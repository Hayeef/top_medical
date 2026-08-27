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
        start_of_today = timezone.make_aware(datetime.combine(today, datetime.min.time()))
        end_of_today = timezone.make_aware(datetime.combine(today, datetime.max.time()))

        # Today's sales
        today_invoices = Invoice.objects.filter(
            created_at__range=(start_of_today, end_of_today)
        ).exclude(payment_status__in=['CANCELLED', 'REFUNDED'])

        today_revenue = today_invoices.aggregate(total=Sum('grand_total'))['total'] or Decimal('0.00')
        today_cash_revenue = today_invoices.aggregate(total=Sum('cash_amount'))['total'] or Decimal('0.00')
        today_upi_revenue = today_invoices.aggregate(total=Sum('upi_amount'))['total'] or Decimal('0.00')
        today_card_revenue = today_invoices.aggregate(total=Sum('card_amount'))['total'] or Decimal('0.00')
        today_credit_sales = today_invoices.filter(
            Q(payment_method='CREDIT') | Q(payment_status='DUE')
        ).aggregate(total=Sum('grand_total'))['total'] or Decimal('0.00')
        today_orders_count = today_invoices.count()

        # All-time totals
        all_time_invoices = Invoice.objects.exclude(payment_status__in=['CANCELLED', 'REFUNDED'])
        all_time_cash = all_time_invoices.aggregate(total=Sum('cash_amount'))['total'] or Decimal('0.00')
        all_time_upi = all_time_invoices.aggregate(total=Sum('upi_amount'))['total'] or Decimal('0.00')
        all_time_revenue = all_time_invoices.aggregate(total=Sum('grand_total'))['total'] or Decimal('0.00')

        # Gross profit estimate for today
        today_items = InvoiceItem.objects.filter(
            invoice__in=today_invoices
        ).select_related('batch')

        today_profit = Decimal('0.00')
        for item in today_items:
            batch = item.batch
            if item.is_loose:
                cost = (batch.purchase_price / Decimal(batch.pack_size)) * Decimal(item.quantity)
            else:
                cost = batch.purchase_price * Decimal(item.quantity)
            profit = item.total_amount - cost
            today_profit += profit

        # Inventory Stats
        total_medicines = Medicine.objects.filter(is_active=True).count()
        
        # Expired batches (>0 stock)
        expired_count = Batch.objects.filter(expiry_date__lte=today, pack_quantity__gt=0).count()
        
        # Near expiry batches (< 90 days, >0 stock)
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

        # Total outstanding customer credit
        total_credit_due = Customer.objects.aggregate(total=Sum('credit_balance'))['total'] or Decimal('0.00')

        return Response({
            "today_revenue": round(float(today_revenue), 2),
            "today_cash_revenue": round(float(today_cash_revenue), 2),
            "today_upi_revenue": round(float(today_upi_revenue), 2),
            "today_card_revenue": round(float(today_card_revenue), 2),
            "today_orders_count": today_orders_count,
            "today_profit": round(float(today_profit), 2),
            "all_time_revenue": round(float(all_time_revenue), 2),
            "all_time_cash_revenue": round(float(all_time_cash), 2),
            "all_time_upi_revenue": round(float(all_time_upi), 2),
            "payment_breakdown": {
                "cash": round(float(today_cash_revenue), 2),
                "upi": round(float(today_upi_revenue), 2),
                "card": round(float(today_card_revenue), 2),
                "credit": round(float(today_credit_sales), 2),
            },
            "total_medicines": total_medicines,
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
        days = request.query_params.get('days')
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')

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
        days = int(request.query_params.get('days', 7))
        today = date.today()
        data = []

        for i in range(days - 1, -1, -1):
            day_date = today - timedelta(days=i)
            start_dt = timezone.make_aware(datetime.combine(day_date, datetime.min.time()))
            end_dt = timezone.make_aware(datetime.combine(day_date, datetime.max.time()))

            invoices = Invoice.objects.filter(
                created_at__range=(start_dt, end_dt)
            ).exclude(payment_status__in=['CANCELLED', 'REFUNDED'])

            rev = invoices.aggregate(total=Sum('grand_total'))['total'] or Decimal('0.00')
            cash_rev = invoices.aggregate(total=Sum('cash_amount'))['total'] or Decimal('0.00')
            upi_rev = invoices.aggregate(total=Sum('upi_amount'))['total'] or Decimal('0.00')
            cnt = invoices.count()

            data.append({
                "date": day_date.strftime('%Y-%m-%d'),
                "day": day_date.strftime('%a'),
                "formatted_date": day_date.strftime('%d %b'),
                "revenue": round(float(rev), 2),
                "cash_revenue": round(float(cash_rev), 2),
                "upi_revenue": round(float(upi_rev), 2),
                "invoices": cnt,
            })

        return Response(data)


class CategoryDistributionView(APIView):
    def get(self, request):
        items = InvoiceItem.objects.filter(
            invoice__payment_status__in=['PAID', 'PARTIAL', 'DUE']
        ).select_related('medicine__category')

        category_sales = {}
        for item in items:
            cat_name = item.medicine.category.name if item.medicine.category else "Uncategorized"
            category_sales[cat_name] = category_sales.get(cat_name, Decimal('0.00')) + item.total_amount

        result = [
            {"category": k, "amount": round(float(v), 2)}
            for k, v in sorted(category_sales.items(), key=lambda x: x[1], reverse=True)
        ]
        return Response(result)


class TopSellingView(APIView):
    def get(self, request):
        top_items = InvoiceItem.objects.filter(
            invoice__payment_status__in=['PAID', 'PARTIAL', 'DUE']
        ).values('medicine__name', 'medicine__dosage_form').annotate(
            total_qty=Sum('quantity'),
            total_revenue=Sum('total_amount')
        ).order_by('-total_qty')[:8]

        result = [
            {
                "name": item['medicine__name'],
                "dosage": item['medicine__dosage_form'],
                "units_sold": item['total_qty'],
                "revenue": round(float(item['total_revenue']), 2)
            }
            for item in top_items
        ]
        return Response(result)


class DailySoldReportView(APIView):
    """
    Daily Inventory Dispensing & Supplier Reorder Report.
    Aggregates all medicines sold on a specific date (or date range), with
    quantities sold, live remaining stock, stock status, and suggested reorder quantities.
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

        # Query all items sold in valid (non-cancelled) invoices for this period
        sold_items = InvoiceItem.objects.filter(
            invoice__created_at__range=(start_dt, end_dt)
        ).exclude(
            invoice__payment_status__in=['CANCELLED', 'REFUNDED']
        ).select_related(
            'medicine',
            'medicine__category',
            'batch',
            'batch__supplier',
            'invoice'
        ).order_by('medicine__name')

        if supplier_id:
            sold_items = sold_items.filter(batch__supplier_id=supplier_id)
        if category_id:
            sold_items = sold_items.filter(medicine__category_id=category_id)

        # Aggregate data by medicine
        medicine_map = {}
        total_sales_value = Decimal('0.00')
        total_cost_value = Decimal('0.00')
        total_packs_sold = 0
        total_loose_sold = 0
        distinct_invoice_ids = set()

        for item in sold_items:
            med = item.medicine
            if not med:
                continue

            if search:
                m_name = (med.name or '').lower()
                g_name = (med.generic_name or '').lower()
                mfg = (med.manufacturer or '').lower()
                if search not in m_name and search not in g_name and search not in mfg:
                    continue

            distinct_invoice_ids.add(item.invoice_id)
            total_sales_value += item.total_amount

            batch = item.batch
            if item.is_loose:
                cost = (batch.purchase_price / Decimal(batch.pack_size or 10)) * Decimal(item.quantity)
                total_loose_sold += item.quantity
            else:
                cost = batch.purchase_price * Decimal(item.quantity)
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

            entry["total_sales_amount"] += item.total_amount
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


