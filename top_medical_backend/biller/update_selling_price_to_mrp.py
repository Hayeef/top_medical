import os
import sys
import django

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'biller.settings')
django.setup()

from django.db.models import F
from inventory.models import Batch

def update_all_selling_prices_to_mrp():
    print("=" * 70)
    print("UPDATING ALL INVENTORY BATCHES: SELLING PRICE = MRP")
    print("=" * 70)

    total_batches = Batch.objects.count()
    diff_count = Batch.objects.exclude(selling_price=F('mrp')).count()

    print(f"Total batches in database: {total_batches}")
    print(f"Batches where selling_price != mrp: {diff_count}")

    # Update all batches
    updated = Batch.objects.all().update(selling_price=F('mrp'))
    print(f"Updated {updated} batches to have selling_price = mrp.")

    # Verify
    remaining_diff = Batch.objects.exclude(selling_price=F('mrp')).count()
    print(f"Remaining batches where selling_price != mrp: {remaining_diff}")
    print("=" * 70)
    print("[SUCCESS] All inventory selling prices are now strictly equal to MRP!")

if __name__ == '__main__':
    update_all_selling_prices_to_mrp()
