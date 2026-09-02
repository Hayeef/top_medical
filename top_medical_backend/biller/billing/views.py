from rest_framework import viewsets, status, filters
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Sum, Count, Q
from django.utils import timezone
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from datetime import datetime, date
from decimal import Decimal
from .models import PharmacyProfile, StaffMember, Doctor, Customer, Invoice, InvoiceItem
from .serializers import (
    PharmacyProfileSerializer, StaffMemberSerializer, DoctorSerializer, CustomerSerializer,
    InvoiceSerializer, InvoiceItemSerializer
)
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

