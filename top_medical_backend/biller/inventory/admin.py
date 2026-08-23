from django.contrib import admin
from .models import Category, Supplier, Medicine, Batch, StockMovement

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'created_at']
    search_fields = ['name']

@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ['name', 'contact_person', 'phone', 'gstin', 'balance']
    search_fields = ['name', 'phone', 'gstin']

class BatchInline(admin.TabularInline):
    model = Batch
    extra = 1

@admin.register(Medicine)
class MedicineAdmin(admin.ModelAdmin):
    list_display = ['name', 'generic_name', 'category', 'dosage_form', 'rack_location', 'min_stock_alert', 'is_active']
    list_filter = ['category', 'dosage_form', 'requires_prescription', 'is_active']
    search_fields = ['name', 'generic_name', 'barcode', 'rack_location']
    inlines = [BatchInline]

@admin.register(Batch)
class BatchAdmin(admin.ModelAdmin):
    list_display = ['medicine', 'batch_number', 'expiry_date', 'pack_quantity', 'loose_quantity', 'mrp', 'selling_price']
    list_filter = ['expiry_date']
    search_fields = ['batch_number', 'medicine__name']

@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = ['batch', 'movement_type', 'quantity_packs', 'quantity_loose', 'reference_id', 'created_at']
    list_filter = ['movement_type', 'created_at']
