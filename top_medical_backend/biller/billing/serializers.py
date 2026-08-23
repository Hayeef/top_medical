from rest_framework import serializers
from django.db import transaction
from decimal import Decimal
from .models import PharmacyProfile, StaffMember, Doctor, Customer, Invoice, InvoiceItem
from inventory.models import Medicine, Batch, StockMovement

class PharmacyProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = PharmacyProfile
        fields = '__all__'


class StaffMemberSerializer(serializers.ModelSerializer):
    invoices_count = serializers.IntegerField(source='invoices.count', read_only=True)

    class Meta:
        model = StaffMember
        fields = ['id', 'name', 'charge_code', 'role', 'phone', 'is_active', 'invoices_count', 'created_at']


class DoctorSerializer(serializers.ModelSerializer):
    invoices_count = serializers.IntegerField(source='invoices.count', read_only=True)

    class Meta:
        model = Doctor
        fields = [
            'id', 'name', 'specialization', 'registration_number', 
            'hospital_name', 'phone', 'email', 'invoices_count', 'created_at'
        ]


class CustomerSerializer(serializers.ModelSerializer):
    invoices_count = serializers.IntegerField(source='invoices.count', read_only=True)
    preferred_doctor_name = serializers.CharField(source='preferred_doctor.name', read_only=True)

    class Meta:
        model = Customer
        fields = [
            'id', 'name', 'phone', 'email', 'address', 
            'preferred_doctor', 'preferred_doctor_name', 
            'credit_balance', 'invoices_count', 'created_at', 'updated_at'
        ]


class InvoiceItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceItem
        fields = [
            'id', 'medicine', 'batch', 'medicine_name', 'batch_number', 
            'expiry_date', 'hsn_code', 'staff_code', 'staff_name', 'is_loose', 'quantity', 'pack_size', 
            'unit_mrp', 'unit_selling_price', 'discount_percent', 
            'gst_rate', 'tax_amount', 'total_amount'
        ]


class InvoiceItemCreateSerializer(serializers.Serializer):
    medicine_id = serializers.IntegerField()
    batch_id = serializers.IntegerField()
    is_loose = serializers.BooleanField(default=False)
    quantity = serializers.IntegerField(min_value=1)
    unit_mrp = serializers.DecimalField(max_digits=10, decimal_places=2)
    unit_selling_price = serializers.DecimalField(max_digits=10, decimal_places=2)
    discount_percent = serializers.DecimalField(max_digits=5, decimal_places=2, default=0.0)
    gst_rate = serializers.DecimalField(max_digits=5, decimal_places=2, default=12.0)


class InvoiceSerializer(serializers.ModelSerializer):
    items = InvoiceItemSerializer(many=True, read_only=True)
    items_data = InvoiceItemCreateSerializer(many=True, write_only=True, required=False)
    customer_details = CustomerSerializer(source='customer', read_only=True)
    doctor_details = DoctorSerializer(source='doctor', read_only=True)
    staff_details = StaffMemberSerializer(source='staff', read_only=True)

    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'staff', 'staff_details', 'staff_code', 'staff_name',
            'customer', 'customer_details', 'customer_name', 'customer_phone', 'customer_address', 
            'doctor', 'doctor_details', 'doctor_name', 'prescription_number', 
            'payment_method', 'payment_status', 'subtotal', 'discount_type', 
            'discount_value', 'discount_amount', 'tax_amount', 'cgst_amount', 
            'sgst_amount', 'round_off', 'grand_total', 'amount_paid', 
            'change_due', 'notes', 'items', 'items_data', 'created_at', 'updated_at'
        ]
        read_only_fields = ['invoice_number', 'created_at', 'updated_at']

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop('items_data', [])
        
        # Auto generate invoice number if not provided
        if not validated_data.get('invoice_number'):
            validated_data['invoice_number'] = Invoice.generate_next_invoice_number()

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

        # Create items and deduct stock from batches
        for item_data in items_data:
            medicine_id = item_data['medicine_id']
            batch_id = item_data['batch_id']
            is_loose = item_data['is_loose']
            qty = item_data['quantity']
            unit_mrp = item_data['unit_mrp']
            unit_sp = item_data['unit_selling_price']
            disc_pct = item_data.get('discount_percent', Decimal('0.0'))
            gst_rate = item_data.get('gst_rate', Decimal('12.0'))

            try:
                batch = Batch.objects.select_for_update().get(id=batch_id, medicine_id=medicine_id)
            except Batch.DoesNotExist:
                raise serializers.ValidationError(f"Batch {batch_id} for medicine {medicine_id} not found.")

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

            # Calculate item line totals
            gross = unit_sp * Decimal(qty)
            disc_amt = (gross * disc_pct) / Decimal('100.0')
            net_before_tax = gross - disc_amt
            tax_amt = (net_before_tax * gst_rate) / Decimal('100.0')
            item_total = net_before_tax + tax_amt

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
                tax_amount=round(tax_amt, 2),
                total_amount=round(item_total, 2)
            )

        # Handle credit account if customer is paying on due
        if invoice.payment_method == 'CREDIT' or invoice.payment_status == 'DUE':
            if customer:
                customer.credit_balance += (invoice.grand_total - invoice.amount_paid)
                customer.save()

        return invoice
