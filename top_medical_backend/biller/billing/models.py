import uuid
from datetime import date, timedelta
from django.db import models
from django.utils import timezone
from decimal import Decimal
from django.contrib.auth.models import User
from inventory.models import Medicine, Batch, Supplier

class PharmacyProfile(models.Model):
    name = models.CharField(max_length=200, default="Top Medical Pharmacy")
    tagline = models.CharField(max_length=255, default="Quality Care & Trusted Medications")
    address = models.TextField(default="3-79/4, R.B.COMPLEX, GROUND FLOOR, UNIVERSITY ROAD, DERALAKATTE, ULLAL TALUK, DERALAKATTE, MANGALORE 575018")
    phone = models.CharField(max_length=50, default="9148240793")
    email = models.EmailField(default="billing@topmedical.com")
    gstin = models.CharField(max_length=50, default="29AJPPU6288G1Z7")
    dl_number_20b = models.CharField(max_length=100, default="KA-MN1-300667", help_text="Drug License (DL No.)")
    dl_number_21b = models.CharField(max_length=100, default="KA-MN1-300667", blank=True, null=True, help_text="Drug License 21B")
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


class StaffMember(models.Model):
    name = models.CharField(max_length=150)
    charge_code = models.CharField(max_length=50, unique=True, db_index=True, help_text="Unique charge code e.g. SC-101")
    role = models.CharField(max_length=100, default="Pharmacist / Cashier")
    phone = models.CharField(max_length=30, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['charge_code']

    def __str__(self):
        return f"[{self.charge_code}] {self.name}"


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
    
    # Staff / Dispenser tracking
    staff = models.ForeignKey(StaffMember, on_delete=models.SET_NULL, null=True, blank=True, related_name='invoices')
    staff_code = models.CharField(max_length=50, blank=True, null=True, db_index=True, help_text="Staff charge code")
    staff_name = models.CharField(max_length=150, blank=True, null=True, default="Staff 1")
    
    customer = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True, blank=True, related_name='invoices')
    customer_name = models.CharField(max_length=150, default="Walk-in Customer", blank=True)
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
    cash_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, help_text="Total cash received for this invoice")
    upi_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, help_text="Total UPI / GPay received for this invoice")
    card_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, help_text="Total Card received for this invoice")
    change_due = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.invoice_number} - {self.customer_name} ({self.grand_total})"

    def save(self, *args, **kwargs):
        # Auto-reconcile cash and upi breakdown if not explicitly supplied
        self.cash_amount = Decimal(str(self.cash_amount or '0.00'))
        self.upi_amount = Decimal(str(self.upi_amount or '0.00'))
        self.card_amount = Decimal(str(self.card_amount or '0.00'))
        self.amount_paid = Decimal(str(self.amount_paid or '0.00'))
        self.grand_total = Decimal(str(self.grand_total or '0.00'))

        if self.cash_amount > Decimal('0.00') and self.upi_amount > Decimal('0.00') and self.payment_method not in ['MIXED', 'SPLIT']:
            self.payment_method = 'MIXED'
        elif self.payment_method == 'CASH' and self.cash_amount == Decimal('0.00') and self.upi_amount == Decimal('0.00') and self.card_amount == Decimal('0.00'):
            self.cash_amount = self.amount_paid if self.amount_paid > Decimal('0.00') else self.grand_total
        elif self.payment_method in ['UPI', 'GPAY'] and self.upi_amount == Decimal('0.00') and self.cash_amount == Decimal('0.00') and self.card_amount == Decimal('0.00'):
            self.upi_amount = self.amount_paid if self.amount_paid > Decimal('0.00') else self.grand_total
        elif self.payment_method == 'CARD' and self.card_amount == Decimal('0.00') and self.cash_amount == Decimal('0.00') and self.upi_amount == Decimal('0.00'):
            self.card_amount = self.amount_paid if self.amount_paid > Decimal('0.00') else self.grand_total

        # Ensure amount_paid covers cash + upi + card if explicitly passed
        total_breakdown = self.cash_amount + self.upi_amount + self.card_amount
        if total_breakdown > Decimal('0.00') and self.amount_paid == Decimal('0.00') and self.payment_method != 'CREDIT':
            self.amount_paid = total_breakdown

        super().save(*args, **kwargs)


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
    
    staff_code = models.CharField(max_length=50, blank=True, null=True)
    staff_name = models.CharField(max_length=150, blank=True, null=True)
    
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


class DailyFinanceRecord(models.Model):
    date = models.DateField(unique=True, db_index=True)
    
    # Sales & Inflow (Strictly Cash and UPI)
    daily_sales = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'), help_text="Total gross sales invoiced/recorded on this day")
    cash_earned = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'), help_text="Total Cash payments received")
    upi_earned = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'), help_text="Total UPI / QR digital payments received")
    total_earned = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'), help_text="Total money earned: Cash + UPI")
    
    # Outflow / Disbursements / Money Paid
    total_paid = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'), help_text="Total money paid out")
    supplier_payments = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'), help_text="Total paid to medicine vendors/wholesalers")
    staff_expenses = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'), help_text="Total staff expenses mapped with charge codes (salary, allowance, tea)")
    vehicle_expenses = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'), help_text="Total delivery vehicle & fuel expenses")
    expenses = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'), help_text="Day-to-day shop operational expenses: rent, electricity, maintenance, etc.")
    other_outflow = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'), help_text="Other miscellaneous expenses or drawings")
    
    # Firm Balances
    opening_balance = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'), help_text="Firm starting balance at opening of day")
    net_day_change = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'), help_text="Net day change: total_earned - total_paid")
    closing_balance = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'), help_text="Closing balance in the firm: opening_balance + total_earned - total_paid")
    
    # Itemized Breakdown
    payment_details = models.JSONField(default=list, blank=True, help_text="Itemized list of payments (vendors, staff with charge codes, vehicle, shop)")
    
    notes = models.TextField(blank=True, null=True, help_text="Daily financial notes / explanations")
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='daily_finance_records')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"Daily Finance ({self.date}): Sales ₹{self.daily_sales} | Inflow ₹{self.total_earned} (Cash ₹{self.cash_earned} + UPI ₹{self.upi_earned}) | Outflow ₹{self.total_paid} | Firm Bal ₹{self.closing_balance}"

    def save(self, *args, **kwargs):
        self.daily_sales = Decimal(str(self.daily_sales or '0.00'))
        self.cash_earned = Decimal(str(self.cash_earned or '0.00'))
        self.upi_earned = Decimal(str(self.upi_earned or '0.00'))
        
        # Total money earned is strictly Cash + UPI
        self.total_earned = self.cash_earned + self.upi_earned
        
        self.supplier_payments = Decimal(str(self.supplier_payments or '0.00'))
        self.staff_expenses = Decimal(str(self.staff_expenses or '0.00'))
        self.vehicle_expenses = Decimal(str(self.vehicle_expenses or '0.00'))
        self.expenses = Decimal(str(self.expenses or '0.00'))
        self.other_outflow = Decimal(str(self.other_outflow or '0.00'))
        
        breakdown_outflow = (
            self.supplier_payments + 
            self.staff_expenses + 
            self.vehicle_expenses + 
            self.expenses + 
            self.other_outflow
        )
        if Decimal(str(self.total_paid or '0.00')) == Decimal('0.00') and breakdown_outflow > Decimal('0.00'):
            self.total_paid = breakdown_outflow
        else:
            self.total_paid = Decimal(str(self.total_paid or '0.00'))
            
        self.opening_balance = Decimal(str(self.opening_balance or '0.00'))
        self.net_day_change = self.total_earned - self.total_paid
        self.closing_balance = self.opening_balance + self.net_day_change
        
        super().save(*args, **kwargs)


class VendorBill(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending Payment'),
        ('PARTIAL', 'Partially Paid'),
        ('PAID', 'Fully Paid'),
        ('OVERDUE', 'Overdue'),
        ('CANCELLED', 'Cancelled / Disputed'),
    ]

    supplier = models.ForeignKey(Supplier, on_delete=models.SET_NULL, null=True, blank=True, related_name='bills')
    supplier_name = models.CharField(max_length=200, db_index=True)
    supplier_phone = models.CharField(max_length=50, blank=True, null=True)
    supplier_gstin = models.CharField(max_length=50, blank=True, null=True)
    
    bill_number = models.CharField(max_length=100, db_index=True, help_text="Supplier invoice/bill number")
    bill_date = models.DateField(default=date.today, db_index=True)
    credit_days = models.PositiveIntegerField(default=21, help_text="Agreed credit period in days")
    due_date = models.DateField(db_index=True, help_text="Payment due date (bill_date + credit_days)")
    
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, help_text="Total bill amount including GST")
    paid_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'), help_text="Total amount paid against this bill")
    balance_due = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'), help_text="Remaining pending balance")
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING', db_index=True)
    
    # Detailed payment audit log
    payment_history = models.JSONField(default=list, blank=True, help_text="List of payment logs: date, amount, mode, ref, notes, logged_in_daily_finance")
    
    notes = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='vendor_bills_created')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['due_date', '-created_at']
        unique_together = [['supplier_name', 'bill_number']]

    def __str__(self):
        return f"{self.supplier_name} - Bill #{self.bill_number} (₹{self.total_amount} | Due: ₹{self.balance_due})"

    @property
    def days_left(self):
        """Returns the number of days remaining until due_date. Negative means overdue."""
        today = date.today()
        if self.due_date:
            return (self.due_date - today).days
        return 0

    @property
    def is_overdue(self):
        return self.status != 'PAID' and self.days_left < 0

    def save(self, *args, **kwargs):
        self.total_amount = Decimal(str(self.total_amount or '0.00'))
        self.paid_amount = Decimal(str(self.paid_amount or '0.00'))
        self.balance_due = max(Decimal('0.00'), self.total_amount - self.paid_amount)
        
        # Calculate due_date if not explicitly provided
        if self.bill_date and not self.due_date:
            self.due_date = self.bill_date + timedelta(days=int(self.credit_days or 21))
        elif self.bill_date and self.due_date and not self.credit_days:
            self.credit_days = max(0, (self.due_date - self.bill_date).days)
            
        # Update status
        if self.balance_due <= Decimal('0.00'):
            self.status = 'PAID'
        elif self.paid_amount > Decimal('0.00'):
            if self.days_left < 0:
                self.status = 'OVERDUE'
            else:
                self.status = 'PARTIAL'
        else:
            if self.days_left < 0:
                self.status = 'OVERDUE'
            else:
                self.status = 'PENDING'
                
        # Auto link supplier object if found by name
        if not self.supplier and self.supplier_name:
            sup = Supplier.objects.filter(name__iexact=self.supplier_name.strip()).first()
            if sup:
                self.supplier = sup
                if not self.supplier_phone and sup.phone:
                    self.supplier_phone = sup.phone
                if not self.supplier_gstin and sup.gstin:
                    self.supplier_gstin = sup.gstin

        super().save(*args, **kwargs)


