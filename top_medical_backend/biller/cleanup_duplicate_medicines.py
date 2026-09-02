import os
import sys
import django

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'biller.settings')
django.setup()

from django.db.models import Count, functions
from inventory.models import Medicine, Batch, StockMovement
from billing.models import InvoiceItem

def merge_and_cleanup_duplicates():
    print("=" * 80)
    print("MEDICINE CATALOG DEDUPLICATION & MERGE RUNNER")
    print("=" * 80)

    # Find case-insensitive duplicate medicine names
    dupes = (
        Medicine.objects.annotate(lower_name=functions.Lower('name'))
        .values('lower_name')
        .annotate(c=Count('id'))
        .filter(c__gt=1)
    )

    merged_count = 0
    deleted_med_count = 0

    for item in dupes:
        lower_name = item['lower_name']
        matching_meds = list(Medicine.objects.filter(name__iexact=lower_name).order_by('id'))
        if len(matching_meds) < 2:
            continue

        canonical_med = matching_meds[0]
        duplicates = matching_meds[1:]
        print(f"[*] Merging duplicate group for '{canonical_med.name}' (IDs: {[m.id for m in matching_meds]})...")

        for dup in duplicates:
            # Move all batches to canonical_med
            for b in dup.batches.all():
                # Check if canonical_med already has a batch with this batch_number
                existing_batch = canonical_med.batches.filter(batch_number__iexact=b.batch_number).first()
                if existing_batch:
                    existing_batch.pack_quantity += b.pack_quantity
                    existing_batch.loose_quantity += b.loose_quantity
                    existing_batch.save()
                    # Re-point stock movements and invoice items
                    b.movements.all().update(batch=existing_batch)
                    InvoiceItem.objects.filter(batch=b).update(batch=existing_batch, medicine=canonical_med)
                    b.delete()
                else:
                    b.medicine = canonical_med
                    b.save()
                    InvoiceItem.objects.filter(batch=b).update(medicine=canonical_med)

            InvoiceItem.objects.filter(medicine=dup).update(medicine=canonical_med)
            dup.delete()
            deleted_med_count += 1
            merged_count += 1

    print("-" * 80)
    print(f"Successfully merged and eliminated {deleted_med_count} duplicate medicine entries.")
    print(f"Current total medicines in DB: {Medicine.objects.count()}")
    print("=" * 80)

if __name__ == '__main__':
    merge_and_cleanup_duplicates()
