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
        today_orders_count = today_invoices.count()

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
            stock = sum(b.pack_quantity for b in m.batches.filter(pack_quantity__gt=0, expiry_date__gt=today))
            if stock <= m.min_stock_alert:
                low_stock_count += 1

        # Total outstanding customer credit
        total_credit_due = Customer.objects.aggregate(total=Sum('credit_balance'))['total'] or Decimal('0.00')

        return Response({
            "today_revenue": round(float(today_revenue), 2),
            "today_orders_count": today_orders_count,
            "today_profit": round(float(today_profit), 2),
            "total_medicines": total_medicines,
            "low_stock_count": low_stock_count,
            "near_expiry_count": near_expiry_count,
            "expired_count": expired_count,
            "total_credit_due": round(float(total_credit_due), 2),
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
            cnt = invoices.count()

            data.append({
                "date": day_date.strftime('%Y-%m-%d'),
                "day": day_date.strftime('%a'),
                "formatted_date": day_date.strftime('%d %b'),
                "revenue": round(float(rev), 2),
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
