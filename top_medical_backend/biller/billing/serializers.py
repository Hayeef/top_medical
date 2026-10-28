from rest_framework import serializers
from django.db import transaction
from decimal import Decimal
from .models import PharmacyProfile, StaffMember, Doctor, Customer, Invoice, InvoiceItem, DailyFinanceRecord, VendorBill
from inventory.models import Medicine, Batch, StockMovement

class PharmacyProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = PharmacyProfile
        fields = '__all__'


class StaffMemberSimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = StaffMember
        fields = ['id', 'name', 'charge_code', 'role', 'phone']


class StaffMemberSerializer(serializers.ModelSerializer):
    invoices_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = StaffMember
        fields = ['id', 'name', 'charge_code', 'role', 'phone', 'is_active', 'invoices_count', 'created_at']


class DoctorSimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Doctor
        fields = ['id', 'name', 'specialization', 'registration_number', 'phone']


class DoctorSerializer(serializers.ModelSerializer):
    invoices_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Doctor
        fields = [
            'id', 'name', 'specialization', 'registration_number', 
            'hospital_name', 'phone', 'email', 'invoices_count', 'created_at'
        ]


class CustomerSimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ['id', 'name', 'phone', 'email', 'address', 'credit_balance']


class CustomerSerializer(serializers.ModelSerializer):
    invoices_count = serializers.IntegerField(read_only=True, default=0)
    preferred_doctor_name = serializers.CharField(source='preferred_doctor.name', read_only=True, default='')

    class Meta:
        model = Customer
        fields = [
            'id', 'name', 'phone', 'email', 'address', 
            'preferred_doctor', 'preferred_doctor_name', 
            'credit_balance', 'invoices_count', 'created_at', 'updated_at'
        ]


class InvoiceItemSerializer(serializers.ModelSerializer):
    dosage_form = serializers.SerializerMethodField()
    category_name = serializers.SerializerMethodField()

    class Meta:
        model = InvoiceItem
        fields = [
            'id', 'medicine', 'batch', 'medicine_name', 'batch_number', 
            'expiry_date', 'hsn_code', 'staff_code', 'staff_name', 'is_loose', 'quantity', 'pack_size', 
            'unit_mrp', 'unit_selling_price', 'discount_percent', 
            'gst_rate', 'tax_amount', 'total_amount',
            'dosage_form', 'category_name'
        ]

    def get_dosage_form(self, obj):
        try:
            if obj.medicine_id and obj.medicine:
                return obj.medicine.dosage_form or ''
        except Exception:
            pass
        return ''

    def get_category_name(self, obj):
        try:
            if obj.medicine_id and obj.medicine and obj.medicine.category_id:
                return obj.medicine.category.name or ''
        except Exception:
            pass
        return ''



class InvoiceItemCreateSerializer(serializers.Serializer):
    medicine_id = serializers.IntegerField()
    batch_id = serializers.IntegerField()
    is_loose = serializers.BooleanField(default=False)
    quantity = serializers.IntegerField(min_value=1)
    unit_mrp = serializers.DecimalField(max_digits=10, decimal_places=2)
    unit_selling_price = serializers.DecimalField(max_digits=10, decimal_places=2)
    discount_percent = serializers.DecimalField(max_digits=5, decimal_places=2, default=0.0)
    gst_rate = serializers.DecimalField(max_digits=5, decimal_places=2, default=5.0)


def resolve_canonical_gst_rate(medicine, raw_gst=None):
    """
    Strict Statutory GST Tax Slab Assignment:
    - 0.00% for chocolates, candies, and OTC confectionery
    - 5.00% for TABLETS and all pharmaceutical medicines
    - 18.00% for COSMETICS, toiletries, soaps, shampoos, skincare, perfumes, personal care
    """
    if not medicine:
        if raw_gst is not None:
            try:
                rg = Decimal(str(raw_gst))
                if rg in [Decimal('0.00'), Decimal('5.00'), Decimal('18.00')]:
                    return rg
            except Exception:
                pass
        return Decimal('5.00')

    med_name = (medicine.name or '').upper()
    cat_name = (medicine.category.name if medicine.category else '').lower()
    hsn_str = str(medicine.hsn_code or '').strip()
    df_str = (medicine.dosage_form or '').strip()

    # 1. Candies / Chocolates / Confectionery -> 0%
    if any(k in med_name for k in ['CHOCOLATE', 'CANDY', 'TOFFEE', 'GUMMY']) or 'confectionery' in cat_name:
        return Decimal('0.00')

    # Comprehensive pure non-pharma cosmetics & personal care keywords
    cosmetic_non_pharma_kws = [
        'SOAP', 'SHAMPOO', 'HAIR OIL', 'HAIR COLOR', 'TOOTHPASTE', 'TOOTH PASTE', 
        'TOOTHBRUSH', 'TOOTH BRUSH', 'BRUSH', 'RAZOR', 'BLADE', 'CARTRIDGE',
        'DEODORANT', 'BODY WASH', 'PERFUME', 'AIR FRESHENER', 'AFTER SHAVE',
        'SHAVING', 'TALC', 'KAJAL', 'SCRUB', 'CONDITIONER', 'BEARD',
        'COLGATE', 'PEPSODENT', 'CLOSEUP', 'SENSODYNE', 'ORAL-B', 'LISTERINE',
        'MOUTHWASH', 'DIAPER', 'PAMPERS', 'MAMYPOKO', 'BABY WIPES', 'WIPES',
        'NAPKIN', 'SANITARY', 'LIP BALM', 'LIP CARE', 'MILD BAR', 'BODY LOTION',
        'HEAD & SHOULDERS', 'PANTENE', 'SUNSILK', 'CLINIC PLUS', 'CLINICAL PLUS',
        'MEERA', 'KARTHIKA', 'LOREAL', 'LORIAL', 'SEBAMED', 'INDULEKHA',
        'LUX', 'LIFEBUOY', 'LIFEBOUY', 'SANTOOR', 'CHANDRIKA', 'PEARS', 'LIRIL',
        'REXONE', 'VASELINE', 'WHISPER', 'SOFY', 'BELLA',
        'FACE WASH', 'FACIAL WASH', 'FOAMING FACE WASH', 'CLEANSER', 'INTIMATE WASH',
        'OLAY', 'PONDS', 'GILLETTE', 'OLD SPICE', 'SUNSCREEN', 'FACIAL', 'MOISTURIZ', 'MOISTURIS'
    ]

    # Strictly medical supply exceptions
    pharma_exceptions = ['STERIPAD', 'WOUND PAD', 'UPADACOL']

    is_pure_cosmetic = any(k in med_name for k in cosmetic_non_pharma_kws)
    if any(k in med_name for k in pharma_exceptions):
        is_pure_cosmetic = False

    if any(c in cat_name for c in ['cosmetic', 'personal care', 'beauty', 'skincare', 'haircare']):
        is_pure_cosmetic = True

    # 2. Tablets Rule: 5% for all medical tablets
    if df_str == 'Tablet' or 'TABLET' in med_name or med_name.endswith(' TAB') or ' TAB ' in med_name or ' TABS' in med_name:
        if is_pure_cosmetic:
            return Decimal('18.00')
        return Decimal('5.00')

    # Ointments, Gels, Suspensions -> 5%
    if df_str in ['Ointment', 'Gel', 'Suspension']:
        if not (is_pure_cosmetic and any(k in med_name for k in ['SOAP', 'SHAMPOO', 'SHAVING', 'RAZOR', 'BLADE', 'OLAY', 'PONDS', 'GILLETTE', 'OLD SPICE'])):
            return Decimal('5.00')
        return Decimal('18.00')

    # Other pharmaceutical dosage forms: Capsule, Syrup, Cream, Drops, Injection, Inhaler, Powder
    if df_str in ['Capsule', 'Syrup', 'Cream', 'Drops', 'Injection', 'Inhaler', 'Powder']:
        if any(k in med_name for k in ['OINTMENT', 'GEL', 'SUSPENSION', 'TABLET', 'CAPSULE', 'CREAM']):
            if not (is_pure_cosmetic and any(k in med_name for k in ['SHAVING', 'SOAP', 'SHAMPOO', 'OLAY', 'PONDS', 'GILLETTE', 'OLD SPICE'])):
                return Decimal('5.00')
        if is_pure_cosmetic:
            return Decimal('18.00')
        return Decimal('5.00')

    # Fallback for cosmetics HSN or categories
    if is_pure_cosmetic or hsn_str.startswith(('33', '34', '9619', '8212')) or 'cosmetic' in cat_name or 'personal care' in cat_name:
        return Decimal('18.00')

    # Explicit 18% in database or request
    if hasattr(medicine, 'gst_rate') and (medicine.gst_rate == Decimal('18.00') or medicine.gst_rate == Decimal('18')):
        return Decimal('18.00')
    if raw_gst is not None:
        try:
            if Decimal(str(raw_gst)) in [Decimal('18.00'), Decimal('18')]:
                return Decimal('18.00')
            if Decimal(str(raw_gst)) in [Decimal('0.00'), Decimal('0')]:
                return Decimal('0.00')
        except Exception:
            pass

    # Default for all pharmaceuticals and medicines -> 5%
    return Decimal('5.00')


class InvoiceSerializer(serializers.ModelSerializer):
    items = InvoiceItemSerializer(many=True, read_only=True)
    items_data = InvoiceItemCreateSerializer(many=True, write_only=True, required=False)
    customer_details = CustomerSimpleSerializer(source='customer', read_only=True)
    doctor_details = DoctorSimpleSerializer(source='doctor', read_only=True)
    staff_details = StaffMemberSimpleSerializer(source='staff', read_only=True)

    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'staff', 'staff_details', 'staff_code', 'staff_name',
            'customer', 'customer_details', 'customer_name', 'customer_phone', 'customer_address', 
            'doctor', 'doctor_details', 'doctor_name', 'prescription_number', 
            'payment_method', 'payment_status', 'subtotal', 'discount_type', 
            'discount_value', 'discount_amount', 'tax_amount', 'cgst_amount', 
            'sgst_amount', 'round_off', 'grand_total', 'amount_paid', 
            'cash_amount', 'upi_amount', 'card_amount',
            'change_due', 'notes', 'items', 'items_data', 'created_at', 'updated_at'
        ]
        read_only_fields = ['invoice_number', 'created_at', 'updated_at']

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop('items_data', [])
        
        # Auto generate invoice number if not provided
        if not validated_data.get('invoice_number'):
            validated_data['invoice_number'] = Invoice.generate_next_invoice_number()

        # Reconcile cash and upi amounts
        pay_method = validated_data.get('payment_method', 'CASH')
        cash_amt = Decimal(str(validated_data.get('cash_amount', '0.00') or '0.00'))
        upi_amt = Decimal(str(validated_data.get('upi_amount', '0.00') or '0.00'))
        card_amt = Decimal(str(validated_data.get('card_amount', '0.00') or '0.00'))
        amt_paid = Decimal(str(validated_data.get('amount_paid', '0.00') or '0.00'))
        gr_total = Decimal(str(validated_data.get('grand_total', '0.00') or '0.00'))

        effective_paid = amt_paid if amt_paid > Decimal('0.00') else gr_total

        if pay_method == 'CASH' and cash_amt == Decimal('0.00') and upi_amt == Decimal('0.00'):
            validated_data['cash_amount'] = effective_paid
            if amt_paid == Decimal('0.00') and validated_data.get('payment_status') != 'DUE':
                validated_data['amount_paid'] = effective_paid
        elif pay_method in ['UPI', 'GPAY'] and upi_amt == Decimal('0.00') and cash_amt == Decimal('0.00'):
            validated_data['payment_method'] = 'UPI'
            validated_data['upi_amount'] = effective_paid
            if amt_paid == Decimal('0.00') and validated_data.get('payment_status') != 'DUE':
                validated_data['amount_paid'] = effective_paid
        elif pay_method == 'CARD' and card_amt == Decimal('0.00') and cash_amt == Decimal('0.00') and upi_amt == Decimal('0.00'):
            validated_data['card_amount'] = effective_paid
            if amt_paid == Decimal('0.00') and validated_data.get('payment_status') != 'DUE':
                validated_data['amount_paid'] = effective_paid
        elif cash_amt > Decimal('0.00') and upi_amt > Decimal('0.00'):
            validated_data['payment_method'] = 'MIXED'
            total_split = cash_amt + upi_amt + card_amt
            if amt_paid == Decimal('0.00'):
                validated_data['amount_paid'] = total_split

        # If customer is selected, ensure customer_name & phone are synced
        customer = validated_data.get('customer')
        if customer:
            if not validated_data.get('customer_name') or validated_data.get('customer_name') == "Walk-in Customer":
                validated_data['customer_name'] = customer.name
            if not validated_data.get('customer_phone'):
                validated_data['customer_phone'] = customer.phone
        elif not validated_data.get('customer_name'):
            validated_data['customer_name'] = "Walk-in Customer"

        # If doctor is selected, sync doctor name
        doctor = validated_data.get('doctor')
        if doctor and not validated_data.get('doctor_name'):
            validated_data['doctor_name'] = doctor.name

        # If staff is selected, sync staff name & code
        staff = validated_data.get('staff')
        if staff:
            validated_data['staff_code'] = staff.charge_code
            validated_data['staff_name'] = staff.name

        staff_code = validated_data.get('staff_code', 'SC-101')
        staff_name = validated_data.get('staff_name', 'Staff 1')

        invoice = Invoice.objects.create(**validated_data)

        # Prepare bill-level discount scaling if applied
        invoice_subtotal = Decimal(str(invoice.subtotal or '0.00'))
        invoice_disc_amt = Decimal(str(invoice.discount_amount or '0.00'))
        bill_disc_ratio = Decimal('1.0')
        if invoice_subtotal > Decimal('0.00') and invoice_disc_amt > Decimal('0.00'):
            bill_disc_ratio = max(Decimal('0.00'), Decimal('1.0') - (invoice_disc_amt / invoice_subtotal))

        total_items_tax = Decimal('0.00')
        raw_items_gross = Decimal('0.00')

        # Create items and deduct stock from batches
        for item_data in items_data:
            medicine_id = item_data['medicine_id']
            batch_id = item_data['batch_id']
            is_loose = item_data['is_loose']
            qty = item_data['quantity']
            unit_mrp = item_data['unit_mrp']
            unit_sp = item_data['unit_selling_price']
            disc_pct = item_data.get('discount_percent', Decimal('0.0'))
            raw_gst = item_data.get('gst_rate')

            try:
                batch = Batch.objects.select_for_update().get(id=batch_id, medicine_id=medicine_id)
            except Batch.DoesNotExist:
                raise serializers.ValidationError(f"Batch {batch_id} for medicine {medicine_id} not found.")

            # Strict statutory canonical GST rate enforcement:
            # 0% for candies/chocolates, 18% for cosmetics/personal care, 5% for tablets & pharmaceutical medicines
            gst_rate = resolve_canonical_gst_rate(batch.medicine, raw_gst)

            # Keep medicine master synchronized
            if batch.medicine and batch.medicine.gst_rate != gst_rate:
                batch.medicine.gst_rate = gst_rate
                batch.medicine.save(update_fields=['gst_rate'])

            # Validate stock availability & deduct
            if not is_loose:
                if batch.pack_quantity < qty:
                    raise serializers.ValidationError(
                        f"Insufficient stock for {batch.medicine.name} (Batch {batch.batch_number}). "
                        f"Available: {batch.pack_quantity} packs, Requested: {qty} packs."
                    )
                batch.pack_quantity -= qty
                stock_packs_deducted = qty
                stock_loose_deducted = 0
            else:
                total_loose_avail = (batch.pack_quantity * batch.pack_size) + batch.loose_quantity
                if total_loose_avail < qty:
                    raise serializers.ValidationError(
                        f"Insufficient loose units for {batch.medicine.name} (Batch {batch.batch_number}). "
                        f"Available: {total_loose_avail} units, Requested: {qty} units."
                    )
                new_total_loose = total_loose_avail - qty
                batch.pack_quantity = new_total_loose // batch.pack_size
                batch.loose_quantity = new_total_loose % batch.pack_size
                stock_packs_deducted = 0
                stock_loose_deducted = qty

            batch.save()

            # Record stock movement
            StockMovement.objects.create(
                batch=batch,
                movement_type='SALE',
                quantity_packs=-stock_packs_deducted,
                quantity_loose=-stock_loose_deducted,
                reference_id=invoice.invoice_number,
                notes=f"Sold by [{staff_code}] {staff_name} to {invoice.customer_name} via {invoice.invoice_number}"
            )

            # Calculate item line totals (MRP / Selling price is inclusive of GST)
            gross = unit_sp * Decimal(qty)
            disc_amt = (gross * disc_pct) / Decimal('100.0')
            line_net_before_bill_disc = gross - disc_amt

            if bill_disc_ratio < Decimal('1.0'):
                item_total = round(line_net_before_bill_disc * bill_disc_ratio, 2)
            else:
                item_total = round(line_net_before_bill_disc, 2)

            taxable_base = round(item_total / (Decimal('1.0') + (gst_rate / Decimal('100.0'))), 2)
            tax_amt = round(item_total - taxable_base, 2)

            InvoiceItem.objects.create(
                invoice=invoice,
                medicine=batch.medicine,
                batch=batch,
                staff_code=staff_code,
                staff_name=staff_name,
                medicine_name=batch.medicine.name,
                batch_number=batch.batch_number,
                expiry_date=batch.expiry_date,
                hsn_code=batch.medicine.hsn_code,
                is_loose=is_loose,
                quantity=qty,
                pack_size=batch.pack_size,
                unit_mrp=unit_mrp,
                unit_selling_price=unit_sp,
                discount_percent=disc_pct,
                gst_rate=gst_rate,
                tax_amount=tax_amt,
                total_amount=item_total
            )

            total_items_tax += tax_amt
            raw_items_gross += gross

        # Re-synchronize invoice tax amounts with the EXACT item totals
        cgst_amt = round(total_items_tax / Decimal('2.0'), 2)
        sgst_amt = round(total_items_tax - cgst_amt, 2)

        invoice.tax_amount = total_items_tax
        invoice.cgst_amount = cgst_amt
        invoice.sgst_amount = sgst_amt
        if raw_items_gross > Decimal('0.00') and (invoice.subtotal == Decimal('0.00') or not invoice.subtotal):
            invoice.subtotal = raw_items_gross
        invoice.save(update_fields=['tax_amount', 'cgst_amount', 'sgst_amount', 'subtotal'])

        # Handle credit account if customer is paying on due
        if invoice.payment_method == 'CREDIT' or invoice.payment_status == 'DUE':
            if customer:
                customer.credit_balance += (invoice.grand_total - invoice.amount_paid)
                customer.save()

        return invoice


class DailyFinanceRecordSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = DailyFinanceRecord
        fields = [
            'id', 'date', 'daily_sales', 'cash_earned', 'upi_earned', 'capital_investment', 'total_earned',
            'total_paid', 'supplier_payments', 'staff_expenses', 'vehicle_expenses', 'expenses', 'other_outflow',
            'opening_balance', 'net_day_change', 'closing_balance',
            'payment_details', 'capital_details', 'notes', 'created_by', 'created_by_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['total_earned', 'net_day_change', 'closing_balance', 'created_at', 'updated_at']

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return 'Admin'


class VendorBillSerializer(serializers.ModelSerializer):
    days_left = serializers.IntegerField(read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = VendorBill
        fields = [
            'id', 'supplier', 'supplier_name', 'supplier_phone', 'supplier_gstin',
            'bill_number', 'bill_date', 'credit_days', 'due_date',
            'total_amount', 'paid_amount', 'balance_due', 'status',
            'days_left', 'is_overdue', 'payment_history', 'notes',
            'created_by', 'created_by_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['balance_due', 'status', 'days_left', 'is_overdue', 'created_at', 'updated_at']

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return 'Admin'


