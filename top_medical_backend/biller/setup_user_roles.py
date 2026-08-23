import os
import sys
import django

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'biller.settings')
django.setup()

from django.contrib.auth.models import User

def setup_users():
    # 1. Admin User (Full Access, Inventory, Purchase Bill Inward, Analytics, Settings)
    admin_email = "admin@topmedical.com"
    admin_user, created_admin = User.objects.get_or_create(username=admin_email, defaults={"email": admin_email, "first_name": "Admin", "last_name": "Manager"})
    admin_user.set_password("AdminTopMedical11@")
    admin_user.is_superuser = True
    admin_user.is_staff = True
    admin_user.is_active = True
    admin_user.save()
    print(f"[OK] Admin User: {admin_email} | Password: AdminTopMedical11@ | Superuser: True")

    # 2. Cashier / Billing Staff User (POS Billing focused, Reprint bills, Logout button)
    cashier_email = "topmedicalnatekal@gmail.com"
    cashier_user, created_cashier = User.objects.get_or_create(username=cashier_email, defaults={"email": cashier_email, "first_name": "Top Medical", "last_name": "Cashier"})
    cashier_user.set_password("Topmedical11@")
    cashier_user.is_superuser = False
    cashier_user.is_staff = False
    cashier_user.is_active = True
    cashier_user.save()
    print(f"[OK] Cashier User: {cashier_email} | Password: Topmedical11@ | Superuser: False")

if __name__ == '__main__':
    setup_users()
