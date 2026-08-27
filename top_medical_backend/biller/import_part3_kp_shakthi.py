import os
import sys
from decimal import Decimal
from datetime import date
import django

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'biller.settings')
django.setup()

from inventory.models import Category, Supplier, Medicine, Batch, StockMovement
from data_imports_util import parse_expiry, parse_pack_size, get_or_create_category, get_or_create_supplier

def run():
    print("[3/5] Importing K P Associates & Shakthi Life Lines invoices...")

    # 1. K P Associates
    sup_kp = get_or_create_supplier({
        "name": "K P Associates",
        "contact_person": "Managing Partner",
        "phone": "9845011223 / 0824-2456789",
        "email": "kpassociatesmangalore@gmail.com",
        "gstin": "29AAVFK8245J1ZF",
        "address": "Door No. 1-N-12-892/3, Kottara Chowki, Mangalore - 575006 (DL: KA-MN2-20B-259000 / KA-MN2-21B-259001)"
    })

    # 2. Shakthi Life Lines
    sup_shakthi = get_or_create_supplier({
        "name": "Shakthi Life Lines",
        "contact_person": "Sales Executive",
        "phone": "0824-2211758 / 2213358 / 9731984022 / 9844670655",
        "email": "shakthilifelines@gmail.com",
        "gstin": "29ADWFS4792G1Z3",
        "address": "Door No. 25-2-93/1-7, Opp Taj Cycles, Kankanady Bypass Rd, Kankanady, Mangalore 575002 (DL: 20B-KA-MN1-245616 / 21B-KA-MN1-245617)"
    })

    cat_surg = get_or_create_category("Surgical & Medical Consumables", "Bandages, Syringes, Cotton, Tapes, Disposables")
    cat_derma = get_or_create_category("Dermatology & Topicals", "Ointments, Creams, Gels, Soaps, Shampoos")
    cat_resp = get_or_create_category("Respiratory & Inhalers", "Inhalers, Respules, Cough & Asthma")
    cat_pain = get_or_create_category("Analgesics & Pain Management", "Pain relief, Anti-inflammatory, Spasm")
    cat_gastro = get_or_create_category("Gastrointestinal & Digestion", "Antacids, Laxatives, Probiotics")
    cat_cardio = get_or_create_category("Cardiovascular & Hypertension", "Blood pressure, Cardiac, Cholesterol")
    cat_neuro = get_or_create_category("Neurology & Psychiatry", "Anticonvulsants, Antidepressants")
    cat_vit = get_or_create_category("Vitamins & Supplements", "Multivitamins, Calcium, Vitamin D3")
    cat_endo = get_or_create_category("Endocrinology & Thyroid", "Thyroid, Hormones")
    cat_anti = get_or_create_category("Antibiotics & Anti-Infectives", "Antibiotics, Anti-fungals, Anti-virals")

    kp_items = [
        {"name": "JAY COTTON 15G", "cat": cat_surg, "mrp": 25.00, "rate": 14.50, "pack": "1NOS", "qty": 20, "gst": 12.0},
        {"name": "JAY COTTON 30G", "cat": cat_surg, "mrp": 40.00, "rate": 20.00, "pack": "1NOS", "qty": 15, "gst": 12.0},
        {"name": "JAY COTTON 70G", "cat": cat_surg, "mrp": 85.00, "rate": 45.00, "pack": "1NOS", "qty": 10, "gst": 12.0},
        {"name": "JAY COTTON 125G", "cat": cat_surg, "mrp": 145.00, "rate": 80.00, "pack": "1NOS", "qty": 10, "gst": 12.0},
        {"name": "JAY COTTON 200G", "cat": cat_surg, "mrp": 225.00, "rate": 120.00, "pack": "1NOS", "qty": 5, "gst": 12.0},
        {"name": "CIPLADINE OINT 10G", "cat": cat_derma, "mrp": 45.00, "rate": 32.00, "pack": "10GM", "qty": 10, "gst": 12.0},
        {"name": "CIPLADINE OINT 20G", "cat": cat_derma, "mrp": 85.00, "rate": 62.00, "pack": "20GM", "qty": 10, "gst": 12.0},
        {"name": "SURGI SPIRIT 100ML", "cat": cat_surg, "mrp": 45.00, "rate": 25.00, "pack": "100ML", "qty": 10, "gst": 18.0},
        {"name": "STERIPAD 7CM", "cat": cat_surg, "mrp": 15.00, "rate": 8.00, "pack": "1NOS", "qty": 25, "gst": 12.0},
        {"name": "STERIPAD 10CM", "cat": cat_surg, "mrp": 25.00, "rate": 12.00, "pack": "1NOS", "qty": 25, "gst": 12.0},
        {"name": "STERIPAD 15CM", "cat": cat_surg, "mrp": 35.00, "rate": 18.00, "pack": "1NOS", "qty": 25, "gst": 12.0},
        {"name": "HYDROGEN PEROXIDE 100ML", "cat": cat_surg, "mrp": 45.00, "rate": 25.00, "pack": "100ML", "qty": 10, "gst": 12.0},
        {"name": "HYDROGEN PEROXIDE 25ML", "cat": cat_surg, "mrp": 20.00, "rate": 12.00, "pack": "25ML", "qty": 15, "gst": 12.0},
        {"name": "NEVASULFI ARCO POWD 10GM", "cat": cat_derma, "mrp": 45.00, "rate": 32.00, "pack": "10GM", "qty": 10, "gst": 12.0},
        {"name": "REXCOF LS SYP 100ML", "cat": cat_resp, "mrp": 115.00, "rate": 87.62, "pack": "100ML", "qty": 5, "gst": 5.0},
        {"name": "KOFCLEAR LS SYP 100ML", "cat": cat_resp, "mrp": 115.00, "rate": 87.62, "pack": "100ML", "qty": 5, "gst": 5.0},
        {"name": "KOFCLEAR DX PLUS 100ML", "cat": cat_resp, "mrp": 125.00, "rate": 95.24, "pack": "100ML", "qty": 5, "gst": 5.0},
        {"name": "KOFCLEAR SF 100ML", "cat": cat_resp, "mrp": 125.00, "rate": 95.24, "pack": "100ML", "qty": 5, "gst": 5.0},
        {"name": "KOFCLEAR ORANGE 100ML", "cat": cat_resp, "mrp": 115.00, "rate": 87.62, "pack": "100ML", "qty": 5, "gst": 5.0},
        {"name": "OFLOX-OZ SYP 30ML", "cat": cat_anti, "mrp": 65.00, "rate": 49.52, "pack": "30ML", "qty": 5, "gst": 5.0},
        {"name": "K LIFE ADULT DIAPER M", "cat": cat_surg, "mrp": 550.00, "rate": 233.30, "pack": "10NOS", "qty": 3, "gst": 5.0},
        {"name": "K LIFE ADULT DIAPER L", "cat": cat_surg, "mrp": 600.00, "rate": 242.48, "pack": "10NOS", "qty": 3, "gst": 5.0},
        {"name": "K LIFE ADULT DIAPER XL", "cat": cat_surg, "mrp": 615.00, "rate": 252.38, "pack": "10NOS", "qty": 3, "gst": 5.0},
        {"name": "K LIFE ADULT PANTS M", "cat": cat_surg, "mrp": 550.00, "rate": 233.30, "pack": "10NOS", "qty": 3, "gst": 5.0},
        {"name": "K LIFE ADULT PANTS L", "cat": cat_surg, "mrp": 600.00, "rate": 242.48, "pack": "10NOS", "qty": 3, "gst": 5.0},
        {"name": "K LIFE ADULT PANTS XL", "cat": cat_surg, "mrp": 615.00, "rate": 252.38, "pack": "10NOS", "qty": 3, "gst": 5.0},
        {"name": "LYFCARE UNDERPAD 10'S", "cat": cat_surg, "mrp": 450.00, "rate": 210.00, "pack": "10NOS", "qty": 2, "gst": 5.0},
        {"name": "EXAMINATION GLOVES M 100'S", "cat": cat_surg, "mrp": 650.00, "rate": 265.00, "pack": "100NOS", "qty": 2, "gst": 5.0},
        {"name": "3 PLY MASK - BLACK 50'S", "cat": cat_surg, "mrp": 250.00, "rate": 80.00, "pack": "50NOS", "qty": 2, "gst": 5.0},
        {"name": "3 PLY MASK - BLUE 50'S", "cat": cat_surg, "mrp": 250.00, "rate": 80.00, "pack": "50NOS", "qty": 2, "gst": 5.0},
        {"name": "K LIFE PAPER TAPE 1 INCH", "cat": cat_surg, "mrp": 45.00, "rate": 22.00, "pack": "1NOS", "qty": 10, "gst": 12.0},
        {"name": "NEUPORE PAPER TAPE 1/2 INCH", "cat": cat_surg, "mrp": 30.00, "rate": 15.00, "pack": "1NOS", "qty": 10, "gst": 12.0},
        {"name": "DERMI 5 CREAM 15GM", "cat": cat_derma, "mrp": 85.00, "rate": 62.00, "pack": "15GM", "qty": 5, "gst": 12.0},
        {"name": "KT5 DERM CREAM 15GM", "cat": cat_derma, "mrp": 95.00, "rate": 72.00, "pack": "15GM", "qty": 5, "gst": 12.0},
        {"name": "FENACIN PLUS GEL 30GM", "cat": cat_pain, "mrp": 125.00, "rate": 95.00, "pack": "30GM", "qty": 3, "gst": 12.0},
        {"name": "NORMAL SALINE 0.9% 500ML", "cat": cat_surg, "mrp": 55.00, "rate": 28.00, "pack": "500ML", "qty": 10, "gst": 12.0},
        {"name": "NORMAL SALINE 0.9% 100ML", "cat": cat_surg, "mrp": 35.00, "rate": 18.00, "pack": "100ML", "qty": 10, "gst": 12.0},
        {"name": "BD SYRINGE 1ML 10'S", "cat": cat_surg, "mrp": 124.00, "rate": 98.00, "pack": "10NOS", "qty": 5, "gst": 5.0},
        {"name": "LEUKOPLAST 1.25CM", "cat": cat_surg, "mrp": 85.00, "rate": 55.00, "pack": "1NOS", "qty": 5, "gst": 12.0},
        {"name": "LEUKOPLAST 2.5CM", "cat": cat_surg, "mrp": 145.00, "rate": 95.00, "pack": "1NOS", "qty": 5, "gst": 12.0},
        {"name": "ABSORBENT GAUGE 10CM", "cat": cat_surg, "mrp": 45.00, "rate": 25.00, "pack": "1NOS", "qty": 10, "gst": 12.0},
        {"name": "ABSORBENT GAUGE 15CM", "cat": cat_surg, "mrp": 65.00, "rate": 35.00, "pack": "1NOS", "qty": 10, "gst": 12.0},
        {"name": "ABSORBENT GAUGE 5CM", "cat": cat_surg, "mrp": 25.00, "rate": 15.00, "pack": "1NOS", "qty": 10, "gst": 12.0},
        {"name": "VIS ELASTIC ADHESIVE BANDAGE 10CM", "cat": cat_surg, "mrp": 285.00, "rate": 165.00, "pack": "1NOS", "qty": 3, "gst": 12.0},
    ]

    for idx, item in enumerate(kp_items, 1):
        med, _ = Medicine.objects.get_or_create(
            name=item["name"],
            defaults={
                "dosage_form": "Other",
                "category": item["cat"],
                "hsn_code": "3005",
                "gst_rate": Decimal(str(item.get("gst", 12.0))),
                "min_stock_alert": 5,
                "is_active": True
            }
        )
        med.category = item["cat"]
        med.gst_rate = Decimal(str(item.get("gst", 12.0)))
        med.save()

        batch, _ = Batch.objects.get_or_create(
            medicine=med,
            batch_number=f"KP8243-{idx:02d}",
            defaults={
                "supplier": sup_kp,
                "expiry_date": date(2029, 6, 30),
                "purchase_price": Decimal(str(item["rate"])),
                "mrp": Decimal(str(item["mrp"])),
                "selling_price": Decimal(str(item["mrp"])),
                "pack_size": parse_pack_size(item["pack"]),
                "pack_quantity": item["qty"],
                "loose_quantity": 0
            }
        )
        batch.supplier = sup_kp
        batch.purchase_price = Decimal(str(item["rate"]))
        batch.mrp = Decimal(str(item["mrp"]))
        batch.selling_price = Decimal(str(item["mrp"]))
        batch.pack_quantity = item["qty"]
        batch.save()

        StockMovement.objects.create(
            batch=batch,
            movement_type='PURCHASE',
            quantity_packs=item["qty"],
            quantity_loose=0,
            reference_id="INV-KP8243",
            notes="Purchase from K P Associates Inv #KP8243/2026-27"
        )
    print(f"  [+] Imported {len(kp_items)} items from K P Associates.")

    # Shakthi Life Lines Items
    shakthi_items = [
        # Inv 61905
        {"inv": "61905", "name": "BECOSULES CAPS 20'S", "form": "Capsule", "cat": cat_vit, "batch": "SH61905-01", "exp": "05-28", "mrp": 55.00, "rate": 41.90, "pack": "20'S", "qty": 5, "gst": 5.0},
        {"inv": "61905", "name": "AZORAN 75 TABS 10'S", "form": "Tablet", "cat": cat_neuro, "batch": "SH61905-02", "exp": "05-28", "mrp": 195.00, "rate": 148.57, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "61905", "name": "BETALOC 25 TABS 15'S", "form": "Tablet", "cat": cat_cardio, "batch": "SH61905-03", "exp": "05-28", "mrp": 125.00, "rate": 95.24, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "61905", "name": "BETALOC 50 TABS 15'S", "form": "Tablet", "cat": cat_cardio, "batch": "SH61905-04", "exp": "05-28", "mrp": 195.00, "rate": 148.57, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "61905", "name": "BUSCOGAST PLUS TAB 10'S", "form": "Tablet", "cat": cat_pain, "batch": "SH61905-05", "exp": "05-28", "mrp": 85.00, "rate": 64.76, "pack": "10'S", "qty": 3, "gst": 5.0},
        {"inv": "61905", "name": "BANDY PLUS TAB 1'S", "form": "Tablet", "cat": cat_anti, "batch": "SH61905-06", "exp": "05-28", "mrp": 28.00, "rate": 21.33, "pack": "1'S", "qty": 10, "gst": 5.0},
        {"inv": "61905", "name": "BISOHEART 2.5 TAB 10'S", "form": "Tablet", "cat": cat_cardio, "batch": "SH61905-07", "exp": "05-28", "mrp": 95.00, "rate": 72.38, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "61905", "name": "BIOSTAR GOLD CAPS 10'S", "form": "Capsule", "cat": cat_vit, "batch": "SH61905-08", "exp": "05-28", "mrp": 245.00, "rate": 186.67, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "61905", "name": "BANOCIDE FORTE TAB 30'S", "form": "Tablet", "cat": cat_anti, "batch": "SH61905-09", "exp": "05-28", "mrp": 45.00, "rate": 34.29, "pack": "30'S", "qty": 3, "gst": 5.0},
        {"inv": "61905", "name": "BETNESOL TABS 20'S", "form": "Tablet", "cat": cat_anti, "batch": "SH61905-10", "exp": "05-28", "mrp": 18.00, "rate": 13.71, "pack": "20'S", "qty": 10, "gst": 5.0},
        {"inv": "61905", "name": "AZULIX 2 TAB 15'S", "form": "Tablet", "cat": cat_endo, "batch": "SH61905-11", "exp": "05-28", "mrp": 165.00, "rate": 125.71, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "61905", "name": "BENADON TABS 10'S", "form": "Tablet", "cat": cat_vit, "batch": "SH61905-12", "exp": "05-28", "mrp": 35.00, "rate": 26.67, "pack": "10'S", "qty": 5, "gst": 5.0},
        {"inv": "61905", "name": "AZTOR 10 TABS 15'S", "form": "Tablet", "cat": cat_cardio, "batch": "SH61905-13", "exp": "05-28", "mrp": 145.00, "rate": 110.48, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "61905", "name": "AZTOR 20 TABS 15'S", "form": "Tablet", "cat": cat_cardio, "batch": "SH61905-14", "exp": "05-28", "mrp": 245.00, "rate": 186.67, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "61905", "name": "BUPRON SR 150 TABS 10'S", "form": "Tablet", "cat": cat_neuro, "batch": "SH61905-15", "exp": "05-28", "mrp": 195.00, "rate": 148.57, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "61905", "name": "THYRONORM 100MCG 120'S", "form": "Tablet", "cat": cat_endo, "batch": "SH61905-16", "exp": "05-28", "mrp": 195.00, "rate": 148.57, "pack": "120'S", "qty": 2, "gst": 5.0},
        {"inv": "61905", "name": "THYRONORM 50MCG 120'S", "form": "Tablet", "cat": cat_endo, "batch": "SH61905-17", "exp": "05-28", "mrp": 175.00, "rate": 133.33, "pack": "120'S", "qty": 2, "gst": 5.0},
        {"inv": "61905", "name": "THYRONORM 25MCG 120'S", "form": "Tablet", "cat": cat_endo, "batch": "SH61905-18", "exp": "05-28", "mrp": 155.00, "rate": 118.10, "pack": "120'S", "qty": 2, "gst": 5.0},
        {"inv": "61905", "name": "THYRONORM 75MCG 120'S", "form": "Tablet", "cat": cat_endo, "batch": "SH61905-19", "exp": "05-28", "mrp": 185.00, "rate": 140.95, "pack": "120'S", "qty": 2, "gst": 5.0},
        {"inv": "61905", "name": "THYRONORM 12.5MCG 120'S", "form": "Tablet", "cat": cat_endo, "batch": "SH61905-20", "exp": "05-28", "mrp": 145.00, "rate": 110.48, "pack": "120'S", "qty": 2, "gst": 5.0},
        {"inv": "61905", "name": "THYRONORM 125MCG 120'S", "form": "Tablet", "cat": cat_endo, "batch": "SH61905-21", "exp": "05-28", "mrp": 215.00, "rate": 163.81, "pack": "120'S", "qty": 2, "gst": 5.0},
        {"inv": "61905", "name": "THYRONORM 88MCG 120'S", "form": "Tablet", "cat": cat_endo, "batch": "SH61905-22", "exp": "05-28", "mrp": 195.00, "rate": 148.57, "pack": "120'S", "qty": 2, "gst": 5.0},
        {"inv": "61905", "name": "AZITHRAL 250 TABS 6'S", "form": "Tablet", "cat": cat_anti, "batch": "SH61905-23", "exp": "05-28", "mrp": 78.50, "rate": 59.81, "pack": "6'S", "qty": 3, "gst": 5.0},
        {"inv": "61905", "name": "BACTRIM DS TABS 10'S", "form": "Tablet", "cat": cat_anti, "batch": "SH61905-24", "exp": "05-28", "mrp": 28.00, "rate": 21.33, "pack": "10'S", "qty": 5, "gst": 5.0},

        # Inv 62001 & 62008
        {"inv": "62001", "name": "CALAMINE LOTION 100ML", "form": "Ointment", "cat": cat_derma, "batch": "SH62001-01", "exp": "05-28", "mrp": 95.00, "rate": 65.00, "pack": "100ML", "qty": 5, "gst": 12.0},
        {"inv": "62001", "name": "SAIBOL OINTMENT 25GM", "form": "Ointment", "cat": cat_derma, "batch": "SH62001-02", "exp": "05-28", "mrp": 45.00, "rate": 30.00, "pack": "25GM", "qty": 5, "gst": 12.0},
        {"inv": "62001", "name": "B-TEX OINT 14GM", "form": "Ointment", "cat": cat_derma, "batch": "SH62001-03", "exp": "05-28", "mrp": 35.00, "rate": 24.00, "pack": "14GM", "qty": 10, "gst": 12.0},
        {"inv": "62008", "name": "ORS PROLYTE ORANGE 21.8GM", "form": "Powder", "cat": cat_gastro, "batch": "SH62008-01", "exp": "05-28", "mrp": 25.10, "rate": 19.12, "pack": "21.8GM", "qty": 20, "gst": 5.0},

        # Inv 61888
        {"inv": "61888", "name": "ASOMEX 2.5 TAB 15'S", "form": "Tablet", "cat": cat_cardio, "batch": "SH61888-01", "exp": "05-28", "mrp": 95.00, "rate": 72.38, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "61888", "name": "ACEPILL MR TAB 10'S", "form": "Tablet", "cat": cat_pain, "batch": "SH61888-02", "exp": "05-28", "mrp": 145.00, "rate": 110.48, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "61888", "name": "AMARYL 1 TAB 30'S", "form": "Tablet", "cat": cat_endo, "batch": "SH61888-03", "exp": "05-28", "mrp": 165.00, "rate": 125.71, "pack": "30'S", "qty": 2, "gst": 5.0},
        {"inv": "61888", "name": "ALLEGRA M TAB 10'S", "form": "Tablet", "cat": cat_resp, "batch": "SH61888-04", "exp": "05-28", "mrp": 225.00, "rate": 171.43, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "61888", "name": "ASPRITO 2 TAB 10'S", "form": "Tablet", "cat": cat_neuro, "batch": "SH61888-05", "exp": "05-28", "mrp": 145.00, "rate": 110.48, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "61888", "name": "AMITONE 10 TAB 15'S", "form": "Tablet", "cat": cat_neuro, "batch": "SH61888-06", "exp": "05-28", "mrp": 45.00, "rate": 34.29, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "61888", "name": "AMLOKIND 5 TAB 15'S", "form": "Tablet", "cat": cat_cardio, "batch": "SH61888-07", "exp": "05-28", "mrp": 45.00, "rate": 34.29, "pack": "15'S", "qty": 3, "gst": 5.0},
        {"inv": "61888", "name": "ANGIZAAR 50 TAB 15'S", "form": "Tablet", "cat": cat_cardio, "batch": "SH61888-08", "exp": "05-28", "mrp": 125.00, "rate": 95.24, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "61888", "name": "ASTIN 10 TAB 15'S", "form": "Tablet", "cat": cat_cardio, "batch": "SH61888-09", "exp": "05-28", "mrp": 145.00, "rate": 110.48, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "61888", "name": "ANXIT 0.25 TAB 15'S", "form": "Tablet", "cat": cat_neuro, "batch": "SH61888-10", "exp": "05-28", "mrp": 45.00, "rate": 34.29, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "61888", "name": "ANXIT 0.5 TAB 15'S", "form": "Tablet", "cat": cat_neuro, "batch": "SH61888-11", "exp": "05-28", "mrp": 65.00, "rate": 49.52, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "61888", "name": "ALPRAX 0.25 TAB 15'S", "form": "Tablet", "cat": cat_neuro, "batch": "SH61888-12", "exp": "05-28", "mrp": 38.00, "rate": 28.95, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "61888", "name": "ALPRAX 0.5 TAB 15'S", "form": "Tablet", "cat": cat_neuro, "batch": "SH61888-13", "exp": "05-28", "mrp": 55.00, "rate": 41.90, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "61888", "name": "AMIFRU 40 TAB 10'S", "form": "Tablet", "cat": cat_cardio, "batch": "SH61888-14", "exp": "05-28", "mrp": 45.00, "rate": 34.29, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "61888", "name": "AMLODAC 5 TAB 15'S", "form": "Tablet", "cat": cat_cardio, "batch": "SH61888-15", "exp": "05-28", "mrp": 65.00, "rate": 49.52, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "61888", "name": "AMCARD 2.5 TAB 10'S", "form": "Tablet", "cat": cat_cardio, "batch": "SH61888-16", "exp": "05-28", "mrp": 45.00, "rate": 34.29, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "61888", "name": "ADMENTA 5 TAB 10'S", "form": "Tablet", "cat": cat_neuro, "batch": "SH61888-17", "exp": "05-28", "mrp": 125.00, "rate": 95.24, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "61888", "name": "AB PHYLLINE SR 200 TAB 10'S", "form": "Tablet", "cat": cat_resp, "batch": "SH61888-18", "exp": "05-28", "mrp": 185.00, "rate": 140.95, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "61888", "name": "AMIXIDE H TAB 10'S", "form": "Tablet", "cat": cat_neuro, "batch": "SH61888-19", "exp": "05-28", "mrp": 55.00, "rate": 41.90, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "61888", "name": "AXCER 90 TAB 14'S", "form": "Tablet", "cat": cat_cardio, "batch": "SH61888-20", "exp": "05-28", "mrp": 485.00, "rate": 369.52, "pack": "14'S", "qty": 2, "gst": 5.0},
        {"inv": "61888", "name": "AB FLO CAPS 10'S", "form": "Capsule", "cat": cat_resp, "batch": "SH61888-21", "exp": "05-28", "mrp": 175.00, "rate": 133.33, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "61888", "name": "ACILOC 150 TAB 30'S", "form": "Tablet", "cat": cat_gastro, "batch": "SH61888-22", "exp": "05-28", "mrp": 42.00, "rate": 32.00, "pack": "30'S", "qty": 5, "gst": 5.0},
        {"inv": "61888", "name": "AMODEP 5 TAB 15'S", "form": "Tablet", "cat": cat_cardio, "batch": "SH61888-23", "exp": "05-28", "mrp": 65.00, "rate": 49.52, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "61888", "name": "AMLOPRES 5 TAB 15'S", "form": "Tablet", "cat": cat_cardio, "batch": "SH61888-24", "exp": "05-28", "mrp": 75.00, "rate": 57.14, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "61888", "name": "AMLOPIN M TAB 10'S", "form": "Tablet", "cat": cat_cardio, "batch": "SH61888-25", "exp": "05-28", "mrp": 115.00, "rate": 87.62, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "61888", "name": "ANGICAM 5 TAB 10'S", "form": "Tablet", "cat": cat_cardio, "batch": "SH61888-26", "exp": "05-28", "mrp": 65.00, "rate": 49.52, "pack": "10'S", "qty": 2, "gst": 5.0},

        # Inv 62451
        {"inv": "62451", "name": "TECZINE 10MG TAB 15'S", "form": "Tablet", "cat": cat_resp, "batch": "SIH0580A", "exp": "02-28", "mrp": 246.56, "rate": 187.86, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "62451", "name": "TOPIROL 50 TAB 10'S", "form": "Tablet", "cat": cat_neuro, "batch": "GTH0688A", "exp": "01-29", "mrp": 192.00, "rate": 146.29, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "62451", "name": "TOPIROL 25 TAB 10'S", "form": "Tablet", "cat": cat_neuro, "batch": "GTH0935A", "exp": "02-29", "mrp": 108.75, "rate": 82.86, "pack": "10'S", "qty": 2, "gst": 5.0},

        # Inv 62408
        {"inv": "62408", "name": "PANTOSEC 40 TAB 10'S", "form": "Tablet", "cat": cat_gastro, "batch": "PNS260101", "exp": "12-27", "mrp": 148.04, "rate": 25.13, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "62408", "name": "PRU-10 TAB 10'S", "form": "Tablet", "cat": cat_gastro, "batch": "PR172608", "exp": "04-29", "mrp": 46.11, "rate": 35.13, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "62408", "name": "PANPRO TABS 10'S", "form": "Tablet", "cat": cat_gastro, "batch": "UT-260587H", "exp": "03-28", "mrp": 70.00, "rate": 53.60, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "62408", "name": "OMEZ 10 CAPS 15'S", "form": "Capsule", "cat": cat_gastro, "batch": "E2502316", "exp": "08-28", "mrp": 38.53, "rate": 29.36, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "62408", "name": "OMEZ DSR PLUS CAPS 15'S", "form": "Capsule", "cat": cat_gastro, "batch": "E2601303", "exp": "04-28", "mrp": 254.71, "rate": 194.06, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "62408", "name": "ORITEL 5 TAB 10'S", "form": "Tablet", "cat": cat_cardio, "batch": "K2600781", "exp": "02-28", "mrp": 65.00, "rate": 49.52, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "62408", "name": "ORITEL 10 TAB 10'S", "form": "Tablet", "cat": cat_cardio, "batch": "K2600922", "exp": "08-27", "mrp": 92.81, "rate": 70.71, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "62408", "name": "OLIZA 5 TAB 10'S", "form": "Tablet", "cat": cat_neuro, "batch": "1NP25B003", "exp": "03-29", "mrp": 62.30, "rate": 47.47, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "62408", "name": "PREGABID 75 CAPS 15'S", "form": "Capsule", "cat": cat_neuro, "batch": "N2600721", "exp": "02-28", "mrp": 293.10, "rate": 223.31, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "62408", "name": "PREGABID ME 75 CAPS 15'S", "form": "Capsule", "cat": cat_neuro, "batch": "N2503714", "exp": "10-27", "mrp": 340.31, "rate": 259.29, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "62408", "name": "PREVA AS 150 CAPS 15'S", "form": "Capsule", "cat": cat_cardio, "batch": "N2503457", "exp": "09-27", "mrp": 96.56, "rate": 73.57, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "62408", "name": "PANTOCAR 40 TABS 15'S", "form": "Tablet", "cat": cat_gastro, "batch": "PACS0041", "exp": "05-27", "mrp": 193.00, "rate": 147.05, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "62408", "name": "PARKIN TABS 15'S", "form": "Tablet", "cat": cat_neuro, "batch": "PNAS0083", "exp": "09-29", "mrp": 21.94, "rate": 16.72, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "62408", "name": "PREGABA M 75 CAPS 15'S", "form": "Capsule", "cat": cat_neuro, "batch": "CNU826001A", "exp": "05-28", "mrp": 394.03, "rate": 300.21, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "62408", "name": "OLMY 20 TAB 10'S", "form": "Tablet", "cat": cat_cardio, "batch": "SB00322A", "exp": "04-28", "mrp": 212.97, "rate": 162.26, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "62408", "name": "PANTODAC 20 TAB 15'S", "form": "Tablet", "cat": cat_gastro, "batch": "IA01023A", "exp": "08-28", "mrp": 187.97, "rate": 143.22, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "62408", "name": "PANTODAC DSR CAPS 15'S", "form": "Capsule", "cat": cat_gastro, "batch": "IB00673A", "exp": "01-28", "mrp": 299.40, "rate": 228.11, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "62408", "name": "PROVIDAC CAPS 14'S", "form": "Capsule", "cat": cat_gastro, "batch": "IB00671A", "exp": "02-28", "mrp": 496.44, "rate": 378.24, "pack": "14'S", "qty": 2, "gst": 5.0},
        {"inv": "62408", "name": "ORVAS 10 TAB 7'S", "form": "Tablet", "cat": cat_cardio, "batch": "HOR042610", "exp": "03-28", "mrp": 22.45, "rate": 17.10, "pack": "7'S", "qty": 2, "gst": 5.0},
        {"inv": "62408", "name": "PRODEP CAPS 10'S", "form": "Capsule", "cat": cat_neuro, "batch": "SIH0801A", "exp": "04-30", "mrp": 42.88, "rate": 32.67, "pack": "10'S", "qty": 1, "gst": 5.0},
        {"inv": "62408", "name": "OLMEZEST 20 TAB 10'S", "form": "Tablet", "cat": cat_cardio, "batch": "GTH1938A", "exp": "09-28", "mrp": 164.00, "rate": 124.95, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "62408", "name": "PANTOCID DSR CAPS 15'S", "form": "Capsule", "cat": cat_gastro, "batch": "SIH0889A", "exp": "05-28", "mrp": 252.19, "rate": 192.14, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "62408", "name": "OXETOL 150 TAB 10'S", "form": "Tablet", "cat": cat_neuro, "batch": "SIH0702A", "exp": "03-29", "mrp": 97.00, "rate": 73.90, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "62408", "name": "PIOZ 15 TAB 10'S", "form": "Tablet", "cat": cat_endo, "batch": "48021370", "exp": "05-29", "mrp": 151.88, "rate": 115.72, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "62408", "name": "PENTIDS 200 TAB 6'S", "form": "Tablet", "cat": cat_anti, "batch": "MRU0821", "exp": "04-28", "mrp": 85.95, "rate": 65.49, "pack": "6'S", "qty": 2, "gst": 5.0},
        {"inv": "62408", "name": "ONDEM MD 4 TAB 10'S", "form": "Tablet", "cat": cat_gastro, "batch": "26441783", "exp": "04-27", "mrp": 15.50, "rate": 11.81, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "62408", "name": "PAN D CAPS 15'S", "form": "Capsule", "cat": cat_gastro, "batch": "26441694", "exp": "04-28", "mrp": 55.20, "rate": 42.06, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "62408", "name": "PAN IT CAPS 10'S", "form": "Capsule", "cat": cat_gastro, "batch": "PIC26007G", "exp": "05-28", "mrp": 261.90, "rate": 199.54, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "62408", "name": "ORNIDA 500 TAB 10'S", "form": "Tablet", "cat": cat_anti, "batch": "SPB260245", "exp": "01-29", "mrp": 302.10, "rate": 230.17, "pack": "10'S", "qty": 2, "gst": 5.0},

        # Inv 62427
        {"inv": "62427", "name": "SOBISIS EC FLORTE 30'S", "form": "Tablet", "cat": cat_gastro, "batch": "DD260295", "exp": "02-28", "mrp": 259.87, "rate": 198.00, "pack": "30'S", "qty": 2, "gst": 5.0},
        {"inv": "62427", "name": "RAZO D CAPS 15'S", "form": "Capsule", "cat": cat_gastro, "batch": "08382613", "exp": "03-28", "mrp": 361.00, "rate": 275.05, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "62427", "name": "STAMLO 10 TAB 30'S", "form": "Tablet", "cat": cat_cardio, "batch": "E2600203", "exp": "12-28", "mrp": 172.73, "rate": 131.60, "pack": "30'S", "qty": 2, "gst": 5.0},
        {"inv": "62427", "name": "STAMLO 5 TAB 30'S", "form": "Tablet", "cat": cat_cardio, "batch": "E2601009", "exp": "04-29", "mrp": 80.51, "rate": 61.34, "pack": "30'S", "qty": 2, "gst": 5.0},
        {"inv": "62427", "name": "REXIPRA PLUS TAB 15'S", "form": "Tablet", "cat": cat_neuro, "batch": "K2600219", "exp": "12-27", "mrp": 193.59, "rate": 147.50, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "62427", "name": "REXIPRA 10 TABS 10'S", "form": "Tablet", "cat": cat_neuro, "batch": "N2600539", "exp": "01-29", "mrp": 96.18, "rate": 73.28, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "62427", "name": "RABIUM 20 TAB 15'S", "form": "Tablet", "cat": cat_gastro, "batch": "N2601507", "exp": "04-28", "mrp": 174.20, "rate": 132.72, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "62427", "name": "PULMOCEF 500 TAB 10'S", "form": "Tablet", "cat": cat_anti, "batch": "FDFB0322", "exp": "03-29", "mrp": 514.92, "rate": 392.32, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "62427", "name": "RISPOND PLUS TAB 15'S", "form": "Tablet", "cat": cat_neuro, "batch": "RPA50042", "exp": "02-29", "mrp": 190.00, "rate": 144.76, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "62427", "name": "SOLVIN COLD TABS 10'S", "form": "Tablet", "cat": cat_resp, "batch": "HTL026006B", "exp": "03-28", "mrp": 74.50, "rate": 56.77, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "62427", "name": "ROSUVAS 10 TAB 15'S", "form": "Tablet", "cat": cat_cardio, "batch": "SIH0879A", "exp": "10-28", "mrp": 375.00, "rate": 285.71, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "62427", "name": "ROSUVAS 5 TAB 15'S", "form": "Tablet", "cat": cat_cardio, "batch": "SIH0971A", "exp": "10-28", "mrp": 215.00, "rate": 163.81, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "62427", "name": "SOTRET 10MG CAPS 10'S", "form": "Capsule", "cat": cat_derma, "batch": "PTH2342A", "exp": "11-28", "mrp": 240.00, "rate": 182.86, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "62427", "name": "STILOZ 50 TAB 15'S", "form": "Tablet", "cat": cat_cardio, "batch": "S21HBTPF602", "exp": "03-28", "mrp": 368.50, "rate": 280.76, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "62427", "name": "TELMA 20 TAB 15'S", "form": "Tablet", "cat": cat_cardio, "batch": "18250419", "exp": "08-28", "mrp": 61.79, "rate": 47.08, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "62427", "name": "TELMA 40 TAB 30'S", "form": "Tablet", "cat": cat_cardio, "batch": "18250686", "exp": "11-28", "mrp": 216.72, "rate": 165.12, "pack": "30'S", "qty": 2, "gst": 5.0},
        {"inv": "62427", "name": "SOMPRAZ D 20 CAPS 15'S", "form": "Capsule", "cat": cat_gastro, "batch": "GTH1196A", "exp": "03-28", "mrp": 202.00, "rate": 153.90, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "62427", "name": "ROZAVEL 5 TAB 15'S", "form": "Tablet", "cat": cat_cardio, "batch": "GTH1281A", "exp": "09-28", "mrp": 215.00, "rate": 163.81, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "62427", "name": "ROZAVEL 10 TAB 15'S", "form": "Tablet", "cat": cat_cardio, "batch": "SIH0385A", "exp": "07-28", "mrp": 460.00, "rate": 350.48, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "62427", "name": "ROZAVEL F 10 TAB 15'S", "form": "Tablet", "cat": cat_cardio, "batch": "5SA1695", "exp": "01-28", "mrp": 197.61, "rate": 150.56, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "62427", "name": "ROSULIP 5 TAB 15'S", "form": "Tablet", "cat": cat_cardio, "batch": "48021424", "exp": "04-28", "mrp": 97.25, "rate": 74.10, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "62427", "name": "TAZLOC 40 TAB 10'S", "form": "Tablet", "cat": cat_cardio, "batch": "48021486", "exp": "05-28", "mrp": 150.35, "rate": 114.55, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "62427", "name": "TAZLOC AM TAB 50'S", "form": "Tablet", "cat": cat_cardio, "batch": "SBB25013", "exp": "10-28", "mrp": 43.05, "rate": 32.80, "pack": "50'S", "qty": 2, "gst": 5.0},
        {"inv": "62427", "name": "SORBITRATE 10 TAB 10'S", "form": "Tablet", "cat": cat_cardio, "batch": "BPF253143", "exp": "10-27", "mrp": 116.25, "rate": 88.57, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "62427", "name": "TELVAS BETA 25 TAB 10'S", "form": "Tablet", "cat": cat_cardio, "batch": "SH62427-25", "exp": "05-28", "mrp": 145.00, "rate": 110.48, "pack": "10'S", "qty": 2, "gst": 5.0},
    ]

    shakthi_count = 0
    for item in shakthi_items:
        med, _ = Medicine.objects.get_or_create(
            name=item["name"],
            defaults={
                "dosage_form": item.get("form", "Tablet"),
                "category": item.get("cat"),
                "hsn_code": "3004",
                "gst_rate": Decimal(str(item.get("gst", 5.0))),
                "min_stock_alert": 5,
                "is_active": True
            }
        )
        med.category = item.get("cat")
        med.dosage_form = item.get("form", "Tablet")
        med.gst_rate = Decimal(str(item.get("gst", 5.0)))
        med.save()

        exp_date = parse_expiry(item["exp"])
        pack_sz = parse_pack_size(item["pack"])
        mrp_val = Decimal(str(item["mrp"]))
        pur_val = Decimal(str(item["rate"]))

        batch, created = Batch.objects.get_or_create(
            medicine=med,
            batch_number=item["batch"],
            defaults={
                "supplier": sup_shakthi,
                "expiry_date": exp_date,
                "purchase_price": pur_val,
                "mrp": mrp_val,
                "selling_price": mrp_val,
                "pack_size": pack_sz,
                "pack_quantity": item["qty"],
                "loose_quantity": 0
            }
        )
        if not created:
            batch.supplier = sup_shakthi
            batch.expiry_date = exp_date
            batch.purchase_price = pur_val
            batch.mrp = mrp_val
            batch.selling_price = mrp_val
            batch.pack_size = pack_sz
            batch.pack_quantity = item["qty"]
            batch.save()

        StockMovement.objects.create(
            batch=batch,
            movement_type='PURCHASE',
            quantity_packs=item["qty"],
            quantity_loose=0,
            reference_id=f"INV-{item['inv']}",
            notes=f"Purchase from Shakthi Life Lines Inv #{item['inv']}"
        )
        shakthi_count += 1
    print(f"  [+] Imported {shakthi_count} items from Shakthi Life Lines.")

if __name__ == '__main__':
    run()
