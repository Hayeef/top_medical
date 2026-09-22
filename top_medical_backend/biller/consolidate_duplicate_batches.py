import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'biller.settings')
django.setup()

from collections import defaultdict
from django.db import transaction
from django.db.models import Count, Case, When, Value, IntegerField
from inventory.models import Medicine, Batch, StockMovement
from billing.models import InvoiceItem

def consolidate_duplicate_batches():
    print("=== Starting Ultra-Fast Batch Deduplication & Consolidation ===")
    
    # 1. Find all medicines with > 1 batch
    meds_with_multi = list(Medicine.objects.annotate(b_count=Count('batches')).filter(b_count__gt=1).values_list('id', flat=True))
    print(f"Total medicines with multiple batches: {len(meds_with_multi)}")
    if not meds_with_multi:
        print("No duplicate batches found.")
        return

    # 2. Fetch all batches for these medicines in 1 single query
    all_batches = list(Batch.objects.filter(medicine_id__in=meds_with_multi).order_by('-expiry_date', '-id'))
    print(f"Total batches retrieved: {len(all_batches)}")

    batches_by_med = defaultdict(list)
    for b in all_batches:
        batches_by_med[b.medicine_id].append(b)

    batches_to_update = []
    secondary_to_primary = {} # {secondary_batch_id: primary_batch_id}
    all_secondary_ids = []

    for med_id, b_list in batches_by_med.items():
        if len(b_list) <= 1:
            continue

        # Choose primary batch: prefer batch with stock > 0, then latest expiry
        primary = None
        for b in b_list:
            if b.pack_quantity > 0:
                primary = b
                break
        if not primary:
            primary = b_list[0]

        secondary = [b for b in b_list if b.id != primary.id]

        add_packs = sum(max(0, b.pack_quantity) for b in secondary)
        add_loose = sum(max(0, b.loose_quantity) for b in secondary)

        for b in secondary:
            if b.purchase_price > 0 and primary.purchase_price == 0:
                primary.purchase_price = b.purchase_price
            if b.mrp > 0 and primary.mrp == 0:
                primary.mrp = b.mrp
            if b.selling_price > 0 and primary.selling_price == 0:
                primary.selling_price = b.selling_price
            if b.supplier_id and not primary.supplier_id:
                primary.supplier_id = b.supplier_id
            if b.expiry_date and b.expiry_date > primary.expiry_date:
                primary.expiry_date = b.expiry_date
            
            secondary_to_primary[b.id] = primary.id
            all_secondary_ids.append(b.id)

        primary.pack_quantity += add_packs
        primary.loose_quantity += add_loose
        batches_to_update.append(primary)

    print(f"Batches to update: {len(batches_to_update)}")
    print(f"Batches to remove: {len(all_secondary_ids)}")

    # 3. Perform bulk database updates with Case/When
    with transaction.atomic():
        if secondary_to_primary:
            when_clauses = [When(batch_id=sec_id, then=Value(prim_id)) for sec_id, prim_id in secondary_to_primary.items()]
            
            # Re-link StockMovements in 1 single bulk query
            sm_updated = StockMovement.objects.filter(batch_id__in=secondary_to_primary.keys()).update(
                batch_id=Case(*when_clauses, output_field=IntegerField())
            )
            print(f"StockMovements re-linked: {sm_updated}")

            # Re-link InvoiceItems in 1 single bulk query
            ii_updated = InvoiceItem.objects.filter(batch_id__in=secondary_to_primary.keys()).update(
                batch_id=Case(*when_clauses, output_field=IntegerField())
            )
            print(f"InvoiceItems re-linked: {ii_updated}")

        # Bulk update primary batches in 1-2 chunks
        Batch.objects.bulk_update(
            batches_to_update, 
            ['pack_quantity', 'loose_quantity', 'purchase_price', 'mrp', 'selling_price', 'expiry_date', 'supplier'],
            batch_size=500
        )

        # Bulk delete secondary batches
        deleted_count, _ = Batch.objects.filter(id__in=all_secondary_ids).delete()

    print(f"=== Successfully Consolidated! Updated {len(batches_to_update)} medicines, removed {deleted_count} duplicate batches ===")

if __name__ == '__main__':
    consolidate_duplicate_batches()
