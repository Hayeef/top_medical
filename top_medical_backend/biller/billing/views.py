from rest_framework import viewsets, status, filters
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from django.http import HttpResponse
from django.db import transaction
from django.db.models import Sum, Count, Q, F
from django.utils import timezone
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from datetime import datetime, date, timedelta
from decimal import Decimal
from .models import PharmacyProfile, StaffMember, Doctor, Customer, Invoice, InvoiceItem, DailyFinanceRecord, VendorBill
from .serializers import (
    PharmacyProfileSerializer, StaffMemberSerializer, DoctorSerializer, CustomerSerializer,
    InvoiceSerializer, InvoiceItemSerializer, DailyFinanceRecordSerializer, VendorBillSerializer
)
from .excel_export import generate_bills_excel, generate_daily_finance_excel
from inventory.models import Batch, StockMovement

class LoginAPIView(APIView):
    """Authenticate user with email or username and password."""
    def post(self, request):
        identifier = request.data.get('email', '').strip() or request.data.get('username', '').strip()
        password = request.data.get('password', '')

        if not identifier or not password:
            return Response(
                {"error": "Please provide both email/username and password."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Look up by email or username
        user = User.objects.filter(email__iexact=identifier).first() or User.objects.filter(username__iexact=identifier).first()

        if user and user.check_password(password):
            if not user.is_active:
                return Response(
                    {"error": "Account is disabled. Please contact administrator."},
                    status=status.HTTP_403_FORBIDDEN
                )
            is_admin_user = bool(user.is_superuser or 'admin' in user.username.lower() or (user.email and 'admin' in user.email.lower()))
            return Response({
                "success": True,
                "token": f"session_token_{user.id}_{int(timezone.now().timestamp())}",
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "name": user.get_full_name() or user.username,
                    "role": "admin" if is_admin_user else "staff",
                    "is_staff": user.is_staff,
                    "is_superuser": user.is_superuser
                },
                "message": "Welcome back! Login successful."
            })
        
        return Response(
            {"error": "Invalid email/username or password. Please try again."},
            status=status.HTTP_401_UNAUTHORIZED
        )


class PharmacyProfileViewSet(viewsets.ViewSet):
    """Retrieve and update pharmacy company profile & receipt details."""
    def list(self, request):
        settings_obj = PharmacyProfile.get_settings()
        serializer = PharmacyProfileSerializer(settings_obj)
        return Response(serializer.data)

    def create(self, request):
        settings_obj = PharmacyProfile.get_settings()
        serializer = PharmacyProfileSerializer(settings_obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class StaffMemberViewSet(viewsets.ModelViewSet):
    queryset = StaffMember.objects.all()
    serializer_class = StaffMemberSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'charge_code', 'role', 'phone']


class DoctorViewSet(viewsets.ModelViewSet):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'specialization', 'registration_number', 'hospital_name', 'phone']


class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all().select_related('preferred_doctor')
    serializer_class = CustomerSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'phone', 'email', 'address']


class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.all().select_related('customer', 'doctor', 'staff').prefetch_related('items')
    serializer_class = InvoiceSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['invoice_number', 'customer_name', 'customer_phone', 'doctor_name', 'staff_name', 'staff_code']

    def get_queryset(self):
        qs = Invoice.objects.all().select_related('customer', 'doctor', 'staff').prefetch_related('items')
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        status_param = self.request.query_params.get('status')
        payment_method = self.request.query_params.get('payment_method')
        staff_code = self.request.query_params.get('staff_code')

        if start_date:
            qs = qs.filter(created_at__date__gte=start_date)
        if end_date:
            qs = qs.filter(created_at__date__lte=end_date)
        if status_param:
            qs = qs.filter(payment_status=status_param)
        if payment_method:
            qs = qs.filter(payment_method=payment_method)
        if staff_code:
            qs = qs.filter(staff_code=staff_code)

        return qs

    @action(detail=False, methods=['get'])
    def next_number(self, request):
        """Get the auto-generated next invoice number."""
        next_num = Invoice.generate_next_invoice_number()
        return Response({"next_invoice_number": next_num})

    @action(detail=False, methods=['get'], url_path='export_excel')
    def export_excel(self, request):
        """
        Export Bills and Sales to a professionally formatted Excel spreadsheet (.xlsx).
        Supports:
        - Monthly bills: ?month=9&year=2026
        - Custom date ranges: ?start_date=2026-08-01&end_date=2026-09-08
        - Filters: staff_code, payment_method, status, search, include_cancelled
        - Export types: full (Summary + Ledger + Items), ledger, items
        """
        qs = Invoice.objects.all().select_related('customer', 'doctor', 'staff').prefetch_related('items__medicine', 'items__batch')
        
        # Determine Period & Scope
        month = request.query_params.get('month')
        year = request.query_params.get('year')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        staff_code = request.query_params.get('staff_code')
        payment_method = request.query_params.get('payment_method')
        status_param = request.query_params.get('status')
        search = request.query_params.get('search')
        export_type = request.query_params.get('export_type', 'full').lower()

        filter_parts = []

        if month:
            try:
                m_int = int(month)
                y_int = int(year) if year else timezone.now().year
                qs = qs.filter(created_at__year=y_int, created_at__month=m_int)
                month_dt = datetime(y_int, m_int, 1)
                month_name = month_dt.strftime('%B %Y')
                report_title = f"MONTHLY BILLS ({month_name.upper()})"
                file_name = f"TopMedical_Bills_Monthly_{month_dt.strftime('%b_%Y')}.xlsx"
                filter_parts.append(f"Month: {month_name}")
            except (ValueError, TypeError):
                m_int = timezone.now().month
                y_int = timezone.now().year
                qs = qs.filter(created_at__year=y_int, created_at__month=m_int)
                report_title = "MONTHLY BILLS"
                file_name = f"TopMedical_Bills_Monthly_{y_int}_{m_int}.xlsx"
                filter_parts.append("Current Month")
        elif start_date or end_date:
            if start_date:
                qs = qs.filter(created_at__date__gte=start_date)
            if end_date:
                qs = qs.filter(created_at__date__lte=end_date)
            date_range_str = f"{start_date or 'Beginning'} to {end_date or 'Present'}"
            report_title = f"BILL HISTORY ({date_range_str})"
            file_name = f"TopMedical_BillHistory_{start_date or 'Start'}_to_{end_date or 'Now'}.xlsx"
            filter_parts.append(f"Date Range: {date_range_str}")
        else:
            report_title = "ALL-TIME BILL HISTORY"
            file_name = f"TopMedical_BillHistory_All_{timezone.now().strftime('%Y%m%d')}.xlsx"
            filter_parts.append("All Time")

        if staff_code:
            qs = qs.filter(staff_code=staff_code)
            filter_parts.append(f"Staff: {staff_code}")

        if payment_method:
            qs = qs.filter(payment_method=payment_method)
            filter_parts.append(f"Payment: {payment_method}")

        if status_param:
            qs = qs.filter(payment_status=status_param)
            filter_parts.append(f"Status: {status_param}")

        if search:
            qs = qs.filter(
                Q(invoice_number__icontains=search) |
                Q(customer_name__icontains=search) |
                Q(customer_phone__icontains=search) |
                Q(doctor_name__icontains=search) |
                Q(staff_name__icontains=search)
            )
            filter_parts.append(f"Search: '{search}'")

        # Chronological order for audit ledger
        qs = qs.order_by('created_at')

        profile = PharmacyProfile.get_settings()
        filter_summary_text = "  |  ".join(filter_parts) if filter_parts else "All Recorded Invoices"

        excel_buffer = generate_bills_excel(
            invoices_qs=qs,
            profile=profile,
            filter_info=filter_summary_text,
            report_title=report_title,
            export_type=export_type
        )

        response = HttpResponse(
            excel_buffer.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="{file_name}"'
        response['Access-Control-Expose-Headers'] = 'Content-Disposition'
        return response

    @action(detail=False, methods=['get'])
    def payment_summary(self, request):
        """
        Summary of payments received (Cash, UPI / GPay, Card, Due)
        for accounting, daily settlement, and cash drawer reconciliation.
        Supports filtering by start_date, end_date, staff_code.
        """
        qs = self.get_queryset().exclude(payment_status__in=['CANCELLED', 'REFUNDED'])

        totals = qs.aggregate(
            total_revenue=Sum('grand_total'),
            total_amount_paid=Sum('amount_paid'),
            total_cash=Sum('cash_amount'),
            total_upi=Sum('upi_amount'),
            total_card=Sum('card_amount'),
            total_discount=Sum('discount_amount'),
            total_tax=Sum('tax_amount'),
        )

        total_revenue = totals['total_revenue'] or Decimal('0.00')
        total_amount_paid = totals['total_amount_paid'] or Decimal('0.00')
        total_cash = totals['total_cash'] or Decimal('0.00')
        total_upi = totals['total_upi'] or Decimal('0.00')
        total_card = totals['total_card'] or Decimal('0.00')
        total_discount = totals['total_discount'] or Decimal('0.00')
        total_tax = totals['total_tax'] or Decimal('0.00')
        total_due = max(Decimal('0.00'), total_revenue - total_amount_paid)

        total_count = qs.count()
        cash_invoices_count = qs.filter(Q(payment_method='CASH') | Q(cash_amount__gt=0)).count()
        upi_invoices_count = qs.filter(Q(payment_method__in=['UPI', 'GPAY']) | Q(upi_amount__gt=0)).count()
        card_invoices_count = qs.filter(Q(payment_method='CARD') | Q(card_amount__gt=0)).count()
        credit_invoices_count = qs.filter(Q(payment_method='CREDIT') | Q(payment_status='DUE')).count()

        # Staff-level collection breakdown
        staff_stats = []
        staff_groups = qs.values('staff_code', 'staff_name').annotate(
            invoices_count=Count('id'),
            cash_collected=Sum('cash_amount'),
            upi_collected=Sum('upi_amount'),
            card_collected=Sum('card_amount'),
            total_collected=Sum('amount_paid'),
            total_sales=Sum('grand_total')
        ).order_by('-total_sales')

        for st in staff_groups:
            staff_stats.append({
                'staff_code': st['staff_code'] or 'N/A',
                'staff_name': st['staff_name'] or 'Unknown Staff',
                'invoices_count': st['invoices_count'],
                'cash_collected': round(float(st['cash_collected'] or 0.0), 2),
                'upi_collected': round(float(st['upi_collected'] or 0.0), 2),
                'card_collected': round(float(st['card_collected'] or 0.0), 2),
                'total_collected': round(float(st['total_collected'] or 0.0), 2),
                'total_sales': round(float(st['total_sales'] or 0.0), 2),
            })

        return Response({
            'total_invoices_count': total_count,
            'total_revenue': round(float(total_revenue), 2),
            'total_amount_paid': round(float(total_amount_paid), 2),
            'total_cash_received': round(float(total_cash), 2),
            'total_upi_received': round(float(total_upi), 2),
            'total_card_received': round(float(total_card), 2),
            'total_due_amount': round(float(total_due), 2),
            'total_discount': round(float(total_discount), 2),
            'total_tax': round(float(total_tax), 2),
            'counts': {
                'total': total_count,
                'cash': cash_invoices_count,
                'upi': upi_invoices_count,
                'card': card_invoices_count,
                'credit': credit_invoices_count,
            },
            'staff_breakdown': staff_stats,
        })

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def cancel_invoice(self, request, pk=None):
        """Cancel an invoice and return stock back to respective batches."""
        invoice = self.get_object()
        if invoice.payment_status in ['CANCELLED', 'REFUNDED']:
            return Response(
                {"error": f"Invoice is already {invoice.payment_status}."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Restore items
        for item in invoice.items.all():
            batch = item.batch
            if not item.is_loose:
                batch.pack_quantity += item.quantity
                pack_restored = item.quantity
                loose_restored = 0
            else:
                total_units = (batch.pack_quantity * batch.pack_size) + batch.loose_quantity + item.quantity
                batch.pack_quantity = total_units // batch.pack_size
                batch.loose_quantity = total_units % batch.pack_size
                pack_restored = 0
                loose_restored = item.quantity

            batch.save()

            StockMovement.objects.create(
                batch=batch,
                movement_type='RETURN',
                quantity_packs=pack_restored,
                quantity_loose=loose_restored,
                reference_id=invoice.invoice_number,
                notes=f"Stock returned from cancelled bill {invoice.invoice_number}"
            )

        # Revert customer credit if needed
        if invoice.customer and (invoice.payment_method == 'CREDIT' or invoice.payment_status == 'DUE'):
            due_amount = invoice.grand_total - invoice.amount_paid
            invoice.customer.credit_balance = max(Decimal('0.00'), invoice.customer.credit_balance - due_amount)
            invoice.customer.save()

        invoice.payment_status = 'CANCELLED'
        invoice.save()

        return Response({"message": f"Invoice {invoice.invoice_number} cancelled and stock successfully restored."})

    @action(detail=True, methods=['post', 'patch'], url_path='update_discount')
    @transaction.atomic
    def update_discount(self, request, pk=None):
        """
        Update post-generation discount on an existing bill (e.g., customer bargaining).
        Recalculates item discounts, tax amounts, round off, and grand total.
        """
        invoice = self.get_object()
        if invoice.payment_status in ['CANCELLED', 'REFUNDED']:
            return Response(
                {"error": f"Cannot modify discount on a {invoice.payment_status} invoice."},
                status=status.HTTP_400_BAD_REQUEST
            )

        data = request.data
        discount_type = str(data.get('discount_type', 'PERCENT')).upper()
        if discount_type not in ['PERCENT', 'FIXED']:
            discount_type = 'PERCENT'

        try:
            discount_value = Decimal(str(data.get('discount_value', '0.00') or '0.00'))
        except (ValueError, TypeError):
            return Response({"error": "Invalid discount value provided."}, status=status.HTTP_400_BAD_REQUEST)

        if discount_value < Decimal('0.00'):
            return Response({"error": "Discount value cannot be negative."}, status=status.HTTP_400_BAD_REQUEST)

        items = list(invoice.items.all())
        raw_gross = sum((item.unit_selling_price * Decimal(item.quantity)) for item in items)
        subtotal = raw_gross if raw_gross > Decimal('0.00') else invoice.subtotal
        if subtotal <= Decimal('0.00'):
            subtotal = invoice.grand_total

        if discount_type == 'PERCENT':
            if discount_value > Decimal('100.0'):
                return Response({"error": "Discount percentage cannot exceed 100%."}, status=status.HTTP_400_BAD_REQUEST)
            discount_amount = round((subtotal * discount_value) / Decimal('100.0'), 2)
        else:
            if discount_value > subtotal:
                return Response({"error": f"Discount amount (₹{discount_value}) cannot exceed subtotal (₹{subtotal})."}, status=status.HTTP_400_BAD_REQUEST)
            discount_amount = round(discount_value, 2)

        # Proportionally adjust items and their GST
        effective_disc_pct = (discount_amount / subtotal * Decimal('100.0')) if subtotal > Decimal('0.00') else Decimal('0.00')
        discount_ratio = (Decimal('1.0') - (discount_amount / subtotal)) if subtotal > Decimal('0.00') else Decimal('1.0')

        total_tax = Decimal('0.00')
        for item in items:
            item_gross = item.unit_selling_price * Decimal(item.quantity)
            item_net = round(item_gross * discount_ratio, 2)
            item_gst_rate = item.gst_rate or Decimal('12.0')
            item_taxable = round(item_net / (Decimal('1.0') + (item_gst_rate / Decimal('100.0'))), 2)
            item_tax = round(item_net - item_taxable, 2)

            item.discount_percent = round(effective_disc_pct, 2)
            item.tax_amount = item_tax
            item.total_amount = item_net
            item.save()

            total_tax += item_tax

        cgst_amount = round(total_tax / Decimal('2.0'), 2)
        sgst_amount = round(total_tax - cgst_amount, 2)

        net_amount = subtotal - discount_amount
        rounded_total = Decimal(str(round(float(net_amount))))
        round_off = rounded_total - net_amount

        old_grand_total = invoice.grand_total
        old_paid = invoice.amount_paid

        invoice.subtotal = subtotal
        invoice.discount_type = discount_type
        invoice.discount_value = discount_value
        invoice.discount_amount = discount_amount
        invoice.tax_amount = total_tax
        invoice.cgst_amount = cgst_amount
        invoice.sgst_amount = sgst_amount
        invoice.round_off = round_off
        invoice.grand_total = rounded_total

        # Auto-adjust payments if invoice was already paid
        if invoice.payment_status == 'PAID' or old_paid >= old_grand_total:
            invoice.amount_paid = rounded_total
            if invoice.payment_method == 'CASH':
                invoice.cash_amount = rounded_total
                invoice.upi_amount = Decimal('0.00')
                invoice.card_amount = Decimal('0.00')
            elif invoice.payment_method in ['UPI', 'GPAY']:
                invoice.upi_amount = rounded_total
                invoice.cash_amount = Decimal('0.00')
                invoice.card_amount = Decimal('0.00')
            elif invoice.payment_method == 'CARD':
                invoice.card_amount = rounded_total
                invoice.cash_amount = Decimal('0.00')
                invoice.upi_amount = Decimal('0.00')
            elif invoice.payment_method == 'MIXED':
                if old_grand_total > Decimal('0.00'):
                    scale = rounded_total / old_grand_total
                    invoice.cash_amount = round(invoice.cash_amount * scale, 2)
                    invoice.upi_amount = round(invoice.upi_amount * scale, 2)
                    invoice.card_amount = max(Decimal('0.00'), rounded_total - invoice.cash_amount - invoice.upi_amount)
                else:
                    invoice.cash_amount = rounded_total
        elif invoice.payment_method == 'CREDIT' or invoice.payment_status == 'DUE':
            if invoice.customer:
                old_due = max(Decimal('0.00'), old_grand_total - old_paid)
                new_due = max(Decimal('0.00'), rounded_total - invoice.amount_paid)
                invoice.customer.credit_balance = max(Decimal('0.00'), invoice.customer.credit_balance - old_due + new_due)
                invoice.customer.save()

        invoice.save()
        serializer = self.get_serializer(invoice)
        return Response({
            "success": True,
            "message": f"Successfully applied {discount_value}{'%' if discount_type == 'PERCENT' else ' ₹'} discount to Bill #{invoice.invoice_number}. New Grand Total: ₹{rounded_total:.2f}",
            "invoice": serializer.data
        }, status=status.HTTP_200_OK)


class DailyFinanceRecordViewSet(viewsets.ModelViewSet):
    """
    Daily Sales, Cash & UPI Earnings, Outflows, and Firm Balance tracking
    exclusively for the Admin portal.
    """
    queryset = DailyFinanceRecord.objects.all().select_related('created_by')
    serializer_class = DailyFinanceRecordSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['notes']

    def get_queryset(self):
        qs = DailyFinanceRecord.objects.all().select_related('created_by')
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        month = self.request.query_params.get('month')
        year = self.request.query_params.get('year')
        search = self.request.query_params.get('search')

        if month:
            try:
                m_int = int(month)
                y_int = int(year) if year else timezone.now().year
                qs = qs.filter(date__year=y_int, date__month=m_int)
            except (ValueError, TypeError):
                pass
        elif start_date or end_date:
            if start_date:
                qs = qs.filter(date__gte=start_date)
            if end_date:
                qs = qs.filter(date__lte=end_date)

        if search:
            qs = qs.filter(notes__icontains=search)

        return qs.order_by('-date')

    def perform_create(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else None
        daily_record = serializer.save(created_by=user)
        self._sync_vendor_bills(daily_record, user)

    def perform_update(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else None
        daily_record = serializer.save()
        self._sync_vendor_bills(daily_record, user)

    def _sync_vendor_bills(self, daily_record, user):
        """
        Auto-sync vendor line items from daily register to VendorBill:
        - CREDIT -> Created or updated as PENDING wholesale credit bills with due dates & remaining days.
        - CASH / UPI -> Created or updated as PAID / CLEARED bills.
        """
        details = daily_record.payment_details or []
        for idx, item in enumerate(details):
            item_type = str(item.get('type', '')).upper()
            if item_type in ['VENDOR', 'SUPPLIER']:
                recipient = (item.get('recipient') or '').strip()
                if not recipient:
                    continue
                try:
                    amt = Decimal(str(item.get('amount', '0.00')))
                except Exception:
                    amt = Decimal('0.00')
                if amt <= Decimal('0.00'):
                    continue

                mode = str(item.get('payment_mode', 'CASH')).upper()
                raw_note = str(item.get('note') or item.get('bill_number') or '').strip()
                bill_number = raw_note if raw_note else f"BILL-{daily_record.date.strftime('%Y%m%d')}-{idx+1}"
                credit_days = int(item.get('credit_days') or 21)
                
                due_date_str = item.get('due_date')
                if due_date_str:
                    try:
                        due_date_val = datetime.strptime(due_date_str, '%Y-%m-%d').date()
                    except ValueError:
                        due_date_val = daily_record.date + timedelta(days=credit_days)
                else:
                    due_date_val = daily_record.date + timedelta(days=credit_days)

                bill = VendorBill.objects.filter(supplier_name__iexact=recipient, bill_number=bill_number).first()
                if not bill:
                    bill = VendorBill(
                        supplier_name=recipient,
                        bill_number=bill_number,
                        bill_date=daily_record.date,
                        credit_days=credit_days,
                        due_date=due_date_val,
                        total_amount=amt,
                        created_by=user,
                        notes=f"Auto-logged from Daily Register ({daily_record.date})"
                    )
                else:
                    bill.bill_date = daily_record.date
                    bill.credit_days = credit_days
                    bill.due_date = due_date_val
                    bill.total_amount = amt

                if mode == 'CREDIT':
                    bill.paid_amount = Decimal('0.00')
                    bill.status = 'PENDING'
                else:
                    bill.paid_amount = amt
                    bill.status = 'PAID'
                    if not bill.payment_history:
                        bill.payment_history = [{
                            "id": 1,
                            "date": daily_record.date.isoformat(),
                            "amount": float(amt),
                            "payment_mode": mode,
                            "reference_number": "Daily Register Payout",
                            "notes": f"Paid via Daily Register ({mode})",
                            "logged_by": user.username if user else 'Staff',
                            "created_at": timezone.now().isoformat()
                        }]

                bill.save()

    @action(detail=False, methods=['get'], url_path='auto_fetch_pos_day')
    def auto_fetch_pos_day(self, request):
        """
        Auto-aggregate live Cash, UPI, and total sales from POS Invoices for a selected date,
        and look up the previous recorded day's closing balance as the suggested opening balance.
        """
        date_str = request.query_params.get('date')
        if date_str:
            try:
                target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                target_date = date.today()
        else:
            target_date = date.today()

        start_dt = timezone.make_aware(datetime.combine(target_date, datetime.min.time()))
        end_dt = timezone.make_aware(datetime.combine(target_date, datetime.max.time()))

        invoices = Invoice.objects.filter(
            created_at__range=(start_dt, end_dt)
        ).exclude(payment_status__in=['CANCELLED', 'REFUNDED'])

        pos_sales = invoices.aggregate(total=Sum('grand_total'))['total'] or Decimal('0.00')
        pos_cash = invoices.aggregate(total=Sum('cash_amount'))['total'] or Decimal('0.00')
        pos_upi = invoices.aggregate(total=Sum('upi_amount'))['total'] or Decimal('0.00')
        invoices_count = invoices.count()

        # Find previous daily record before this date to carry forward closing balance
        prev_record = DailyFinanceRecord.objects.filter(date__lt=target_date).order_by('-date').first()
        suggested_opening = prev_record.closing_balance if prev_record else Decimal('0.00')

        # Check if a record already exists for this date
        existing_record = DailyFinanceRecord.objects.filter(date=target_date).first()
        existing_data = DailyFinanceRecordSerializer(existing_record).data if existing_record else None

        return Response({
            "target_date": target_date.strftime('%Y-%m-%d'),
            "pos_daily_sales": round(float(pos_sales), 2),
            "pos_cash_earned": round(float(pos_cash), 2),
            "pos_upi_earned": round(float(pos_upi), 2),
            "pos_total_earned": round(float(pos_cash + pos_upi), 2),
            "invoices_count": invoices_count,
            "suggested_opening_balance": round(float(suggested_opening), 2),
            "has_existing_record": bool(existing_record),
            "existing_record": existing_data,
        })

    @action(detail=False, methods=['get'], url_path='summary_stats')
    def summary_stats(self, request):
        """
        Overall financial dashboard KPIs:
        - Current Firm Balance
        - All-Time & Monthly Sales, Cash, UPI, Outflows, and Net Profit/Draw
        """
        all_records = DailyFinanceRecord.objects.all().order_by('-date')
        
        # Today's Record
        today_d = date.today()
        today_record = DailyFinanceRecord.objects.filter(date=today_d).first()
        
        # All time sums
        all_time_totals = all_records.aggregate(
            total_sales=Sum('daily_sales'),
            total_cash=Sum('cash_earned'),
            total_upi=Sum('upi_earned'),
            total_earned=Sum('total_earned'),
            total_paid=Sum('total_paid'),
            total_supplier=Sum('supplier_payments'),
            total_staff=Sum('staff_expenses'),
            total_vehicle=Sum('vehicle_expenses'),
            total_expenses=Sum('expenses'),
            total_other_outflow=Sum('other_outflow'),
        )

        # Current Firm Balance is the closing balance of the most recent record
        latest_record = all_records.first()
        current_firm_balance = latest_record.closing_balance if latest_record else Decimal('0.00')

        # Current Month Totals
        cur_year = today_d.year
        cur_month = today_d.month
        month_records = DailyFinanceRecord.objects.filter(date__year=cur_year, date__month=cur_month)
        month_totals = month_records.aggregate(
            month_sales=Sum('daily_sales'),
            month_cash=Sum('cash_earned'),
            month_upi=Sum('upi_earned'),
            month_earned=Sum('total_earned'),
            month_paid=Sum('total_paid'),
            month_supplier=Sum('supplier_payments'),
            month_staff=Sum('staff_expenses'),
            month_vehicle=Sum('vehicle_expenses'),
            month_expenses=Sum('expenses'),
        )

        month_earned = month_totals['month_earned'] or Decimal('0.00')
        month_paid = month_totals['month_paid'] or Decimal('0.00')
        month_net = month_earned - month_paid

        return Response({
            "current_firm_balance": round(float(current_firm_balance), 2),
            "today": {
                "recorded": bool(today_record),
                "date": today_d.strftime('%Y-%m-%d'),
                "daily_sales": round(float(today_record.daily_sales), 2) if today_record else 0.0,
                "cash_earned": round(float(today_record.cash_earned), 2) if today_record else 0.0,
                "upi_earned": round(float(today_record.upi_earned), 2) if today_record else 0.0,
                "total_earned": round(float(today_record.total_earned), 2) if today_record else 0.0,
                "total_paid": round(float(today_record.total_paid), 2) if today_record else 0.0,
                "supplier_payments": round(float(today_record.supplier_payments), 2) if today_record else 0.0,
                "staff_expenses": round(float(today_record.staff_expenses), 2) if today_record else 0.0,
                "vehicle_expenses": round(float(today_record.vehicle_expenses), 2) if today_record else 0.0,
                "expenses": round(float(today_record.expenses), 2) if today_record else 0.0,
                "net_day_change": round(float(today_record.net_day_change), 2) if today_record else 0.0,
                "closing_balance": round(float(today_record.closing_balance), 2) if today_record else 0.0,
            },
            "this_month": {
                "year": cur_year,
                "month": cur_month,
                "month_name": today_d.strftime('%B %Y'),
                "sales": round(float(month_totals['month_sales'] or 0.0), 2),
                "cash_earned": round(float(month_totals['month_cash'] or 0.0), 2),
                "upi_earned": round(float(month_totals['month_upi'] or 0.0), 2),
                "total_earned": round(float(month_earned), 2),
                "total_paid": round(float(month_paid), 2),
                "supplier_paid": round(float(month_totals['month_supplier'] or 0.0), 2),
                "staff_paid": round(float(month_totals['month_staff'] or 0.0), 2),
                "vehicle_paid": round(float(month_totals['month_vehicle'] or 0.0), 2),
                "expenses": round(float(month_totals['month_expenses'] or 0.0), 2),
                "net_change": round(float(month_net), 2),
                "days_count": month_records.count(),
            },
            "all_time": {
                "total_sales": round(float(all_time_totals['total_sales'] or 0.0), 2),
                "cash_earned": round(float(all_time_totals['total_cash'] or 0.0), 2),
                "upi_earned": round(float(all_time_totals['total_upi'] or 0.0), 2),
                "total_earned": round(float(all_time_totals['total_earned'] or 0.0), 2),
                "total_paid": round(float(all_time_totals['total_paid'] or 0.0), 2),
                "supplier_paid": round(float(all_time_totals['total_supplier'] or 0.0), 2),
                "staff_paid": round(float(all_time_totals['total_staff'] or 0.0), 2),
                "vehicle_paid": round(float(all_time_totals['total_vehicle'] or 0.0), 2),
                "expenses": round(float(all_time_totals['total_expenses'] or 0.0), 2),
                "total_days_recorded": all_records.count(),
            }
        })

    @action(detail=False, methods=['get'], url_path='export_excel')
    def export_excel(self, request):
        """
        Download Excel sheet of the Daily Financial Register.
        Supports filtering by month, year, start_date, end_date.
        """
        qs = self.get_queryset().order_by('date')
        
        month = request.query_params.get('month')
        year = request.query_params.get('year')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        filter_info = ""
        if month:
            try:
                m_int = int(month)
                y_int = int(year) if year else timezone.now().year
                month_dt = datetime(y_int, m_int, 1)
                filter_info = f"Month: {month_dt.strftime('%B %Y')}"
                filename = f"TopMedical_DailyFinance_{month_dt.strftime('%b_%Y')}.xlsx"
            except (ValueError, TypeError):
                filter_info = "Current Month"
                filename = f"TopMedical_DailyFinance_{timezone.now().strftime('%Y%m')}.xlsx"
        elif start_date or end_date:
            filter_info = f"Date Range: {start_date or 'Start'} to {end_date or 'Now'}"
            filename = f"TopMedical_DailyFinance_{start_date or 'Start'}_to_{end_date or 'Now'}.xlsx"
        else:
            filter_info = "All Recorded Entries"
            filename = f"TopMedical_DailyFinance_All_{timezone.now().strftime('%Y%m%d')}.xlsx"

        profile = PharmacyProfile.get_settings()
        excel_buffer = generate_daily_finance_excel(
            records_qs=qs,
            profile=profile,
            filter_info=filter_info,
            report_title="DAILY SALES & CASH/UPI FINANCIAL REGISTER"
        )

        response = HttpResponse(
            excel_buffer.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        response['Access-Control-Expose-Headers'] = 'Content-Disposition'
        return response


class VendorBillViewSet(viewsets.ModelViewSet):
    queryset = VendorBill.objects.all()
    serializer_class = VendorBillSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['supplier_name', 'bill_number', 'supplier_phone', 'supplier_gstin', 'notes']
    ordering_fields = ['due_date', 'bill_date', 'total_amount', 'balance_due', 'created_at']
    ordering = ['due_date', '-bill_date']

    def get_queryset(self):
        qs = super().get_queryset()
        supplier_id = self.request.query_params.get('supplier')
        supplier_name = self.request.query_params.get('supplier_name')
        status_filter = self.request.query_params.get('status')
        due_filter = self.request.query_params.get('due_filter') # 'overdue' | 'due_soon'
        is_overdue = self.request.query_params.get('is_overdue')
        due_soon = self.request.query_params.get('due_soon') # e.g. within 7 days
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        search = self.request.query_params.get('search')

        if supplier_id:
            qs = qs.filter(supplier_id=supplier_id)
        if supplier_name:
            qs = qs.filter(supplier_name__icontains=supplier_name)
        if search:
            qs = qs.filter(
                Q(supplier_name__icontains=search) |
                Q(bill_number__icontains=search) |
                Q(supplier_gstin__icontains=search) |
                Q(supplier_phone__icontains=search) |
                Q(notes__icontains=search)
            )

        if status_filter:
            if status_filter == 'PENDING' or status_filter == 'PENDING_DUES':
                qs = qs.filter(paid_amount__lt=F('total_amount'))
            elif status_filter == 'PAID':
                qs = qs.filter(paid_amount__gte=F('total_amount'))
            elif status_filter == 'OVERDUE':
                qs = qs.filter(paid_amount__lt=F('total_amount'), due_date__lt=date.today())
            elif status_filter == 'PARTIAL':
                qs = qs.filter(paid_amount__gt=Decimal('0.00'), paid_amount__lt=F('total_amount'))
            else:
                qs = qs.filter(status=status_filter)

        if due_filter == 'overdue' or is_overdue == 'true':
            qs = qs.filter(paid_amount__lt=F('total_amount'), due_date__lt=date.today())
        elif due_filter == 'due_soon' or due_soon == 'true':
            today = date.today()
            seven_days = today + timedelta(days=7)
            qs = qs.filter(paid_amount__lt=F('total_amount'), due_date__gte=today, due_date__lte=seven_days)

        if start_date:
            qs = qs.filter(bill_date__gte=start_date)
        if end_date:
            qs = qs.filter(bill_date__lte=end_date)
            
        return qs

    def perform_create(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else None
        serializer.save(created_by=user)

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def record_payment(self, request, pk=None):
        """
        Record a partial or full payment against a vendor bill.
        Optional parameter sync_to_daily_accounts (boolean) to simultaneously record this in today's Daily Cash/Accounts outflow.
        """
        bill = self.get_object()
        data = request.data
        
        try:
            pay_amount = Decimal(str(data.get('amount', '0.00')))
        except Exception:
            return Response({"error": "Invalid payment amount."}, status=status.HTTP_400_BAD_REQUEST)
            
        if pay_amount <= Decimal('0.00'):
            return Response({"error": "Payment amount must be greater than zero."}, status=status.HTTP_400_BAD_REQUEST)

        if pay_amount > bill.balance_due:
            return Response(
                {"error": f"Payment amount (₹{pay_amount}) cannot exceed remaining balance due (₹{bill.balance_due})."},
                status=status.HTTP_400_BAD_REQUEST
            )

        pay_mode = str(data.get('payment_mode', 'CASH')).upper()
        if pay_mode not in ['CASH', 'UPI', 'NEFT', 'CHEQUE', 'BANK']:
            pay_mode = 'CASH'

        payment_date_str = data.get('payment_date') or date.today().isoformat()
        try:
            pay_date = datetime.strptime(payment_date_str, '%Y-%m-%d').date()
        except ValueError:
            pay_date = date.today()

        ref_no = str(data.get('reference_number', data.get('reference_no', ''))).strip()
        notes = str(data.get('notes', '')).strip()
        sync_daily = bool(data.get('sync_to_daily_accounts', True))

        # 1. Update bill's payment history
        history = list(bill.payment_history or [])
        new_pay_id = len(history) + 1
        pay_log = {
            "id": new_pay_id,
            "date": pay_date.isoformat(),
            "payment_date": pay_date.isoformat(),
            "amount": float(pay_amount),
            "payment_mode": pay_mode,
            "reference_number": ref_no,
            "reference_no": ref_no,
            "notes": notes,
            "logged_by": request.user.username if request.user.is_authenticated else 'Staff',
            "created_at": timezone.now().isoformat()
        }
        history.append(pay_log)
        bill.payment_history = history
        bill.paid_amount += pay_amount
        bill.save()

        # 2. Sync to DailyFinanceRecord if requested
        daily_record_synced = None
        sync_status = "Skipped"
        if sync_daily:
            daily_record, _ = DailyFinanceRecord.objects.get_or_create(
                date=pay_date,
                defaults={
                    "opening_balance": Decimal('0.00'),
                    "daily_sales": Decimal('0.00'),
                    "cash_earned": Decimal('0.00'),
                    "upi_earned": Decimal('0.00'),
                    "total_earned": Decimal('0.00'),
                    "total_paid": Decimal('0.00'),
                }
            )

            p_details = list(daily_record.payment_details or [])
            # Append vendor payment line item
            p_details.append({
                "id": int(datetime.now().timestamp() * 1000),
                "type": "VENDOR",
                "recipient": bill.supplier_name,
                "staff_id": "",
                "staff_name": "",
                "charge_code": "",
                "purpose": f"Settlement for Bill #{bill.bill_number}",
                "vehicle_info": "",
                "category": "Wholesale Medicine Supplier",
                "amount": float(pay_amount),
                "payment_mode": pay_mode if pay_mode in ['CASH', 'UPI'] else 'CASH',
                "note": f"Bill #{bill.bill_number} (Ref: {ref_no})" if ref_no else f"Bill #{bill.bill_number}"
            })
            daily_record.payment_details = p_details

            # Re-sum supplier_payments & total_paid
            daily_record.supplier_payments = sum(
                Decimal(str(p.get('amount', 0.0)))
                for p in p_details
                if p.get('type') == 'VENDOR'
            )
            daily_record.total_paid = sum(
                Decimal(str(p.get('amount', 0.0)))
                for p in p_details
            )
            daily_record.save()
            daily_record_synced = daily_record.id
            sync_status = "Synced"

        serializer = self.get_serializer(bill)
        return Response({
            "message": f"Successfully recorded payment of ₹{pay_amount:.2f} for {bill.supplier_name}.",
            "bill": serializer.data,
            "daily_record_id": daily_record_synced,
            "sync_status": sync_status
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """
        Aggregate summary metrics for vendor bills & credit dues.
        """
        today = date.today()
        seven_days = today + timedelta(days=7)

        all_bills = list(VendorBill.objects.all())
        total_vendor_bills = len(all_bills)

        total_invoiced_amount = sum((b.total_amount for b in all_bills), Decimal('0.00'))
        total_paid_to_vendors = sum((b.paid_amount for b in all_bills), Decimal('0.00'))
        total_pending_due = sum((b.balance_due for b in all_bills), Decimal('0.00'))

        paid_bills_count = sum(1 for b in all_bills if b.balance_due == Decimal('0.00'))
        pending_bills_count = sum(1 for b in all_bills if b.balance_due > Decimal('0.00'))

        overdue_bills = [b for b in all_bills if b.balance_due > Decimal('0.00') and b.due_date < today]
        overdue_bills_count = len(overdue_bills)
        overdue_amount = sum((b.balance_due for b in overdue_bills), Decimal('0.00'))

        upcoming_due_7days = [b for b in all_bills if b.balance_due > Decimal('0.00') and today <= b.due_date <= seven_days]
        upcoming_due_7days_count = len(upcoming_due_7days)
        upcoming_due_amount = sum((b.balance_due for b in upcoming_due_7days), Decimal('0.00'))

        return Response({
            "total_vendor_bills": total_vendor_bills,
            "total_invoiced_amount": round(float(total_invoiced_amount), 2),
            "total_paid_to_vendors": round(float(total_paid_to_vendors), 2),
            "total_pending_due": round(float(total_pending_due), 2),
            "paid_bills_count": paid_bills_count,
            "pending_bills_count": pending_bills_count,
            "overdue_bills_count": overdue_bills_count,
            "overdue_amount": round(float(overdue_amount), 2),
            "upcoming_due_7days_count": upcoming_due_7days_count,
            "upcoming_due_amount": round(float(upcoming_due_amount), 2),
        })



