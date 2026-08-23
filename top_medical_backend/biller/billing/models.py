import uuid
from django.db import models
from django.utils import timezone
from decimal import Decimal
from inventory.models import Medicine, Batch

class PharmacyProfile(models.Model):
    name = models.CharField(max_length=200, default="Top Medical Pharmacy")
    tagline = models.CharField(max_length=255, default="Quality Care & Trusted Medications")
    address = models.TextField(default="Shop 4, City Care Complex, Main Health Road")
    phone = models.CharField(max_length=50, default="+91 98765 43210")
    email = models.EmailField(default="billing@topmedical.com")
    gstin = models.CharField(max_length=50, default="29ABCDE1234F1Z5")
    dl_number_20b = models.CharField(max_length=100, default="KA-B1-20B-123456", help_text="Drug License 20B (Allopathic)")
    dl_number_21b = models.CharField(max_length=100, default="KA-B1-21B-123457", help_text="Drug License 21B")
    fssai_number = models.CharField(max_length=100, blank=True, null=True, default="11223344556677")
    currency_symbol = models.CharField(max_length=10, default="₹")
    invoice_footer_note = models.TextField(
        default="1. Goods once sold will be taken back only within 7 days with original bill.\n"
                "2. Please check expiry dates and doctor's prescription before consuming."
    )
    upi_id = models.CharField(max_length=100, default="topmedical@upi", help_text="UPI VPA ID for dynamic QR payments")
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    @classmethod
    def get_settings(cls):
        obj, _ = cls.objects.get_or_create(id=1)
        return obj


class Doctor(models.Model):
    name = models.CharField(max_length=150)
    specialization = models.CharField(max_length=100, blank=True, null=True, default="General Physician")
    registration_number = models.CharField(max_length=100, blank=True, null=True, help_text="Medical Council Reg No")
    hospital_name = models.CharField(max_length=200, blank=True, null=True)
    phone = models.CharField(max_length=30, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.specialization or 'Doctor'})"


class Customer(models.Model):
    name = models.CharField(max_length=150)
    phone = models.CharField(max_length=30, db_index=True)
    email = models.EmailField(blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    preferred_doctor = models.ForeignKey(Doctor, on_delete=models.SET_NULL, null=True, blank=True)
    credit_balance = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Unpaid dues")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.phone})"


class Invoice(models.Model):
    PAYMENT_METHODS = [
        ('CASH', 'Cash'),
        ('UPI', 'UPI / QR Code'),
        ('CARD', 'Debit / Credit Card'),
        ('CREDIT', 'Due / Credit Account'),
        ('MIXED', 'Split Payment'),
    ]

    PAYMENT_STATUSES = [
        ('PAID', 'Fully Paid'),
        ('PARTIAL', 'Partially Paid'),
        ('DUE', 'Unpaid / Due'),
        ('CANCELLED', 'Cancelled / Void'),
        ('REFUNDED', 'Returned & Refunded'),
    ]

    invoice_number = models.CharField(max_length=64, unique=True, db_index=True)
    customer = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True, blank=True, related_name='invoices')
    customer_name = models.CharField(max_length=150, default="Walk-in Customer")
    customer_phone = models.CharField(max_length=50, blank=True, null=True)
    customer_address = models.CharField(max_length=255, blank=True, null=True)
    
    doctor = models.ForeignKey(Doctor, on_delete=models.SET_NULL, null=True, blank=True, related_name='invoices')
    doctor_name = models.CharField(max_length=150, blank=True, null=True)
    prescription_number = models.CharField(max_length=100, blank=True, null=True)
    
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHODS, default='CASH')
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUSES, default='PAID')
    
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    discount_type = models.CharField(max_length=20, default='PERCENT', choices=[('PERCENT', 'Percentage'), ('FIXED', 'Fixed Amount')])
    discount_value = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, help_text="Total GST (CGST + SGST)")
    cgst_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    sgst_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    
    round_off = models.DecimalField(max_digits=6, decimal_places=2, default=0.00)
    grand_total = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    change_due = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.invoice_number} - {self.customer_name} ({self.grand_total})"

    @classmethod
    def generate_next_invoice_number(cls):
        today_str = timezone.now().strftime('%Y%m%d')
        prefix = f"TMP-{today_str}-"
        last_invoice = cls.objects.filter(invoice_number__startswith=prefix).order_by('-id').first()
        if last_invoice:
            try:
                last_seq = int(last_invoice.invoice_number.split('-')[-1])
                new_seq = last_seq + 1
            except ValueError:
                new_seq = 1
        else:
            new_seq = 1
        return f"{prefix}{new_seq:04d}"


class InvoiceItem(models.Model):
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='items')
    medicine = models.ForeignKey(Medicine, on_delete=models.PROTECT, related_name='sale_items')
    batch = models.ForeignKey(Batch, on_delete=models.PROTECT, related_name='sale_items')
    
    medicine_name = models.CharField(max_length=255)
    batch_number = models.CharField(max_length=100)
    expiry_date = models.DateField()
    hsn_code = models.CharField(max_length=50, default="3004")
    
    is_loose = models.BooleanField(default=False, help_text="True if sold as single units / tablets")
    quantity = models.PositiveIntegerField(default=1)
    pack_size = models.PositiveIntegerField(default=10)
    
    unit_mrp = models.DecimalField(max_digits=10, decimal_places=2)
    unit_selling_price = models.DecimalField(max_digits=10, decimal_places=2)
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    gst_rate = models.DecimalField(max_digits=5, decimal_places=2, default=12.00)
    
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    def __str__(self):
        unit_type = "Units" if self.is_loose else "Packs"
        return f"{self.medicine_name} x {self.quantity} {unit_type} ({self.total_amount})"
