from rest_framework import serializers
from .models import Category, Supplier, Medicine, Batch, StockMovement

class CategorySerializer(serializers.ModelSerializer):
    medicines_count = serializers.IntegerField(source='medicines.count', read_only=True)

    class Meta:
        model = Category
        fields = ['id', 'name', 'description', 'medicines_count', 'created_at']


class SupplierSerializer(serializers.ModelSerializer):
    batches_count = serializers.IntegerField(source='batches.count', read_only=True)

    class Meta:
        model = Supplier
        fields = [
            'id', 'name', 'contact_person', 'phone', 'email', 
            'gstin', 'address', 'balance', 'batches_count', 
            'created_at', 'updated_at'
        ]


class BatchSerializer(serializers.ModelSerializer):
    medicine_name = serializers.CharField(source='medicine.name', read_only=True)
    medicine_generic = serializers.CharField(source='medicine.generic_name', read_only=True)
    dosage_form = serializers.CharField(source='medicine.dosage_form', read_only=True)
    strength = serializers.CharField(source='medicine.strength', read_only=True)
    rack_location = serializers.CharField(source='medicine.rack_location', read_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    
    total_units = serializers.ReadOnlyField()
    unit_selling_price = serializers.ReadOnlyField()
    unit_mrp = serializers.ReadOnlyField()
    is_expired = serializers.ReadOnlyField()
    is_near_expiry = serializers.ReadOnlyField()
    days_to_expiry = serializers.ReadOnlyField()

    class Meta:
        model = Batch
        fields = [
            'id', 'medicine', 'medicine_name', 'medicine_generic', 'dosage_form', 
            'strength', 'rack_location', 'supplier', 'supplier_name', 
            'batch_number', 'expiry_date', 'mfg_date', 
            'purchase_price', 'mrp', 'selling_price', 
            'pack_size', 'pack_quantity', 'loose_quantity', 
            'total_units', 'unit_selling_price', 'unit_mrp', 
            'is_expired', 'is_near_expiry', 'days_to_expiry', 
            'created_at', 'updated_at'
        ]


class MedicineSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    batches = BatchSerializer(many=True, read_only=True)
    total_stock_packs = serializers.ReadOnlyField()
    total_loose_units = serializers.ReadOnlyField()
    has_low_stock = serializers.ReadOnlyField()

    class Meta:
        model = Medicine
        fields = [
            'id', 'name', 'generic_name', 'category', 'category_name', 
            'dosage_form', 'strength', 'manufacturer', 'hsn_code', 
            'barcode', 'rack_location', 'min_stock_alert', 
            'requires_prescription', 'gst_rate', 'is_active', 
            'total_stock_packs', 'total_loose_units', 'has_low_stock', 
            'batches', 'created_at', 'updated_at'
        ]


class StockMovementSerializer(serializers.ModelSerializer):
    batch_number = serializers.CharField(source='batch.batch_number', read_only=True)
    medicine_name = serializers.CharField(source='batch.medicine.name', read_only=True)

    class Meta:
        model = StockMovement
        fields = [
            'id', 'batch', 'batch_number', 'medicine_name', 
            'movement_type', 'quantity_packs', 'quantity_loose', 
            'reference_id', 'notes', 'created_at'
        ]
