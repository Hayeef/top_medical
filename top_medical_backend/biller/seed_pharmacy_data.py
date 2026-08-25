import os
import sys
import django
from datetime import date, timedelta
from decimal import Decimal

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'biller.settings')
django.setup()

from inventory.models import Category, Supplier, Medicine, Batch, StockMovement
from billing.models import PharmacyProfile, Doctor, Customer, Invoice, InvoiceItem

def seed():
    print("Seeding Top Medical Pharmacy data...")

    # 1. Pharmacy Profile
    profile = PharmacyProfile.get_settings()
    profile.name = "Top Medical Pharmacy"
    profile.tagline = "Healthcare, Wellness & Life Saving Medicines"
    profile.address = "Shop 12-14, Health Plaza, 100 Ft Ring Road, Bengaluru - 560034"
    profile.phone = "+91 98765 43210 / 080-25544332"
    profile.email = "support@topmedicalpharmacy.com"
    profile.gstin = "29AABCU9603R1ZM"
    profile.dl_number_20b = "KA-B1-20B-98765"
    profile.dl_number_21b = "KA-B1-21B-98766"
    profile.fssai_number = "11223344556677"
    profile.currency_symbol = "₹"
    profile.upi_id = "topmedical@upi"
    profile.save()
    print("[OK] Pharmacy Profile updated.")
    # 2. Doctors
    docs_data = [
        {"name": "Dr. Sarah Jenkins", "specialization": "General Physician", "registration_number": "MCI-45892", "hospital_name": "City Care Hospital", "phone": "+91 98111 22334"},
        {"name": "Dr. Rajesh Kumar", "specialization": "Pediatrician", "registration_number": "KMC-78901", "hospital_name": "Apollo Clinic", "phone": "+91 98222 33445"},
        {"name": "Dr. Ananya Sharma", "specialization": "Cardiologist", "registration_number": "DMC-33412", "hospital_name": "Fortis Heart Care", "phone": "+91 98333 44556"},
        {"name": "Dr. Michael Chang", "specialization": "Orthopedic Surgeon", "registration_number": "TMC-99012", "hospital_name": "LifeLine Ortho Clinic", "phone": "+91 98444 55667"},
    ]
    doctors = []
    for d in docs_data:
        doc, _ = Doctor.objects.get_or_create(registration_number=d["registration_number"], defaults=d)
        doctors.append(doc)
    print(f"[OK] {len(doctors)} Doctors created.")

    # 3. Categories
    cat_names = [
        ("Antibiotics", "Broad spectrum and targeted antibiotic drugs"),
        ("Analgesics & Antipyretics", "Pain relief and fever reducers"),
        ("Cardiovascular & Hypertension", "Heart health, blood pressure and cholesterol"),
        ("Gastrointestinal", "Antacids, anti-emetics, proton-pump inhibitors"),
        ("Respiratory & Cold", "Cough syrups, inhalers, bronchodilators"),
        ("Antidiabetic", "Blood sugar management and insulin"),
        ("Dermatology", "Creams, lotions, anti-fungals and skin care"),
        ("Vitamins & Supplements", "Multivitamins, minerals, calcium and immunity boosters"),
        ("Medical Consumables", "Bandages, syringes, surgical tape, masks"),
    ]
    categories = {}
    for name, desc in cat_names:
        cat, _ = Category.objects.get_or_create(name=name, defaults={"description": desc})
        categories[name] = cat
    print(f"[OK] {len(categories)} Categories created.")

    # 4. Suppliers
    suppliers_data = [
        {"name": "Sun Pharma Distributors Ltd", "contact_person": "Vikas Agarwal", "phone": "+91 98711 00112", "email": "supply@sunpharma.example.com", "gstin": "29AAACS1234F1Z1", "balance": Decimal('14500.00')},
        {"name": "Cipla Healthcare Supply", "contact_person": "Ramesh Patel", "phone": "+91 98722 00223", "email": "orders@ciplasupply.example.com", "gstin": "29AAACC5678G2Z2", "balance": Decimal('8200.00')},
        {"name": "Mankind MedLogistics", "contact_person": "Pooja Verma", "phone": "+91 98733 00334", "email": "care@mankindlogistics.example.com", "gstin": "29AAACM9012H3Z3", "balance": Decimal('0.00')},
        {"name": "Abbott Pharma Agency", "contact_person": "Arun Nair", "phone": "+91 98744 00445", "email": "distrib@abbottagency.example.com", "gstin": "29AAACA3456I4Z4", "balance": Decimal('5600.00')},
    ]
    suppliers = []
    for s in suppliers_data:
        sup, _ = Supplier.objects.get_or_create(name=s["name"], defaults=s)
        suppliers.append(sup)
    print(f"[OK] {len(suppliers)} Suppliers created.")

    # 5. Customers
    customers_data = [
        {"name": "Amitabh Roy", "phone": "9845012345", "email": "amitabh.roy@example.com", "address": "#45, 4th Cross, Indiranagar", "preferred_doctor": doctors[0], "credit_balance": Decimal('0.00')},
        {"name": "Priya Sundaram", "phone": "9845023456", "email": "priya.s@example.com", "address": "Flat 202, Green Glen Layout", "preferred_doctor": doctors[1], "credit_balance": Decimal('450.00')},
        {"name": "Kavita Nair", "phone": "9845034567", "email": "kavita.nair@example.com", "address": "#12, 1st Main, Koramangala", "preferred_doctor": doctors[2], "credit_balance": Decimal('0.00')},
        {"name": "John D'Souza", "phone": "9845045678", "email": "john.dsouza@example.com", "address": "#88, Cambridge Road, Ulsoor", "preferred_doctor": doctors[3], "credit_balance": Decimal('1200.00')},
    ]
    customers = []
    for c in customers_data:
        cust, _ = Customer.objects.get_or_create(phone=c["phone"], defaults=c)
        customers.append(cust)
    print(f"[OK] {len(customers)} Customers created.")

    # 6. Medicines & Batches
    today = date.today()
    med_configs = [
        {
            "name": "Augmentin 625 Duo",
            "generic_name": "Amoxicillin (500mg) + Clavulanic Acid (125mg)",
            "category": categories["Antibiotics"],
            "dosage_form": "Tablet",
            "strength": "625mg",
            "manufacturer": "GlaxoSmithKline",
            "hsn_code": "3004",
            "barcode": "890103001001",
            "rack_location": "Rack A-1",
            "min_stock_alert": 10,
            "requires_prescription": True,
            "gst_rate": Decimal('12.00'),
            "batches": [
                {"batch_number": "AG625-24A", "expiry_date": today + timedelta(days=400), "purchase_price": Decimal('140.00'), "mrp": Decimal('205.00'), "selling_price": Decimal('185.00'), "pack_size": 10, "pack_quantity": 45, "loose_quantity": 0, "supplier": suppliers[0]},
                {"batch_number": "AG625-23Z", "expiry_date": today + timedelta(days=45), "purchase_price": Decimal('135.00'), "mrp": Decimal('200.00'), "selling_price": Decimal('170.00'), "pack_size": 10, "pack_quantity": 12, "loose_quantity": 4, "supplier": suppliers[0]},
            ]
        },
        {
            "name": "Dolo 650",
            "generic_name": "Paracetamol / Acetaminophen (650mg)",
            "category": categories["Analgesics & Antipyretics"],
            "dosage_form": "Tablet",
            "strength": "650mg",
            "manufacturer": "Micro Labs Ltd",
            "hsn_code": "3004",
            "barcode": "890103001002",
            "rack_location": "Rack A-2",
            "min_stock_alert": 20,
            "requires_prescription": False,
            "gst_rate": Decimal('12.00'),
            "batches": [
                {"batch_number": "DL650-88", "expiry_date": today + timedelta(days=600), "purchase_price": Decimal('22.00'), "mrp": Decimal('34.50'), "selling_price": Decimal('32.00'), "pack_size": 15, "pack_quantity": 120, "loose_quantity": 7, "supplier": suppliers[1]},
            ]
        },
        {
            "name": "Azithral 500",
            "generic_name": "Azithromycin (500mg)",
            "category": categories["Antibiotics"],
            "dosage_form": "Tablet",
            "strength": "500mg",
            "manufacturer": "Alembic Pharmaceuticals",
            "hsn_code": "3004",
            "barcode": "890103001003",
            "rack_location": "Rack A-3",
            "min_stock_alert": 10,
            "requires_prescription": True,
            "gst_rate": Decimal('12.00'),
            "batches": [
                {"batch_number": "AZ500-112", "expiry_date": today + timedelta(days=320), "purchase_price": Decimal('85.00'), "mrp": Decimal('132.00'), "selling_price": Decimal('120.00'), "pack_size": 5, "pack_quantity": 30, "loose_quantity": 0, "supplier": suppliers[2]},
            ]
        },
        {
            "name": "Pan 40",
            "generic_name": "Pantoprazole (40mg)",
            "category": categories["Gastrointestinal"],
            "dosage_form": "Tablet",
            "strength": "40mg",
            "manufacturer": "Alkem Laboratories",
            "hsn_code": "3004",
            "barcode": "890103001004",
            "rack_location": "Rack B-1",
            "min_stock_alert": 15,
            "requires_prescription": False,
            "gst_rate": Decimal('12.00'),
            "batches": [
                {"batch_number": "PAN-774", "expiry_date": today + timedelta(days=480), "purchase_price": Decimal('95.00'), "mrp": Decimal('155.00'), "selling_price": Decimal('140.00'), "pack_size": 15, "pack_quantity": 60, "loose_quantity": 3, "supplier": suppliers[1]},
            ]
        },
        {
            "name": "Telma 40",
            "generic_name": "Telmisartan (40mg)",
            "category": categories["Cardiovascular & Hypertension"],
            "dosage_form": "Tablet",
            "strength": "40mg",
            "manufacturer": "Glenmark Pharma",
            "hsn_code": "3004",
            "barcode": "890103001005",
            "rack_location": "Rack B-2",
            "min_stock_alert": 15,
            "requires_prescription": True,
            "gst_rate": Decimal('12.00'),
            "batches": [
                {"batch_number": "TLM-40-09", "expiry_date": today + timedelta(days=500), "purchase_price": Decimal('145.00'), "mrp": Decimal('225.00'), "selling_price": Decimal('210.00'), "pack_size": 15, "pack_quantity": 40, "loose_quantity": 0, "supplier": suppliers[0]},
            ]
        },
        {
            "name": "Glycomet GP 1",
            "generic_name": "Metformin (500mg) + Glimepiride (1mg)",
            "category": categories["Antidiabetic"],
            "dosage_form": "Tablet",
            "strength": "500mg+1mg",
            "manufacturer": "USV Pvt Ltd",
            "hsn_code": "3004",
            "barcode": "890103001006",
            "rack_location": "Rack B-3",
            "min_stock_alert": 15,
            "requires_prescription": True,
            "gst_rate": Decimal('12.00'),
            "batches": [
                {"batch_number": "GG1-229", "expiry_date": today + timedelta(days=360), "purchase_price": Decimal('80.00'), "mrp": Decimal('128.00'), "selling_price": Decimal('115.00'), "pack_size": 15, "pack_quantity": 55, "loose_quantity": 5, "supplier": suppliers[2]},
            ]
        },
        {
            "name": "Ascoril LS Syrup",
            "generic_name": "Levosalbutamol + Ambroxol + Guaifenesin",
            "category": categories["Respiratory & Cold"],
            "dosage_form": "Syrup",
            "strength": "100ml",
            "manufacturer": "Glenmark Pharma",
            "hsn_code": "3004",
            "barcode": "890103001007",
            "rack_location": "Rack C-1",
            "min_stock_alert": 8,
            "requires_prescription": False,
            "gst_rate": Decimal('12.00'),
            "batches": [
                {"batch_number": "ASC-LS-100", "expiry_date": today + timedelta(days=280), "purchase_price": Decimal('75.00'), "mrp": Decimal('118.00'), "selling_price": Decimal('110.00'), "pack_size": 1, "pack_quantity": 25, "loose_quantity": 0, "supplier": suppliers[0]},
            ]
        },
        {
            "name": "Betadine 10% Ointment",
            "generic_name": "Povidone Iodine (10% w/w)",
            "category": categories["Dermatology"],
            "dosage_form": "Ointment",
            "strength": "20g",
            "manufacturer": "Win-Medicare",
            "hsn_code": "3004",
            "barcode": "890103001008",
            "rack_location": "Rack C-2",
            "min_stock_alert": 10,
            "requires_prescription": False,
            "gst_rate": Decimal('12.00'),
            "batches": [
                {"batch_number": "BTD-1020", "expiry_date": today + timedelta(days=450), "purchase_price": Decimal('82.00'), "mrp": Decimal('130.00'), "selling_price": Decimal('122.00'), "pack_size": 1, "pack_quantity": 18, "loose_quantity": 0, "supplier": suppliers[3]},
            ]
        },
        {
            "name": "Becosules Z Capsules",
            "generic_name": "Vitamin B-Complex + Vitamin C + Zinc",
            "category": categories["Vitamins & Supplements"],
            "dosage_form": "Capsule",
            "strength": "Strip of 20",
            "manufacturer": "Pfizer Limited",
            "hsn_code": "3004",
            "barcode": "890103001009",
            "rack_location": "Rack D-1",
            "min_stock_alert": 15,
            "requires_prescription": False,
            "gst_rate": Decimal('12.00'),
            "batches": [
                {"batch_number": "BCZ-901", "expiry_date": today + timedelta(days=350), "purchase_price": Decimal('35.00'), "mrp": Decimal('54.00'), "selling_price": Decimal('50.00'), "pack_size": 20, "pack_quantity": 80, "loose_quantity": 12, "supplier": suppliers[3]},
            ]
        },
        {
            "name": "Shelcal 500",
            "generic_name": "Calcium (500mg) + Vitamin D3 (250 IU)",
            "category": categories["Vitamins & Supplements"],
            "dosage_form": "Tablet",
            "strength": "500mg",
            "manufacturer": "Torrent Pharma",
            "hsn_code": "3004",
            "barcode": "890103001010",
            "rack_location": "Rack D-2",
            "min_stock_alert": 15,
            "requires_prescription": False,
            "gst_rate": Decimal('12.00'),
            "batches": [
                # LOW STOCK: only 4 packs in stock (threshold is 15)
                {"batch_number": "SHC-401", "expiry_date": today + timedelta(days=300), "purchase_price": Decimal('80.00'), "mrp": Decimal('131.00'), "selling_price": Decimal('120.00'), "pack_size": 15, "pack_quantity": 4, "loose_quantity": 0, "supplier": suppliers[1]},
            ]
        },
        {
            "name": "Cifran 500",
            "generic_name": "Ciprofloxacin (500mg)",
            "category": categories["Antibiotics"],
            "dosage_form": "Tablet",
            "strength": "500mg",
            "manufacturer": "Sun Pharma",
            "hsn_code": "3004",
            "barcode": "890103001011",
            "rack_location": "Rack A-4",
            "min_stock_alert": 10,
            "requires_prescription": True,
            "gst_rate": Decimal('12.00'),
            "batches": [
                # NEAR EXPIRY: 25 days left
                {"batch_number": "CF500-EXP25", "expiry_date": today + timedelta(days=25), "purchase_price": Decimal('30.00'), "mrp": Decimal('48.00'), "selling_price": Decimal('42.00'), "pack_size": 10, "pack_quantity": 18, "loose_quantity": 2, "supplier": suppliers[0]},
            ]
        },
        {
            "name": "Erythrocin 250 (Expired Stock Demo)",
            "generic_name": "Erythromycin Estolate (250mg)",
            "category": categories["Antibiotics"],
            "dosage_form": "Tablet",
            "strength": "250mg",
            "manufacturer": "Pfizer",
            "hsn_code": "3004",
            "barcode": "890103001012",
            "rack_location": "Quarantine Box Q-1",
            "min_stock_alert": 5,
            "requires_prescription": True,
            "gst_rate": Decimal('12.00'),
            "batches": [
                # EXPIRED: expired 20 days ago
                {"batch_number": "ERY-EXP-OLD", "expiry_date": today - timedelta(days=20), "purchase_price": Decimal('40.00'), "mrp": Decimal('65.00'), "selling_price": Decimal('55.00'), "pack_size": 10, "pack_quantity": 6, "loose_quantity": 0, "supplier": suppliers[3]},
            ]
        },
    ]

    all_created_batches = []
    for med_data in med_configs:
        batches_info = med_data.pop("batches")
        med, _ = Medicine.objects.get_or_create(barcode=med_data["barcode"], defaults=med_data)
        for b_info in batches_info:
            batch, _ = Batch.objects.get_or_create(
                medicine=med,
                batch_number=b_info["batch_number"],
                defaults=b_info
            )
            all_created_batches.append(batch)
            StockMovement.objects.get_or_create(
                batch=batch,
                movement_type='PURCHASE',
                reference_id=f"INIT-{batch.batch_number}",
                defaults={
                    "quantity_packs": batch.pack_quantity,
                    "quantity_loose": batch.loose_quantity,
                    "notes": "Initial inventory seed"
                }
            )

    print(f"[OK] {len(med_configs)} Medicines and {len(all_created_batches)} Batches configured.")

    # 7. Sample Initial Invoices
    inv1 = Invoice.objects.create(
        invoice_number="TMP-20260823-0001",
        customer=customers[0],
        customer_name=customers[0].name,
        customer_phone=customers[0].phone,
        doctor=doctors[0],
        doctor_name=doctors[0].name,
        payment_method="UPI",
        payment_status="PAID",
        subtotal=Decimal('305.00'),
        discount_type="PERCENT",
        discount_value=Decimal('5.00'),
        discount_amount=Decimal('15.25'),
        tax_amount=Decimal('34.77'),
        cgst_amount=Decimal('17.38'),
        sgst_amount=Decimal('17.39'),
        round_off=Decimal('0.48'),
        grand_total=Decimal('325.00'),
        amount_paid=Decimal('325.00'),
        cash_amount=Decimal('0.00'),
        upi_amount=Decimal('325.00'),
        change_due=Decimal('0.00'),
        notes="Rx for viral fever"
    )
    b1 = Batch.objects.get(batch_number="AG625-24A")
    b2 = Batch.objects.get(batch_number="DL650-88")
    
    InvoiceItem.objects.create(
        invoice=inv1,
        medicine=b1.medicine,
        batch=b1,
        medicine_name=b1.medicine.name,
        batch_number=b1.batch_number,
        expiry_date=b1.expiry_date,
        hsn_code=b1.medicine.hsn_code,
        is_loose=False,
        quantity=1,
        pack_size=b1.pack_size,
        unit_mrp=b1.mrp,
        unit_selling_price=b1.selling_price,
        discount_percent=Decimal('5.00'),
        gst_rate=Decimal('12.00'),
        tax_amount=Decimal('21.09'),
        total_amount=Decimal('196.84')
    )
    InvoiceItem.objects.create(
        invoice=inv1,
        medicine=b2.medicine,
        batch=b2,
        medicine_name=b2.medicine.name,
        batch_number=b2.batch_number,
        expiry_date=b2.expiry_date,
        hsn_code=b2.medicine.hsn_code,
        is_loose=False,
        quantity=4,
        pack_size=b2.pack_size,
        unit_mrp=b2.mrp,
        unit_selling_price=b2.selling_price,
        discount_percent=Decimal('5.00'),
        gst_rate=Decimal('12.00'),
        tax_amount=Decimal('13.68'),
        total_amount=Decimal('128.16')
    )

    print("[OK] Sample invoices created.")
    print("Database seeding completed successfully!")

if __name__ == '__main__':
    seed()
