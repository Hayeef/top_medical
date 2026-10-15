import os
import sys
import django
from decimal import Decimal

# Configure Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'biller.settings')
django.setup()

from django.db import transaction
from django.db.models import Q, Sum
from inventory.models import Medicine, Category
from billing.models import Invoice, InvoiceItem

def run_tax_migration():
    print("=" * 65)
    print("TOP MEDICAL PHARMACY - SYSTEM TAX PERCENTAGE UPDATE")
    print("Updating Tax: 5% for Tablets & Medicines, 18% for Cosmetics, 0% for Candies")
    print("=" * 65)

    cosmetic_kws = [
        'FACE WASH', 'FACIAL', 'SOAP', 'SHAMPOO', 'SUNSCREEN', 'HAIR OIL', 
        'TOOTHPASTE', 'DEODORANT', 'BODY WASH', 'LIP BALM', 'LIP CARE', 
        'PERFUME', 'PETROLEUM JELLY', 'VASELINE', 'TALC', 'KAJAL', 'SCRUB', 
        'CONDITIONER', 'BEARD', 'AFTER SHAVE', 'SHAVING', 'AIR FRESHENER', 
        'COLGATE', 'PEPSODENT', 'CLOSEUP', 'SENSODYNE', 'ORAL-B', 'GILLETTE', 
        'CETAPHIL', 'DERMADEW', 'ATOGLA', 'BELLA', 'NAPKIN', 'DIAPER', 
        'PAMPERS', 'MAMYPOKO', 'HIMALAYA BABY', 'BABY WIPES', 'WIPES', 
        'MOISTURIZ', 'MOISTURIS'
    ]

    with transaction.atomic():
        # 1. Classify Medicines
        q_cosm = (
            Q(hsn_code__startswith='33') | 
            Q(hsn_code__startswith='34') | 
            Q(hsn_code__startswith='9619') | 
            Q(hsn_code__startswith='8212') | 
            Q(category__name='Personal Care & Hygiene')
        )
        for kw in cosmetic_kws:
            q_cosm |= Q(name__icontains=kw)

        q_candy = Q(name__icontains='CHOCOLATE') | Q(name__icontains='CANDY')

        cosm_med_ids = set(Medicine.objects.filter(q_cosm).values_list('id', flat=True))
        candy_med_ids = set(Medicine.objects.filter(q_candy).values_list('id', flat=True))

        print(f"\n1. UPDATING MEDICINE CATALOG ({Medicine.objects.count()} total medicines):")
        # Update Cosmetics to 18%
        c_count = Medicine.objects.filter(id__in=cosm_med_ids).update(gst_rate=Decimal('18.00'))
        print(f"   [+] Updated {c_count} Cosmetic products to 18.00% GST")

        # Update Candies to 0%
        cand_count = Medicine.objects.filter(id__in=candy_med_ids).exclude(id__in=cosm_med_ids).update(gst_rate=Decimal('0.00'))
        print(f"   [+] Updated {cand_count} OTC Candy products to 0.00% GST")

        # Update all other tablets and medicines to 5%
        tab_count = Medicine.objects.exclude(id__in=cosm_med_ids).exclude(id__in=candy_med_ids).update(gst_rate=Decimal('5.00'))
        print(f"   [+] Updated {tab_count} Tablets & Medicines to 5.00% GST")

        # 2. Update Previous InvoiceItems using high-speed bulk_update
        print(f"\n2. UPDATING PREVIOUS INVOICE ITEMS ({InvoiceItem.objects.count()} total items):")
        all_items = list(InvoiceItem.objects.select_related('medicine').all())
        items_cosm = 0
        items_cand = 0
        items_tabs = 0

        for item in all_items:
            name_u = item.medicine_name.upper()
            is_candy = (item.medicine_id in candy_med_ids) or ('CHOCOLATE' in name_u) or ('CANDY' in name_u)
            is_cosm = (item.medicine_id in cosm_med_ids) or any(k in name_u for k in cosmetic_kws)

            if is_candy:
                rate = Decimal('0.00')
                items_cand += 1
            elif is_cosm:
                rate = Decimal('18.00')
                items_cosm += 1
            else:
                rate = Decimal('5.00')
                items_tabs += 1

            line_total = item.total_amount
            taxable_base = line_total / (Decimal('1.0') + (rate / Decimal('100.0')))
            new_tax_amt = round(line_total - taxable_base, 2)

            item.gst_rate = rate
            item.tax_amount = new_tax_amt

        InvoiceItem.objects.bulk_update(all_items, ['gst_rate', 'tax_amount'], batch_size=500)
        print(f"   [+] Bulk updated {len(all_items)} Invoice Items in batches:")
        print(f"       - Tablets & Medicines (5%): {items_tabs}")
        print(f"       - Cosmetics (18%): {items_cosm}")
        print(f"       - OTC Candies (0%): {items_cand}")

        # 3. Recalculate Previous Invoices using high-speed bulk_update
        print(f"\n3. RECALCULATING ALL PREVIOUS INVOICES ({Invoice.objects.count()} total invoices):")
        all_invoices = list(Invoice.objects.prefetch_related('items').all())
        total_new_tax = Decimal('0.00')

        for inv in all_invoices:
            items_list = list(inv.items.all())
            inv_tax = sum((it.tax_amount or Decimal('0.00')) for it in items_list)
            inv_cgst = round(inv_tax / Decimal('2.0'), 2)
            inv_sgst = round(inv_tax - inv_cgst, 2)

            inv.tax_amount = inv_tax
            inv.cgst_amount = inv_cgst
            inv.sgst_amount = inv_sgst
            total_new_tax += inv_tax

        Invoice.objects.bulk_update(all_invoices, ['tax_amount', 'cgst_amount', 'sgst_amount'], batch_size=500)
        print(f"   [+] Bulk updated tax for {len(all_invoices)} invoices.")
        print(f"   [+] Total Reconciled GST across all invoices: Rs. {total_new_tax:.2f}")

    print("\n" + "=" * 65)
    print("SUCCESS: ALL PREVIOUS BILLS AND PRODUCTS ARE FULLY UPDATED!")
    print("=" * 65)

if __name__ == '__main__':
    run_tax_migration()
