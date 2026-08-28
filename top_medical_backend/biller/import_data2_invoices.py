import os
import sys
from decimal import Decimal
from datetime import date
import django

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'biller.settings')
django.setup()

from django.db import transaction
from inventory.models import Category, Supplier, Medicine, Batch, StockMovement
from data_imports_util import parse_expiry, parse_pack_size, get_or_create_category

def get_or_create_supplier_fast(sup_data, supplier_cache):
    name = (sup_data.get('name') or '').strip()
    gst = (sup_data.get('gstin') or '').strip()
    key = name.lower()
    
    if key in supplier_cache:
        return supplier_cache[key]
    
    sup = Supplier.objects.filter(name__iexact=name).first()
    if not sup and gst:
        sup = Supplier.objects.filter(gstin__iexact=gst).first()
    
    if not sup:
        sup = Supplier.objects.create(
            name=name,
            contact_person=(sup_data.get('contact_person') or '')[:100],
            phone=(sup_data.get('phone') or '')[:20],
            email=(sup_data.get('email') or ''),
            gstin=gst[:50],
            address=(sup_data.get('address') or '')
        )
    else:
        if gst and not sup.gstin:
            sup.gstin = gst
        if sup_data.get('phone') and not sup.phone:
            sup.phone = sup_data.get('phone')[:20]
        if sup_data.get('address') and not sup.address:
            sup.address = sup_data.get('address')
        sup.save()
        
    supplier_cache[key] = sup
    return sup

def ingest_all_invoices():
    print("=" * 80)
    print("STARTING HIGH-PERFORMANCE DATA2 INVOICE INGESTION")
    print("=" * 80)

    # 1. Preload Caches
    print("Pre-loading database cache...")
    cat_resp = get_or_create_category("Respiratory & Inhalers", "Inhalers, Respules, Cough & Asthma")
    cat_anti = get_or_create_category("Antibiotics & Anti-Infectives", "Antibiotics, Anti-fungals, Anti-virals")
    cat_cardio = get_or_create_category("Cardiovascular & Hypertension", "Blood pressure, Cardiac, Cholesterol")
    cat_pain = get_or_create_category("Analgesics & Pain Management", "Pain relief, Anti-inflammatory, Spasm")
    cat_derma = get_or_create_category("Dermatology & Topicals", "Ointments, Creams, Gels, Soaps, Shampoos")
    cat_gastro = get_or_create_category("Gastrointestinal & Digestion", "Antacids, Laxatives, Probiotics")
    cat_vit = get_or_create_category("Vitamins & Supplements", "Multivitamins, Calcium, Vitamin D3")
    cat_neuro = get_or_create_category("Neurology & Psychiatry", "Anticonvulsants, Antidepressants")
    cat_diab = get_or_create_category("Diabetes & Endocrine", "Insulins, Oral Hypoglycemics")
    cat_baby = get_or_create_category("Baby & Child Care", "Diapers, Baby Wipes, Baby Skincare")
    cat_hygiene = get_or_create_category("Personal Care & Hygiene", "Sanitary Pads, Haircare, Shaving, Dental Care")
    cat_surg = get_or_create_category("Surgical & Medical Consumables", "Bandages, Sprays, Antiseptics")
    cat_women = get_or_create_category("Women's Health & Hormones", "Contraceptives, Hormone Therapy")
    cat_eye = get_or_create_category("Ophthalmology & Eye Drops", "Eye drops, Ointments, Eye care")
    cat_uro = get_or_create_category("Urology & Men's Health", "Prostate, Urinary Tract")

    supplier_cache = {s.name.lower(): s for s in Supplier.objects.all()}
    medicine_cache = {m.name.strip().upper(): m for m in Medicine.objects.all()}
    batch_cache = {(b.medicine_id, b.batch_number.strip().upper()): b for b in Batch.objects.all()}
    existing_movement_refs = set(StockMovement.objects.values_list('reference_id', flat=True))

    invoices_data = [
        # 1. Amazon / P&G
        {
            "supplier": {
                "name": "Amazon Distributors Pvt. Ltd. (P & G)",
                "contact_person": "Vinod N (DSE Name)",
                "phone": "6362292599",
                "email": "amazondistributors.mangalore@gmail.com",
                "gstin": "29AAAFCA9197E1Z9",
                "address": "Near Padil Railway Over Bridge, Alape Padil, Mangalore"
            },
            "inv_num": "ABMNG-26-1031145",
            "inv_date": "2026-08-26",
            "items": [
                {"name": "OLAY NA IGF 40GM", "form": "Ointment", "cat": cat_derma, "mfr": "Procter & Gamble", "mrp": 199.00, "rate": 146.65, "qty": 1, "pack": "1NOS", "gst": 18.0, "hsn": "33049990"},
                {"name": "OLAY NA IGF 20GM", "form": "Ointment", "cat": cat_derma, "mfr": "Procter & Gamble", "mrp": 109.00, "rate": 80.32, "qty": 1, "pack": "1NOS", "gst": 18.0, "hsn": "33049990"},
                {"name": "OLD SPICE CREAM MUSK 30G", "form": "Ointment", "cat": cat_hygiene, "mfr": "Procter & Gamble", "mrp": 40.00, "rate": 34.01, "qty": 1, "pack": "1NOS", "gst": 5.0, "hsn": "33071010"},
                {"name": "OLD SPICE ASL ORIGINAL 50ML", "form": "Drops", "cat": cat_hygiene, "mfr": "Procter & Gamble", "mrp": 133.00, "rate": 112.25, "qty": 1, "pack": "1NOS", "gst": 5.0, "hsn": "33071010"},
                {"name": "GILLETTE TSG (MST) 60G", "form": "Ointment", "cat": cat_hygiene, "mfr": "Gillette India", "mrp": 99.00, "rate": 74.91, "qty": 1, "pack": "1NOS", "gst": 18.0, "hsn": "33071090"},
                {"name": "GILLETTE CREAM REG 70GM", "form": "Ointment", "cat": cat_hygiene, "mfr": "Gillette India", "mrp": 71.00, "rate": 60.38, "qty": 1, "pack": "1NOS", "gst": 5.0, "hsn": "33071010"},
                {"name": "GILLETTE CREAM REG 30GM", "form": "Ointment", "cat": cat_hygiene, "mfr": "Gillette India", "mrp": 40.00, "rate": 34.01, "qty": 1, "pack": "1NOS", "gst": 5.0, "hsn": "33071010"},
                {"name": "GILLETTE CREAM LIME 93GM", "form": "Ointment", "cat": cat_hygiene, "mfr": "Gillette India", "mrp": 71.00, "rate": 60.38, "qty": 1, "pack": "1NOS", "gst": 5.0, "hsn": "33071010"},
                {"name": "GILLETTE CREAM LIME 30GM", "form": "Ointment", "cat": cat_hygiene, "mfr": "Gillette India", "mrp": 40.00, "rate": 34.01, "qty": 1, "pack": "1NOS", "gst": 5.0, "hsn": "33071010"},
                {"name": "GILLETTE FOAM (REG) 50GM", "form": "Device", "cat": cat_hygiene, "mfr": "Gillette India", "mrp": 95.00, "rate": 71.89, "qty": 2, "pack": "1NOS", "gst": 18.0, "hsn": "33071090"},
                {"name": "GILLETTE FOAM (REG) 196M", "form": "Device", "cat": cat_hygiene, "mfr": "Gillette India", "mrp": 249.00, "rate": 188.41, "qty": 1, "pack": "1NOS", "gst": 18.0, "hsn": "33071090"},
                {"name": "ORAL-B DENTAL FLOSS", "form": "Device", "cat": cat_hygiene, "mfr": "Procter & Gamble", "mrp": 140.00, "rate": 111.11, "qty": 1, "pack": "1NOS", "gst": 5.0, "hsn": "33062000"},
                {"name": "ORAL-B SENS WHITE B2G2", "form": "Device", "cat": cat_hygiene, "mfr": "Procter & Gamble", "mrp": 150.00, "rate": 119.05, "qty": 1, "pack": "4NOS", "gst": 5.0, "hsn": "96032100"},
                {"name": "ORAL-B SENS CARE 9+3 CC SENS", "form": "Device", "cat": cat_hygiene, "mfr": "Procter & Gamble", "mrp": 270.00, "rate": 214.29, "qty": 1, "pack": "12NOS", "gst": 5.0, "hsn": "96032100"},
                {"name": "ORAL-B SENS CARE 5S PACK", "form": "Device", "cat": cat_hygiene, "mfr": "Procter & Gamble", "mrp": 130.00, "rate": 103.18, "qty": 1, "pack": "5NOS", "gst": 5.0, "hsn": "96032100"},
                {"name": "ORAL-B KIDS 3S MICKEY", "form": "Device", "cat": cat_baby, "mfr": "Procter & Gamble", "mrp": 110.00, "rate": 87.30, "qty": 1, "pack": "3NOS", "gst": 5.0, "hsn": "96032100"},
                {"name": "ORAL-B CRISSCROSS SENS UT 5+3", "form": "Device", "cat": cat_hygiene, "mfr": "Procter & Gamble", "mrp": 275.00, "rate": 218.25, "qty": 1, "pack": "8NOS", "gst": 5.0, "hsn": "96032100"},
                {"name": "ORAL-B CRISSCROSS RS 50 6+2CD M", "form": "Device", "cat": cat_hygiene, "mfr": "Procter & Gamble", "mrp": 240.00, "rate": 190.48, "qty": 1, "pack": "8NOS", "gst": 5.0, "hsn": "96032100"},
                {"name": "ORAL-B CDBACF S 6SPACK", "form": "Device", "cat": cat_hygiene, "mfr": "Procter & Gamble", "mrp": 130.00, "rate": 103.18, "qty": 1, "pack": "6NOS", "gst": 5.0, "hsn": "96032100"},
                {"name": "ORAL-B CAV DEF M 9+3EC FREE", "form": "Device", "cat": cat_hygiene, "mfr": "Procter & Gamble", "mrp": 225.00, "rate": 178.57, "qty": 1, "pack": "12NOS", "gst": 5.0, "hsn": "96032100"},
                {"name": "ORAL-B 3IN1 GPCARD 6+6+3", "form": "Device", "cat": cat_hygiene, "mfr": "Procter & Gamble", "mrp": 240.00, "rate": 190.48, "qty": 1, "pack": "15NOS", "gst": 5.0, "hsn": "96032100"},
                {"name": "ORAL-B SMALL RTM BOX PACK", "form": "Device", "cat": cat_hygiene, "mfr": "Procter & Gamble", "mrp": 658.00, "rate": 468.03, "qty": 1, "pack": "1NOS", "gst": 5.0, "hsn": "96032100"},
                {"name": "VICKS COUGH DROPS 175+50 PK", "form": "Drops", "cat": cat_resp, "mfr": "Procter & Gamble", "mrp": 350.00, "rate": 278.14, "qty": 1, "pack": "225NOS", "gst": 5.0, "hsn": "30049011"},
                {"name": "VICKS VAPORUB XTRA STRONG 50ML", "form": "Ointment", "cat": cat_resp, "mfr": "Procter & Gamble", "mrp": 229.00, "rate": 181.99, "qty": 1, "pack": "50ML", "gst": 5.0, "hsn": "30049011"},
                {"name": "VICKS VAPORUB XTRA STRONG 25ML", "form": "Ointment", "cat": cat_resp, "mfr": "Procter & Gamble", "mrp": 128.00, "rate": 101.72, "qty": 3, "pack": "25ML", "gst": 5.0, "hsn": "30049011"},
                {"name": "VICKS VAPORUB XTRA STRONG 10ML", "form": "Ointment", "cat": cat_resp, "mfr": "Procter & Gamble", "mrp": 59.00, "rate": 46.89, "qty": 6, "pack": "10ML", "gst": 5.0, "hsn": "30049011"},
                {"name": "VICKS VAPORUB 5GM", "form": "Ointment", "cat": cat_resp, "mfr": "Procter & Gamble", "mrp": 23.00, "rate": 18.28, "qty": 12, "pack": "5GM", "gst": 5.0, "hsn": "30049011"},
                {"name": "VICKS VAPORUB 50GM", "form": "Ointment", "cat": cat_resp, "mfr": "Procter & Gamble", "mrp": 199.00, "rate": 158.15, "qty": 2, "pack": "50GM", "gst": 5.0, "hsn": "30049011"},
                {"name": "VICKS VAPORUB 25GM", "form": "Ointment", "cat": cat_resp, "mfr": "Procter & Gamble", "mrp": 109.00, "rate": 86.62, "qty": 3, "pack": "25GM", "gst": 5.0, "hsn": "30049011"},
                {"name": "VICKS VAPORUB 10GM", "form": "Ointment", "cat": cat_resp, "mfr": "Procter & Gamble", "mrp": 48.00, "rate": 38.14, "qty": 12, "pack": "10GM", "gst": 5.0, "hsn": "30049011"},
                {"name": "VICKS VAPORUB 105ML", "form": "Ointment", "cat": cat_resp, "mfr": "Procter & Gamble", "mrp": 349.00, "rate": 277.35, "qty": 1, "pack": "105ML", "gst": 5.0, "hsn": "30049011"},
                {"name": "VICKS INHALER KEYCHAIN HANGSELL", "form": "Inhaler", "cat": cat_resp, "mfr": "Procter & Gamble", "mrp": 1116.00, "rate": 813.01, "qty": 1, "pack": "12NOS", "gst": 5.0, "hsn": "30049011"},
                {"name": "VICKS INHALER HANGING JUMBO", "form": "Inhaler", "cat": cat_resp, "mfr": "Procter & Gamble", "mrp": 2070.00, "rate": 1425.68, "qty": 1, "pack": "25NOS", "gst": 5.0, "hsn": "30049011"},
                {"name": "VICKS BABYRUB 50 ML", "form": "Ointment", "cat": cat_baby, "mfr": "Procter & Gamble", "mrp": 229.00, "rate": 181.99, "qty": 1, "pack": "50ML", "gst": 5.0, "hsn": "30049011"},
                {"name": "VICKS BABYRUB 25 ML", "form": "Ointment", "cat": cat_baby, "mfr": "Procter & Gamble", "mrp": 128.00, "rate": 101.72, "qty": 3, "pack": "25ML", "gst": 5.0, "hsn": "30049011"},
                {"name": "VICKS BABYRUB 10 ML", "form": "Ointment", "cat": cat_baby, "mfr": "Procter & Gamble", "mrp": 59.00, "rate": 46.89, "qty": 6, "pack": "10ML", "gst": 5.0, "hsn": "30049011"},
                {"name": "PANTENE CONDI HFC 90ML", "form": "Syrup", "cat": cat_hygiene, "mfr": "Procter & Gamble", "mrp": 105.00, "rate": 77.38, "qty": 1, "pack": "90ML", "gst": 18.0, "hsn": "33059090"},
                {"name": "PANTENE SHAMPOO SILKY SMOOTH 75ML", "form": "Syrup", "cat": cat_hygiene, "mfr": "Procter & Gamble", "mrp": 75.00, "rate": 64.93, "qty": 1, "pack": "75ML", "gst": 5.0, "hsn": "33051090"},
                {"name": "PANTENE SHAMPOO SILKY SMOOTH 180ML", "form": "Syrup", "cat": cat_hygiene, "mfr": "Procter & Gamble", "mrp": 192.00, "rate": 166.24, "qty": 1, "pack": "180ML", "gst": 5.0, "hsn": "33051090"},
                {"name": "PANTENE LIVELY CLEAN 90ML", "form": "Syrup", "cat": cat_hygiene, "mfr": "Procter & Gamble", "mrp": 75.00, "rate": 64.93, "qty": 1, "pack": "90ML", "gst": 5.0, "hsn": "33051090"},
                {"name": "PANTENE LIVELY CLEAN 200ML", "form": "Syrup", "cat": cat_hygiene, "mfr": "Procter & Gamble", "mrp": 192.00, "rate": 166.24, "qty": 1, "pack": "200ML", "gst": 5.0, "hsn": "33051090"},
                {"name": "PANTENE HAIR FALL CONTROL 75ML", "form": "Syrup", "cat": cat_hygiene, "mfr": "Procter & Gamble", "mrp": 75.00, "rate": 64.93, "qty": 1, "pack": "75ML", "gst": 5.0, "hsn": "33051090"},
                {"name": "PANTENE HAIR FALL CONTROL 180ML", "form": "Syrup", "cat": cat_hygiene, "mfr": "Procter & Gamble", "mrp": 192.00, "rate": 166.24, "qty": 1, "pack": "180ML", "gst": 5.0, "hsn": "33051090"},
                {"name": "PANTENE DAMAGE RESCUE 75ML", "form": "Syrup", "cat": cat_hygiene, "mfr": "Procter & Gamble", "mrp": 75.00, "rate": 64.93, "qty": 1, "pack": "75ML", "gst": 5.0, "hsn": "33051090"},
                {"name": "HEAD & SHOULDERS SMOOTH & SILKY 72ML", "form": "Syrup", "cat": cat_hygiene, "mfr": "Procter & Gamble", "mrp": 79.00, "rate": 68.39, "qty": 1, "pack": "72ML", "gst": 5.0, "hsn": "33051090"},
                {"name": "HEAD & SHOULDERS SMOOTH & SILKY 180ML", "form": "Syrup", "cat": cat_hygiene, "mfr": "Procter & Gamble", "mrp": 218.00, "rate": 188.74, "qty": 1, "pack": "180ML", "gst": 5.0, "hsn": "33051090"},
                {"name": "HEAD & SHOULDERS SILKY BLACK 72ML", "form": "Syrup", "cat": cat_hygiene, "mfr": "Procter & Gamble", "mrp": 79.00, "rate": 68.39, "qty": 1, "pack": "72ML", "gst": 5.0, "hsn": "33051090"},
                {"name": "HEAD & SHOULDERS SILKY BLACK 180ML", "form": "Syrup", "cat": cat_hygiene, "mfr": "Procter & Gamble", "mrp": 218.00, "rate": 188.74, "qty": 1, "pack": "180ML", "gst": 5.0, "hsn": "33051090"},
                {"name": "HEAD & SHOULDERS LEMON FRESH 72ML", "form": "Syrup", "cat": cat_hygiene, "mfr": "Procter & Gamble", "mrp": 79.00, "rate": 68.39, "qty": 1, "pack": "72ML", "gst": 5.0, "hsn": "33051090"},
                {"name": "HEAD & SHOULDERS LEMON FRESH 200ML", "form": "Syrup", "cat": cat_hygiene, "mfr": "Procter & Gamble", "mrp": 218.00, "rate": 188.74, "qty": 1, "pack": "200ML", "gst": 5.0, "hsn": "33051090"},
                {"name": "HEAD & SHOULDERS COOL MENTHOL 72ML", "form": "Syrup", "cat": cat_hygiene, "mfr": "Procter & Gamble", "mrp": 79.00, "rate": 68.39, "qty": 1, "pack": "72ML", "gst": 5.0, "hsn": "33051090"},
                {"name": "HEAD & SHOULDERS COOL MENTHOL 180ML", "form": "Syrup", "cat": cat_hygiene, "mfr": "Procter & Gamble", "mrp": 218.00, "rate": 188.74, "qty": 1, "pack": "180ML", "gst": 5.0, "hsn": "33051090"},
                {"name": "HEAD & SHOULDERS ANTI-HAIRFALL 180ML", "form": "Syrup", "cat": cat_hygiene, "mfr": "Procter & Gamble", "mrp": 218.00, "rate": 188.74, "qty": 1, "pack": "180ML", "gst": 5.0, "hsn": "33051090"},
                {"name": "HEAD & SHOULDERS NEEM 72ML", "form": "Syrup", "cat": cat_hygiene, "mfr": "Procter & Gamble", "mrp": 93.00, "rate": 80.51, "qty": 1, "pack": "72ML", "gst": 5.0, "hsn": "33051090"},
                {"name": "HEAD & SHOULDERS NEEM 180ML", "form": "Syrup", "cat": cat_hygiene, "mfr": "Procter & Gamble", "mrp": 258.00, "rate": 223.38, "qty": 1, "pack": "180ML", "gst": 5.0, "hsn": "33051090"},
                {"name": "GILLETTE VECTOR3 RAZOR", "form": "Device", "cat": cat_hygiene, "mfr": "Gillette India", "mrp": 175.00, "rate": 132.42, "qty": 1, "pack": "1NOS", "gst": 18.0, "hsn": "82121010"},
                {"name": "GILLETTE VECTOR3 CARTRIDGES 4S", "form": "Device", "cat": cat_hygiene, "mfr": "Gillette India", "mrp": 275.00, "rate": 208.08, "qty": 1, "pack": "4NOS", "gst": 18.0, "hsn": "82122011"},
                {"name": "GILLETTE GUARD 3IN1 RAZOR", "form": "Device", "cat": cat_hygiene, "mfr": "Gillette India", "mrp": 125.00, "rate": 94.58, "qty": 1, "pack": "1NOS", "gst": 18.0, "hsn": "82121010"},
                {"name": "GILLETTE GUARD 3IN1 CARTRIDGES 2S", "form": "Device", "cat": cat_hygiene, "mfr": "Gillette India", "mrp": 99.00, "rate": 74.91, "qty": 1, "pack": "2NOS", "gst": 18.0, "hsn": "82122011"},
                {"name": "GILLETTE GUARD RAZOR RS 28", "form": "Device", "cat": cat_hygiene, "mfr": "Gillette India", "mrp": 140.00, "rate": 93.92, "qty": 3, "pack": "1NOS", "gst": 18.0, "hsn": "82121010"},
                {"name": "GILLETTE GUARD BLADES 1S", "form": "Device", "cat": cat_hygiene, "mfr": "Gillette India", "mrp": 150.00, "rate": 102.52, "qty": 1, "pack": "10NOS", "gst": 18.0, "hsn": "82122011"},
                {"name": "GILLETTE MACH 3 RAZOR", "form": "Device", "cat": cat_hygiene, "mfr": "Gillette India", "mrp": 369.00, "rate": 226.25, "qty": 1, "pack": "1NOS", "gst": 18.0, "hsn": "82121010"},
                {"name": "GILLETTE MACH 3 CARTRIDGES 2S", "form": "Device", "cat": cat_hygiene, "mfr": "Gillette India", "mrp": 375.00, "rate": 283.75, "qty": 1, "pack": "2NOS", "gst": 18.0, "hsn": "82122011"},
                {"name": "GILLETTE FUSION RAZOR", "form": "Device", "cat": cat_hygiene, "mfr": "Gillette India", "mrp": 425.00, "rate": 321.58, "qty": 1, "pack": "1NOS", "gst": 18.0, "hsn": "82121010"},
                {"name": "GILLETTE VENUS RAZOR", "form": "Device", "cat": cat_hygiene, "mfr": "Gillette India", "mrp": 325.00, "rate": 241.60, "qty": 1, "pack": "1NOS", "gst": 18.0, "hsn": "82121010"},
                {"name": "GILLETTE VENUS BREEZE RAZOR", "form": "Device", "cat": cat_hygiene, "mfr": "Gillette India", "mrp": 399.00, "rate": 296.61, "qty": 1, "pack": "1NOS", "gst": 18.0, "hsn": "82121010"},
                {"name": "WHISPER BINDAS NIGHTS SOFT XL+ 15S", "form": "Device", "cat": cat_hygiene, "mfr": "Procter & Gamble", "mrp": 215.00, "rate": 193.69, "qty": 1, "pack": "15NOS", "gst": 0.0, "hsn": "96190010"},
                {"name": "WHISPER BINDAS NIGHTS SOFT XL 15S", "form": "Device", "cat": cat_hygiene, "mfr": "Procter & Gamble", "mrp": 195.00, "rate": 175.67, "qty": 1, "pack": "15NOS", "gst": 0.0, "hsn": "96190010"},
                {"name": "WHISPER ULTRA CLEAN XL+ 7S", "form": "Device", "cat": cat_hygiene, "mfr": "Procter & Gamble", "mrp": 99.00, "rate": 89.19, "qty": 3, "pack": "7NOS", "gst": 0.0, "hsn": "96190010"},
                {"name": "WHISPER ULTRA CLEAN XL+ 15S", "form": "Device", "cat": cat_hygiene, "mfr": "Procter & Gamble", "mrp": 210.00, "rate": 189.19, "qty": 2, "pack": "15NOS", "gst": 0.0, "hsn": "96190010"},
                {"name": "WHISPER ULTRA CLEAN XL 6S", "form": "Device", "cat": cat_hygiene, "mfr": "Procter & Gamble", "mrp": 70.00, "rate": 63.06, "qty": 2, "pack": "6NOS", "gst": 0.0, "hsn": "96190010"},
                {"name": "WHISPER ULTRA CLEAN XL 30S", "form": "Device", "cat": cat_hygiene, "mfr": "Procter & Gamble", "mrp": 369.00, "rate": 323.69, "qty": 1, "pack": "30NOS", "gst": 0.0, "hsn": "96190010"},
                {"name": "WHISPER ULTRA CLEAN XL 15S", "form": "Device", "cat": cat_hygiene, "mfr": "Procter & Gamble", "mrp": 185.00, "rate": 166.67, "qty": 1, "pack": "15NOS", "gst": 0.0, "hsn": "96190010"},
                {"name": "WHISPER ULTRA NIGHTS XXXL 10S", "form": "Device", "cat": cat_hygiene, "mfr": "Procter & Gamble", "mrp": 370.00, "rate": 324.56, "qty": 1, "pack": "10NOS", "gst": 0.0, "hsn": "96190010"},
                {"name": "WHISPER ULTRA NIGHTS XXXL 4S", "form": "Device", "cat": cat_hygiene, "mfr": "Procter & Gamble", "mrp": 150.00, "rate": 131.58, "qty": 2, "pack": "4NOS", "gst": 0.0, "hsn": "96190010"},
                {"name": "WHISPER ULTRA NIGHTS XXL+ 6S", "form": "Device", "cat": cat_hygiene, "mfr": "Procter & Gamble", "mrp": 150.00, "rate": 131.58, "qty": 2, "pack": "6NOS", "gst": 0.0, "hsn": "96190010"},
                {"name": "WHISPER ULTRA NIGHTS XXL+ 16S", "form": "Device", "cat": cat_hygiene, "mfr": "Procter & Gamble", "mrp": 370.00, "rate": 324.56, "qty": 1, "pack": "16NOS", "gst": 0.0, "hsn": "96190010"},
                {"name": "WHISPER CHOICE XL 6S", "form": "Device", "cat": cat_hygiene, "mfr": "Procter & Gamble", "mrp": 45.00, "rate": 40.54, "qty": 15, "pack": "6NOS", "gst": 0.0, "hsn": "96190010"},
                {"name": "WHISPER CHOICE XL 18S", "form": "Device", "cat": cat_hygiene, "mfr": "Procter & Gamble", "mrp": 125.00, "rate": 112.61, "qty": 1, "pack": "18NOS", "gst": 0.0, "hsn": "96190010"},
                {"name": "WHISPER CHOICE XL 12S", "form": "Device", "cat": cat_hygiene, "mfr": "Procter & Gamble", "mrp": 80.00, "rate": 72.08, "qty": 2, "pack": "12NOS", "gst": 0.0, "hsn": "96190010"},
                {"name": "WHISPER CHOICE ULTRA 20S", "form": "Device", "cat": cat_hygiene, "mfr": "Procter & Gamble", "mrp": 160.00, "rate": 144.14, "qty": 1, "pack": "20NOS", "gst": 0.0, "hsn": "96190010"},
                {"name": "WHISPER CHOICE ULTRA 10S", "form": "Device", "cat": cat_hygiene, "mfr": "Procter & Gamble", "mrp": 80.00, "rate": 72.08, "qty": 3, "pack": "10NOS", "gst": 0.0, "hsn": "96190010"},
                {"name": "WHISPER CHOICE WINGS 6S", "form": "Device", "cat": cat_hygiene, "mfr": "Procter & Gamble", "mrp": 40.00, "rate": 36.03, "qty": 12, "pack": "6NOS", "gst": 0.0, "hsn": "96190010"},
                {"name": "WHISPER CHOICE WINGS 18S", "form": "Device", "cat": cat_hygiene, "mfr": "Procter & Gamble", "mrp": 125.00, "rate": 112.61, "qty": 2, "pack": "18NOS", "gst": 0.0, "hsn": "96190010"},
                {"name": "PAMPERS ALL ROUND PROTECTION PANTS XXL 16S", "form": "Device", "cat": cat_baby, "mfr": "Procter & Gamble", "mrp": 389.00, "rate": 308.73, "qty": 1, "pack": "16NOS", "gst": 5.0, "hsn": "96190030"},
                {"name": "PAMPERS PANTS SM 31S", "form": "Device", "cat": cat_baby, "mfr": "Procter & Gamble", "mrp": 374.00, "rate": 296.83, "qty": 1, "pack": "31NOS", "gst": 5.0, "hsn": "96190030"},
                {"name": "PAMPERS PANTS MD 24S", "form": "Device", "cat": cat_baby, "mfr": "Procter & Gamble", "mrp": 374.00, "rate": 296.83, "qty": 1, "pack": "24NOS", "gst": 5.0, "hsn": "96190030"},
                {"name": "PAMPERS PANTS LG 21S", "form": "Device", "cat": cat_baby, "mfr": "Procter & Gamble", "mrp": 374.00, "rate": 296.83, "qty": 1, "pack": "21NOS", "gst": 5.0, "hsn": "96190030"},
                {"name": "PAMPERS PANTS XL 7S", "form": "Device", "cat": cat_baby, "mfr": "Procter & Gamble", "mrp": 149.00, "rate": 118.26, "qty": 2, "pack": "7NOS", "gst": 5.0, "hsn": "96190030"},
                {"name": "PAMPERS PANTS NB 8S", "form": "Device", "cat": cat_baby, "mfr": "Procter & Gamble", "mrp": 93.00, "rate": 73.81, "qty": 2, "pack": "8NOS", "gst": 5.0, "hsn": "96190030"},
                {"name": "PAMPERS PANTS MD 12S", "form": "Device", "cat": cat_baby, "mfr": "Procter & Gamble", "mrp": 196.00, "rate": 155.55, "qty": 2, "pack": "12NOS", "gst": 5.0, "hsn": "96190030"},
                {"name": "PAMPERS PANTS LG 10S", "form": "Device", "cat": cat_baby, "mfr": "Procter & Gamble", "mrp": 196.00, "rate": 155.55, "qty": 2, "pack": "10NOS", "gst": 5.0, "hsn": "96190030"},
                {"name": "PAMPERS BABY WIPES 5S", "form": "Device", "cat": cat_baby, "mfr": "Procter & Gamble", "mrp": 83.00, "rate": 68.73, "qty": 1, "pack": "5NOS", "gst": 5.0, "hsn": "96190030"},
                {"name": "AMBI PUR AIR FRESHENER LB+RB 20ML", "form": "Device", "cat": cat_hygiene, "mfr": "Procter & Gamble", "mrp": 897.00, "rate": 524.25, "qty": 1, "pack": "1NOS", "gst": 18.0, "hsn": "33074900"}
            ]
        },

        # 2. Sai Radha 260007300128107
        {
            "supplier": {
                "name": "Sai Radha Pharma (India) Pvt. Ltd.",
                "contact_person": "Sales Executive (01 DIRECT)",
                "phone": "0824-2497757 / 9480838140",
                "email": "srpharmamangalore@gmail.com",
                "gstin": "29AAQCS0711F1ZC",
                "address": "Door No. 4-6-574/15-19, Karangalpady, Mangalore - 575003"
            },
            "inv_num": "260007300128107",
            "inv_date": "2026-08-26",
            "items": [
                {"name": "XENADOM 250MG TAB", "form": "Tablet", "cat": cat_pain, "mfr": "Mankind Pharma", "batch": "MT26-255", "exp": "03-29", "mrp": 93.70, "rate": 71.39, "qty": 1, "pack": "10'S", "gst": 5.0, "rx": True},
                {"name": "WALAPHAGE 500MG TAB", "form": "Tablet", "cat": cat_diab, "mfr": "Wallace Pharma", "batch": "WER001G", "exp": "12-28", "mrp": 26.14, "rate": 19.92, "qty": 1, "pack": "15'S", "gst": 5.0, "rx": True},
                {"name": "WALYTE ORS LEMON SACHET 4.4GM", "form": "Powder", "cat": cat_gastro, "mfr": "Wallace Pharma", "batch": "GMD004", "exp": "12-28", "mrp": 19.02, "rate": 15.61, "qty": 1, "pack": "1NOS", "gst": 5.0},
                {"name": "WALYTE ORS ORANGE 21.8GM", "form": "Powder", "cat": cat_gastro, "mfr": "Wallace Pharma", "batch": "CWOL519G", "exp": "05-29", "mrp": 23.20, "rate": 17.70, "qty": 1, "pack": "1NOS", "gst": 5.0},
                {"name": "WALYTE ORS SACHET (MANGO)", "form": "Powder", "cat": cat_gastro, "mfr": "Wallace Pharma", "batch": "RC86923", "exp": "02-28", "mrp": 23.20, "rate": 17.70, "qty": 1, "pack": "1NOS", "gst": 5.0},
                {"name": "WYSOLONE TABS 10MG DT", "form": "Tablet", "cat": cat_resp, "mfr": "Pfizer Ltd", "batch": "NY8251", "exp": "03-28", "mrp": 29.84, "rate": 22.74, "qty": 1, "pack": "15'S", "gst": 5.0, "rx": True},
                {"name": "WYSOLONE TABS 20MG DT", "form": "Tablet", "cat": cat_resp, "mfr": "Pfizer Ltd", "batch": "RH5221", "exp": "02-28", "mrp": 38.48, "rate": 31.59, "qty": 1, "pack": "15'S", "gst": 5.0, "rx": True},
                {"name": "WYSOLONE TABS 5MG DT", "form": "Tablet", "cat": cat_resp, "mfr": "Pfizer Ltd", "batch": "05251459A", "exp": "01-29", "mrp": 10.82, "rate": 8.87, "qty": 1, "pack": "15'S", "gst": 5.0, "rx": True},
                {"name": "XMET 500 TABS", "form": "Tablet", "cat": cat_diab, "mfr": "Glenmark Pharma", "batch": "6KA0741", "exp": "10-28", "mrp": 74.88, "rate": 57.05, "qty": 1, "pack": "10'S", "gst": 5.0, "rx": True},
                {"name": "VENLOR XR 37.5 CAPS", "form": "Capsule", "cat": cat_neuro, "mfr": "Cipla Ltd", "batch": "6KA0830", "exp": "08-28", "mrp": 152.51, "rate": 116.20, "qty": 1, "pack": "10'S", "gst": 5.0, "rx": True},
                {"name": "VENLOR XR 75 CAPS", "form": "Capsule", "cat": cat_neuro, "mfr": "Cipla Ltd", "batch": "6SB0160", "exp": "08-28", "mrp": 78.75, "rate": 60.00, "qty": 1, "pack": "30'S", "gst": 5.0, "rx": True},
                {"name": "WARF 1 TAB", "form": "Tablet", "cat": cat_cardio, "mfr": "Cipla Ltd", "batch": "6SB0374", "exp": "10-28", "mrp": 102.59, "rate": 78.24, "qty": 1, "pack": "30'S", "gst": 5.0, "rx": True},
                {"name": "WARF 2 TABS", "form": "Tablet", "cat": cat_cardio, "mfr": "Cipla Ltd", "batch": "6SB0412", "exp": "10-28", "mrp": 87.87, "rate": 66.95, "qty": 1, "pack": "30'S", "gst": 5.0, "rx": True},
                {"name": "WARF 3 TAB", "form": "Tablet", "cat": cat_cardio, "mfr": "Cipla Ltd", "batch": "FH26861015", "exp": "04-29", "mrp": 309.10, "rate": 235.50, "qty": 1, "pack": "15'S", "gst": 5.0, "rx": True},
                {"name": "VEHYCAL XT TAB", "form": "Tablet", "cat": cat_vit, "mfr": "Alembic Pharma", "batch": "2680000110", "exp": "02-28", "mrp": 36.44, "rate": 65.86, "qty": 1, "pack": "15'S", "gst": 5.0},
                {"name": "WIKORYL TAB", "form": "Tablet", "cat": cat_resp, "mfr": "Alembic Pharma", "batch": "MT263028", "exp": "05-28", "mrp": 224.85, "rate": 171.31, "qty": 1, "pack": "15'S", "gst": 5.0},
                {"name": "VERIFICA M (50MG+500MG) TAB", "form": "Tablet", "cat": cat_diab, "mfr": "Lupin Ltd", "batch": "N2601387", "exp": "04-29", "mrp": 590.63, "rate": 450.00, "qty": 1, "pack": "15'S", "gst": 5.0, "rx": True},
                {"name": "VELTAM PLUS CAPS", "form": "Capsule", "cat": cat_uro, "mfr": "Intas Pharma", "batch": "P1621", "exp": "04-29", "mrp": 450.00, "rate": 340.00, "qty": 1, "pack": "15'S", "gst": 5.0, "rx": True},
                {"name": "VELOZ 20 TABS", "form": "Tablet", "cat": cat_gastro, "mfr": "Torrent Pharma", "batch": "2KB3M007", "exp": "05-27", "mrp": 209.06, "rate": 159.29, "qty": 1, "pack": "15'S", "gst": 5.0, "rx": True},
                {"name": "VERTIN 16 MG TABS", "form": "Tablet", "cat": cat_neuro, "mfr": "Abbott India", "batch": "VEB26024", "exp": "05-29", "mrp": 405.94, "rate": 309.29, "qty": 1, "pack": "15'S", "gst": 5.0, "rx": True},
                {"name": "VERTIN 8 TABS", "form": "Tablet", "cat": cat_neuro, "mfr": "Abbott India", "batch": "SSM0069", "exp": "05-29", "mrp": 220.35, "rate": 167.89, "qty": 1, "pack": "15'S", "gst": 5.0, "rx": True},
            ]
        },

        # 3. Shakthi Life Lines 62909
        {
            "supplier": {
                "name": "Shakthi Life Lines",
                "contact_person": "Sales Executive",
                "phone": "0824-2211758 / 9731984022",
                "email": "shakthilifelines@gmail.com",
                "gstin": "29ADWFS4792G1Z3",
                "address": "Door No. 25-2-93/1-7, Opp Taj Cycles, Kankanady, Mangalore 575002"
            },
            "inv_num": "INV-62909",
            "inv_date": "2026-08-27",
            "items": [
                {"name": "ZENTEL SUSPENSION 10ML", "form": "Syrup", "cat": cat_anti, "mfr": "GlaxoSmithKline", "batch": "NA327", "exp": "01-29", "mrp": 19.11, "rate": 14.56, "qty": 4, "pack": "10ML", "gst": 5.0},
                {"name": "SIZAREST DROPS 15ML", "form": "Drops", "cat": cat_resp, "mfr": "Sun Pharma", "batch": "L3646", "exp": "11-28", "mrp": 129.63, "rate": 98.77, "qty": 1, "pack": "15ML", "gst": 5.0},
                {"name": "SIZAREST AF DROPS 15ML", "form": "Drops", "cat": cat_resp, "mfr": "Sun Pharma", "batch": "SAL2603", "exp": "04-29", "mrp": 95.49, "rate": 72.75, "qty": 1, "pack": "15ML", "gst": 5.0},
                {"name": "LOX 2% JELLY 30GM", "form": "Ointment", "cat": cat_pain, "mfr": "Neon Labs", "batch": "C3CM2008", "exp": "03-28", "mrp": 70.30, "rate": 23.00, "qty": 2, "pack": "30GM", "gst": 5.0},
                {"name": "ASTRAKIND LS DROPS 15ML", "form": "Drops", "cat": cat_resp, "mfr": "Mankind Pharma", "batch": "L1878", "exp": "06-28", "mrp": 85.08, "rate": 53.56, "qty": 1, "pack": "15ML", "gst": 5.0},
                {"name": "ASTRAKIND P DROPS 15ML", "form": "Drops", "cat": cat_resp, "mfr": "Mankind Pharma", "batch": "ULAL2003", "exp": "03-28", "mrp": 338.75, "rate": 64.82, "qty": 1, "pack": "15ML", "gst": 5.0},
                {"name": "SITADAY DM TABS", "form": "Tablet", "cat": cat_diab, "mfr": "Sun Pharma", "batch": "AOAZ002", "exp": "01-28", "mrp": 70.31, "rate": 258.10, "qty": 4, "pack": "15'S", "gst": 5.0, "rx": True},
                {"name": "ZOLE SKIN OINT 15GM", "form": "Ointment", "cat": cat_derma, "mfr": "Sun Pharma", "batch": "SXH0956A", "exp": "04-29", "mrp": 128.00, "rate": 53.57, "qty": 2, "pack": "15GM", "gst": 5.0},
                {"name": "ZOLE-F SKIN OINT 15GM", "form": "Ointment", "cat": cat_derma, "mfr": "Sun Pharma", "batch": "SXH1112A", "exp": "04-28", "mrp": 271.75, "rate": 97.52, "qty": 2, "pack": "15GM", "gst": 5.0},
                {"name": "FORACORT 100 INHALER 120MD", "form": "Inhaler", "cat": cat_resp, "mfr": "Cipla Ltd", "batch": "IB00033A", "exp": "12-27", "mrp": 139.33, "rate": 207.05, "qty": 1, "pack": "120MD", "gst": 5.0, "rx": True},
                {"name": "FORACORT 100 RESPECAP 30'S", "form": "Capsule", "cat": cat_resp, "mfr": "Cipla Ltd", "batch": "IB01288A", "exp": "05-28", "mrp": 273.45, "rate": 106.16, "qty": 1, "pack": "30'S", "gst": 5.0, "rx": True},
                {"name": "BUDAMATE 100 TRANSCAPS 30'S", "form": "Capsule", "cat": cat_resp, "mfr": "Lupin Ltd", "batch": "JC01520", "exp": "10-27", "mrp": 138.40, "rate": 208.34, "qty": 1, "pack": "30'S", "gst": 5.0, "rx": True},
                {"name": "BUDAMATE 100 INHALER 120MDI", "form": "Inhaler", "cat": cat_resp, "mfr": "Lupin Ltd", "batch": "JC00865", "exp": "02-28", "mrp": 184.35, "rate": 105.45, "qty": 1, "pack": "120MD", "gst": 5.0, "rx": True},
                {"name": "BUDAMATE 200 TRANSCAPS 30'S", "form": "Capsule", "cat": cat_resp, "mfr": "Lupin Ltd", "batch": "JC01098", "exp": "03-28", "mrp": 431.95, "rate": 140.46, "qty": 2, "pack": "30'S", "gst": 5.0, "rx": True},
                {"name": "BUDAMATE 400 INHALER 120MI", "form": "Inhaler", "cat": cat_resp, "mfr": "Lupin Ltd", "batch": "JC00555", "exp": "01-28", "mrp": 431.95, "rate": 329.11, "qty": 1, "pack": "120MD", "gst": 5.0, "rx": True},
                {"name": "BUDAMATE 400 TRANSCAPS 30'S", "form": "Capsule", "cat": cat_resp, "mfr": "Lupin Ltd", "batch": "UC00706", "exp": "02-28", "mrp": 222.70, "rate": 169.68, "qty": 1, "pack": "30'S", "gst": 5.0, "rx": True},
                {"name": "ESIFLO 100 TRANSCAPS", "form": "Capsule", "cat": cat_resp, "mfr": "Lupin Ltd", "batch": "UB02552", "exp": "09-27", "mrp": 314.90, "rate": 239.92, "qty": 1, "pack": "30'S", "gst": 5.0, "rx": True},
                {"name": "ESIFLO 250 TRANSCAPS 30'S", "form": "Capsule", "cat": cat_resp, "mfr": "Lupin Ltd", "batch": "6SB0349", "exp": "04-29", "mrp": 596.40, "rate": 454.40, "qty": 1, "pack": "30'S", "gst": 5.0, "rx": True},
                {"name": "KLERID TABS", "form": "Tablet", "cat": cat_anti, "mfr": "Cipla Ltd", "batch": "6SA0644", "exp": "02-28", "mrp": 20.16, "rate": 15.36, "qty": 3, "pack": "10'S", "gst": 5.0, "rx": True},
                {"name": "AEROCORT FORTE ROTACAPS 30'S", "form": "Capsule", "cat": cat_resp, "mfr": "Cipla Ltd", "batch": "6SA0009", "exp": "01-28", "mrp": 130.59, "rate": 99.50, "qty": 1, "pack": "30'S", "gst": 5.0, "rx": True},
                {"name": "CIPLOX EYE DROPS 10ML", "form": "Drops", "cat": cat_eye, "mfr": "Cipla Ltd", "batch": "6L80069", "exp": "04-28", "mrp": 30.10, "rate": 22.93, "qty": 4, "pack": "10ML", "gst": 5.0},
                {"name": "CIPLOX D EYE DROPS 10ML", "form": "Drops", "cat": cat_eye, "mfr": "Cipla Ltd", "batch": "6SN0072", "exp": "03-28", "mrp": 16.58, "rate": 12.56, "qty": 4, "pack": "10ML", "gst": 5.0},
                {"name": "BUDECORT 100 INHALER 200MD", "form": "Inhaler", "cat": cat_resp, "mfr": "Cipla Ltd", "batch": "5SN1121", "exp": "04-28", "mrp": 302.40, "rate": 230.40, "qty": 1, "pack": "200MD", "gst": 5.0, "rx": True},
                {"name": "BUDECORT 200 INHALER 200MD", "form": "Inhaler", "cat": cat_resp, "mfr": "Cipla Ltd", "batch": "6BA0576", "exp": "02-29", "mrp": 434.70, "rate": 331.20, "qty": 1, "pack": "200MD", "gst": 5.0, "rx": True},
                {"name": "BUDECORT 200 ROTACAPS 30'S", "form": "Capsule", "cat": cat_resp, "mfr": "Cipla Ltd", "batch": "6BA0456", "exp": "01-28", "mrp": 107.41, "rate": 81.84, "qty": 1, "pack": "30'S", "gst": 5.0, "rx": True},
                {"name": "DUOLIN INHALER 200MD", "form": "Inhaler", "cat": cat_resp, "mfr": "Cipla Ltd", "batch": "6BA0753", "exp": "03-28", "mrp": 468.21, "rate": 356.73, "qty": 1, "pack": "200MD", "gst": 5.0, "rx": True},
                {"name": "DUOLIN ROTACAPS 60'S", "form": "Capsule", "cat": cat_resp, "mfr": "Cipla Ltd", "batch": "6SA0584", "exp": "02-28", "mrp": 245.97, "rate": 187.41, "qty": 1, "pack": "60S", "gst": 5.0, "rx": True},
                {"name": "FORACORT 100 ROTACAPS 30'S", "form": "Capsule", "cat": cat_resp, "mfr": "Cipla Ltd", "batch": "6SN0393", "exp": "12-28", "mrp": 139.54, "rate": 106.32, "qty": 1, "pack": "30'S", "gst": 5.0, "rx": True},
                {"name": "FORACORT 100 INHALER", "form": "Inhaler", "cat": cat_resp, "mfr": "Cipla Ltd", "batch": "6SN0767", "exp": "03-29", "mrp": 272.15, "rate": 207.35, "qty": 1, "pack": "120MD", "gst": 5.0, "rx": True},
                {"name": "FORACORT 200 INHALER 120MD", "form": "Inhaler", "cat": cat_resp, "mfr": "Cipla Ltd", "batch": "6SA0687", "exp": "02-28", "mrp": 381.76, "rate": 290.86, "qty": 1, "pack": "120MD", "gst": 5.0, "rx": True},
                {"name": "FORACORT 200 ROTACAPS 30'S", "form": "Capsule", "cat": cat_resp, "mfr": "Cipla Ltd", "batch": "6SA0687A", "exp": "02-28", "mrp": 184.57, "rate": 140.62, "qty": 1, "pack": "30'S", "gst": 5.0, "rx": True},
            ]
        },

        # 4. Sai Radha 260007300128108
        {
            "supplier": {
                "name": "Sai Radha Pharma (India) Pvt. Ltd.",
                "contact_person": "Sales Executive (01 DIRECT)",
                "phone": "0824-2497757 / 9480838140",
                "email": "srpharmamangalore@gmail.com",
                "gstin": "29AAQCS0711F1ZC",
                "address": "Door No. 4-6-574/15-19, Karangalpady, Mangalore - 575003"
            },
            "inv_num": "260007300128108",
            "inv_date": "2026-08-26",
            "items": [
                {"name": "YASMIN TABLETS", "form": "Tablet", "cat": cat_women, "mfr": "Bayer Zydus", "batch": "KT1133B", "exp": "12-28", "mrp": 721.00, "rate": 605.64, "qty": 1, "pack": "21S", "gst": 5.0, "rx": True},
                {"name": "XSTAN 40 TAB", "form": "Tablet", "cat": cat_cardio, "mfr": "Blue Cross", "batch": "ZAHC2612", "exp": "04-29", "mrp": 51.85, "rate": 39.51, "qty": 1, "pack": "14'S", "gst": 5.0, "rx": True},
                {"name": "ZIBLOK 50MG TAB", "form": "Tablet", "cat": cat_cardio, "mfr": "FDC Ltd", "batch": "0726B028", "exp": "09-27", "mrp": 11.54, "rate": 8.79, "qty": 1, "pack": "15'S", "gst": 5.0, "rx": True},
                {"name": "ZILOS 50 TAB", "form": "Tablet", "cat": cat_cardio, "mfr": "FDC Ltd", "batch": "0726B008", "exp": "01-28", "mrp": 68.05, "rate": 51.85, "qty": 1, "pack": "15'S", "gst": 5.0, "rx": True},
                {"name": "XYKAA RAPID 650 TAB 15'S", "form": "Tablet", "cat": cat_pain, "mfr": "Troikaa Pharma", "batch": "X50H242", "exp": "11-28", "mrp": 31.78, "rate": 25.42, "qty": 1, "pack": "15'S", "gst": 5.0},
                {"name": "XAFINACT 50MG TAB", "form": "Tablet", "cat": cat_neuro, "mfr": "Sun Pharma", "batch": "GTH1969A", "exp": "05-28", "mrp": 280.00, "rate": 142.48, "qty": 1, "pack": "10'S", "gst": 5.0, "rx": True},
                {"name": "XAFINACT 100MG TAB", "form": "Tablet", "cat": cat_neuro, "mfr": "Sun Pharma", "batch": "GTH1973A", "exp": "05-28", "mrp": 187.00, "rate": 213.34, "qty": 1, "pack": "20'S", "gst": 5.0, "rx": True},
                {"name": "ZAPIZ 0.5MG 20'S TAB", "form": "Tablet", "cat": cat_neuro, "mfr": "Intas Pharma", "batch": "K2601146", "exp": "04-28", "mrp": 74.13, "rate": 56.48, "qty": 1, "pack": "20'S", "gst": 5.0, "rx": True},
                {"name": "ZADONASE TAB", "form": "Tablet", "cat": cat_resp, "mfr": "Alkem Labs", "batch": "26440152", "exp": "02-29", "mrp": 237.15, "rate": 180.69, "qty": 1, "pack": "10'S", "gst": 5.0, "rx": True},
                {"name": "XEVOR 5MG 15'S TAB", "form": "Tablet", "cat": cat_resp, "mfr": "Abbott India", "batch": "TPM0064", "exp": "04-28", "mrp": 126.63, "rate": 96.48, "qty": 1, "pack": "15'S", "gst": 5.0},
                {"name": "ZADY 500 TAB", "form": "Tablet", "cat": cat_anti, "mfr": "Mankind Pharma", "batch": "H6AG2012", "exp": "04-28", "mrp": 59.69, "rate": 45.48, "qty": 1, "pack": "5'S", "gst": 5.0, "rx": True},
                {"name": "XYZAL 5MG TAB", "form": "Tablet", "cat": cat_resp, "mfr": "Dr. Reddy's", "batch": "E2600048", "exp": "11-27", "mrp": 225.00, "rate": 171.43, "qty": 1, "pack": "15'S", "gst": 5.0},
            ]
        },

        # 5. Sai Radha 260007300128106
        {
            "supplier": {
                "name": "Sai Radha Pharma (India) Pvt. Ltd.",
                "contact_person": "Sales Executive (01 DIRECT)",
                "phone": "0824-2497757 / 9480838140",
                "email": "srpharmamangalore@gmail.com",
                "gstin": "29AAQCS0711F1ZC",
                "address": "Door No. 4-6-574/15-19, Karangalpady, Mangalore - 575003"
            },
            "inv_num": "260007300128106",
            "inv_date": "2026-08-26",
            "items": [
                {"name": "TELCHAMP 40MG TAB", "form": "Tablet", "cat": cat_cardio, "mfr": "Torrent Pharma", "batch": "MT253039B", "exp": "08-27", "mrp": 69.00, "rate": 53.89, "qty": 1, "pack": "10'S", "gst": 5.0, "rx": True},
                {"name": "VERTIZAC TAB", "form": "Tablet", "cat": cat_neuro, "mfr": "Abbott India", "batch": "GT07646", "exp": "03-28", "mrp": 206.25, "rate": 157.14, "qty": 1, "pack": "15'S", "gst": 5.0, "rx": True},
                {"name": "TENDIA 20MG 15'S TAB", "form": "Tablet", "cat": cat_diab, "mfr": "Micro Labs", "batch": "ATNA26002", "exp": "10-28", "mrp": 178.68, "rate": 136.14, "qty": 1, "pack": "15'S", "gst": 5.0, "rx": True},
                {"name": "TELVAS 20 (NOW 15'S) TAB", "form": "Tablet", "cat": cat_cardio, "mfr": "Aristo Pharma", "batch": "SPD260598", "exp": "03-28", "mrp": 56.11, "rate": 42.75, "qty": 1, "pack": "15'S", "gst": 5.0, "rx": True},
                {"name": "V TOTAL TAB", "form": "Tablet", "cat": cat_vit, "mfr": "Apex Labs", "batch": "26F4903AR", "exp": "09-27", "mrp": 122.50, "rate": 93.34, "qty": 1, "pack": "10'S", "gst": 5.0},
                {"name": "STALOPAM 5 TAB", "form": "Tablet", "cat": cat_neuro, "mfr": "Lupin Ltd", "batch": "UB02888", "exp": "11-28", "mrp": 53.55, "rate": 40.80, "qty": 1, "pack": "10'S", "gst": 5.0, "rx": True},
                {"name": "VILNIP M TAB", "form": "Tablet", "cat": cat_diab, "mfr": "Lupin Ltd", "batch": "MT263030", "exp": "05-28", "mrp": 224.85, "rate": 171.31, "qty": 1, "pack": "15'S", "gst": 5.0, "rx": True},
                {"name": "TENORIC 50 TAB", "form": "Tablet", "cat": cat_cardio, "mfr": "IPCA Labs", "batch": "INP25B102", "exp": "10-27", "mrp": 186.56, "rate": 142.14, "qty": 1, "pack": "10'S", "gst": 5.0, "rx": True},
                {"name": "TENEFIT 20 TAB", "form": "Tablet", "cat": cat_diab, "mfr": "Sun Pharma", "batch": "IP0126001A", "exp": "01-30", "mrp": 113.95, "rate": 86.82, "qty": 1, "pack": "10'S", "gst": 5.0, "rx": True},
                {"name": "TELMIKIND 40 15'S TAB", "form": "Tablet", "cat": cat_cardio, "mfr": "Mankind Pharma", "batch": "5K52054", "exp": "03-28", "mrp": 103.78, "rate": 79.07, "qty": 1, "pack": "15'S", "gst": 5.0, "rx": True},
                {"name": "VONALONG 20'S TAB", "form": "Tablet", "cat": cat_cardio, "mfr": "Mankind Pharma", "batch": "A3KAZ003", "exp": "12-27", "mrp": 62.27, "rate": 47.44, "qty": 1, "pack": "10'S", "gst": 5.0, "rx": True},
                {"name": "VITAKIND I 10'S TAB", "form": "Tablet", "cat": cat_vit, "mfr": "Mankind Pharma", "batch": "B9GKZ002", "exp": "06-27", "mrp": 154.68, "rate": 117.85, "qty": 1, "pack": "10'S", "gst": 5.0},
                {"name": "T-R3 TAB", "form": "Tablet", "cat": cat_vit, "mfr": "Torrent Pharma", "batch": "TRT00925BR", "exp": "03-27", "mrp": 205.88, "rate": 156.86, "qty": 1, "pack": "15'S", "gst": 5.0},
                {"name": "VOVERAN SR 75 TAB", "form": "Tablet", "cat": cat_pain, "mfr": "Novartis", "batch": "Z03SWBC5", "exp": "11-27", "mrp": 124.00, "rate": 94.48, "qty": 1, "pack": "10'S", "gst": 5.0, "rx": True},
                {"name": "XENADOM 500MG TAB", "form": "Tablet", "cat": cat_pain, "mfr": "Mankind Pharma", "batch": "XEN500-26", "exp": "04-29", "mrp": 396.95, "rate": 300.00, "qty": 1, "pack": "10'S", "gst": 5.0, "rx": True},
            ]
        },

        # 6. Lifeline Surgical LS26011109
        {
            "supplier": {
                "name": "Lifeline Surgical & Pharma",
                "contact_person": "Node1 Invoicing (Vasudha)",
                "phone": "0824-2430349 / 8075832132",
                "email": "lifelinesurgicalpharma@gmail.com",
                "gstin": "29AACFL6382L1ZR",
                "address": "Bhagavathi Complex, Capitanio, Mangalore - 575002"
            },
            "inv_num": "LS26011109",
            "inv_date": "2026-08-28",
            "items": [
                {"name": "CLEAN & DRY OINTMENT 15GMS", "form": "Ointment", "cat": cat_derma, "mfr": "Midas Care", "batch": "N5850006", "exp": "10-28", "mrp": 141.00, "rate": 111.90, "qty": 1, "pack": "15GM", "gst": 5.0, "hsn": "33069000"},
                {"name": "NO-P 200ML INTIMATE WASH", "form": "Syrup", "cat": cat_hygiene, "mfr": "Midas Care", "batch": "W2GH012", "exp": "05-28", "mrp": 119.00, "rate": 88.47, "qty": 1, "pack": "200ML", "gst": 18.0, "hsn": "33069000"},
                {"name": "RELISPRAY PAIN RELIEF 15GMS", "form": "Device", "cat": cat_pain, "mfr": "Midas Care", "batch": "G250160", "exp": "09-28", "mrp": 94.00, "rate": 78.53, "qty": 1, "pack": "15GM", "gst": 5.0, "hsn": "33069000"},
                {"name": "SPRAY MINT-ELACHI FRESHENER", "form": "Device", "cat": cat_hygiene, "mfr": "Midas Care", "batch": "G260065", "exp": "03-29", "mrp": 99.00, "rate": 67.93, "qty": 1, "pack": "1NOS", "gst": 18.0, "hsn": "33069000"},
                {"name": "SPRAY MINT-ICYMINT FRESHENER", "form": "Device", "cat": cat_hygiene, "mfr": "Midas Care", "batch": "G260084", "exp": "03-29", "mrp": 99.00, "rate": 67.93, "qty": 2, "pack": "1NOS", "gst": 18.0, "hsn": "33069000"},
                {"name": "SPRAY MINT-ORG WAVE FRESHENER", "form": "Device", "cat": cat_hygiene, "mfr": "Midas Care", "batch": "G260094", "exp": "05-29", "mrp": 99.00, "rate": 67.93, "qty": 1, "pack": "1NOS", "gst": 18.0, "hsn": "33069000"}
            ]
        },

        # 7. A S Traders UC2601026
        {
            "supplier": {
                "name": "A S Traders (Unicharm Healthcare)",
                "contact_person": "Rachan K (SM Name)",
                "phone": "9036312024 / 9148240793",
                "email": "astraders.mangalore@gmail.com",
                "gstin": "29AAIFU3526B1Z9",
                "address": "Behind Yenepoya Hospital, Kumpala Road, Mangalore"
            },
            "inv_num": "UC2601026",
            "inv_date": "2026-08-27",
            "items": [
                {"name": "MAMYPOKO PANTS ALL NIGHT ABSORB COCO NB2", "form": "Device", "cat": cat_baby, "mfr": "Unicharm India", "mrp": 17.00, "rate": 13.49, "qty": 6, "pack": "2NOS", "gst": 5.0, "hsn": "96190030"},
                {"name": "MAMYPOKO PANTS ALL NIGHT ABSORB COCO S2", "form": "Device", "cat": cat_baby, "mfr": "Unicharm India", "mrp": 19.00, "rate": 15.08, "qty": 6, "pack": "2NOS", "gst": 5.0, "hsn": "96190030"},
                {"name": "MAMYPOKO PANTS ALL NIGHT ABSORB COCO L2", "form": "Device", "cat": cat_baby, "mfr": "Unicharm India", "mrp": 23.00, "rate": 18.25, "qty": 6, "pack": "2NOS", "gst": 5.0, "hsn": "96190030"},
                {"name": "MAMYPOKO PANTS ALL NIGHT ABSORB COCO XL2", "form": "Device", "cat": cat_baby, "mfr": "Unicharm India", "mrp": 28.00, "rate": 22.22, "qty": 6, "pack": "2NOS", "gst": 5.0, "hsn": "96190030"},
                {"name": "MAMYPOKO PANTS STANDARD NB4", "form": "Device", "cat": cat_baby, "mfr": "Unicharm India", "mrp": 33.00, "rate": 26.19, "qty": 6, "pack": "4NOS", "gst": 5.0, "hsn": "96190030"},
                {"name": "MAMYPOKO PANTS STANDARD S4", "form": "Device", "cat": cat_baby, "mfr": "Unicharm India", "mrp": 34.00, "rate": 26.98, "qty": 2, "pack": "4NOS", "gst": 5.0, "hsn": "96190030"},
                {"name": "MAMYPOKO PANTS EXTRA ABSORB M4", "form": "Device", "cat": cat_baby, "mfr": "Unicharm India", "mrp": 38.00, "rate": 30.16, "qty": 2, "pack": "4NOS", "gst": 5.0, "hsn": "96190030"},
                {"name": "MAMYPOKO PANTS STANDARD L4", "form": "Device", "cat": cat_baby, "mfr": "Unicharm India", "mrp": 53.00, "rate": 42.06, "qty": 2, "pack": "4NOS", "gst": 5.0, "hsn": "96190030"},
                {"name": "MAMYPOKO PANTS STANDARD XL4", "form": "Device", "cat": cat_baby, "mfr": "Unicharm India", "mrp": 55.00, "rate": 43.65, "qty": 2, "pack": "4NOS", "gst": 5.0, "hsn": "96190030"},
                {"name": "MAMYPOKO PANTS EXTRA ABSORB NB8", "form": "Device", "cat": cat_baby, "mfr": "Unicharm India", "mrp": 75.00, "rate": 59.52, "qty": 2, "pack": "8NOS", "gst": 5.0, "hsn": "96190030"},
                {"name": "MAMYPOKO PANTS ALL NIGHT ABSORB COCO M7", "form": "Device", "cat": cat_baby, "mfr": "Unicharm India", "mrp": 93.00, "rate": 73.81, "qty": 2, "pack": "7NOS", "gst": 5.0, "hsn": "96190030"},
                {"name": "MAMYPOKO PANTS ALL NIGHT ABSORB COCO L6", "form": "Device", "cat": cat_baby, "mfr": "Unicharm India", "mrp": 99.00, "rate": 78.57, "qty": 3, "pack": "6NOS", "gst": 5.0, "hsn": "96190030"},
                {"name": "MAMYPOKO PANTS STANDARD L6", "form": "Device", "cat": cat_baby, "mfr": "Unicharm India", "mrp": 80.00, "rate": 63.49, "qty": 2, "pack": "6NOS", "gst": 5.0, "hsn": "96190030"},
                {"name": "MAMYPOKO ALL NIGHT ABSORB COCO XL6", "form": "Device", "cat": cat_baby, "mfr": "Unicharm India", "mrp": 103.00, "rate": 81.75, "qty": 2, "pack": "6NOS", "gst": 5.0, "hsn": "96190030"},
                {"name": "MAMYPOKO PANTS EXTRA ABSORB XXL7", "form": "Device", "cat": cat_baby, "mfr": "Unicharm India", "mrp": 187.00, "rate": 148.41, "qty": 1, "pack": "7NOS", "gst": 5.0, "hsn": "96190030"},
                {"name": "MAMYPOKO ALL NIGHT ABSORB COCO NB20", "form": "Device", "cat": cat_baby, "mfr": "Unicharm India", "mrp": 187.00, "rate": 148.41, "qty": 1, "pack": "20NOS", "gst": 5.0, "hsn": "96190030"},
                {"name": "MAMYPOKO PANTS EXTRA ABSORB S14", "form": "Device", "cat": cat_baby, "mfr": "Unicharm India", "mrp": 187.00, "rate": 148.41, "qty": 2, "pack": "14NOS", "gst": 5.0, "hsn": "96190030"},
                {"name": "MAMYPOKO ALL NIGHT ABSORB COCO M15", "form": "Device", "cat": cat_baby, "mfr": "Unicharm India", "mrp": 187.00, "rate": 148.41, "qty": 1, "pack": "15NOS", "gst": 5.0, "hsn": "96190030"},
                {"name": "MAMYPOKO ALL NIGHT ABSORB COCO L13", "form": "Device", "cat": cat_baby, "mfr": "Unicharm India", "mrp": 327.00, "rate": 259.52, "qty": 1, "pack": "13NOS", "gst": 5.0, "hsn": "96190030"},
                {"name": "MAMYPOKO ALL NIGHT ABSORB COCO XL11", "form": "Device", "cat": cat_baby, "mfr": "Unicharm India", "mrp": 374.00, "rate": 296.82, "qty": 1, "pack": "11NOS", "gst": 5.0, "hsn": "96190030"},
                {"name": "MAMYPOKO PANTS EXTRA ABSORB NB32", "form": "Device", "cat": cat_baby, "mfr": "Unicharm India", "mrp": 374.00, "rate": 296.82, "qty": 1, "pack": "32NOS", "gst": 5.0, "hsn": "96190030"},
                {"name": "MAMYPOKO ALL NIGHT ABSORB COCO S36", "form": "Device", "cat": cat_baby, "mfr": "Unicharm India", "mrp": 374.00, "rate": 296.82, "qty": 1, "pack": "36NOS", "gst": 5.0, "hsn": "96190030"},
                {"name": "MAMYPOKO ALL NIGHT ABSORB COCO M30", "form": "Device", "cat": cat_baby, "mfr": "Unicharm India", "mrp": 374.00, "rate": 296.82, "qty": 1, "pack": "30NOS", "gst": 5.0, "hsn": "96190030"},
                {"name": "MAMYPOKO ALL NIGHT ABSORB COCO L26", "form": "Device", "cat": cat_baby, "mfr": "Unicharm India", "mrp": 374.00, "rate": 296.82, "qty": 1, "pack": "26NOS", "gst": 5.0, "hsn": "96190030"},
                {"name": "MAMYPOKO ALL NIGHT ABSORB COCO XL22", "form": "Device", "cat": cat_baby, "mfr": "Unicharm India", "mrp": 35.00, "rate": 29.17, "qty": 6, "pack": "22NOS", "gst": 5.0, "hsn": "96190030"},
                {"name": "SOFY BODYFIT XL 6P", "form": "Device", "cat": cat_hygiene, "mfr": "Unicharm India", "mrp": 42.00, "rate": 35.00, "qty": 6, "pack": "6NOS", "gst": 0.0, "hsn": "96190010"},
                {"name": "SOFY BODYFIT PRO XL 6P", "form": "Device", "cat": cat_hygiene, "mfr": "Unicharm India", "mrp": 45.00, "rate": 37.50, "qty": 6, "pack": "6NOS", "gst": 0.0, "hsn": "96190010"},
                {"name": "SOFY BODYFIT NIGHTS XXL 6P", "form": "Device", "cat": cat_hygiene, "mfr": "Unicharm India", "mrp": 50.00, "rate": 41.67, "qty": 3, "pack": "6NOS", "gst": 0.0, "hsn": "96190010"},
                {"name": "SOFY ANTIBACTERIA XL 7P", "form": "Device", "cat": cat_hygiene, "mfr": "Unicharm India", "mrp": 70.00, "rate": 58.33, "qty": 4, "pack": "7NOS", "gst": 0.0, "hsn": "96190010"},
                {"name": "SOFY ANTIBACTERIA XL+ 6P", "form": "Device", "cat": cat_hygiene, "mfr": "Unicharm India", "mrp": 75.00, "rate": 62.50, "qty": 3, "pack": "6NOS", "gst": 0.0, "hsn": "96190010"},
                {"name": "SOFY ANTIBACTERIA NIGHTS XXL+ 5P", "form": "Device", "cat": cat_hygiene, "mfr": "Unicharm India", "mrp": 80.00, "rate": 66.67, "qty": 2, "pack": "5NOS", "gst": 0.0, "hsn": "96190010"},
                {"name": "SOFY BODYFIT XL 18P", "form": "Device", "cat": cat_hygiene, "mfr": "Unicharm India", "mrp": 120.00, "rate": 100.00, "qty": 1, "pack": "18NOS", "gst": 0.0, "hsn": "96190010"},
                {"name": "SOFY ANTIBACTERIA XL 14P", "form": "Device", "cat": cat_hygiene, "mfr": "Unicharm India", "mrp": 140.00, "rate": 116.67, "qty": 1, "pack": "14NOS", "gst": 0.0, "hsn": "96190010"},
                {"name": "SOFY ANTIBACTERIA XL +15P", "form": "Device", "cat": cat_hygiene, "mfr": "Unicharm India", "mrp": 185.00, "rate": 154.17, "qty": 1, "pack": "15NOS", "gst": 0.0, "hsn": "96190010"},
                {"name": "SOFY ANTIBACTERIA XL 28P", "form": "Device", "cat": cat_hygiene, "mfr": "Unicharm India", "mrp": 285.00, "rate": 237.50, "qty": 1, "pack": "28NOS", "gst": 0.0, "hsn": "96190010"},
                {"name": "SOFY ANTIBACTERIA NIGHTS XXXL+ 4P", "form": "Device", "cat": cat_hygiene, "mfr": "Unicharm India", "mrp": 115.00, "rate": 95.83, "qty": 1, "pack": "4NOS", "gst": 0.0, "hsn": "96190010"}
            ]
        }
    ]

    summary_stats = []

    for idx, inv_info in enumerate(invoices_data, start=1):
        inv_num = inv_info['inv_num']
        sup_data = inv_info['supplier']
        items = inv_info['items']
        
        print(f"\n[{idx}/7] Ingesting Invoice #{inv_num} from {sup_data['name']} ({len(items)} items)...")
        
        with transaction.atomic():
            sup = get_or_create_supplier_fast(sup_data, supplier_cache)
            
            created_meds = 0
            created_batches = 0
            updated_batches = 0
            inv_cost = Decimal('0.00')
            inv_mrp = Decimal('0.00')
            inv_packs = 0

            # List of movements to bulk create
            movements_to_create = []

            for it in items:
                m_name = it['name'].strip()
                m_key = m_name.upper()
                
                # Medicine
                if m_key in medicine_cache:
                    med = medicine_cache[m_key]
                else:
                    med = Medicine.objects.create(
                        name=m_name,
                        generic_name=it.get('generic', m_name),
                        category=it.get('cat') or cat_hygiene,
                        dosage_form=it.get('form', 'Tablet'),
                        manufacturer=it.get('mfr', 'Standard Pharma'),
                        hsn_code=it.get('hsn', '3004'),
                        gst_rate=Decimal(str(it.get('gst', 12.0))),
                        requires_prescription=it.get('rx', False),
                        rack_location=it.get('rack', 'Rack A-1')
                    )
                    medicine_cache[m_key] = med
                    created_meds += 1

                # Batch
                batch_num = str(it.get('batch') or f"B-{inv_num[:8]}-{abs(hash(m_name))%10000}").strip().upper()
                exp_date = parse_expiry(it.get('exp', '2028-12-31'))
                pack_sz = parse_pack_size(it.get('pack', "10'S"))
                qty = int(it.get('qty', 1))
                rate = Decimal(str(it.get('rate', 50.0)))
                mrp = Decimal(str(it.get('mrp', 80.0)))
                sell_price = Decimal(str(it.get('sell', round(float(mrp) * 0.92, 2))))

                batch_key = (med.id, batch_num)
                if batch_key in batch_cache:
                    batch = batch_cache[batch_key]
                    # Check if already inwarded from this invoice
                    if inv_num not in existing_movement_refs:
                        batch.pack_quantity += qty
                        batch.purchase_price = rate
                        batch.mrp = mrp
                        batch.selling_price = sell_price
                        batch.expiry_date = exp_date
                        batch.supplier = sup
                        batch.save()

                        movements_to_create.append(StockMovement(
                            batch=batch,
                            movement_type='PURCHASE',
                            quantity_packs=qty,
                            quantity_loose=0,
                            reference_id=inv_num,
                            notes=f"Stock Inward: Bill #{inv_num} ({sup.name})"
                        ))
                    updated_batches += 1
                else:
                    batch = Batch.objects.create(
                        medicine=med,
                        batch_number=batch_num,
                        supplier=sup,
                        expiry_date=exp_date,
                        purchase_price=rate,
                        mrp=mrp,
                        selling_price=sell_price,
                        pack_size=pack_sz,
                        pack_quantity=qty,
                        loose_quantity=0,
                    )
                    batch_cache[batch_key] = batch
                    created_batches += 1

                    movements_to_create.append(StockMovement(
                        batch=batch,
                        movement_type='PURCHASE',
                        quantity_packs=qty,
                        quantity_loose=0,
                        reference_id=inv_num,
                        notes=f"Stock Inward: Bill #{inv_num} ({sup.name})"
                    ))

                item_cost = rate * Decimal(qty)
                item_mrp = mrp * Decimal(qty)
                inv_cost += item_cost
                inv_mrp += item_mrp
                inv_packs += qty

            if movements_to_create:
                StockMovement.objects.bulk_create(movements_to_create)
                existing_movement_refs.add(inv_num)

            summary_stats.append({
                "invoice": inv_num,
                "supplier": sup.name,
                "items": len(items),
                "packs": inv_packs,
                "new_medicines": created_meds,
                "new_batches": created_batches,
                "cost": inv_cost,
                "mrp": inv_mrp
            })
            print(f"  -> SUCCESS! Processed {len(items)} items ({inv_packs} packs) | New Meds: {created_meds} | Cost: Rs. {inv_cost:,.2f} | MRP: Rs. {inv_mrp:,.2f}")

    # Master Audit Report
    print("\n" + "=" * 90)
    print("DATA2 INVENTORY INGESTION AUDIT REPORT")
    print("=" * 90)
    print(f"{'Invoice Number':<20} | {'Supplier':<32} | {'Items':<5} | {'Packs':<5} | {'Cost (Rs.)':<10} | {'MRP (Rs.)':<10}")
    print("-" * 90)
    grand_items = 0
    grand_packs = 0
    grand_cost = Decimal('0.00')
    grand_mrp = Decimal('0.00')
    for s in summary_stats:
        print(f"{s['invoice']:<20} | {s['supplier'][:32]:<32} | {s['items']:<5} | {s['packs']:<5} | Rs.{s['cost']:>8.2f} | Rs.{s['mrp']:>8.2f}")
        grand_items += s['items']
        grand_packs += s['packs']
        grand_cost += s['cost']
        grand_mrp += s['mrp']
    print("-" * 90)
    print(f"{'TOTALS':<20} | {'ALL 7 SUPPLIER INVOICES':<32} | {grand_items:<5} | {grand_packs:<5} | Rs.{grand_cost:>8.2f} | Rs.{grand_mrp:>8.2f}")
    print("=" * 90)
    print(f"Total Unique Active Medicines in DB : {Medicine.objects.filter(is_active=True).count()}")
    print(f"Total Active Batches in DB           : {Batch.objects.count()}")
    print(f"Total Stock Movements in DB          : {StockMovement.objects.count()}")
    print("=" * 90)

if __name__ == '__main__':
    ingest_all_invoices()
