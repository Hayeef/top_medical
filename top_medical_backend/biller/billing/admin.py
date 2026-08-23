from django.contrib import admin
from .models import PharmacyProfile, Doctor, Customer, Invoice, InvoiceItem

@admin.register(PharmacyProfile)
class PharmacyProfileAdmin(admin.ModelAdmin):
    list_display = ['name', 'phone', 'email', 'gstin', 'dl_number_20b', 'updated_at']

@admin.register(Doctor)
class DoctorAdmin(admin.ModelAdmin):
    list_display = ['name', 'specialization', 'registration_number', 'phone']
    search_fields = ['name', 'specialization', 'registration_number']

@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ['name', 'phone', 'email', 'credit_balance', 'created_at']
    search_fields = ['name', 'phone']

class InvoiceItemInline(admin.TabularInline):
    model = InvoiceItem
    extra = 0
    readonly_fields = ['medicine', 'batch', 'medicine_name', 'batch_number', 'expiry_date', 'hsn_code', 'is_loose', 'quantity', 'pack_size', 'unit_mrp', 'unit_selling_price', 'discount_percent', 'gst_rate', 'tax_amount', 'total_amount']

@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ['invoice_number', 'customer_name', 'payment_method', 'payment_status', 'grand_total', 'amount_paid', 'created_at']
    list_filter = ['payment_method', 'payment_status', 'created_at']
    search_fields = ['invoice_number', 'customer_name', 'customer_phone']
    inlines = [InvoiceItemInline]
