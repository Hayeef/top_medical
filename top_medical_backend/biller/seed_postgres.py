import os
import django
from decimal import Decimal
from datetime import date, timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'biller.settings')
django.setup()

from django.contrib.auth.models import User
from billing.models import PharmacyProfile, StaffMember, Customer, Doctor
from inventory.models import Category, Supplier, Medicine, Batch, StockMovement

def seed():
    print("[*] Seeding Render PostgreSQL Database...")

    # 1. Users
    admin_user, created = User.objects.get_or_create(
        username="admin@topmedical.com",
        defaults={
            "email": "admin@topmedical.com",
            "first_name": "Admin",
            "last_name": "Pharmacist",
            "is_staff": True,
            "is_superuser": True
        }
    )
    admin_user.set_password("AdminTopMedical11@")
    admin_user.is_staff = True
    admin_user.is_superuser = True
    admin_user.save()
    print("  [+] Admin user: admin@topmedical.com / AdminTopMedical11@")

    staff_user, created = User.objects.get_or_create(
        username="topmedicalnatekal@gmail.com",
        defaults={
            "email": "topmedicalnatekal@gmail.com",
            "first_name": "Billing",
            "last_name": "Staff",
            "is_staff": False,
            "is_superuser": False
        }
    )
    staff_user.set_password("Topmedical11@")
    staff_user.is_staff = False
    staff_user.is_superuser = False
    staff_user.save()
    print("  [+] Staff user: topmedicalnatekal@gmail.com / Topmedical11@")

    # 2. Pharmacy Profile
    profile, _ = PharmacyProfile.objects.get_or_create(
        id=1,
        defaults={
            "name": "TOP MEDICAL PHARMACY",
            "tagline": "Retail & Wholesale Dispensing Pharmacy",
            "address": "3-79/4, R.B.COMPLEX, GROUND FLOOR, UNIVERSITY ROAD, DERALAKATTE, ULLAL TALUK, DERALAKATTE, MANGALORE 575018",
            "phone": "9148240793",
            "email": "topmedicalnatekal@gmail.com",
            "gstin": "29AJPPU6288G1Z7",
            "dl_number_20b": "KA-MN1-300667",
            "dl_number_21b": "KA-MN1-300667",
            "upi_id": "topmedical@upi",
            "currency_symbol": "₹",
            "invoice_footer_note": "Thank you for choosing Top Medical Pharmacy. Wishing you good health! Medicines once sold cannot be returned without original bill."
        }
    )
    print("  [+] Pharmacy Profile configured")

    # 3. Staff Charge Codes
    staff_members = [
        {"name": "Ahmed", "charge_code": "SC-101", "role": "Senior Pharmacist", "phone": "+91 98450 11111"},
        {"name": "Fatima", "charge_code": "SC-102", "role": "Cashier & Dispenser", "phone": "+91 98450 22222"},
        {"name": "Bilal", "charge_code": "SC-103", "role": "Assistant Pharmacist", "phone": "+91 98450 33333"},
    ]
    for s in staff_members:
        StaffMember.objects.get_or_create(
            charge_code=s["charge_code"],
            defaults={"name": s["name"], "role": s["role"], "phone": s["phone"], "is_active": True}
        )
    print("  [+] Staff Charge Codes seeded: SC-101, SC-102, SC-103")

    # 4. Categories
    cat_analgesics, _ = Category.objects.get_or_create(name="Analgesics & Antipyretics", defaults={"description": "Pain relief & fever control"})
    cat_antibiotics, _ = Category.objects.get_or_create(name="Antibiotics", defaults={"description": "Bacterial infection treatments"})
    cat_gastro, _ = Category.objects.get_or_create(name="Gastrointestinal", defaults={"description": "Acidity, PPI, digestion"})
    cat_cardiac, _ = Category.objects.get_or_create(name="Cardiovascular", defaults={"description": "Hypertension & heart health"})
    cat_diabetes, _ = Category.objects.get_or_create(name="Diabetes Care", defaults={"description": "Oral hypoglycemics"})
    cat_allergy, _ = Category.objects.get_or_create(name="Antiallergic & Respiratory", defaults={"description": "Cough, cold, antihistamines"})
    print("  [+] Drug Categories seeded")

    # 5. Suppliers
    sup_micro, _ = Supplier.objects.get_or_create(name="Micro Labs Wholesale Distributors", defaults={"contact_person": "Venkatesh", "phone": "+91 98440 55555", "gstin": "29AAACM1234F1Z1"})
    sup_cipla, _ = Supplier.objects.get_or_create(name="Cipla Pharma Logistics", defaults={"contact_person": "Rajesh", "phone": "+91 98440 66666", "gstin": "29AAACC5678K1Z2"})
    sup_sun, _ = Supplier.objects.get_or_create(name="Sun Pharma Direct Agency", defaults={"contact_person": "Arun", "phone": "+91 98440 77777", "gstin": "29AAACS9012M1Z3"})
    print("  [+] Wholesale Suppliers seeded")

    # 6. Doctors & Customers
    Doctor.objects.get_or_create(name="Dr. Mohammed Farhan", defaults={"registration_number": "KMC-45892", "specialization": "General Physician", "hospital_name": "Natekal Health Care", "phone": "+91 98860 11223"})
    Doctor.objects.get_or_create(name="Dr. Ayesha Banu", defaults={"registration_number": "KMC-56711", "specialization": "Pediatrician", "hospital_name": "City Clinic", "phone": "+91 98860 44556"})
    Customer.objects.get_or_create(phone="9876543210", defaults={"name": "Rahul Sharma", "email": "rahul@example.com", "address": "Natekal Junction"})
    Customer.objects.get_or_create(phone="9876500001", defaults={"name": "Fatima Begum", "email": "fatima@example.com", "address": "Derlakatte"})
    print("  [+] Doctors and Customers seeded")

    # 7. Core Medicines & Batches
    medicines_data = [
        {
            "name": "Dolo 650mg Tablet",
            "generic": "Paracetamol 650mg",
            "category": cat_analgesics,
            "form": "Tablet",
            "mfg": "Micro Labs",
            "rack": "Rack A-1",
            "rx": False,
            "batches": [
                {"no": "DL-6524", "exp": "2028-11-30", "sup": sup_micro, "pack_qty": 60, "pack_size": 15, "cost": Decimal("18.50"), "mrp": Decimal("34.50"), "sell": Decimal("30.00")}
            ]
        },
        {
            "name": "Augmentin 625 Duo Tablet",
            "generic": "Amoxicillin 500mg + Clavulanic Acid 125mg",
            "category": cat_antibiotics,
            "form": "Tablet",
            "mfg": "GSK",
            "rack": "Rack B-1",
            "rx": True,
            "batches": [
                {"no": "AG-8821", "exp": "2028-09-30", "sup": sup_cipla, "pack_qty": 35, "pack_size": 10, "cost": Decimal("95.00"), "mrp": Decimal("185.00"), "sell": Decimal("165.00")}
            ]
        },
        {
            "name": "Pan 40 Tablet",
            "generic": "Pantoprazole Sodium 40mg",
            "category": cat_gastro,
            "form": "Tablet",
            "mfg": "Alkem Labs",
            "rack": "Rack A-3",
            "rx": False,
            "batches": [
                {"no": "PN-4011", "exp": "2028-12-31", "sup": sup_sun, "pack_qty": 45, "pack_size": 15, "cost": Decimal("52.00"), "mrp": Decimal("112.00"), "sell": Decimal("98.00")}
            ]
        },
        {
            "name": "Glycomet GP 1 Tablet",
            "generic": "Glimepiride 1mg + Metformin HCl 500mg",
            "category": cat_diabetes,
            "form": "Tablet",
            "mfg": "USV Ltd",
            "rack": "Rack C-1",
            "rx": True,
            "batches": [
                {"no": "GL-1045", "exp": "2028-10-31", "sup": sup_micro, "pack_qty": 40, "pack_size": 15, "cost": Decimal("48.00"), "mrp": Decimal("102.00"), "sell": Decimal("90.00")}
            ]
        },
        {
            "name": "Telma 40 Tablet",
            "generic": "Telmisartan 40mg",
            "category": cat_cardiac,
            "form": "Tablet",
            "mfg": "Glenmark",
            "rack": "Rack C-2",
            "rx": True,
            "batches": [
                {"no": "TL-4099", "exp": "2028-12-31", "sup": sup_sun, "pack_qty": 30, "pack_size": 15, "cost": Decimal("68.00"), "mrp": Decimal("145.00"), "sell": Decimal("130.00")}
            ]
        },
        {
            "name": "Azithral 500mg Tablet",
            "generic": "Azithromycin 500mg",
            "category": cat_antibiotics,
            "form": "Tablet",
            "mfg": "Alembic",
            "rack": "Rack B-2",
            "rx": True,
            "batches": [
                {"no": "AZ-5002", "exp": "2028-08-31", "sup": sup_cipla, "pack_qty": 50, "pack_size": 5, "cost": Decimal("42.00"), "mrp": Decimal("88.00"), "sell": Decimal("78.00")}
            ]
        },
        {
            "name": "Cetzine 10mg Tablet",
            "generic": "Cetirizine HCl 10mg",
            "category": cat_allergy,
            "form": "Tablet",
            "mfg": "Dr Reddys",
            "rack": "Rack A-2",
            "rx": False,
            "batches": [
                {"no": "CT-1088", "exp": "2028-11-30", "sup": sup_micro, "pack_qty": 50, "pack_size": 10, "cost": Decimal("14.00"), "mrp": Decimal("28.00"), "sell": Decimal("24.00")}
            ]
        }
    ]

    for m in medicines_data:
        med, _ = Medicine.objects.get_or_create(
            name=m["name"],
            defaults={
                "generic_name": m["generic"],
                "category": m["category"],
                "dosage_form": m["form"],
                "manufacturer": m["mfg"],
                "rack_location": m["rack"],
                "requires_prescription": m["rx"],
                "min_stock_alert": 10,
                "gst_rate": Decimal("12.0")
            }
        )
        for b in m["batches"]:
            batch, created = Batch.objects.get_or_create(
                medicine=med,
                batch_number=b["no"],
                defaults={
                    "supplier": b["sup"],
                    "expiry_date": b["exp"],
                    "purchase_price": b["cost"],
                    "mrp": b["mrp"],
                    "selling_price": b["sell"],
                    "pack_size": b["pack_size"],
                    "pack_quantity": b["pack_qty"],
                    "loose_quantity": 0
                }
            )
            if created:
                StockMovement.objects.create(
                    batch=batch,
                    movement_type='PURCHASE',
                    quantity_packs=b["pack_qty"],
                    quantity_loose=0,
                    reference_id="INIT-MIGRATE",
                    notes="Initial Stock Population on PostgreSQL"
                )

    print("  [+] Medicines & Batches seeded successfully!")
    print("[SUCCESS] PostgreSQL Initialization complete!")

if __name__ == '__main__':
    seed()
