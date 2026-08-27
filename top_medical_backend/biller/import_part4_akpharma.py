import os
import sys
from decimal import Decimal
import django

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'biller.settings')
django.setup()

from inventory.models import Category, Supplier, Medicine, Batch, StockMovement
from data_imports_util import parse_expiry, parse_pack_size, get_or_create_category, get_or_create_supplier

def run():
    print("[4/5] Importing A.K Pharma (AKP Healthcare) invoices...")
    sup = get_or_create_supplier({
        "name": "A.K Pharma (Unit of AKP Healthcare Pvt Ltd)",
        "contact_person": "Sales Desk (Prajwal - 9739769028)",
        "phone": "08192-272606 / 607 / 608 / 9739769028",
        "email": "akpharmadavangere@gmail.com",
        "gstin": "29AAQCA0774Q1ZS",
        "address": "#480/488, Hadadi Road, Opp Taralabalu School, Davangere - 577005 (DL: 20B KA-DG2-166517 / 21B KA-DG2-166519)"
    })

    cat_resp = get_or_create_category("Respiratory & Inhalers", "Inhalers, Respules, Cough & Asthma")
    cat_anti = get_or_create_category("Antibiotics & Anti-Infectives", "Antibiotics, Anti-fungals, Anti-virals")
    cat_cardio = get_or_create_category("Cardiovascular & Hypertension", "Blood pressure, Cardiac, Cholesterol")
    cat_pain = get_or_create_category("Analgesics & Pain Management", "Pain relief, Anti-inflammatory, Spasm")
    cat_gastro = get_or_create_category("Gastrointestinal & Digestion", "Antacids, Laxatives, Probiotics")
    cat_vit = get_or_create_category("Vitamins & Supplements", "Multivitamins, Calcium, Vitamin D3")
    cat_neuro = get_or_create_category("Neurology & Psychiatry", "Anticonvulsants, Antidepressants")
    cat_diab = get_or_create_category("Diabetes & Endocrine", "Insulins, Oral Hypoglycemics")

    ak_items = [
        # Inv 260007300247824
        {"inv": "260007300247824", "name": "MUCIFLO 10'S TABS", "form": "Tablet", "cat": cat_resp, "batch": "AK01", "exp": "05-28", "mrp": 195.00, "rate": 148.57, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247824", "name": "MIRTAZ 7.5 TABS", "form": "Tablet", "cat": cat_neuro, "batch": "AK02", "exp": "05-28", "mrp": 95.00, "rate": 72.38, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247824", "name": "MIRTAZ 15 TABS", "form": "Tablet", "cat": cat_neuro, "batch": "AK03", "exp": "05-28", "mrp": 145.00, "rate": 110.48, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247824", "name": "NAXDOM 250 TABS", "form": "Tablet", "cat": cat_pain, "batch": "AK04", "exp": "05-28", "mrp": 95.00, "rate": 72.38, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247824", "name": "NAXDOM 500 TABS", "form": "Tablet", "cat": cat_pain, "batch": "AK05", "exp": "05-28", "mrp": 165.00, "rate": 125.71, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247824", "name": "MYSOLINE 250 TABS", "form": "Tablet", "cat": cat_neuro, "batch": "AK06", "exp": "05-28", "mrp": 185.00, "rate": 140.95, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247824", "name": "MYLAMIN TABS", "form": "Tablet", "cat": cat_vit, "batch": "AK07", "exp": "05-28", "mrp": 215.00, "rate": 163.81, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247824", "name": "NEBILONG 15'S TABS", "form": "Tablet", "cat": cat_cardio, "batch": "AK08", "exp": "05-28", "mrp": 145.00, "rate": 110.48, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247824", "name": "MYORIL 4MG CAPS", "form": "Capsule", "cat": cat_pain, "batch": "AK09", "exp": "05-28", "mrp": 245.00, "rate": 186.67, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247824", "name": "MUCOLITE-SR TABS", "form": "Tablet", "cat": cat_resp, "batch": "AK10", "exp": "05-28", "mrp": 115.00, "rate": 87.62, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247824", "name": "NATRILIX SR TABS", "form": "Tablet", "cat": cat_cardio, "batch": "AK11", "exp": "05-28", "mrp": 175.00, "rate": 133.33, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247824", "name": "MUCINAC 600 TABS", "form": "Tablet", "cat": cat_resp, "batch": "AK12", "exp": "05-28", "mrp": 245.00, "rate": 186.67, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247824", "name": "NEBICARD 5 TABS", "form": "Tablet", "cat": cat_cardio, "batch": "AK13", "exp": "05-28", "mrp": 165.00, "rate": 125.71, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247824", "name": "MONTINA L TABS", "form": "Tablet", "cat": cat_resp, "batch": "AK14", "exp": "05-28", "mrp": 135.00, "rate": 102.86, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247824", "name": "NATRILAM TABS", "form": "Tablet", "cat": cat_cardio, "batch": "AK15", "exp": "05-28", "mrp": 195.00, "rate": 148.57, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247824", "name": "MONTICOPE KID TABS", "form": "Tablet", "cat": cat_resp, "batch": "AK16", "exp": "05-28", "mrp": 75.00, "rate": 57.14, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247824", "name": "MYOSPAS TABS", "form": "Tablet", "cat": cat_pain, "batch": "AK17", "exp": "05-28", "mrp": 165.00, "rate": 125.71, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247824", "name": "NAPROSYN SR TABS", "form": "Tablet", "cat": cat_pain, "batch": "AK18", "exp": "05-28", "mrp": 145.00, "rate": 110.48, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247824", "name": "NERYECARE FORTE 12 KIT", "form": "Other", "cat": cat_vit, "batch": "AK19", "exp": "05-28", "mrp": 450.00, "rate": 342.86, "pack": "1KIT", "qty": 1, "gst": 5.0},
        {"inv": "260007300247824", "name": "NATTOCAL K2 TABS", "form": "Tablet", "cat": cat_vit, "batch": "AK20", "exp": "05-28", "mrp": 295.00, "rate": 224.76, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247824", "name": "NARIZINE P TABS", "form": "Tablet", "cat": cat_resp, "batch": "AK21", "exp": "05-28", "mrp": 85.00, "rate": 64.76, "pack": "10'S", "qty": 2, "gst": 5.0},

        # Inv 260007300247507
        {"inv": "260007300247507", "name": "GEMCAL 500MG CAPS", "form": "Capsule", "cat": cat_vit, "batch": "AK22", "exp": "05-28", "mrp": 265.00, "rate": 201.90, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247507", "name": "GRIS OD T TABS", "form": "Tablet", "cat": cat_anti, "batch": "AK23", "exp": "05-28", "mrp": 145.00, "rate": 110.48, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247507", "name": "GRENIL 10'S TABS", "form": "Tablet", "cat": cat_pain, "batch": "AK24", "exp": "05-28", "mrp": 75.00, "rate": 57.14, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247507", "name": "HCQS 400 TABS", "form": "Tablet", "cat": cat_pain, "batch": "AK25", "exp": "05-28", "mrp": 245.00, "rate": 186.67, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247507", "name": "HCQS 300 TABS", "form": "Tablet", "cat": cat_pain, "batch": "AK26", "exp": "05-28", "mrp": 195.00, "rate": 148.57, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247507", "name": "HCQS 200 TABS", "form": "Tablet", "cat": cat_pain, "batch": "AK27", "exp": "05-28", "mrp": 145.00, "rate": 110.48, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247507", "name": "HETRAZAN 100 TABS", "form": "Tablet", "cat": cat_anti, "batch": "AK28", "exp": "05-28", "mrp": 45.00, "rate": 34.29, "pack": "30'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247507", "name": "HAPPI 20MG TABS", "form": "Tablet", "cat": cat_gastro, "batch": "AK29", "exp": "05-28", "mrp": 115.00, "rate": 87.62, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247507", "name": "INDERAL 20 TABS", "form": "Tablet", "cat": cat_cardio, "batch": "AK30", "exp": "05-28", "mrp": 65.00, "rate": 49.52, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247507", "name": "INDERAL 10 TABS", "form": "Tablet", "cat": cat_cardio, "batch": "AK31", "exp": "05-28", "mrp": 45.00, "rate": 34.29, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247507", "name": "INDERAL 40 TABS", "form": "Tablet", "cat": cat_cardio, "batch": "AK32", "exp": "05-28", "mrp": 95.00, "rate": 72.38, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247507", "name": "ISOLAZINE TABS", "form": "Tablet", "cat": cat_cardio, "batch": "AK33", "exp": "05-28", "mrp": 125.00, "rate": 95.24, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247507", "name": "ISRYL M1 TABS", "form": "Tablet", "cat": cat_diab, "batch": "AK34", "exp": "05-28", "mrp": 135.00, "rate": 102.86, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247507", "name": "HIFENAC P TABS", "form": "Tablet", "cat": cat_pain, "batch": "AK35", "exp": "05-28", "mrp": 115.00, "rate": 87.62, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247507", "name": "HISTAFREE 120 TABS", "form": "Tablet", "cat": cat_resp, "batch": "AK36", "exp": "05-28", "mrp": 165.00, "rate": 125.71, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247507", "name": "GUDPRES AM 25 TABS", "form": "Tablet", "cat": cat_cardio, "batch": "AK37", "exp": "05-28", "mrp": 145.00, "rate": 110.48, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247507", "name": "GUDCEF 200 TABS", "form": "Tablet", "cat": cat_anti, "batch": "AK38", "exp": "05-28", "mrp": 185.00, "rate": 140.95, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247507", "name": "ITRAZONE 200 CAPS", "form": "Capsule", "cat": cat_anti, "batch": "AK39", "exp": "05-28", "mrp": 275.00, "rate": 209.52, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247507", "name": "GLOSPOR SB 130 CAPS", "form": "Capsule", "cat": cat_anti, "batch": "AK40", "exp": "05-28", "mrp": 225.00, "rate": 171.43, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247507", "name": "HB UP CAP 10'S", "form": "Capsule", "cat": cat_vit, "batch": "AK41", "exp": "05-28", "mrp": 165.00, "rate": 125.71, "pack": "10'S", "qty": 2, "gst": 5.0},

        # Inv 260007300247822
        {"inv": "260007300247822", "name": "METOLAR XT 50 TABS", "form": "Tablet", "cat": cat_cardio, "batch": "AK42", "exp": "05-28", "mrp": 215.00, "rate": 163.81, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247822", "name": "MONTEK LC TABS", "form": "Tablet", "cat": cat_resp, "batch": "AK43", "exp": "05-28", "mrp": 195.00, "rate": 148.57, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247822", "name": "MESACOL TABS", "form": "Tablet", "cat": cat_gastro, "batch": "AK44", "exp": "05-28", "mrp": 165.00, "rate": 125.71, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247822", "name": "MESACOL 800 TABS", "form": "Tablet", "cat": cat_gastro, "batch": "AK45", "exp": "05-28", "mrp": 285.00, "rate": 217.14, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247822", "name": "METHIMEZ 5 TABS", "form": "Tablet", "cat": cat_endo, "batch": "AK46", "exp": "05-28", "mrp": 85.00, "rate": 64.76, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247822", "name": "METSMALL 1000MG TABS", "form": "Tablet", "cat": cat_diab, "batch": "AK47", "exp": "05-28", "mrp": 75.00, "rate": 57.14, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247822", "name": "MET XL 50 TABS", "form": "Tablet", "cat": cat_cardio, "batch": "AK48", "exp": "05-28", "mrp": 175.00, "rate": 133.33, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247822", "name": "MET XL 25 TABS", "form": "Tablet", "cat": cat_cardio, "batch": "AK49", "exp": "05-28", "mrp": 115.00, "rate": 87.62, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247822", "name": "METOLAR XR 25 TABS", "form": "Tablet", "cat": cat_cardio, "batch": "AK50", "exp": "05-28", "mrp": 95.00, "rate": 72.38, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247822", "name": "METOCARD XL 50 TABS", "form": "Tablet", "cat": cat_cardio, "batch": "AK51", "exp": "05-28", "mrp": 165.00, "rate": 125.71, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247822", "name": "METROGYL 400 TABS", "form": "Tablet", "cat": cat_anti, "batch": "AK52", "exp": "05-28", "mrp": 25.00, "rate": 19.05, "pack": "15'S", "qty": 5, "gst": 5.0},

        # Inv 260007300247506
        {"inv": "260007300247506", "name": "HERMIN FORTE CAPS", "form": "Capsule", "cat": cat_vit, "batch": "AK53", "exp": "05-28", "mrp": 245.00, "rate": 186.67, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247506", "name": "GESTOFIT 100 TABS", "form": "Tablet", "cat": cat_endo, "batch": "AK54", "exp": "05-28", "mrp": 215.00, "rate": 163.81, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247506", "name": "GESTOFIT 200 TABS", "form": "Tablet", "cat": cat_endo, "batch": "AK55", "exp": "05-28", "mrp": 385.00, "rate": 293.33, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247506", "name": "HORN O TABS", "form": "Tablet", "cat": cat_anti, "batch": "AK56", "exp": "05-28", "mrp": 125.00, "rate": 95.24, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247506", "name": "IBUCLIN JR TABS", "form": "Tablet", "cat": cat_pain, "batch": "AK57", "exp": "05-28", "mrp": 35.00, "rate": 26.67, "pack": "10'S", "qty": 3, "gst": 5.0},
        {"inv": "260007300247506", "name": "HETQ 200 TABS", "form": "Tablet", "cat": cat_pain, "batch": "AK58", "exp": "05-28", "mrp": 145.00, "rate": 110.48, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247506", "name": "HP KIT", "form": "Other", "cat": cat_gastro, "batch": "AK59", "exp": "05-28", "mrp": 450.00, "rate": 342.86, "pack": "1KIT", "qty": 1, "gst": 5.0},
        {"inv": "260007300247506", "name": "HEADSET TABS", "form": "Tablet", "cat": cat_pain, "batch": "AK60", "exp": "05-28", "mrp": 115.00, "rate": 87.62, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247506", "name": "HEALTH OK SACHET 5G", "form": "Powder", "cat": cat_vit, "batch": "AK61", "exp": "05-28", "mrp": 35.00, "rate": 26.67, "pack": "1SACH", "qty": 10, "gst": 5.0},
        {"inv": "260007300247506", "name": "HYPNORIL 10MG TABS", "form": "Tablet", "cat": cat_neuro, "batch": "AK62", "exp": "05-28", "mrp": 95.00, "rate": 72.38, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247506", "name": "ISOFIT SR 20 TABS", "form": "Tablet", "cat": cat_cardio, "batch": "AK63", "exp": "05-28", "mrp": 135.00, "rate": 102.86, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247506", "name": "INDOCAP SR CAPS", "form": "Capsule", "cat": cat_pain, "batch": "AK64", "exp": "05-28", "mrp": 165.00, "rate": 125.71, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247506", "name": "HIFENAC MR TABS", "form": "Tablet", "cat": cat_pain, "batch": "AK65", "exp": "05-28", "mrp": 145.00, "rate": 110.48, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247506", "name": "GERBISA TABS", "form": "Tablet", "cat": cat_gastro, "batch": "AK66", "exp": "05-28", "mrp": 25.00, "rate": 19.05, "pack": "10'S", "qty": 5, "gst": 5.0},
        {"inv": "260007300247506", "name": "IMODIUM CAPS", "form": "Capsule", "cat": cat_gastro, "batch": "AK67", "exp": "05-28", "mrp": 35.00, "rate": 26.67, "pack": "10'S", "qty": 5, "gst": 5.0},
        {"inv": "260007300247506", "name": "I-WIN 200 CAPS", "form": "Capsule", "cat": cat_anti, "batch": "AK68", "exp": "05-28", "mrp": 275.00, "rate": 209.52, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247506", "name": "I-WIN 100 CAPS", "form": "Capsule", "cat": cat_anti, "batch": "AK69", "exp": "05-28", "mrp": 165.00, "rate": 125.71, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247506", "name": "GRAMOCEF O 100 DT TABS", "form": "Tablet", "cat": cat_anti, "batch": "AK70", "exp": "05-28", "mrp": 95.00, "rate": 72.38, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247506", "name": "INAPURE 5 TABS", "form": "Tablet", "cat": cat_cardio, "batch": "AK71", "exp": "05-28", "mrp": 145.00, "rate": 110.48, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247506", "name": "HS CAL TABS", "form": "Tablet", "cat": cat_vit, "batch": "AK72", "exp": "05-28", "mrp": 195.00, "rate": 148.57, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247506", "name": "IVEPRED 8 TABS", "form": "Tablet", "cat": cat_anti, "batch": "AK73", "exp": "05-28", "mrp": 95.00, "rate": 72.38, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247506", "name": "IVEPRED 4 TABS", "form": "Tablet", "cat": cat_anti, "batch": "AK74", "exp": "05-28", "mrp": 65.00, "rate": 49.52, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247506", "name": "HB Z CAPS", "form": "Capsule", "cat": cat_vit, "batch": "AK75", "exp": "05-28", "mrp": 165.00, "rate": 125.71, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247506", "name": "I PILL 1'S TAB", "form": "Tablet", "cat": cat_endo, "batch": "AK76", "exp": "05-28", "mrp": 110.00, "rate": 83.81, "pack": "1'S", "qty": 5, "gst": 5.0},
        {"inv": "260007300247506", "name": "ITRABOND 100MG CAPS", "form": "Capsule", "cat": cat_anti, "batch": "AK77", "exp": "05-28", "mrp": 165.00, "rate": 125.71, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247506", "name": "HAPPIBIOTIC TABS", "form": "Tablet", "cat": cat_gastro, "batch": "AK78", "exp": "05-28", "mrp": 215.00, "rate": 163.81, "pack": "10'S", "qty": 2, "gst": 5.0},

        # Inv 260007300247269
        {"inv": "260007300247269", "name": "FOLVITE ACTIVE TABS", "form": "Tablet", "cat": cat_vit, "batch": "AK79", "exp": "05-28", "mrp": 245.00, "rate": 186.67, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247269", "name": "FOLINAL PLUS TABS", "form": "Tablet", "cat": cat_vit, "batch": "AK80", "exp": "05-28", "mrp": 195.00, "rate": 148.57, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247269", "name": "FLUVOXIN 50 TABS", "form": "Tablet", "cat": cat_neuro, "batch": "AK81", "exp": "05-28", "mrp": 165.00, "rate": 125.71, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247269", "name": "FAMOCID 40 TABS", "form": "Tablet", "cat": cat_gastro, "batch": "AK82", "exp": "05-28", "mrp": 35.00, "rate": 26.67, "pack": "14'S", "qty": 3, "gst": 5.0},
        {"inv": "260007300247269", "name": "FAMOCID 20 TABS", "form": "Tablet", "cat": cat_gastro, "batch": "AK83", "exp": "05-28", "mrp": 22.00, "rate": 16.76, "pack": "14'S", "qty": 3, "gst": 5.0},
        {"inv": "260007300247269", "name": "FOSIROL POWDR 8G", "form": "Powder", "cat": cat_anti, "batch": "AK84", "exp": "05-28", "mrp": 395.00, "rate": 300.95, "pack": "8GM", "qty": 1, "gst": 5.0},
        {"inv": "260007300247269", "name": "FENOLIP-145 TABS", "form": "Tablet", "cat": cat_cardio, "batch": "AK85", "exp": "05-28", "mrp": 215.00, "rate": 163.81, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247269", "name": "FOLITRAX 5MG TABS", "form": "Tablet", "cat": cat_pain, "batch": "AK86", "exp": "05-28", "mrp": 95.00, "rate": 72.38, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247269", "name": "FOLITRAX 2.5MG TABS", "form": "Tablet", "cat": cat_pain, "batch": "AK87", "exp": "05-28", "mrp": 65.00, "rate": 49.52, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247269", "name": "FLEXON MR TABS", "form": "Tablet", "cat": cat_pain, "batch": "AK88", "exp": "05-28", "mrp": 55.00, "rate": 41.90, "pack": "10'S", "qty": 5, "gst": 5.0},
        {"inv": "260007300247269", "name": "EUGLIM-M 2 TABS", "form": "Tablet", "cat": cat_diab, "batch": "AK89", "exp": "05-28", "mrp": 145.00, "rate": 110.48, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247269", "name": "EUGLIM-M 1 TABS", "form": "Tablet", "cat": cat_diab, "batch": "AK90", "exp": "05-28", "mrp": 115.00, "rate": 87.62, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247269", "name": "GLIMY 2 TABS", "form": "Tablet", "cat": cat_diab, "batch": "AK91", "exp": "05-28", "mrp": 95.00, "rate": 72.38, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247269", "name": "GLIMY 1 TABS", "form": "Tablet", "cat": cat_diab, "batch": "AK92", "exp": "05-28", "mrp": 65.00, "rate": 49.52, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247269", "name": "GLIMESTAR 2 TABS", "form": "Tablet", "cat": cat_diab, "batch": "AK93", "exp": "05-28", "mrp": 95.00, "rate": 72.38, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247269", "name": "GLIMESTAR 1 TABS", "form": "Tablet", "cat": cat_diab, "batch": "AK94", "exp": "05-28", "mrp": 65.00, "rate": 49.52, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247269", "name": "GABANTIN 100 CAPS", "form": "Capsule", "cat": cat_neuro, "batch": "AK95", "exp": "05-28", "mrp": 145.00, "rate": 110.48, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247269", "name": "GABANTIN 300 CAPS", "form": "Capsule", "cat": cat_neuro, "batch": "AK96", "exp": "05-28", "mrp": 275.00, "rate": 209.52, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247269", "name": "EVION LC TABS", "form": "Tablet", "cat": cat_vit, "batch": "AK97", "exp": "05-28", "mrp": 95.00, "rate": 72.38, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247269", "name": "EVION 600MG CAPS", "form": "Capsule", "cat": cat_vit, "batch": "AK98", "exp": "05-28", "mrp": 95.00, "rate": 72.38, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247269", "name": "GABAWIN NT TABS", "form": "Tablet", "cat": cat_neuro, "batch": "AK99", "exp": "05-28", "mrp": 245.00, "rate": 186.67, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247269", "name": "GLYCOMET 500 TABS", "form": "Tablet", "cat": cat_diab, "batch": "AK100", "exp": "05-28", "mrp": 35.00, "rate": 26.67, "pack": "20'S", "qty": 5, "gst": 5.0},
        {"inv": "260007300247269", "name": "FLOZEN AA TABS", "form": "Tablet", "cat": cat_pain, "batch": "AK101", "exp": "05-28", "mrp": 165.00, "rate": 125.71, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247269", "name": "FORCAN 150 TABS", "form": "Tablet", "cat": cat_anti, "batch": "AK102", "exp": "05-28", "mrp": 45.00, "rate": 34.29, "pack": "1'S", "qty": 5, "gst": 5.0},
        {"inv": "260007300247269", "name": "FUSYS 150 TABS", "form": "Tablet", "cat": cat_anti, "batch": "AK103", "exp": "05-28", "mrp": 45.00, "rate": 34.29, "pack": "1'S", "qty": 5, "gst": 5.0},

        # Inv 260007300247578 (Page 1 & 2)
        {"inv": "260007300247578", "name": "KENACORT 4MG TAB 15'S", "form": "Tablet", "cat": cat_anti, "batch": "SSM0050", "exp": "04-28", "mrp": 182.12, "rate": 138.76, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247578", "name": "K GLIM 1MG TABS", "form": "Tablet", "cat": cat_diab, "batch": "KG2603", "exp": "03-28", "mrp": 20.75, "rate": 15.81, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247578", "name": "MEGAGLIPTIN TAB 10'S", "form": "Tablet", "cat": cat_diab, "batch": "BPM253599", "exp": "11-27", "mrp": 101.58, "rate": 77.39, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247578", "name": "MEFTAL 250 DT TABS", "form": "Tablet", "cat": cat_pain, "batch": "HMU2608.", "exp": "05-28", "mrp": 21.70, "rate": 16.53, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247578", "name": "MEBEX 6TAB MEBENDAZOLE(100MG)", "form": "Tablet", "cat": cat_anti, "batch": "AMQ25ANA", "exp": "06-28", "mrp": 18.57, "rate": 10.83, "pack": "6'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247578", "name": "LEVOFLOX 750 MG TABS", "form": "Tablet", "cat": cat_anti, "batch": "6SD0200", "exp": "06-29", "mrp": 66.93, "rate": 50.99, "pack": "5'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247578", "name": "MEFTAL SPAS TABS", "form": "Tablet", "cat": cat_pain, "batch": "YMS2639", "exp": "02-29", "mrp": 51.56, "rate": 39.28, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247578", "name": "LEVACETAM 500MG TAB 10'S", "form": "Tablet", "cat": cat_neuro, "batch": "LCBS0100", "exp": "04-29", "mrp": 139.60, "rate": 106.36, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247578", "name": "LEVOCET TAB 10'S", "form": "Tablet", "cat": cat_resp, "batch": "2GT26162A", "exp": "01-29", "mrp": 52.90, "rate": 40.30, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247578", "name": "JARDIANCE 25MG TAB'S 10'S", "form": "Tablet", "cat": cat_diab, "batch": "25H0421", "exp": "03-28", "mrp": 504.00, "rate": 403.20, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247578", "name": "LOSACAR 50TAB 10'S", "form": "Tablet", "cat": cat_cardio, "batch": "SB00406A", "exp": "05-28", "mrp": 120.52, "rate": 91.82, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247578", "name": "LINID TABS", "form": "Tablet", "cat": cat_anti, "batch": "IB01079A", "exp": "06-28", "mrp": 383.51, "rate": 292.19, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247578", "name": "LEVOFLOX 500 TAB", "form": "Tablet", "cat": cat_anti, "batch": "6SD0196", "exp": "06-29", "mrp": 96.68, "rate": 73.66, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247578", "name": "LOREL 1MG TAB 10'S", "form": "Tablet", "cat": cat_neuro, "batch": "4758", "exp": "03-30", "mrp": 24.82, "rate": 18.91, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247578", "name": "KARVOL PLUS CAPS 15'S", "form": "Capsule", "cat": cat_resp, "batch": "25420107", "exp": "11-28", "mrp": 156.09, "rate": 118.93, "pack": "15S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247578", "name": "LIPICARD 160 TABS 10'S", "form": "Tablet", "cat": cat_cardio, "batch": "28028433", "exp": "04-28", "mrp": 223.00, "rate": 169.90, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247578", "name": "LOPAMIDE TAB", "form": "Tablet", "cat": cat_gastro, "batch": "2G92N005", "exp": "04-29", "mrp": 24.45, "rate": 18.63, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247578", "name": "LASILACTONE 50 TABS", "form": "Tablet", "cat": cat_cardio, "batch": "6GCW001", "exp": "12-28", "mrp": 73.52, "rate": 56.02, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247578", "name": "ISTAVEL 100MG TAB 10'S", "form": "Tablet", "cat": cat_diab, "batch": "GTH2043A", "exp": "05-28", "mrp": 175.00, "rate": 133.34, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247578", "name": "LUMIA 60K CAPS 8'S", "form": "Capsule", "cat": cat_vit, "batch": "SIH1028A", "exp": "04-28", "mrp": 264.65, "rate": 201.64, "pack": "8'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247578", "name": "LIPIKIND 20MG TAB", "form": "Tablet", "cat": cat_cardio, "batch": "E15Z008", "exp": "03-28", "mrp": 62.62, "rate": 47.71, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247578", "name": "KERABOOST TAB 10'S", "form": "Tablet", "cat": cat_vit, "batch": "GT600180A", "exp": "03-28", "mrp": 214.68, "rate": 163.57, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247578", "name": "LIPIKIND CV 10MG TAB 10'S", "form": "Tablet", "cat": cat_cardio, "batch": "C0HQZ004", "exp": "04-28", "mrp": 120.39, "rate": 91.73, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247578", "name": "LIVOGEN-XT TABS 10'S", "form": "Tablet", "cat": cat_vit, "batch": "6163C84205", "exp": "05-28", "mrp": 217.85, "rate": 165.98, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247578", "name": "LUPISIT D 100MG/10MG TABLET 10'S", "form": "Tablet", "cat": cat_diab, "batch": "EMV261636B", "exp": "05-28", "mrp": 237.00, "rate": 180.57, "pack": "10'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247578", "name": "LAMIFIN TAB 10'S", "form": "Tablet", "cat": cat_anti, "batch": "T6336", "exp": "05-28", "mrp": 212.00, "rate": 161.52, "pack": "10S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247578", "name": "LIPICARD CAPS 10'S", "form": "Capsule", "cat": cat_cardio, "batch": "28028349", "exp": "04-28", "mrp": 300.80, "rate": 229.18, "pack": "10'S", "qty": 2, "gst": 5.0},

        # Inv 260007300247823
        {"inv": "260007300247823", "name": "LASIX TABS 15'S", "form": "Tablet", "cat": cat_cardio, "batch": "6GAK404", "exp": "12-28", "mrp": 14.42, "rate": 11.53, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247823", "name": "K GLIM 2MG TAB 15'S", "form": "Tablet", "cat": cat_diab, "batch": "KGT2603", "exp": "03-28", "mrp": 31.00, "rate": 23.62, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247823", "name": "LONAZEP 0.25MG TABS", "form": "Tablet", "cat": cat_neuro, "batch": "SIH0910A", "exp": "04-28", "mrp": 32.39, "rate": 24.68, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247823", "name": "LAXOPEG SACHET 17GM", "form": "Powder", "cat": cat_gastro, "batch": "W26E23", "exp": "04-28", "mrp": 49.00, "rate": 37.34, "pack": "17GM", "qty": 2, "gst": 5.0},
        {"inv": "260007300247823", "name": "LIPITAB 10MG TAB'S 15'S", "form": "Tablet", "cat": cat_cardio, "batch": "HT26132", "exp": "01-29", "mrp": 68.98, "rate": 52.56, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247823", "name": "LOMOTIL TAB 20'S", "form": "Tablet", "cat": cat_gastro, "batch": "03L26024", "exp": "02-28", "mrp": 31.70, "rate": 24.15, "pack": "20'S", "qty": 3, "gst": 5.0},
        {"inv": "260007300247823", "name": "JALRA 50 MG TAB 15'S", "form": "Tablet", "cat": cat_diab, "batch": "48021262", "exp": "01-28", "mrp": 331.41, "rate": 252.50, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247823", "name": "KETOROL DT 15'S", "form": "Tablet", "cat": cat_pain, "batch": "E2601397", "exp": "05-29", "mrp": 182.78, "rate": 139.26, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247823", "name": "LOSAR 25MG TAB 15'S", "form": "Tablet", "cat": cat_cardio, "batch": "9FY7N005", "exp": "02-29", "mrp": 103.73, "rate": 79.03, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247823", "name": "LEVERA-500MG TAB 15'S", "form": "Tablet", "cat": cat_neuro, "batch": "N2601766", "exp": "05-29", "mrp": 209.48, "rate": 159.60, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247823", "name": "LORINOL 10 TAB 15'S", "form": "Tablet", "cat": cat_resp, "batch": "L0AS0078", "exp": "09-28", "mrp": 167.80, "rate": 127.85, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247823", "name": "LOSTAT H TABS 15'S", "form": "Tablet", "cat": cat_cardio, "batch": "LSH2602", "exp": "01-28", "mrp": 76.87, "rate": 58.57, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247823", "name": "LACTARE CAPS 30'S", "form": "Capsule", "cat": cat_vit, "batch": "C5DJZ011", "exp": "03-28", "mrp": 300.00, "rate": 228.57, "pack": "30'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247823", "name": "LAMITOR DT 25 15'S", "form": "Tablet", "cat": cat_neuro, "batch": "2KBAM005", "exp": "08-28", "mrp": 167.70, "rate": 127.77, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247823", "name": "LIMCEE 500 MG TABS 15'S", "form": "Tablet", "cat": cat_vit, "batch": "LBR26573", "exp": "04-28", "mrp": 24.84, "rate": 18.93, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247823", "name": "MIDORISE 2.5 TABLET 20'S", "form": "Tablet", "cat": cat_cardio, "batch": "GFFG0005", "exp": "05-28", "mrp": 1176.00, "rate": 896.00, "pack": "20'S", "qty": 2, "gst": 5.0},

        # Inv 260007300247270
        {"inv": "260007300247270", "name": "ESGIPYRIN TABS 15'S", "form": "Tablet", "cat": cat_pain, "batch": "SSL0163", "exp": "09-27", "mrp": 146.14, "rate": 111.34, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247270", "name": "GABAPIN 100MG 15'S TAB", "form": "Tablet", "cat": cat_neuro, "batch": "N2601434", "exp": "04-28", "mrp": 169.10, "rate": 128.84, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247270", "name": "GLIMIPREX MF 1/500MG TAB 15'S", "form": "Tablet", "cat": cat_diab, "batch": "SPE260710", "exp": "04-28", "mrp": 122.00, "rate": 92.95, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247270", "name": "GLUCONORM G2 TABS 15'S", "form": "Tablet", "cat": cat_diab, "batch": "UC01302", "exp": "04-28", "mrp": 359.75, "rate": 274.10, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247270", "name": "GLYCOMET-GP 1 15'S", "form": "Tablet", "cat": cat_diab, "batch": "60002910", "exp": "04-28", "mrp": 123.28, "rate": 93.93, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247270", "name": "GLYCINORM 80MG TAB 15'S", "form": "Tablet", "cat": cat_diab, "batch": "EKK0826002AS", "exp": "02-29", "mrp": 168.98, "rate": 128.75, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247270", "name": "GARDENAL 60MG TAB 100'S", "form": "Tablet", "cat": cat_neuro, "batch": "GEM26001", "exp": "03-29", "mrp": 202.65, "rate": 154.40, "pack": "100'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247270", "name": "GLYCINORM 40MG TABS 15'S", "form": "Tablet", "cat": cat_diab, "batch": "EKJ0526002AS", "exp": "01-29", "mrp": 101.53, "rate": 77.35, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247270", "name": "GLUCONORM G1 TABS 15'S", "form": "Tablet", "cat": cat_diab, "batch": "UC01549", "exp": "05-28", "mrp": 255.50, "rate": 194.67, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247270", "name": "GLUCONORM SR 500MG TABS 15'S", "form": "Tablet", "cat": cat_diab, "batch": "UC01543", "exp": "04-28", "mrp": 32.45, "rate": 24.72, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247270", "name": "ECOSPRIN GOLD 10 CAP'S 15'S", "form": "Capsule", "cat": cat_cardio, "batch": "EGSC26024B", "exp": "10-27", "mrp": 139.50, "rate": 111.60, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247270", "name": "GLYCOMET -GP 2 15'S", "form": "Tablet", "cat": cat_diab, "batch": "60002992", "exp": "05-28", "mrp": 180.00, "rate": 137.14, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247270", "name": "ECOSPRIN-AV 75 CAPS 15'S", "form": "Capsule", "cat": cat_cardio, "batch": "28028482B", "exp": "10-27", "mrp": 65.50, "rate": 52.40, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247270", "name": "FURIC 40MG TAB 15S", "form": "Tablet", "cat": cat_pain, "batch": "JC01092", "exp": "03-28", "mrp": 291.15, "rate": 221.83, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247270", "name": "FELIZ S PLUS TABS 15'S", "form": "Tablet", "cat": cat_neuro, "batch": "2396N003", "exp": "02-29", "mrp": 330.75, "rate": 252.00, "pack": "15'S", "qty": 2, "gst": 5.0},
        {"inv": "260007300247270", "name": "EUGI 1GM SAC", "form": "Powder", "cat": cat_anti, "batch": "16SEU139", "exp": "11-27", "mrp": 20.62, "rate": 15.71, "pack": "1SACH", "qty": 2, "gst": 5.0},
    ]

    count = 0
    for item in ak_items:
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
                "supplier": sup,
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
            batch.supplier = sup
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
            notes=f"Purchase from A.K Pharma Inv #{item['inv']}"
        )
        count += 1
    print(f"  [+] Imported {count} items from A.K Pharma.")

if __name__ == '__main__':
    run()
