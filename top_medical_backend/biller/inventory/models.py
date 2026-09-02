from django.db import models
from django.utils import timezone
from datetime import date, timedelta
from decimal import Decimal

class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Categories"
        ordering = ['name']

    def __str__(self):
        return self.name


class Supplier(models.Model):
    name = models.CharField(max_length=200)
    contact_person = models.CharField(max_length=100, blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    gstin = models.CharField(max_length=50, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Medicine(models.Model):
    DOSAGE_CHOICES = [
        ('Tablet', 'Tablet'),
        ('Capsule', 'Capsule'),
        ('Syrup', 'Syrup / Suspension'),
        ('Injection', 'Injection'),
        ('Ointment', 'Ointment / Cream / Gel'),
        ('Drops', 'Eye / Ear / Nasal Drops'),
        ('Inhaler', 'Inhaler / Respules'),
        ('Powder', 'Powder / Granules'),
        ('Device', 'Medical Device / Kit'),
        ('Other', 'Other Consumable'),
    ]

    name = models.CharField(max_length=255, db_index=True, help_text="Brand name of the medicine e.g. Augmentin 625 Duo")
    generic_name = models.CharField(max_length=255, blank=True, null=True, db_index=True, help_text="Salt composition e.g. Amoxicillin & Clavulanate")
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='medicines')
    dosage_form = models.CharField(max_length=50, choices=DOSAGE_CHOICES, default='Tablet')
    strength = models.CharField(max_length=100, blank=True, null=True, help_text="e.g. 625mg, 500mg, 100ml")
    manufacturer = models.CharField(max_length=150, blank=True, null=True, help_text="e.g. Sun Pharma, Cipla, GSK")
    hsn_code = models.CharField(max_length=50, default="3004", help_text="HSN Code for GST")
    barcode = models.CharField(max_length=100, blank=True, null=True, db_index=True)
    rack_location = models.CharField(max_length=100, blank=True, null=True, help_text="e.g. Rack A-3, Shelf 2, Fridge")
    min_stock_alert = models.IntegerField(default=10, help_text="Low stock alert threshold (in packs)")
    requires_prescription = models.BooleanField(default=False, help_text="Schedule H / H1 Rx requirement")
    gst_rate = models.DecimalField(max_digits=5, decimal_places=2, default=12.00, help_text="GST percentage (e.g. 0, 5, 12, 18)")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.strength or self.dosage_form})"

    @property
    def total_stock_packs(self):
        today = date.today()
        if hasattr(self, '_prefetched_objects_cache') and 'batches' in self._prefetched_objects_cache:
            return sum(b.pack_quantity for b in self._prefetched_objects_cache['batches'] if b.pack_quantity > 0 and b.expiry_date > today)
        return sum(b.pack_quantity for b in self.batches.all() if b.pack_quantity > 0 and b.expiry_date > today)

    @property
    def total_loose_units(self):
        today = date.today()
        if hasattr(self, '_prefetched_objects_cache') and 'batches' in self._prefetched_objects_cache:
            return sum(b.loose_quantity for b in self._prefetched_objects_cache['batches'] if b.expiry_date > today)
        return sum(b.loose_quantity for b in self.batches.all() if b.expiry_date > today)

    @property
    def has_low_stock(self):
        return self.total_stock_packs <= self.min_stock_alert


class Batch(models.Model):
    medicine = models.ForeignKey(Medicine, on_delete=models.CASCADE, related_name='batches')
    supplier = models.ForeignKey(Supplier, on_delete=models.SET_NULL, null=True, blank=True, related_name='batches')
    batch_number = models.CharField(max_length=100, db_index=True)
    expiry_date = models.DateField(db_index=True)
    mfg_date = models.DateField(blank=True, null=True)
    
    purchase_price = models.DecimalField(max_digits=10, decimal_places=2, help_text="Purchase/Cost price per full pack")
    mrp = models.DecimalField(max_digits=10, decimal_places=2, help_text="Maximum Retail Price per full pack")
    selling_price = models.DecimalField(max_digits=10, decimal_places=2, help_text="Selling price per full pack")
    
    pack_size = models.PositiveIntegerField(default=10, help_text="Units per pack (e.g. 10 tablets/strip, 1 bottle)")
    pack_quantity = models.IntegerField(default=0, help_text="Full pack quantity in stock")
    loose_quantity = models.IntegerField(default=0, help_text="Loose units in stock (0 to pack_size-1)")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['expiry_date', 'id']
        verbose_name_plural = "Batches"

    def save(self, *args, **kwargs):
        if self.selling_price is None or self.selling_price == 0:
            self.selling_price = self.mrp
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.medicine.name} - Batch {self.batch_number} (Exp: {self.expiry_date})"

    @property
    def total_units(self):
        return (self.pack_quantity * self.pack_size) + self.loose_quantity

    @property
    def unit_selling_price(self):
        if self.pack_size > 0:
            return round(self.selling_price / Decimal(self.pack_size), 2)
        return self.selling_price

    @property
    def unit_mrp(self):
        if self.pack_size > 0:
            return round(self.mrp / Decimal(self.pack_size), 2)
        return self.mrp

    @property
    def expiry_date_obj(self):
        if isinstance(self.expiry_date, str):
            try:
                return datetime.strptime(self.expiry_date.split('T')[0], '%Y-%m-%d').date()
            except (ValueError, TypeError):
                return date.today() + timedelta(days=730)
        return self.expiry_date or (date.today() + timedelta(days=730))

    @property
    def is_expired(self):
        return self.expiry_date_obj <= date.today()

    @property
    def days_to_expiry(self):
        return (self.expiry_date_obj - date.today()).days

    @property
    def is_near_expiry(self):
        days = self.days_to_expiry
        return 0 < days <= 90


class StockMovement(models.Model):
    MOVEMENT_CHOICES = [
        ('PURCHASE', 'Stock Purchase / Inward'),
        ('SALE', 'Sale Billing'),
        ('RETURN', 'Customer Return'),
        ('VENDOR_RETURN', 'Returned to Vendor'),
        ('ADJUSTMENT', 'Inventory Adjustment'),
        ('EXPIRED_DISCARD', 'Expired Stock Quarantine/Discard'),
    ]

    batch = models.ForeignKey(Batch, on_delete=models.CASCADE, related_name='movements')
    movement_type = models.CharField(max_length=20, choices=MOVEMENT_CHOICES)
    quantity_packs = models.IntegerField(default=0)
    quantity_loose = models.IntegerField(default=0)
    reference_id = models.CharField(max_length=100, blank=True, null=True, help_text="Invoice #, PO # or Reason")
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.movement_type} - {self.batch} ({self.quantity_packs} packs, {self.quantity_loose} units)"
