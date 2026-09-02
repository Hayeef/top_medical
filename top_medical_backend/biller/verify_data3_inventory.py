import os
import sys
from decimal import Decimal
import django

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'biller.settings')
django.setup()

from django.db.models import F
from inventory.models import Category, Supplier, Medicine, Batch, StockMovement

def verify_and_report_data3():
    print("=" * 80)
    print("DATA3 INVENTORY AUDIT & VERIFICATION REPORT")
    print("=" * 80)

    invoices = [
        ("G.K. Pharma", "58283", 27),
        ("Shakthi Life Lines", "63417", 40),
        ("Kanara Distributors", "KJ2425/79837", 12),
        ("A.K Pharma", "260007300253116", 11),
        ("A.K Pharma", "260007300253258", 3),
        ("Aamish Traders", "194", 6)
    ]

    total_items = 0
    total_packs = 0
    total_cost = Decimal("0.00")
    total_mrp = Decimal("0.00")

    for sup_name, inv_no, expected_count in invoices:
        ref_id = f"INV-{inv_no}"
        movements = StockMovement.objects.filter(reference_id=ref_id)
        count = movements.count()
        packs = sum(m.quantity_packs for m in movements)
        cost = sum(m.batch.purchase_price * m.quantity_packs for m in movements)
        mrp = sum(m.batch.mrp * m.quantity_packs for m in movements)

        total_items += count
        total_packs += packs
        total_cost += cost
        total_mrp += mrp

        status_str = "[OK]" if count == expected_count else "[MISMATCH]"
        print(f"{status_str} {sup_name:<22} | Inv #{inv_no:<16} | Items: {count:>2}/{expected_count} | Packs: {packs:>2} | Cost: Rs.{cost:>8.2f} | MRP: Rs.{mrp:>8.2f}")

    print("-" * 80)
    print(f"Total Inward Line Items : {total_items} (Expected: 99)")
    print(f"Total Inward Packs      : {total_packs}")
    print(f"Total Cost Value        : Rs. {total_cost:,.2f}")
    print(f"Total MRP Value         : Rs. {total_mrp:,.2f}")

    # Check for any batches with selling_price != mrp
    diff_batches = Batch.objects.exclude(selling_price=F('mrp')).count()
    print(f"Batches where Selling Price != MRP: {diff_batches} (0 expected)")
    print("=" * 80)

if __name__ == '__main__':
    verify_and_report_data3()
