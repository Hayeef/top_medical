import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'biller.settings')
django.setup()

from decimal import Decimal
from inventory.models import Medicine, Batch, Category, Supplier
from rest_framework.test import APIClient

def test_import_logic():
    print("=== Testing Excel Import Deduplication & Stock Increment Logic ===")
    
    client = APIClient()

    # 1. Test existing medicine: CL PLS ANT DNDF 80ML
    cl_pls = Medicine.objects.filter(name__icontains='CL PLS').first()
    initial_qty = cl_pls.batches.first().pack_quantity
    initial_batch_count = cl_pls.batches.count()
    print(f"Initial state for {cl_pls.name}: Batches={initial_batch_count}, Stock={initial_qty}")

    payload1 = {
        "items": [
            {
                "medicine_name": "CL PLS ANT DNDF 80ML",
                "dosage_form": "Tablet",
                "pack_quantity": 2,
                "pack_size": 10,
                "purchase_price": 47.62,
                "mrp": 55.00,
                "selling_price": 55.00,
                "distributor": "SRI KRISHNA AGENCIES",
                "expiry_date": "2029-04-28"
            }
        ]
    }
    res1 = client.post('/api/inventory/medicines/bulk_upload_excel/', payload1, format='json')
    print("Import 1 Response:", res1.data)
    assert res1.status_code == 201

    cl_pls.refresh_from_db()
    after_qty = cl_pls.batches.first().pack_quantity
    after_batch_count = cl_pls.batches.count()
    print(f"After Import for {cl_pls.name}: Batches={after_batch_count}, Stock={after_qty}")
    assert after_batch_count == 1, f"Expected 1 batch, got {after_batch_count}"
    assert after_qty == initial_qty + 2, f"Expected {initial_qty + 2}, got {after_qty}"
    print("PASS: Existing medicine stock incremented without duplicate batch!")

    # 2. Test Out of Stock Medicine Update
    out_of_stock_med, _ = Medicine.objects.get_or_create(
        name="TEST OUT OF STOCK SYRUP 100ML",
        defaults={"dosage_form": "Syrup", "generic_name": "Test Salt"}
    )
    b_zero, _ = Batch.objects.get_or_create(
        medicine=out_of_stock_med,
        batch_number="TEST-OOS-01",
        defaults={
            "expiry_date": "2025-01-01",
            "purchase_price": 20.0,
            "mrp": 40.0,
            "selling_price": 40.0,
            "pack_quantity": 0
        }
    )
    b_zero.pack_quantity = 0
    b_zero.expiry_date = "2025-01-01"
    b_zero.save()

    print(f"Created OOS Medicine: {out_of_stock_med.name}, Stock={b_zero.pack_quantity}, Exp={b_zero.expiry_date}")

    payload_oos = {
        "items": [
            {
                "medicine_name": "TEST OUT OF STOCK SYRUP 100ML",
                "dosage_form": "Syrup",
                "pack_quantity": 15,
                "pack_size": 1,
                "purchase_price": 25.0,
                "mrp": 50.0,
                "selling_price": 50.0,
                "distributor": "Apollo Wholesale",
                "expiry_date": "2030-05-31"
            }
        ]
    }
    res_oos = client.post('/api/inventory/medicines/bulk_upload_excel/', payload_oos, format='json')
    print("OOS Import Response:", res_oos.data)
    assert res_oos.status_code == 201

    out_of_stock_med.refresh_from_db()
    updated_b = out_of_stock_med.batches.first()
    print(f"After Inward: Batches={out_of_stock_med.batches.count()}, Stock={updated_b.pack_quantity}, Exp={updated_b.expiry_date}, Price={updated_b.purchase_price}")
    assert out_of_stock_med.batches.count() == 1, "Duplicate batch created for OOS medicine!"
    assert updated_b.pack_quantity == 15, f"Expected 15, got {updated_b.pack_quantity}"
    assert str(updated_b.expiry_date) == "2030-05-31", "Expiry date not updated on OOS medicine!"
    print("PASS: Out of stock medicine successfully updated with new stock and expiry date!")

    # 3. Test Brand New Medicine Creation & Subsequent Re-import
    new_med_name = "TEST UNIQUE ANTIBIOTIC 500MG"
    Medicine.objects.filter(name=new_med_name).delete()

    payload_new = {
        "items": [
            {
                "medicine_name": new_med_name,
                "dosage_form": "Tablet",
                "pack_quantity": 8,
                "pack_size": 10,
                "purchase_price": 100.0,
                "mrp": 180.0,
                "selling_price": 180.0,
                "distributor": "MedPlus Wholesale",
                "expiry_date": "2029-10-31"
            }
        ]
    }
    res_new = client.post('/api/inventory/medicines/bulk_upload_excel/', payload_new, format='json')
    print("New Medicine Import Response:", res_new.data)
    assert res_new.data['new_medicines_created'] == 1, "Expected 1 new medicine created"

    created_med = Medicine.objects.get(name=new_med_name)
    assert created_med.batches.count() == 1
    assert created_med.batches.first().pack_quantity == 8
    print("PASS: New medicine created with 1 batch and 8 packs.")

    # Re-import same new medicine again with +4 packs
    payload_reimport = {
        "items": [
            {
                "medicine_name": new_med_name,
                "dosage_form": "Tablet",
                "pack_quantity": 4,
                "pack_size": 10,
                "purchase_price": 100.0,
                "mrp": 180.0,
                "selling_price": 180.0,
                "distributor": "MedPlus Wholesale",
                "expiry_date": "2029-10-31"
            }
        ]
    }
    res_re = client.post('/api/inventory/medicines/bulk_upload_excel/', payload_reimport, format='json')
    print("Re-import Response:", res_re.data)
    assert res_re.data['existing_medicines_updated'] == 1

    created_med.refresh_from_db()
    assert created_med.batches.count() == 1, "Duplicate batch created on re-import!"
    assert created_med.batches.first().pack_quantity == 12, f"Expected 12, got {created_med.batches.first().pack_quantity}"
    print("PASS: Re-import correctly incremented stock from 8 to 12 with 0 duplicates!")

    # Cleanup test items
    out_of_stock_med.delete()
    created_med.delete()
    # Reset CL PLS back to 3
    cl_pls_batch = cl_pls.batches.first()
    cl_pls_batch.pack_quantity = 3
    cl_pls_batch.save()

    print("\n=== ALL TESTS PASSED PERFECTLY! ===")

if __name__ == '__main__':
    test_import_logic()
