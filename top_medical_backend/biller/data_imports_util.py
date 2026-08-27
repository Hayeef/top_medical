import os
import sys
import json
import re
from datetime import date, datetime
from decimal import Decimal
import django

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'biller.settings')
django.setup()

from inventory.models import Category, Supplier, Medicine, Batch, StockMovement

def parse_expiry(exp_str):
    if not exp_str:
        return date(2028, 12, 31)
    exp_str = str(exp_str).strip()
    # formats: MM-YY, MM/YY, MM-YYYY, MM/YYYY, YYYY-MM-DD
    if re.match(r'^\d{4}-\d{2}-\d{2}$', exp_str):
        parts = [int(p) for p in exp_str.split('-')]
        return date(parts[0], parts[1], parts[2])
    
    m = re.match(r'^(\d{1,2})[-/](\d{2,4})$', exp_str)
    if m:
        month = int(m.group(1))
        year = int(m.group(2))
        if year < 100:
            year += 2000
        # last day of month
        if month in [1, 3, 5, 7, 8, 10, 12]:
            day = 31
        elif month in [4, 6, 9, 11]:
            day = 30
        else:
            day = 29 if (year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)) else 28
        return date(year, month, day)
    return date(2028, 12, 31)

def parse_pack_size(pack_str):
    if not pack_str:
        return 10
    pack_str = str(pack_str).strip().upper()
    if 'NOS' in pack_str or 'PCS' in pack_str or 'BOTTLE' in pack_str or 'JAR' in pack_str or 'KIT' in pack_str or 'SACH' in pack_str or 'TIN' in pack_str:
        return 1
    m = re.search(r'(\d+)', pack_str)
    if m:
        val = int(m.group(1))
        return val if val > 0 else 1
    return 10

def get_or_create_category(name, desc=""):
    cat, _ = Category.objects.get_or_create(name=name, defaults={"description": desc})
    return cat

def get_or_create_supplier(sup_data):
    gst = (sup_data.get('gstin') or '').strip()[:50]
    name = (sup_data.get('name') or '').strip()[:200]
    contact = (sup_data.get('contact_person') or '').strip()[:100]
    phone = (sup_data.get('phone') or '').strip()[:20]
    email = (sup_data.get('email') or '').strip()
    address = sup_data.get('address') or ''

    sup, _ = Supplier.objects.get_or_create(
        gstin=gst,
        defaults={
            "name": name,
            "contact_person": contact,
            "phone": phone,
            "email": email,
            "address": address
        }
    )
    # Update fields if needed
    sup.name = name
    if address:
        sup.address = address
    if phone:
        sup.phone = phone
    if contact:
        sup.contact_person = contact
    sup.save()
    return sup
