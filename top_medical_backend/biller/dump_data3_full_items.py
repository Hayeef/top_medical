import os
import sys
import django

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'biller.settings')
django.setup()

from inventory.models import StockMovement, Batch, Medicine, Supplier

def dump_all():
    invoices = [
        ("G.K. Pharma (Inv #58283)", "INV-58283"),
        ("Shakthi Life Lines (Inv #63417)", "INV-63417"),
        ("Kanara Distributors (Inv #KJ2425/79837)", "INV-KJ2425/79837"),
        ("A.K Pharma (Inv #260007300253116)", "INV-260007300253116"),
        ("A.K Pharma (Inv #260007300253258)", "INV-260007300253258"),
        ("Aamish Traders (Inv #194)", "INV-194")
    ]

    total_count = 0
    total_packs = 0

    for title, ref in invoices:
        movs = StockMovement.objects.filter(reference_id=ref).select_related('batch', 'batch__medicine', 'batch__supplier')
        print("=" * 100)
        print(f" {title} - {movs.count()} Items")
        print("=" * 100)
        print(f"{'#':<3} | {'Medicine Name':<32} | {'Batch':<12} | {'Exp':<10} | {'Qty':<4} | {'Pack':<5} | {'Cost':<8} | {'MRP':<8} | {'SP':<8}")
        print("-" * 100)
        
        idx = 1
        for m in movs:
            b = m.batch
            med = b.medicine
            print(f"{idx:<3} | {med.name[:32]:<32} | {b.batch_number:<12} | {str(b.expiry_date):<10} | {m.quantity_packs:<4} | {b.pack_size:<5} | {b.purchase_price:>8.2f} | {b.mrp:>8.2f} | {b.selling_price:>8.2f}")
            total_count += 1
            total_packs += m.quantity_packs
            idx += 1

    print("=" * 100)
    print(f"GRAND TOTAL: {total_count} line items, {total_packs} packs verified in database.")
    print("=" * 100)

if __name__ == '__main__':
    dump_all()
