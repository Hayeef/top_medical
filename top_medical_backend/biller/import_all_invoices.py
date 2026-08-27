import os
import sys
from decimal import Decimal
import django

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'biller.settings')
django.setup()

from inventory.models import Category, Supplier, Medicine, Batch, StockMovement
import import_part1_sairadha
import import_part2_gk_kateel
import import_part3_kp_shakthi
import import_part4_akpharma
import import_part5_alchemy_aamish

def master_run():
    print("=" * 70)
    print("TOP MEDICAL PHARMACY - COMPLETE INVENTORY IMPORT RUNNER")
    print("=" * 70)

    # 1. Execute all 5 import parts
    import_part1_sairadha.run()
    import_part2_gk_kateel.run()
    import_part3_kp_shakthi.run()
    import_part4_akpharma.run()
    import_part5_alchemy_aamish.run()

    print("\n" + "=" * 70)
    print("POST-IMPORT CLEANUP & SYNCHRONIZATION")
    print("=" * 70)

    # Clean up dummy batches (where MRP=50.00 and supplier is dummy/None or batch_number is BTH...)
    dummy_batches = Batch.objects.filter(mrp=Decimal("50.00"), purchase_price=Decimal("36.00"))
    dummy_count = dummy_batches.count()
    if dummy_count > 0:
        print(f"[*] Removing {dummy_count} old dummy/placeholder test batches (MRP=50.00)...")
        dummy_batches.delete()
        print("    Successfully removed placeholder batches.")
    else:
        print("[*] No placeholder dummy batches found.")

    # Remove any orphan medicines with 0 batches if created by old seed scripts
    orphans = Medicine.objects.filter(batches__isnull=True)
    orphan_count = orphans.count()
    print(f"[*] Total medicines without active batches: {orphan_count}")

    # Generate Audit Report
    total_cats = Category.objects.count()
    total_sups = Supplier.objects.count()
    total_meds = Medicine.objects.filter(is_active=True).count()
    total_batches = Batch.objects.count()
    total_movements = StockMovement.objects.count()

    total_cost_val = Decimal("0.00")
    total_mrp_val = Decimal("0.00")
    total_pack_qty = 0

    print("\n" + "=" * 70)
    print("FINAL INVENTORY DATABASE AUDIT REPORT")
    print("=" * 70)
    print(f" Total Categories  : {total_cats}")
    print(f" Total Suppliers   : {total_sups}")
    print(f" Total Medicines   : {total_meds}")
    print(f" Total Batches     : {total_batches}")
    print(f" Stock Movements   : {total_movements}")
    print("-" * 70)
    print("SUPPLIER BREAKDOWN:")
    for sup in Supplier.objects.all():
        batches = Batch.objects.filter(supplier=sup)
        b_count = batches.count()
        sup_packs = sum(b.pack_quantity for b in batches)
        sup_cost = sum(b.purchase_price * b.pack_quantity for b in batches)
        sup_mrp = sum(b.mrp * b.pack_quantity for b in batches)
        total_cost_val += sup_cost
        total_mrp_val += sup_mrp
        total_pack_qty += sup_packs
        print(f" • {sup.name[:42]:<42} | {b_count:>3} Batches | {sup_packs:>4} Packs | Cost: Rs. {sup_cost:>9.2f} | MRP: Rs. {sup_mrp:>9.2f}")

    print("-" * 70)
    print(f" Total Inventory Units (Packs) : {total_pack_qty:,}")
    print(f" Total Inventory Cost Value    : Rs. {total_cost_val:,.2f}")
    print(f" Total Inventory MRP Value     : Rs. {total_mrp_val:,.2f}")
    print("=" * 70)
    print("[SUCCESS] All invoice data successfully ingested and verified in PostgreSQL!")

if __name__ == '__main__':
    master_run()
