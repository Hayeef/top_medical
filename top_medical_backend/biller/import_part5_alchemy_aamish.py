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
    print("[5/5] Importing Mangalore Alchemy Healthcare & Aamish Traders invoices...")

    # 1. Mangalore Alchemy Healthcare
    sup_alchemy = get_or_create_supplier({
        "name": "Mangalore Alchemy Healthcare",
        "contact_person": "Sales Desk",
        "phone": "8105042655 / 6366773187",
        "email": "cosales@alchemyhealthcare.in",
        "gstin": "29ABXFM2197E2ZK",
        "address": "2-171/16-17, G07 Kingdom Tower, Thokkottu Permannur, Permannur Village, Ullal, Dakshina Kannada, Karnataka (DL: KA-MN2-244799, 244801, 244800, 244802)"
    })

    # 2. Aamish Traders
    sup_aamish = get_or_create_supplier({
        "name": "Aamish Traders",
        "contact_person": "Managing Partner",
        "phone": "9844995857",
        "email": "aamishtraders@gmail.com",
        "gstin": "29ACOFA3906D1ZF",
        "address": "4-5/9(2) Hira Residency, Babbukatte, Permannur, Ullal, Mangalore 575017"
    })

    cat_ortho = get_or_create_category("Orthopedic & Rehabilitation", "Belts, Supports, Splints, Walkers, Footwear")
    cat_device = get_or_create_category("Medical Devices & Diagnostics", "BP Monitors, Glucometers, Nebulizers, Thermometers")
    cat_surg = get_or_create_category("Surgical & Medical Consumables", "Bandages, Syringes, Cotton, Tapes, Disposables")
    cat_diaper = get_or_create_category("Adult & Baby Diapers", "Adult Pullup Pants, Tape Diapers, Underpads")
    cat_oral = get_or_create_category("Oral Care & Hygiene", "Toothpastes, Toothbrushes, Tongue Cleaners")
    cat_soap = get_or_create_category("Soaps & Skin Cleaners", "Bathing soaps, Handwashes, Cleansers")
    cat_fmcg = get_or_create_category("FMCG & Household", "Confectionery, Mosquito Repellents, Adhesives")

    alchemy_items = [
        # Devices & Ortho Belts
        {"name": "BM 36BP MONITOR", "cat": cat_device, "form": "Device", "mrp": 1950.00, "rate": 1150.00, "qty": 1, "gst": 5.0},
        {"name": "IH 18 NEBULIZER BEURER", "cat": cat_device, "form": "Device", "mrp": 2048.00, "rate": 1150.00, "qty": 1, "gst": 5.0},
        {"name": "A03 TUMMY TRIMMER/ABDOMINAL BELT 8\" L", "cat": cat_ortho, "form": "Device", "mrp": 900.00, "rate": 540.00, "qty": 1, "gst": 5.0},
        {"name": "A03 TUMMY TRIMMER/ABDOMINAL BELT 8\" M", "cat": cat_ortho, "form": "Device", "mrp": 900.00, "rate": 540.00, "qty": 1, "gst": 5.0},
        {"name": "A03 TUMMY TRIMMER/ABDOMINAL BELT 8\" XL", "cat": cat_ortho, "form": "Device", "mrp": 900.00, "rate": 540.00, "qty": 1, "gst": 5.0},
        {"name": "A05 LUMBO SACRAL BELT L", "cat": cat_ortho, "form": "Device", "mrp": 1087.00, "rate": 652.20, "qty": 1, "gst": 5.0},
        {"name": "A05 LUMBO SACRAL BELT SPL XL", "cat": cat_ortho, "form": "Device", "mrp": 1087.00, "rate": 652.20, "qty": 1, "gst": 5.0},
        {"name": "A05 LUMBO SACRAL BELT M", "cat": cat_ortho, "form": "Device", "mrp": 1087.00, "rate": 652.20, "qty": 1, "gst": 5.0},
        {"name": "D01 ANKLE BINDER L", "cat": cat_ortho, "form": "Device", "mrp": 365.00, "rate": 219.00, "qty": 1, "gst": 5.0},
        {"name": "D01 ANKLE BINDER M", "cat": cat_ortho, "form": "Device", "mrp": 365.00, "rate": 219.00, "qty": 1, "gst": 5.0},
        {"name": "D04 KNEE CAP (PAIR) L", "cat": cat_ortho, "form": "Device", "mrp": 419.00, "rate": 251.40, "qty": 1, "gst": 5.0},
        {"name": "D04 KNEE CAP (PAIR) M", "cat": cat_ortho, "form": "Device", "mrp": 419.00, "rate": 251.40, "qty": 1, "gst": 5.0},
        {"name": "D04 KNEE CAP (PAIR) S", "cat": cat_ortho, "form": "Device", "mrp": 419.00, "rate": 251.40, "qty": 1, "gst": 5.0},
        {"name": "D04 KNEE CAP (PAIR) SPL XL", "cat": cat_ortho, "form": "Device", "mrp": 419.00, "rate": 251.40, "qty": 1, "gst": 5.0},
        {"name": "E05 WRIST BRACE WITH DOUBLE LOCK M", "cat": cat_ortho, "form": "Device", "mrp": 213.00, "rate": 127.80, "qty": 1, "gst": 5.0},
        {"name": "E11 ELBOW SUPPORT M", "cat": cat_ortho, "form": "Device", "mrp": 256.00, "rate": 153.60, "qty": 1, "gst": 5.0},
        {"name": "E11 ELBOW SUPPORT L", "cat": cat_ortho, "form": "Device", "mrp": 256.00, "rate": 153.60, "qty": 1, "gst": 5.0},
        {"name": "E10 TENNIS ELBOW SUPPORT XL", "cat": cat_ortho, "form": "Device", "mrp": 333.00, "rate": 199.80, "qty": 1, "gst": 5.0},
        {"name": "E10 TENNIS ELBOW SUPPORT M", "cat": cat_ortho, "form": "Device", "mrp": 360.00, "rate": 216.00, "qty": 1, "gst": 5.0},
        {"name": "E10 TENNIS ELBOW SUPPORT S", "cat": cat_ortho, "form": "Device", "mrp": 333.00, "rate": 199.80, "qty": 1, "gst": 5.0},
        {"name": "E10 TENNIS ELBOW SUPPORT L", "cat": cat_ortho, "form": "Device", "mrp": 360.00, "rate": 216.00, "qty": 1, "gst": 5.0},
        {"name": "H05 EXERCISING BALL NEURO", "cat": cat_ortho, "form": "Device", "mrp": 136.00, "rate": 81.60, "qty": 1, "gst": 18.0},
        {"name": "H05 EXERCISING BALL ORTHO", "cat": cat_ortho, "form": "Device", "mrp": 144.00, "rate": 86.40, "qty": 1, "gst": 18.0},
        {"name": "I16 C.STOCKING BELOW KNEE CLASSIC PAIR M", "cat": cat_ortho, "form": "Device", "mrp": 952.00, "rate": 571.20, "qty": 1, "gst": 5.0},
        {"name": "I16 C. STOCKING BELOW KNEE CLASSIC PAIR L", "cat": cat_ortho, "form": "Device", "mrp": 1028.00, "rate": 616.80, "qty": 1, "gst": 5.0},
        {"name": "F06 THUMB SPICA SPLINT UNIVERSAL", "cat": cat_ortho, "form": "Device", "mrp": 375.00, "rate": 225.00, "qty": 2, "gst": 5.0},
        {"name": "C06 POUCH ARM SLING (BAGGY) M", "cat": cat_ortho, "form": "Device", "mrp": 505.00, "rate": 303.00, "qty": 1, "gst": 5.0},
        {"name": "D03 ANKLET (PAIR) L", "cat": cat_ortho, "form": "Device", "mrp": 340.00, "rate": 204.00, "qty": 1, "gst": 5.0},
        {"name": "D03 ANKLET (PAIR) S", "cat": cat_ortho, "form": "Device", "mrp": 340.00, "rate": 204.00, "qty": 1, "gst": 5.0},
        {"name": "D03 ANKLET (PAIR) M", "cat": cat_ortho, "form": "Device", "mrp": 340.00, "rate": 204.00, "qty": 1, "gst": 5.0},
        {"name": "D03 ANKLET (PAIR) SPL XL", "cat": cat_ortho, "form": "Device", "mrp": 340.00, "rate": 204.00, "qty": 1, "gst": 5.0},
        {"name": "MOREPEN GLUCO MONITOR STRIP 25'S", "cat": cat_device, "form": "Device", "mrp": 465.00, "rate": 346.00, "qty": 1, "gst": 5.0},
        {"name": "MOREPEN GLUCO MONITOR STRIP 50'S", "cat": cat_device, "form": "Device", "mrp": 827.00, "rate": 570.00, "qty": 1, "gst": 5.0},
        {"name": "MOREPEN GLUCO MONITOR BG-03", "cat": cat_device, "form": "Device", "mrp": 620.00, "rate": 238.09, "qty": 3, "gst": 5.0},
        {"name": "ACCUSURE DIGITAL THERMOMETER MT-1027", "cat": cat_device, "form": "Device", "mrp": 222.00, "rate": 100.00, "qty": 10, "gst": 5.0},
        {"name": "FT 09/1 CLINICAL THERMOMETER BEURER", "cat": cat_device, "form": "Device", "mrp": 249.00, "rate": 160.00, "qty": 6, "gst": 5.0},
        {"name": "SYRINGE DISPOVAN 20 ML", "cat": cat_surg, "form": "Other", "mrp": 30.60, "rate": 13.00, "qty": 4, "gst": 5.0},
        {"name": "SYRINGE DISPOVAN 50ML", "cat": cat_surg, "form": "Other", "mrp": 62.40, "rate": 26.25, "qty": 5, "gst": 5.0},
        {"name": "SYRINGE DISPOVAN 2.5ML 24G", "cat": cat_surg, "form": "Other", "mrp": 7.00, "rate": 3.75, "qty": 10, "gst": 5.0},
        {"name": "SYRINGE DISPOVAN 5ML 24G", "cat": cat_surg, "form": "Other", "mrp": 10.23, "rate": 4.00, "qty": 10, "gst": 5.0},
        {"name": "DISPO SYRINGE 10ML 22G", "cat": cat_surg, "form": "Other", "mrp": 13.00, "rate": 5.50, "qty": 10, "gst": 5.0},
        {"name": "3 PLY MASK (BLACK)", "cat": cat_surg, "form": "Other", "mrp": 9.99, "rate": 2.70, "qty": 100, "gst": 5.0},
        {"name": "3 PLY MASK (BLUE)", "cat": cat_surg, "form": "Other", "mrp": 9.99, "rate": 2.70, "qty": 100, "gst": 5.0},
        {"name": "ROLLER BANDAGE 15CM*3MTS", "cat": cat_surg, "form": "Other", "mrp": 240.00, "rate": 74.50, "qty": 1, "gst": 5.0},
        {"name": "ROLLER BANDAGE 10CM*3M", "cat": cat_surg, "form": "Other", "mrp": 160.00, "rate": 50.20, "qty": 1, "gst": 5.0},
        {"name": "ROLLER BANDAGE 7.5CM*3M", "cat": cat_surg, "form": "Other", "mrp": 120.00, "rate": 40.00, "qty": 1, "gst": 5.0},
        {"name": "ROLLER BANDAGE 5CM*3MTS", "cat": cat_surg, "form": "Other", "mrp": 80.00, "rate": 28.00, "qty": 1, "gst": 5.0},
        {"name": "JAYCOT ABSORBENT COTTON ROLL-15GM", "cat": cat_surg, "form": "Other", "mrp": 25.00, "rate": 14.50, "qty": 16, "gst": 5.0},
        {"name": "JAYCOT ABSORBENT COTTON ROLL-30GM", "cat": cat_surg, "form": "Other", "mrp": 40.00, "rate": 20.00, "qty": 8, "gst": 5.0},
        {"name": "2 CARE URINE CAN (2IN1)", "cat": cat_surg, "form": "Device", "mrp": 245.00, "rate": 75.00, "qty": 1, "gst": 5.0},
        {"name": "SAFETOUCH HOT WATER BAG-M", "cat": cat_surg, "form": "Device", "mrp": 290.00, "rate": 105.00, "qty": 1, "gst": 18.0},
        {"name": "SAFETOUCH HOT WATER BAG-S", "cat": cat_surg, "form": "Device", "mrp": 195.00, "rate": 94.00, "qty": 1, "gst": 18.0},
        {"name": "SEIBERT HOT WATER BAG", "cat": cat_surg, "form": "Device", "mrp": 390.00, "rate": 135.00, "qty": 1, "gst": 18.0},
        {"name": "ROMSONS AERO MIST (ADULT)", "cat": cat_surg, "form": "Device", "mrp": 668.00, "rate": 75.00, "qty": 5, "gst": 5.0},
        {"name": "ROMSONS AERO MIST (CHILD)", "cat": cat_surg, "form": "Device", "mrp": 668.00, "rate": 75.00, "qty": 5, "gst": 5.0},
        {"name": "DR. TRUST MANUAL BREAST PUMP-60", "cat": cat_device, "form": "Device", "mrp": 842.81, "rate": 471.42, "qty": 1, "gst": 5.0},
        {"name": "CHETHAK VAPORISER ALL IN ONE", "cat": cat_device, "form": "Device", "mrp": 492.00, "rate": 270.00, "qty": 1, "gst": 5.0},
        {"name": "MEDICARE EXAMINATION LATEX GLOVES - M", "cat": cat_surg, "form": "Other", "mrp": 1250.00, "rate": 265.00, "qty": 1, "gst": 5.0},
        {"name": "M02 TYNOCREPE (8CM)", "cat": cat_surg, "form": "Other", "mrp": 299.00, "rate": 245.53, "qty": 3, "gst": 5.0},
        {"name": "M03 TYNOCREPE (10 CM * 4 M)", "cat": cat_surg, "form": "Other", "mrp": 318.00, "rate": 258.92, "qty": 3, "gst": 5.0},
        {"name": "TULIPS BABY WIPES WITH LID", "cat": cat_diaper, "form": "Other", "mrp": 129.00, "rate": 48.00, "qty": 5, "gst": 18.0},
        {"name": "TULIPS COTTON BUDS 100S", "cat": cat_surg, "form": "Other", "mrp": 66.00, "rate": 30.00, "qty": 6, "gst": 5.0},
        {"name": "TULIP MEDIPLASTER WASHPROOF 100S", "cat": cat_surg, "form": "Other", "mrp": 300.00, "rate": 142.00, "qty": 1, "gst": 5.0},
        {"name": "BD SYRING 1ML 50'S", "cat": cat_surg, "form": "Other", "mrp": 12.40, "rate": 9.80, "qty": 50, "gst": 5.0},
        {"name": "DR. SEIBERT 10*4/6M CM TIN", "cat": cat_surg, "form": "Other", "mrp": 1200.00, "rate": 201.00, "qty": 1, "gst": 5.0},
        {"name": "DR. SEIBERT 10*1M CM", "cat": cat_surg, "form": "Other", "mrp": 327.00, "rate": 68.00, "qty": 1, "gst": 5.0},
        {"name": "TULIP PULLUP PANTS ADULT DIAPER L", "cat": cat_diaper, "form": "Other", "mrp": 600.00, "rate": 242.48, "qty": 1, "gst": 5.0},
        {"name": "TULIP PULLUP PANTS ADULT DIAPER M", "cat": cat_diaper, "form": "Other", "mrp": 550.00, "rate": 233.30, "qty": 1, "gst": 5.0},
        {"name": "TULIP PULLUP PANTS ADULT DIAPER XL", "cat": cat_diaper, "form": "Other", "mrp": 615.00, "rate": 252.38, "qty": 1, "gst": 5.0},
        {"name": "TULIPS ADULT DIAPER TAPE L", "cat": cat_diaper, "form": "Other", "mrp": 600.00, "rate": 242.85, "qty": 1, "gst": 5.0},
        {"name": "TULIPS ADULT DIAPER TAPE M", "cat": cat_diaper, "form": "Other", "mrp": 550.00, "rate": 233.33, "qty": 1, "gst": 5.0},
        {"name": "TULIPS ADULT DIAPER TAPE XL", "cat": cat_diaper, "form": "Other", "mrp": 615.00, "rate": 252.38, "qty": 1, "gst": 5.0},
        {"name": "AL MULTI 2 MCR LADIES CHAPPAL 6", "cat": cat_ortho, "form": "Other", "mrp": 562.00, "rate": 305.00, "qty": 1, "gst": 5.0},
        {"name": "AL MULTI 2 MCR LADIES CHAPPAL 8", "cat": cat_ortho, "form": "Other", "mrp": 562.00, "rate": 305.00, "qty": 1, "gst": 5.0},
        {"name": "AL MULTI 2 MCR LADIES CHAPPAL 9", "cat": cat_ortho, "form": "Other", "mrp": 562.00, "rate": 305.00, "qty": 1, "gst": 5.0},
        {"name": "AL MULTI 2 MCR LADIES CHAPPAL 10", "cat": cat_ortho, "form": "Other", "mrp": 562.00, "rate": 305.00, "qty": 1, "gst": 5.0},
        {"name": "AL MULTI MCP LADIES CHAPPAL 11", "cat": cat_ortho, "form": "Other", "mrp": 592.00, "rate": 350.00, "qty": 1, "gst": 5.0},
        {"name": "AL MULTI MCP LADIES CHAPPAL 12", "cat": cat_ortho, "form": "Other", "mrp": 655.00, "rate": 350.00, "qty": 1, "gst": 5.0},
        {"name": "AL GBK GENTS CHAPPAL 9", "cat": cat_ortho, "form": "Other", "mrp": 655.00, "rate": 350.00, "qty": 1, "gst": 5.0},
        {"name": "AL GBK GENTS CHAPPAL 11", "cat": cat_ortho, "form": "Other", "mrp": 99.00, "rate": 59.00, "qty": 2, "gst": 5.0},
        {"name": "KAREIN ADULT PANTS 2S-M", "cat": cat_diaper, "form": "Other", "mrp": 99.00, "rate": 59.00, "qty": 2, "gst": 5.0},
        {"name": "KAREIN ADULT PANTS 2S - L", "cat": cat_diaper, "form": "Other", "mrp": 99.00, "rate": 59.00, "qty": 2, "gst": 5.0},
        {"name": "ACCUSURE COMPACT NEBULIZER", "cat": cat_device, "form": "Device", "mrp": 1780.00, "rate": 850.00, "qty": 1, "gst": 5.0},
        {"name": "TULIP COTTON BUDS PAPER STICK", "cat": cat_surg, "form": "Other", "mrp": 624.00, "rate": 259.00, "qty": 1, "gst": 5.0},
    ]

    for idx, item in enumerate(alchemy_items, 1):
        med, _ = Medicine.objects.get_or_create(
            name=item["name"],
            defaults={
                "dosage_form": item.get("form", "Device"),
                "category": item["cat"],
                "gst_rate": Decimal(str(item.get("gst", 5.0))),
                "min_stock_alert": 2,
                "is_active": True
            }
        )
        med.category = item["cat"]
        med.dosage_form = item.get("form", "Device")
        med.gst_rate = Decimal(str(item.get("gst", 5.0)))
        med.save()

        batch, _ = Batch.objects.get_or_create(
            medicine=med,
            batch_number=f"ALC-1129-{idx:02d}",
            defaults={
                "supplier": sup_alchemy,
                "expiry_date": date(2030, 12, 31),
                "purchase_price": Decimal(str(item["rate"])),
                "mrp": Decimal(str(item["mrp"])),
                "selling_price": Decimal(str(item["mrp"])),
                "pack_size": 1,
                "pack_quantity": item["qty"],
                "loose_quantity": 0
            }
        )
        batch.supplier = sup_alchemy
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
            reference_id="INV-82627-1129",
            notes="Purchase from Mangalore Alchemy Healthcare Inv #82627-1129"
        )
    print(f"  [+] Imported {len(alchemy_items)} items from Mangalore Alchemy Healthcare.")

    # 3. Aamish Traders Items (INV-130)
    aamish_items = [
        {"name": "CST 50GM MRP30", "cat": cat_oral, "mrp": 30.00, "rate": 25.97, "qty": 12, "gst": 5.0},
        {"name": "CST 200GM MRP135", "cat": cat_oral, "mrp": 135.00, "rate": 117.14, "qty": 3, "gst": 5.0},
        {"name": "CST 18GM MRP10", "cat": cat_oral, "mrp": 10.00, "rate": 8.65, "qty": 12, "gst": 5.0},
        {"name": "CST 40GM MRP20", "cat": cat_oral, "mrp": 20.00, "rate": 17.31, "qty": 12, "gst": 5.0},
        {"name": "CST 100GM MRP73", "cat": cat_oral, "mrp": 73.00, "rate": 63.20, "qty": 6, "gst": 5.0},
        {"name": "CST 150GM MRP99", "cat": cat_oral, "mrp": 99.00, "rate": 85.71, "qty": 3, "gst": 5.0},
        {"name": "CAS 40GM MRP20", "cat": cat_oral, "mrp": 20.00, "rate": 17.31, "qty": 12, "gst": 5.0},
        {"name": "CAS 100GM MRP75", "cat": cat_oral, "mrp": 75.00, "rate": 64.93, "qty": 6, "gst": 5.0},
        {"name": "CAS 200GM MRP142", "cat": cat_oral, "mrp": 142.00, "rate": 123.80, "qty": 2, "gst": 5.0},
        {"name": "CMF 20GM MRP10", "cat": cat_oral, "mrp": 10.00, "rate": 8.65, "qty": 12, "gst": 5.0},
        {"name": "CMF 6+1 42GM MRP20", "cat": cat_oral, "mrp": 20.00, "rate": 17.31, "qty": 12, "gst": 5.0},
        {"name": "CMF RED 70GM MRP73", "cat": cat_oral, "mrp": 73.00, "rate": 62.85, "qty": 4, "gst": 5.0},
        {"name": "CMF BLUE 81GM MRP83", "cat": cat_oral, "mrp": 83.00, "rate": 72.38, "qty": 3, "gst": 5.0},
        {"name": "CMF RED 150GM MRP138", "cat": cat_oral, "mrp": 138.00, "rate": 120.00, "qty": 2, "gst": 5.0},
        {"name": "KIDS 40GM BF MRP99", "cat": cat_oral, "mrp": 99.00, "rate": 85.71, "qty": 5, "gst": 5.0},
        {"name": "KIDS 40GM SB MRP99", "cat": cat_oral, "mrp": 99.00, "rate": 85.71, "qty": 2, "gst": 5.0},
        {"name": "COLGATE SEN 40G", "cat": cat_oral, "mrp": 105.00, "rate": 90.90, "qty": 2, "gst": 5.0},
        {"name": "COLGATE SENSITIVE 80+80GM MRP207", "cat": cat_oral, "mrp": 207.00, "rate": 179.21, "qty": 1, "gst": 5.0},
        {"name": "COLGATE TOTAL 80GM MRP80", "cat": cat_oral, "mrp": 80.00, "rate": 69.25, "qty": 2, "gst": 5.0},
        {"name": "PAINOUT COLGATE MRP84", "cat": cat_oral, "mrp": 84.00, "rate": 72.72, "qty": 12, "gst": 5.0},
        {"name": "DABUR RED PASTE 40GM MRP20", "cat": cat_oral, "mrp": 20.00, "rate": 17.31, "qty": 12, "gst": 5.0},
        {"name": "DABUR RED PASTE 100GM MRP75", "cat": cat_oral, "mrp": 75.00, "rate": 64.93, "qty": 6, "gst": 5.0},
        {"name": "DABUR RED PASTE 200GM MRP145", "cat": cat_oral, "mrp": 141.00, "rate": 125.53, "qty": 3, "gst": 5.0},
        {"name": "MESWAK 42GM MRP20", "cat": cat_oral, "mrp": 20.00, "rate": 17.31, "qty": 12, "gst": 5.0},
        {"name": "MESWAK TP100GM MRP 72", "cat": cat_oral, "mrp": 72.00, "rate": 62.38, "qty": 5, "gst": 5.0},
        {"name": "MESWAK 200GM MRP141", "cat": cat_oral, "mrp": 141.00, "rate": 122.85, "qty": 3, "gst": 5.0},
        {"name": "DABUR HONEY 20GM MRP24", "cat": cat_fmcg, "mrp": 24.00, "rate": 20.40, "qty": 10, "gst": 5.0},
        {"name": "DABUR HONEY 50GM MR245", "cat": cat_fmcg, "mrp": 45.00, "rate": 38.25, "qty": 6, "gst": 5.0},
        {"name": "DABUR HONEY 100GM MRP70", "cat": cat_fmcg, "mrp": 70.00, "rate": 59.52, "qty": 5, "gst": 5.0},
        {"name": "DABUR HONEY 250GM MRP125", "cat": cat_fmcg, "mrp": 125.00, "rate": 106.28, "qty": 3, "gst": 5.0},
        {"name": "DABUR HONEY 500GM MRP250", "cat": cat_fmcg, "mrp": 250.00, "rate": 207.03, "qty": 1, "gst": 5.0},
        {"name": "DABUR GULABARI 30ML MRP16", "cat": cat_fmcg, "mrp": 16.00, "rate": 12.10, "qty": 5, "gst": 18.0},
        {"name": "DABUR GULABARI 50ML MRP30", "cat": cat_fmcg, "mrp": 30.00, "rate": 22.69, "qty": 6, "gst": 18.0},
        {"name": "DABUR GULABARI 120ML MRP56", "cat": cat_fmcg, "mrp": 56.00, "rate": 42.37, "qty": 4, "gst": 18.0},
        {"name": "DABUR GULABARI 250ML MRP96", "cat": cat_fmcg, "mrp": 96.00, "rate": 72.63, "qty": 2, "gst": 18.0},
        {"name": "AMLA 45ML MRP18", "cat": cat_fmcg, "mrp": 18.00, "rate": 15.58, "qty": 4, "gst": 5.0},
        {"name": "ODONIL ZIPPER LAVENDER MRP60", "cat": cat_fmcg, "mrp": 60.00, "rate": 44.21, "qty": 6, "gst": 18.0},
        {"name": "ODONIL BLOCK MRP245", "cat": cat_fmcg, "mrp": 245.00, "rate": 166.10, "qty": 3, "gst": 18.0},
        {"name": "VICKS CHOCLT MRP230", "cat": cat_fmcg, "mrp": 230.00, "rate": 182.85, "qty": 1, "gst": 5.0},
        {"name": "COFSILS MRP190", "cat": cat_fmcg, "mrp": 190.00, "rate": 157.14, "qty": 1, "gst": 5.0},
        {"name": "HAJMOL IIMLI TABLET MRP170", "cat": cat_fmcg, "mrp": 170.00, "rate": 147.61, "qty": 1, "gst": 5.0},
        {"name": "HAJMOL MAHA CANDY MRP130", "cat": cat_fmcg, "mrp": 130.00, "rate": 112.38, "qty": 1, "gst": 5.0},
        {"name": "CDM PERK", "cat": cat_fmcg, "mrp": 240.00, "rate": 207.79, "qty": 1, "gst": 5.0},
        {"name": "CDM DAIRY MILK", "cat": cat_fmcg, "mrp": 360.00, "rate": 311.68, "qty": 1, "gst": 5.0},
        {"name": "SNICKERS MRP10", "cat": cat_fmcg, "mrp": 10.00, "rate": 340.00, "qty": 1, "gst": 5.0},
        {"name": "SAFARI CHOCLT MRP240", "cat": cat_fmcg, "mrp": 240.00, "rate": 200.00, "qty": 1, "gst": 5.0},
        {"name": "BENDI MRP200", "cat": cat_fmcg, "mrp": 200.00, "rate": 147.61, "qty": 1, "gst": 5.0},
        {"name": "SNICKERS MRP20", "cat": cat_fmcg, "mrp": 20.00, "rate": 554.28, "qty": 1, "gst": 5.0},
        {"name": "BOUNTY CHOCLT MRP45", "cat": cat_fmcg, "mrp": 45.00, "rate": 38.09, "qty": 1, "gst": 5.0},
        {"name": "GARNIER 2.0 20ML MRP45", "cat": cat_soap, "mrp": 45.00, "rate": 33.89, "qty": 10, "gst": 18.0},
        {"name": "GARNIER BROWN 4.0 MRP45", "cat": cat_soap, "mrp": 45.00, "rate": 33.89, "qty": 10, "gst": 18.0},
        {"name": "GARNIER BROWN BLACK 3.0", "cat": cat_soap, "mrp": 45.00, "rate": 34.66, "qty": 10, "gst": 18.0},
        {"name": "GARNIER BURGUNDY 3.16", "cat": cat_soap, "mrp": 45.00, "rate": 34.66, "qty": 10, "gst": 18.0},
        {"name": "VIP SHAMPOO BLACK 20ML MRP51", "cat": cat_soap, "mrp": 51.00, "rate": 36.01, "qty": 12, "gst": 18.0},
        {"name": "INDICA EASY SHAMPOO 18ML MRP30", "cat": cat_soap, "mrp": 30.00, "rate": 23.11, "qty": 24, "gst": 18.0},
        {"name": "INDICA SHAMPOO 10ML MRP15", "cat": cat_soap, "mrp": 15.00, "rate": 12.98, "qty": 20, "gst": 18.0},
        {"name": "NONI BLACK HAIR MAGIC MRP50", "cat": cat_soap, "mrp": 50.00, "rate": 35.31, "qty": 24, "gst": 18.0},
        {"name": "DURACELL AA MRP25", "cat": cat_fmcg, "mrp": 25.00, "rate": 16.94, "qty": 12, "gst": 18.0},
        {"name": "DURACELL AAA MRP25", "cat": cat_fmcg, "mrp": 25.00, "rate": 16.94, "qty": 10, "gst": 18.0},
        {"name": "NIPPO AA MRP20", "cat": cat_fmcg, "mrp": 20.00, "rate": 12.10, "qty": 20, "gst": 18.0},
        {"name": "NIPPO AAA MRP20", "cat": cat_fmcg, "mrp": 20.00, "rate": 12.10, "qty": 20, "gst": 18.0},
        {"name": "PHENYL 1LTR MRP95", "cat": cat_fmcg, "mrp": 95.00, "rate": 42.37, "qty": 4, "gst": 18.0},
        {"name": "SUNSILK SHAMPOO 6ML MRP16", "cat": cat_soap, "mrp": 16.00, "rate": 12.38, "qty": 4, "gst": 18.0},
        {"name": "DOVE SOAP 100GM MRP60", "cat": cat_soap, "mrp": 60.00, "rate": 52.90, "qty": 6, "gst": 5.0},
        {"name": "REXONE SOAP MRP40", "cat": cat_soap, "mrp": 40.00, "rate": 35.26, "qty": 6, "gst": 5.0},
        {"name": "HAMAM MRP45", "cat": cat_soap, "mrp": 45.00, "rate": 39.67, "qty": 6, "gst": 5.0},
        {"name": "LIRIL SOAP MRP39", "cat": cat_soap, "mrp": 39.00, "rate": 34.39, "qty": 6, "gst": 18.0},
        {"name": "DR WASH CAKE 200GM 39", "cat": cat_soap, "mrp": 39.00, "rate": 33.80, "qty": 6, "gst": 5.0},
        {"name": "RAKTHA CHANDAN SOAP MRP38", "cat": cat_soap, "mrp": 38.00, "rate": 33.33, "qty": 6, "gst": 5.0},
        {"name": "SANTOOR SOAP SANDAL MRP40", "cat": cat_soap, "mrp": 40.00, "rate": 35.23, "qty": 6, "gst": 5.0},
        {"name": "SANTOOR SOAP WHITE MRP40", "cat": cat_soap, "mrp": 40.00, "rate": 35.23, "qty": 6, "gst": 5.0},
        {"name": "SANTOOR WHITE 44GM MRP10", "cat": cat_soap, "mrp": 10.00, "rate": 8.65, "qty": 12, "gst": 5.0},
        {"name": "SANTOOR HANDWASH CLASSIC BIG1 MRP99", "cat": cat_soap, "mrp": 99.00, "rate": 76.27, "qty": 2, "gst": 18.0},
        {"name": "THAI CANDY MRP160", "cat": cat_fmcg, "mrp": 160.00, "rate": 126.66, "qty": 2, "gst": 5.0},
        {"name": "T-CON ORANGE MRP150", "cat": cat_fmcg, "mrp": 150.00, "rate": 119.04, "qty": 1, "gst": 5.0},
        {"name": "T-CON MANGO MRP150", "cat": cat_fmcg, "mrp": 150.00, "rate": 119.04, "qty": 1, "gst": 5.0},
        {"name": "AJAY TB SOFT QUEST MRP20", "cat": cat_oral, "mrp": 20.00, "rate": 14.64, "qty": 36, "gst": 5.0},
        {"name": "AJAY TB MEDIUM QUEST MRP20", "cat": cat_oral, "mrp": 20.00, "rate": 14.64, "qty": 36, "gst": 5.0},
        {"name": "AJAY TB HARD QUEST MRP20", "cat": cat_oral, "mrp": 20.00, "rate": 14.64, "qty": 36, "gst": 5.0},
        {"name": "AJAY COMPLETE TB MRP18", "cat": cat_oral, "mrp": 18.00, "rate": 12.69, "qty": 12, "gst": 5.0},
        {"name": "TONGUE CLEANER MRP10", "cat": cat_oral, "mrp": 10.00, "rate": 5.08, "qty": 12, "gst": 18.0},
        {"name": "COLGATE SVS 100GM MRP85", "cat": cat_oral, "mrp": 85.00, "rate": 73.59, "qty": 2, "gst": 5.0},
        {"name": "COLGATE CHARCOAL CLEAN MRP198", "cat": cat_oral, "mrp": 198.00, "rate": 171.42, "qty": 1, "gst": 5.0},
        {"name": "COLGATE VISIBLE WHITE 50GM MRP89", "cat": cat_oral, "mrp": 89.00, "rate": 77.14, "qty": 2, "gst": 5.0},
        {"name": "COLGATE VISIBLE WHITE 100+20GM MRP198", "cat": cat_oral, "mrp": 198.00, "rate": 171.42, "qty": 2, "gst": 5.0},
        {"name": "FEVIKWIK MRP5", "cat": cat_fmcg, "mrp": 5.00, "rate": 3.81, "qty": 84, "gst": 18.0},
        {"name": "PARLE KACCHA MANGO", "cat": cat_fmcg, "mrp": 50.00, "rate": 43.29, "qty": 3, "gst": 5.0},
        {"name": "T CON LOLLY POPS MRP500", "cat": cat_fmcg, "mrp": 50.00, "rate": 323.80, "qty": 1, "gst": 5.0},
        {"name": "COLGATE TOOTH POWDER(CTP)50GM MRP42", "cat": cat_oral, "mrp": 42.00, "rate": 37.14, "qty": 3, "gst": 5.0},
        {"name": "HIT BLACK MRP210", "cat": cat_fmcg, "mrp": 210.00, "rate": 161.86, "qty": 3, "gst": 18.0},
        {"name": "HIT RED MRP210", "cat": cat_fmcg, "mrp": 210.00, "rate": 161.86, "qty": 3, "gst": 18.0},
        {"name": "GENTLE CLEAN 6+3 MRP216", "cat": cat_oral, "mrp": 216.00, "rate": 171.42, "qty": 2, "gst": 5.0},
        {"name": "SUPER FLEXY TB 11+2 MRP 220", "cat": cat_oral, "mrp": 220.00, "rate": 176.19, "qty": 1, "gst": 5.0},
        {"name": "CIBACA SUPREME HARD TB MRP30", "cat": cat_oral, "mrp": 30.00, "rate": 21.42, "qty": 12, "gst": 5.0},
        {"name": "COLGATE TB EXTRA CLEAN 10+3 MRP180", "cat": cat_oral, "mrp": 180.00, "rate": 142.85, "qty": 1, "gst": 5.0},
        {"name": "ZIGZAG BRUSH 9+3 MRP270", "cat": cat_oral, "mrp": 270.00, "rate": 219.04, "qty": 1, "gst": 5.0},
        {"name": "GENTLE SENSITIVE 6+1 MRP390", "cat": cat_oral, "mrp": 390.00, "rate": 309.52, "qty": 2, "gst": 5.0},
        {"name": "BRILLIANT STAR TB MRP50", "cat": cat_oral, "mrp": 50.00, "rate": 39.67, "qty": 12, "gst": 5.0},
        {"name": "KIDS SUP JUNIOR 9+3 MRP180", "cat": cat_oral, "mrp": 180.00, "rate": 131.42, "qty": 1, "gst": 5.0},
        {"name": "SUPERFLEXY CHARCOL 10+2 MRP220", "cat": cat_oral, "mrp": 220.00, "rate": 176.19, "qty": 1, "gst": 5.0},
        {"name": "DETTOL HANDWASH MRP99", "cat": cat_soap, "mrp": 99.00, "rate": 76.27, "qty": 3, "gst": 18.0},
        {"name": "DETTOL LIQUID MRP267", "cat": cat_soap, "mrp": 267.00, "rate": 207.62, "qty": 2, "gst": 18.0},
        {"name": "DETTOL LIQUID 250ML", "cat": cat_soap, "mrp": 167.34, "rate": 159.37, "qty": 3, "gst": 5.0},
        {"name": "DETTOL LIQD ANTISEPTIC 125ML MRP83", "cat": cat_soap, "mrp": 83.00, "rate": 64.40, "qty": 4, "gst": 18.0},
        {"name": "NAIL CUTTER BELL", "cat": cat_fmcg, "mrp": 50.00, "rate": 28.24, "qty": 12, "gst": 18.0},
        {"name": "NAIL CUTTER BIG", "cat": cat_fmcg, "mrp": 70.00, "rate": 39.54, "qty": 12, "gst": 18.0},
        {"name": "NAIL CUTTER MINI", "cat": cat_fmcg, "mrp": 40.00, "rate": 22.59, "qty": 12, "gst": 18.0},
        {"name": "DETTOL SOAP ORG MRP10", "cat": cat_soap, "mrp": 10.00, "rate": 8.73, "qty": 12, "gst": 5.0},
        {"name": "DETTOL COOL 40GM MRP10", "cat": cat_soap, "mrp": 10.00, "rate": 8.73, "qty": 12, "gst": 5.0},
        {"name": "DETTOL SOAP ORG MRP40", "cat": cat_soap, "mrp": 40.00, "rate": 35.28, "qty": 6, "gst": 5.0},
        {"name": "DETTOL 100GM COOL MRP40", "cat": cat_soap, "mrp": 40.00, "rate": 35.28, "qty": 6, "gst": 5.0},
        {"name": "HIT RED MRP110", "cat": cat_fmcg, "mrp": 110.00, "rate": 84.74, "qty": 2, "gst": 18.0},
        {"name": "COLGATE VW PURPLE", "cat": cat_oral, "mrp": 70.00, "rate": 60.60, "qty": 1, "gst": 5.0},
        {"name": "AMLA 90ML MRP54", "cat": cat_fmcg, "mrp": 54.00, "rate": 46.75, "qty": 3, "gst": 5.0},
        {"name": "CIBACA 123 TB 9+3 MRP117", "cat": cat_oral, "mrp": 117.00, "rate": 85.71, "qty": 1, "gst": 5.0},
        {"name": "KIDS 2PLUS TB", "cat": cat_oral, "mrp": 162.00, "rate": 119.04, "qty": 2, "gst": 5.0},
        {"name": "BUDS WOODEN MRP20", "cat": cat_fmcg, "mrp": 400.00, "rate": 190.47, "qty": 1, "gst": 5.0},
        {"name": "KIDS 0-2 TB MRP27", "cat": cat_oral, "mrp": 27.00, "rate": 19.84, "qty": 12, "gst": 5.0},
        {"name": "DETTOL LIQUID ANTISEPTIC 60ML MRP41.49", "cat": cat_soap, "mrp": 41.49, "rate": 31.96, "qty": 6, "gst": 18.0},
    ]

    for idx, item in enumerate(aamish_items, 1):
        med, _ = Medicine.objects.get_or_create(
            name=item["name"],
            defaults={
                "dosage_form": "Other",
                "category": item["cat"],
                "gst_rate": Decimal(str(item.get("gst", 5.0))),
                "min_stock_alert": 5,
                "is_active": True
            }
        )
        med.category = item["cat"]
        med.gst_rate = Decimal(str(item.get("gst", 5.0)))
        med.save()

        batch, _ = Batch.objects.get_or_create(
            medicine=med,
            batch_number=f"AAM-130-{idx:03d}",
            defaults={
                "supplier": sup_aamish,
                "expiry_date": date(2029, 12, 31),
                "purchase_price": Decimal(str(item["rate"])),
                "mrp": Decimal(str(item["mrp"])),
                "selling_price": Decimal(str(item["mrp"])),
                "pack_size": 1,
                "pack_quantity": item["qty"],
                "loose_quantity": 0
            }
        )
        batch.supplier = sup_aamish
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
            reference_id="INV-130",
            notes="Purchase from Aamish Traders Inv #INV-130"
        )
    print(f"  [+] Imported {len(aamish_items)} items from Aamish Traders.")

if __name__ == '__main__':
    run()
