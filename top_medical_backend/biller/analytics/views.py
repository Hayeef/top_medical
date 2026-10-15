from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Sum, Count, F, Q
from django.utils import timezone
from datetime import date, timedelta, datetime
from decimal import Decimal
from billing.models import Invoice, InvoiceItem, Customer
from inventory.models import Medicine, Batch

class DashboardSummaryView(APIView):
    def get(self, request):
        today = date.today()
        yesterday = today - timedelta(days=1)
        seven_days_ago = today - timedelta(days=6)
        month_start = today.replace(day=1)

        # 1. Fetch this month's invoices in a single query (covers today, yesterday, 7-days, and MTD)
        month_invoices = list(Invoice.objects.filter(
            created_at__date__gte=month_start
        ).exclude(payment_status__in=['CANCELLED', 'REFUNDED']).values(
            'id', 'created_at', 'grand_total', 'cash_amount', 'upi_amount', 'card_amount',
            'amount_paid', 'discount_amount', 'tax_amount', 'payment_method', 'payment_status'
        ))

        def summarize_invs(inv_list):
            rev = sum((inv['grand_total'] for inv in inv_list), Decimal('0.00'))
            cash = sum((inv['cash_amount'] for inv in inv_list), Decimal('0.00'))
            upi = sum((inv['upi_amount'] for inv in inv_list), Decimal('0.00'))
            card = sum((inv['card_amount'] for inv in inv_list), Decimal('0.00'))
            paid = sum((inv['amount_paid'] for inv in inv_list), Decimal('0.00'))
            disc = sum((inv['discount_amount'] for inv in inv_list), Decimal('0.00'))
            tax = sum((inv['tax_amount'] for inv in inv_list), Decimal('0.00'))
            credit = sum((inv['grand_total'] for inv in inv_list if inv['payment_method'] == 'CREDIT' or inv['payment_status'] == 'DUE'), Decimal('0.00'))
            cnt = len(inv_list)
            avg = (rev / cnt) if cnt > 0 else Decimal('0.00')
            return {
                'revenue': rev, 'cash': cash, 'upi': upi, 'card': card,
                'total_collected': cash + upi + card,
                'paid': paid, 'discount': disc, 'tax': tax, 'credit': credit,
                'count': cnt, 'avg_order_value': avg
            }

        today_inv_list = [inv for inv in month_invoices if inv['created_at'].date() == today]
        yest_inv_list = [inv for inv in month_invoices if inv['created_at'].date() == yesterday]
        week_inv_list = [inv for inv in month_invoices if inv['created_at'].date() >= seven_days_ago]
        month_inv_list = month_invoices

        today_sum = summarize_invs(today_inv_list)
        yest_sum = summarize_invs(yest_inv_list)
        week_sum = summarize_invs(week_inv_list)
        month_sum = summarize_invs(month_inv_list)

        # 2. Compute cost and gross profit for month in a single pass
        month_items = InvoiceItem.objects.filter(
            invoice__created_at__date__gte=month_start
        ).exclude(
            invoice__payment_status__in=['CANCELLED', 'REFUNDED']
        ).select_related('batch', 'invoice')

        today_cost = Decimal('0.00'); today_profit = Decimal('0.00')
        yest_cost = Decimal('0.00'); yest_profit = Decimal('0.00')
        week_cost = Decimal('0.00'); week_profit = Decimal('0.00')
        month_cost = Decimal('0.00'); month_profit = Decimal('0.00')

        for it in month_items:
            inv_date = it.invoice.created_at.date()
            b = it.batch
            if b:
                if it.is_loose and b.pack_size > 0:
                    cost = (b.purchase_price / Decimal(b.pack_size)) * Decimal(it.quantity)
                else:
                    cost = b.purchase_price * Decimal(it.quantity)
            else:
                cost = Decimal('0.00')
            profit = it.total_amount - cost

            month_cost += cost
            month_profit += profit

            if inv_date >= seven_days_ago:
                week_cost += cost
                week_profit += profit
            if inv_date == yesterday:
                yest_cost += cost
                yest_profit += profit
            if inv_date == today:
                today_cost += cost
                today_profit += profit

        def calc_margin_pct(p, r):
            return round((float(p) / float(r) * 100), 1) if r > Decimal('0.00') else 0.0

        today_margin_pct = calc_margin_pct(today_profit, today_sum['revenue'])
        yest_margin_pct = calc_margin_pct(yest_profit, yest_sum['revenue'])
        week_margin_pct = calc_margin_pct(week_profit, week_sum['revenue'])
        month_margin_pct = calc_margin_pct(month_profit, month_sum['revenue'])

        # 3. All-time aggregate totals
        all_time_invoices = Invoice.objects.exclude(payment_status__in=['CANCELLED', 'REFUNDED'])
        all_agg = all_time_invoices.aggregate(
            rev=Sum('grand_total'),
            cash=Sum('cash_amount'),
            upi=Sum('upi_amount'),
            card=Sum('card_amount'),
            cnt=Count('id')
        )
        all_rev = all_agg['rev'] or Decimal('0.00')
        all_cash = all_agg['cash'] or Decimal('0.00')
        all_upi = all_agg['upi'] or Decimal('0.00')
        all_card = all_agg['card'] or Decimal('0.00')
        all_count = all_agg['cnt'] or 0
        all_collected = all_cash + all_upi + all_card
        all_avg = (all_rev / all_count) if all_count > 0 else Decimal('0.00')

        # 4. Inventory stats & live asset valuation
        total_medicines = Medicine.objects.filter(is_active=True).count()
        inv_agg = Batch.objects.filter(expiry_date__gt=today).aggregate(
            cost=Sum(F('pack_quantity') * F('purchase_price')),
            retail=Sum(F('pack_quantity') * F('selling_price'))
        )
        inventory_cost_value = inv_agg['cost'] or Decimal('0.00')
        inventory_retail_value = inv_agg['retail'] or Decimal('0.00')
        unrealized_profit = max(Decimal('0.00'), inventory_retail_value - inventory_cost_value)

        expired_count = Batch.objects.filter(expiry_date__lte=today, pack_quantity__gt=0).count()
        near_expiry_date = today + timedelta(days=90)
        near_expiry_count = Batch.objects.filter(
            expiry_date__gt=today,
            expiry_date__lte=near_expiry_date,
            pack_quantity__gt=0
        ).count()

        # Low stock count
        all_meds = Medicine.objects.filter(is_active=True).prefetch_related('batches')
        low_stock_count = 0
        for m in all_meds:
            stock = sum(b.pack_quantity for b in m.batches.all() if b.pack_quantity > 0 and b.expiry_date > today)
            if stock <= m.min_stock_alert:
                low_stock_count += 1

        # Customer credit dues
        total_credit_due = Customer.objects.aggregate(total=Sum('credit_balance'))['total'] or Decimal('0.00')

        # 5. Daily finance records (Inflow/Outflow/Firm balances)
        from billing.models import DailyFinanceRecord
        today_fin = DailyFinanceRecord.objects.filter(date=today).first()
        month_fin = DailyFinanceRecord.objects.filter(date__gte=month_start).aggregate(
            inflow=Sum('total_earned'),
            outflow=Sum('total_paid'),
            supplier=Sum('supplier_payments'),
            staff=Sum('staff_expenses'),
            shop=Sum('expenses'),
            capital=Sum('capital_investment')
        )

        return Response({
            # Multi-horizon structured metrics
            "periods": {
                "today": {
                    "revenue": round(float(today_sum['revenue']), 2),
                    "cash_revenue": round(float(today_sum['cash']), 2),
                    "upi_revenue": round(float(today_sum['upi']), 2),
                    "card_revenue": round(float(today_sum['card']), 2),
                    "total_collected": round(float(today_sum['total_collected']), 2),
                    "credit_sales": round(float(today_sum['credit']), 2),
                    "orders_count": today_sum['count'],
                    "avg_order_value": round(float(today_sum['avg_order_value']), 2),
                    "profit": round(float(today_profit), 2),
                    "cost": round(float(today_cost), 2),
                    "profit_margin_pct": today_margin_pct,
                    "discount_amount": round(float(today_sum['discount']), 2),
                    "tax_amount": round(float(today_sum['tax']), 2),
                },
                "yesterday": {
                    "revenue": round(float(yest_sum['revenue']), 2),
                    "cash_revenue": round(float(yest_sum['cash']), 2),
                    "upi_revenue": round(float(yest_sum['upi']), 2),
                    "card_revenue": round(float(yest_sum['card']), 2),
                    "total_collected": round(float(yest_sum['total_collected']), 2),
                    "orders_count": yest_sum['count'],
                    "avg_order_value": round(float(yest_sum['avg_order_value']), 2),
                    "profit": round(float(yest_profit), 2),
                    "cost": round(float(yest_cost), 2),
                    "profit_margin_pct": yest_margin_pct,
                },
                "week": {
                    "revenue": round(float(week_sum['revenue']), 2),
                    "cash_revenue": round(float(week_sum['cash']), 2),
                    "upi_revenue": round(float(week_sum['upi']), 2),
                    "card_revenue": round(float(week_sum['card']), 2),
                    "total_collected": round(float(week_sum['total_collected']), 2),
                    "orders_count": week_sum['count'],
                    "avg_order_value": round(float(week_sum['avg_order_value']), 2),
                    "profit": round(float(week_profit), 2),
                    "cost": round(float(week_cost), 2),
                    "profit_margin_pct": week_margin_pct,
                },
                "month": {
                    "revenue": round(float(month_sum['revenue']), 2),
                    "cash_revenue": round(float(month_sum['cash']), 2),
                    "upi_revenue": round(float(month_sum['upi']), 2),
                    "card_revenue": round(float(month_sum['card']), 2),
                    "total_collected": round(float(month_sum['total_collected']), 2),
                    "orders_count": month_sum['count'],
                    "avg_order_value": round(float(month_sum['avg_order_value']), 2),
                    "profit": round(float(month_profit), 2),
                    "cost": round(float(month_cost), 2),
                    "profit_margin_pct": month_margin_pct,
                    "discount_amount": round(float(month_sum['discount']), 2),
                    "tax_amount": round(float(month_sum['tax']), 2),
                },
                "all_time": {
                    "revenue": round(float(all_rev), 2),
                    "cash_revenue": round(float(all_cash), 2),
                    "upi_revenue": round(float(all_upi), 2),
                    "card_revenue": round(float(all_card), 2),
                    "total_collected": round(float(all_collected), 2),
                    "orders_count": all_count,
                    "avg_order_value": round(float(all_avg), 2),
                }
            },

            # Inventory Asset Valuation
            "inventory": {
                "cost_value": round(float(inventory_cost_value), 2),
                "retail_value": round(float(inventory_retail_value), 2),
                "unrealized_profit": round(float(unrealized_profit), 2),
                "total_medicines": total_medicines,
                "low_stock_count": low_stock_count,
                "near_expiry_count": near_expiry_count,
                "expired_count": expired_count,
            },

            # Daily Finance context
            "daily_finance": {
                "today_inflow": round(float(today_fin.total_earned), 2) if today_fin else round(float(today_sum['total_collected']), 2),
                "today_outflow": round(float(today_fin.total_paid), 2) if today_fin else 0.0,
                "today_net_change": round(float(today_fin.net_day_change), 2) if today_fin else round(float(today_sum['total_collected']), 2),
                "today_closing": round(float(today_fin.closing_balance), 2) if today_fin else 0.0,
                "today_capital": round(float(today_fin.capital_investment), 2) if today_fin else 0.0,
                "month_inflow": round(float(month_fin['inflow'] or Decimal('0.00')), 2),
                "month_outflow": round(float(month_fin['outflow'] or Decimal('0.00')), 2),
                "month_capital": round(float(month_fin['capital'] or Decimal('0.00')), 2),
                "month_supplier": round(float(month_fin['supplier'] or Decimal('0.00')), 2),
                "month_staff": round(float(month_fin['staff'] or Decimal('0.00')), 2),
                "month_shop": round(float(month_fin['shop'] or Decimal('0.00')), 2),
            },

            # Legacy top-level keys for backwards-compatibility
            "today_revenue": round(float(today_sum['revenue']), 2),
            "today_cash_revenue": round(float(today_sum['cash']), 2),
            "today_upi_revenue": round(float(today_sum['upi']), 2),
            "today_card_revenue": round(float(today_sum['card']), 2),
            "today_orders_count": today_sum['count'],
            "today_profit": round(float(today_profit), 2),
            "today_profit_margin_pct": today_margin_pct,
            "today_cogs": round(float(today_cost), 2),
            "today_avg_order_value": round(float(today_sum['avg_order_value']), 2),

            "all_time_revenue": round(float(all_rev), 2),
            "all_time_cash_revenue": round(float(all_cash), 2),
            "all_time_upi_revenue": round(float(all_upi), 2),
            "all_time_collected": round(float(all_collected), 2),
            "all_time_orders_count": all_count,

            "payment_breakdown": {
                "cash": round(float(today_sum['cash']), 2),
                "upi": round(float(today_sum['upi']), 2),
                "card": round(float(today_sum['card']), 2),
                "credit": round(float(today_sum['credit']), 2),
            },

            # Inventory backward compat
            "total_medicines": total_medicines,
            "total_medicines_count": total_medicines,
            "total_inventory_value": round(float(inventory_cost_value), 2),
            "total_inventory_cost_value": round(float(inventory_cost_value), 2),
            "total_inventory_retail_value": round(float(inventory_retail_value), 2),
            "unrealized_profit": round(float(unrealized_profit), 2),
            "low_stock_count": low_stock_count,
            "near_expiry_count": near_expiry_count,
            "expired_count": expired_count,
            "total_credit_due": round(float(total_credit_due), 2),
        })


class PaymentBreakdownView(APIView):
    """
    Detailed payment breakdown (Cash, UPI / GPay, Card, Due) over specified periods:
    today, 7 days, 30 days, or custom date range.
    """
    def get(self, request):
        params = getattr(request, 'query_params', getattr(request, 'GET', {}))
        days = params.get('days')
        start_date_str = params.get('start_date')
        end_date_str = params.get('end_date')

        invoices = Invoice.objects.exclude(payment_status__in=['CANCELLED', 'REFUNDED'])

        if start_date_str and end_date_str:
            try:
                s_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
                e_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
                start_dt = timezone.make_aware(datetime.combine(s_date, datetime.min.time()))
                end_dt = timezone.make_aware(datetime.combine(e_date, datetime.max.time()))
                invoices = invoices.filter(created_at__range=(start_dt, end_dt))
            except ValueError:
                pass
        elif days:
            try:
                d = int(days)
                cutoff = timezone.now() - timedelta(days=d)
                invoices = invoices.filter(created_at__gte=cutoff)
            except ValueError:
                pass

        total_cash = invoices.aggregate(total=Sum('cash_amount'))['total'] or Decimal('0.00')
        total_upi = invoices.aggregate(total=Sum('upi_amount'))['total'] or Decimal('0.00')
        total_card = invoices.aggregate(total=Sum('card_amount'))['total'] or Decimal('0.00')
        total_paid = invoices.aggregate(total=Sum('amount_paid'))['total'] or Decimal('0.00')
        total_revenue = invoices.aggregate(total=Sum('grand_total'))['total'] or Decimal('0.00')
        total_due = max(Decimal('0.00'), total_revenue - total_paid)

        cash_count = invoices.filter(Q(payment_method='CASH') | Q(cash_amount__gt=0)).count()
        upi_count = invoices.filter(Q(payment_method__in=['UPI', 'GPAY']) | Q(upi_amount__gt=0)).count()
        card_count = invoices.filter(Q(payment_method='CARD') | Q(card_amount__gt=0)).count()
        credit_count = invoices.filter(Q(payment_method='CREDIT') | Q(payment_status='DUE')).count()

        total_collected = total_cash + total_upi + total_card
        cash_pct = round((float(total_cash) / float(total_collected) * 100), 1) if total_collected > 0 else 0.0
        upi_pct = round((float(total_upi) / float(total_collected) * 100), 1) if total_collected > 0 else 0.0
        card_pct = round((float(total_card) / float(total_collected) * 100), 1) if total_collected > 0 else 0.0

        return Response({
            "total_revenue": round(float(total_revenue), 2),
            "total_amount_paid": round(float(total_paid), 2),
            "total_cash": round(float(total_cash), 2),
            "total_upi": round(float(total_upi), 2),
            "total_card": round(float(total_card), 2),
            "total_due": round(float(total_due), 2),
            "percentages": {
                "cash": cash_pct,
                "upi": upi_pct,
                "card": card_pct,
            },
            "counts": {
                "total": invoices.count(),
                "cash": cash_count,
                "upi": upi_count,
                "card": card_count,
                "credit": credit_count,
            }
        })


class SalesTrendView(APIView):
    def get(self, request):
        params = getattr(request, 'query_params', getattr(request, 'GET', {}))
        days = int(params.get('days', 7))
        today = date.today()
        start_d = today - timedelta(days=days - 1)

        day_map = {}
        for i in range(days):
            d = start_d + timedelta(days=i)
            d_str = d.strftime('%Y-%m-%d')
            day_map[d_str] = {
                "date": d_str,
                "day": d.strftime('%a'),
                "formatted_date": d.strftime('%d %b'),
                "revenue": Decimal('0.00'),
                "cash_revenue": Decimal('0.00'),
                "upi_revenue": Decimal('0.00'),
                "cost": Decimal('0.00'),
                "profit": Decimal('0.00'),
                "margin_pct": 0.0,
                "invoices": 0,
            }

        invoices = Invoice.objects.filter(
            created_at__date__gte=start_d
        ).exclude(payment_status__in=['CANCELLED', 'REFUNDED'])

        for inv in invoices:
            d_str = inv.created_at.date().strftime('%Y-%m-%d')
            if d_str in day_map:
                day_map[d_str]['revenue'] += inv.grand_total
                day_map[d_str]['cash_revenue'] += inv.cash_amount
                day_map[d_str]['upi_revenue'] += inv.upi_amount
                day_map[d_str]['invoices'] += 1

        items = InvoiceItem.objects.filter(
            invoice__created_at__date__gte=start_d
        ).exclude(
            invoice__payment_status__in=['CANCELLED', 'REFUNDED']
        ).select_related('batch', 'invoice')

        for it in items:
            d_str = it.invoice.created_at.date().strftime('%Y-%m-%d')
            if d_str in day_map:
                b = it.batch
                if b:
                    if it.is_loose and b.pack_size > 0:
                        cost = (b.purchase_price / Decimal(b.pack_size)) * Decimal(it.quantity)
                    else:
                        cost = b.purchase_price * Decimal(it.quantity)
                else:
                    cost = Decimal('0.00')
                day_map[d_str]['cost'] += cost
                day_map[d_str]['profit'] += (it.total_amount - cost)

        data = []
        for d_str, val in day_map.items():
            rev = val['revenue']
            profit = val['profit']
            cost = val['cost']
            margin = round((float(profit) / float(rev) * 100), 1) if rev > Decimal('0.00') else 0.0
            data.append({
                "date": val['date'],
                "day": val['day'],
                "formatted_date": val['formatted_date'],
                "revenue": round(float(rev), 2),
                "cash_revenue": round(float(val['cash_revenue']), 2),
                "upi_revenue": round(float(val['upi_revenue']), 2),
                "cost": round(float(cost), 2),
                "profit": round(float(profit), 2),
                "margin_pct": margin,
                "invoices": val['invoices'],
            })

        return Response(data)


class CategoryDistributionView(APIView):
    def get(self, request):
        items = InvoiceItem.objects.filter(
            invoice__payment_status__in=['PAID', 'PARTIAL', 'DUE']
        ).select_related('medicine__category', 'batch')

        category_map = {}
        for item in items:
            cat_name = item.medicine.category.name if (item.medicine and item.medicine.category) else "General"
            if cat_name not in category_map:
                category_map[cat_name] = {
                    'category': cat_name,
                    'amount': Decimal('0.00'),
                    'cost': Decimal('0.00'),
                    'units': 0
                }
            category_map[cat_name]['amount'] += item.total_amount
            category_map[cat_name]['units'] += item.quantity
            b = item.batch
            if b:
                if item.is_loose and b.pack_size > 0:
                    c = (b.purchase_price / Decimal(b.pack_size)) * Decimal(item.quantity)
                else:
                    c = b.purchase_price * Decimal(item.quantity)
            else:
                c = Decimal('0.00')
            category_map[cat_name]['cost'] += c

        result = []
        for cat_name, data in sorted(category_map.items(), key=lambda x: x[1]['amount'], reverse=True):
            profit = data['amount'] - data['cost']
            margin_pct = round((float(profit) / float(data['amount']) * 100), 1) if data['amount'] > Decimal('0.00') else 0.0
            result.append({
                "category": cat_name,
                "amount": round(float(data['amount']), 2),
                "cost": round(float(data['cost']), 2),
                "profit": round(float(profit), 2),
                "margin_pct": margin_pct,
                "units": data['units']
            })

        return Response(result)


class TopSellingView(APIView):
    def get(self, request):
        items = InvoiceItem.objects.filter(
            invoice__payment_status__in=['PAID', 'PARTIAL', 'DUE']
        ).select_related('medicine', 'batch')

        med_map = {}
        for item in items:
            if not item.medicine:
                continue
            m_id = item.medicine.id
            if m_id not in med_map:
                med_map[m_id] = {
                    "name": item.medicine.name,
                    "dosage": item.medicine.dosage_form or "Tablet",
                    "units_sold": 0,
                    "revenue": Decimal('0.00'),
                    "cost": Decimal('0.00')
                }
            med_map[m_id]['units_sold'] += item.quantity
            med_map[m_id]['revenue'] += item.total_amount
            b = item.batch
            if b:
                if item.is_loose and b.pack_size > 0:
                    c = (b.purchase_price / Decimal(b.pack_size)) * Decimal(item.quantity)
                else:
                    c = b.purchase_price * Decimal(item.quantity)
            else:
                c = Decimal('0.00')
            med_map[m_id]['cost'] += c

        top_list = sorted(med_map.values(), key=lambda x: x['units_sold'], reverse=True)[:8]
        result = []
        for item in top_list:
            profit = item['revenue'] - item['cost']
            margin_pct = round((float(profit) / float(item['revenue']) * 100), 1) if item['revenue'] > Decimal('0.00') else 0.0
            result.append({
                "name": item['name'],
                "dosage": item['dosage'],
                "units_sold": item['units_sold'],
                "revenue": round(float(item['revenue']), 2),
                "cost": round(float(item['cost']), 2),
                "profit": round(float(profit), 2),
                "margin_pct": margin_pct
            })

        return Response(result)


class DailySoldReportView(APIView):
    """
    Daily Inventory Dispensing & Supplier Reorder Report.
    Aggregates all medicines sold on a specific date (or date range), with
    quantities sold, live remaining stock, stock status, and suggested reorder quantities.
    Matches the exact net revenue of Daily Accounts (apportioning invoice discounts).
    """
    def get(self, request):
        date_str = request.query_params.get('date')
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')
        search = request.query_params.get('search', '').strip().lower()
        supplier_id = request.query_params.get('supplier_id')
        category_id = request.query_params.get('category_id')

        # Determine date range
        if start_date_str and end_date_str:
            try:
                start_d = datetime.strptime(start_date_str, '%Y-%m-%d').date()
                end_d = datetime.strptime(end_date_str, '%Y-%m-%d').date()
            except ValueError:
                start_d = end_d = date.today()
        elif date_str:
            try:
                start_d = end_d = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                start_d = end_d = date.today()
        else:
            start_d = end_d = date.today()

        start_dt = timezone.make_aware(datetime.combine(start_d, datetime.min.time()))
        end_dt = timezone.make_aware(datetime.combine(end_d, datetime.max.time()))

        # Query all valid (non-cancelled) invoices for this period
        if start_d == end_d:
            invoices = Invoice.objects.filter(
                Q(created_at__range=(start_dt, end_dt)) | Q(created_at__date=start_d)
            ).exclude(payment_status__in=['CANCELLED', 'REFUNDED']).prefetch_related(
                'items__medicine',
                'items__medicine__category',
                'items__batch',
                'items__batch__supplier'
            )
        else:
            invoices = Invoice.objects.filter(
                created_at__range=(start_dt, end_dt)
            ).exclude(payment_status__in=['CANCELLED', 'REFUNDED']).prefetch_related(
                'items__medicine',
                'items__medicine__category',
                'items__batch',
                'items__batch__supplier'
            )

        # Aggregate data by medicine
        medicine_map = {}
        total_sales_value = Decimal('0.00')
        total_cost_value = Decimal('0.00')
        total_packs_sold = 0
        total_loose_sold = 0
        distinct_invoice_ids = set()

        for inv in invoices:
            inv_items = list(inv.items.all())
            if not inv_items:
                continue

            inv_items_sum = sum(it.total_amount for it in inv_items)

            for item in inv_items:
                med = item.medicine
                if not med:
                    continue

                if supplier_id and str(item.batch.supplier_id if item.batch else '') != str(supplier_id):
                    continue
                if category_id and str(med.category_id or '') != str(category_id):
                    continue

                if search:
                    m_name = (med.name or '').lower()
                    g_name = (med.generic_name or '').lower()
                    mfg = (med.manufacturer or '').lower()
                    if search not in m_name and search not in g_name and search not in mfg:
                        continue

                distinct_invoice_ids.add(inv.id)

                # Apportion invoice grand_total across items proportionally
                if inv_items_sum > Decimal('0.00'):
                    effective_item_amount = (item.total_amount / inv_items_sum) * inv.grand_total
                else:
                    effective_item_amount = item.total_amount

                total_sales_value += effective_item_amount

                batch = item.batch
                if item.is_loose:
                    cost = (batch.purchase_price / Decimal(batch.pack_size or 10)) * Decimal(item.quantity) if batch else Decimal('0.00')
                    total_loose_sold += item.quantity
                else:
                    cost = batch.purchase_price * Decimal(item.quantity) if batch else Decimal('0.00')
                    total_packs_sold += item.quantity

                total_cost_value += cost

                if med.id not in medicine_map:
                    # Calculate current active stock across unexpired batches
                    active_batches = med.batches.filter(expiry_date__gt=date.today())
                    current_packs = sum(b.pack_quantity for b in active_batches if b.pack_quantity > 0)
                    current_loose = sum(b.loose_quantity for b in active_batches if b.loose_quantity > 0)

                    primary_supplier = None
                    if batch and batch.supplier:
                        primary_supplier = batch.supplier.name
                    elif med.batches.filter(supplier__isnull=False).exists():
                        primary_supplier = med.batches.filter(supplier__isnull=False).first().supplier.name

                    medicine_map[med.id] = {
                        "medicine_id": med.id,
                        "name": med.name,
                        "generic_name": med.generic_name or "Standard Composition",
                        "dosage_form": med.dosage_form or "Tablet",
                        "strength": med.strength or "",
                        "category_name": med.category.name if med.category else "General",
                        "manufacturer": med.manufacturer or "Pharma Co",
                        "rack_location": med.rack_location or "Main Shelf",
                        "hsn_code": med.hsn_code or "3004",
                        "min_stock_alert": med.min_stock_alert or 10,
                        "current_stock_packs": current_packs,
                        "current_stock_loose": current_loose,
                        "packs_sold": 0,
                        "loose_sold": 0,
                        "total_sales_amount": Decimal('0.00'),
                        "total_cost_amount": Decimal('0.00'),
                        "unit_mrp": float(item.unit_mrp),
                        "selling_price": float(item.unit_selling_price),
                        "batches_dispensed": set(),
                        "primary_supplier": primary_supplier or "Standard Distributor",
                    }

                entry = medicine_map[med.id]
                if item.is_loose:
                    entry["loose_sold"] += item.quantity
                else:
                    entry["packs_sold"] += item.quantity

                entry["total_sales_amount"] += effective_item_amount
                entry["total_cost_amount"] += cost
                if batch:
                    entry["batches_dispensed"].add(f"{batch.batch_number} (Exp: {batch.expiry_date})")

        # Format items list with stock status & suggested reorders
        items_list = []
        low_stock_reorder_count = 0

        for med_id, data in medicine_map.items():
            curr_packs = data["current_stock_packs"]
            min_alert = data["min_stock_alert"]
            packs_sold = data["packs_sold"]

            # Determine stock status & suggested reorder packs
            if curr_packs <= 0:
                stock_status = "OUT_OF_STOCK"
                suggested_reorder = max(min_alert * 2, packs_sold * 2, 10)
                low_stock_reorder_count += 1
            elif curr_packs <= min_alert:
                stock_status = "LOW_STOCK"
                suggested_reorder = max((min_alert * 2) - curr_packs, packs_sold)
                low_stock_reorder_count += 1
            else:
                stock_status = "IN_STOCK"
                suggested_reorder = max(packs_sold, 0)

            # Build display string
            qty_parts = []
            if data["packs_sold"] > 0:
                qty_parts.append(f"{data['packs_sold']} pk")
            if data["loose_sold"] > 0:
                qty_parts.append(f"{data['loose_sold']} un")
            total_qty_display = " + ".join(qty_parts) if qty_parts else "0"

            items_list.append({
                "medicine_id": data["medicine_id"],
                "name": data["name"],
                "generic_name": data["generic_name"],
                "dosage_form": data["dosage_form"],
                "strength": data["strength"],
                "category_name": data["category_name"],
                "manufacturer": data["manufacturer"],
                "rack_location": data["rack_location"],
                "hsn_code": data["hsn_code"],
                "packs_sold": data["packs_sold"],
                "loose_sold": data["loose_sold"],
                "total_qty_display": total_qty_display,
                "current_stock_packs": curr_packs,
                "current_stock_loose": data["current_stock_loose"],
                "min_stock_alert": min_alert,
                "stock_status": stock_status,
                "suggested_reorder_packs": suggested_reorder,
                "unit_mrp": data["unit_mrp"],
                "selling_price": data["selling_price"],
                "total_sales_amount": round(float(data["total_sales_amount"]), 2),
                "total_cost_amount": round(float(data["total_cost_amount"]), 2),
                "batches_dispensed": list(data["batches_dispensed"]),
                "primary_supplier": data["primary_supplier"],
            })

        # Sort items: out of stock & low stock first, then by highest quantity sold
        items_list.sort(
            key=lambda x: (
                0 if x["stock_status"] == "OUT_OF_STOCK" else (1 if x["stock_status"] == "LOW_STOCK" else 2),
                -x["packs_sold"],
                -x["total_sales_amount"]
            )
        )

        return Response({
            "report_date": start_d.strftime('%Y-%m-%d'),
            "formatted_date": start_d.strftime('%A, %d %B %Y') if start_d == end_d else f"{start_d.strftime('%d %b %Y')} to {end_d.strftime('%d %b %Y')}",
            "is_date_range": start_d != end_d,
            "start_date": start_d.strftime('%Y-%m-%d'),
            "end_date": end_d.strftime('%Y-%m-%d'),
            "total_distinct_medicines": len(items_list),
            "total_packs_sold": total_packs_sold,
            "total_loose_sold": total_loose_sold,
            "total_sales_value": round(float(total_sales_value), 2),
            "total_cost_value": round(float(total_cost_value), 2),
            "estimated_profit": round(float(total_sales_value - total_cost_value), 2),
            "total_bills_count": len(distinct_invoice_ids),
            "low_stock_reorder_count": low_stock_reorder_count,
            "items": items_list,
        })


