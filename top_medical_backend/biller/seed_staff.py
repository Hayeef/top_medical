import os
import sys
import django

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'biller.settings')
django.setup()

from billing.models import StaffMember

def seed_staff():
    staff_data = [
        {"name": "Ahmed (Staff 1)", "charge_code": "SC-101", "role": "Senior Pharmacist", "phone": "+91 98451 11001"},
        {"name": "Fatima (Staff 2)", "charge_code": "SC-102", "role": "Cashier & Dispenser", "phone": "+91 98451 11002"},
        {"name": "Bilal (Staff 3)", "charge_code": "SC-103", "role": "Assistant Pharmacist", "phone": "+91 98451 11003"},
    ]

    for s in staff_data:
        obj, created = StaffMember.objects.get_or_create(charge_code=s["charge_code"], defaults=s)
        status_str = "Created" if created else "Exists"
        print(f"[OK] Staff [{obj.charge_code}] {obj.name} - {status_str}")

if __name__ == '__main__':
    seed_staff()
