import os
import sys
from datetime import date
from decimal import Decimal
import django

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'biller.settings')
django.setup()

from inventory.models import Category, Supplier, Medicine, Batch, StockMovement

def add_cepodem():
    print("=" * 70)
    print("ADDING CEPODEM XP 325MG TAB TO INVENTORY")
    print("=" * 70)

    cat_anti, _ = Category.objects.get_or_create(
        name="Antibiotics & Anti-Infectives",
        defaults={"description": "Antibiotics, Anti-fungals, Anti-virals"}
    )

    sup = Supplier.objects.filter(name__icontains="A.K Pharma").first()
    if not sup:
        sup = Supplier.objects.first()

    # 1. Ensure CEPODEM XP 325MG TAB exists
    med, created = Medicine.objects.get_or_create(
        name="CEPODEM XP 325MG TAB",
        defaults={
            "generic_name": "Cefpodoxime Proxetil (200mg) + Clavulanic Acid (125mg)",
            "category": cat_anti,
            "dosage_form": "Tablet",
            "strength": "325mg",
            "manufacturer": "Sun Pharma / Ranbaxy Laboratories Ltd",
            "hsn_code": "30042011",
            "gst_rate": Decimal("5.00"),
            "min_stock_alert": 5,
            "requires_prescription": True,
            "is_active": True
        }
    )

    med.generic_name = "Cefpodoxime Proxetil (200mg) + Clavulanic Acid (125mg)"
    med.category = cat_anti
    med.dosage_form = "Tablet"
    med.strength = "325mg"
    med.manufacturer = "Sun Pharma / Ranbaxy Laboratories Ltd"
    med.hsn_code = "30042011"
    med.gst_rate = Decimal("5.00")
    med.requires_prescription = True
    med.is_active = True
    med.save()

    batch_no = "DFH2176A"
    exp_date = date(2027, 9, 30)
    mrp_val = Decimal("393.00")
    pur_val = Decimal("299.43")
    qty_val = 4
    pack_sz = 10

    batch, b_created = Batch.objects.get_or_create(
        medicine=med,
        batch_number=batch_no,
        defaults={
            "supplier": sup,
            "expiry_date": exp_date,
            "purchase_price": pur_val,
            "mrp": mrp_val,
            "selling_price": mrp_val,
            "pack_size": pack_sz,
            "pack_quantity": qty_val,
            "loose_quantity": 0
        }
    )

    if not b_created:
        batch.pack_quantity = qty_val
        batch.expiry_date = exp_date
        batch.purchase_price = pur_val
        batch.mrp = mrp_val
        batch.selling_price = mrp_val
        batch.pack_size = pack_sz
        batch.supplier = sup
        batch.save()

    StockMovement.objects.create(
        batch=batch,
        movement_type='PURCHASE',
        quantity_packs=qty_val,
        quantity_loose=0,
        reference_id="MANUAL-STOCK-ENTRY",
        notes="Added Cepodem XP 325mg Tab (4 packs stock) to inventory"
    )

    # Also check if CEFODEM-XP exists, update it as alias or sync
    alt_med = Medicine.objects.filter(name="CEFODEM-XP 325MG TAB 10'S").first()
    if alt_med:
        alt_med.generic_name = "Cefpodoxime Proxetil (200mg) + Clavulanic Acid (125mg)"
        alt_med.manufacturer = "Sun Pharma / Ranbaxy Laboratories Ltd"
        alt_med.strength = "325mg"
        alt_med.category = cat_anti
        alt_med.save()

    print(f"[+] Successfully added/updated: {med.name}")
    print(f"    - Category: {med.category.name}")
    print(f"    - Generic: {med.generic_name}")
    print(f"    - Dosage Form: {med.dosage_form} ({med.strength})")
    print(f"    - Manufacturer: {med.manufacturer}")
    print(f"    - HSN Code: {med.hsn_code} | GST: {med.gst_rate}%")
    print(f"    - Batch Number: {batch.batch_number}")
    print(f"    - Expiry Date: {batch.expiry_date}")
    print(f"    - Pack Size: {batch.pack_size} tablets per strip")
    print(f"    - Pack Quantity: {batch.pack_quantity} packs in stock")
    print(f"    - MRP: Rs. {batch.mrp:.2f}")
    print(f"    - Purchase Rate: Rs. {batch.purchase_price:.2f}")
    print(f"    - Selling Price: Rs. {batch.selling_price:.2f}")
    print("=" * 70)

if __name__ == '__main__':
    add_cepodem()
