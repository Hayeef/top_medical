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
    print("[2/5] Importing G.K. Pharma, Sri Kateel Agencies & Rafais invoices...")
    
    # 1. G.K. Pharma
    sup_gk = get_or_create_supplier({
        "name": "G.K. Pharma",
        "contact_person": "Managing Partner",
        "phone": "0824-2426867 / 9448123456",
        "email": "gkpharmamangalore@gmail.com",
        "gstin": "29AABFG3239N1Z3",
        "address": "Door No. 13-9-723/7, K.S. Rao Road, Mangalore 575001 (DL: KA-MN1-20-300667 / KA-MN1-21-300668)"
    })

    # 2. Sri Kateel Agencies
    sup_kateel = get_or_create_supplier({
        "name": "Sri Kateel Agencies",
        "contact_person": "Sales Executive",
        "phone": "9448123456 / 0824-2441122",
        "email": "srikateelagencies@gmail.com",
        "gstin": "29AAXFS5430R1Z0",
        "address": "Door No. 13-10-856/1, Opp. Sharavu Temple, Mangalore - 575001 (DL: KA-MN1-294124 / KA-MN1-294125)"
    })

    # 3. Rafais
    sup_rafais = get_or_create_supplier({
        "name": "RAFAIS",
        "contact_person": "Manager",
        "phone": "9845012345",
        "email": "rafaisdistributors@gmail.com",
        "gstin": "29AAWFR5829A1ZQ",
        "address": "Near Noor Masjid, Bunder, Mangalore - 575001 (DL: KA-MN1-176166)"
    })

    cat_resp = get_or_create_category("Respiratory & Inhalers", "Inhalers, Respules, Cough & Asthma")
    cat_anti = get_or_create_category("Antibiotics & Anti-Infectives", "Antibiotics, Anti-fungals, Anti-virals")
    cat_pain = get_or_create_category("Analgesics & Pain Management", "Pain relief, Anti-inflammatory, Spasm")
    cat_derma = get_or_create_category("Dermatology & Topicals", "Ointments, Creams, Gels, Soaps, Shampoos")
    cat_gastro = get_or_create_category("Gastrointestinal & Digestion", "Antacids, Laxatives, Probiotics")
    cat_vit = get_or_create_category("Vitamins & Supplements", "Multivitamins, Calcium, Vitamin D3")
    cat_surg = get_or_create_category("Surgical & Medical Consumables", "Bandages, Syringes, Cotton, Tapes, Disposables")
    cat_hygiene = get_or_create_category("Personal Care & Hygiene", "Pads, Buds, Tissues, Personal care")
    cat_cardio = get_or_create_category("Cardiovascular & Hypertension", "Blood pressure, Cardiac, Cholesterol")

    gk_items = [
        # Inv 57089
        {"inv": "57089", "name": "ALLERCET M SYP 60ML", "form": "Syrup", "cat": cat_resp, "batch": "13028300", "exp": "05-28", "mrp": 135.00, "rate": 102.86, "pack": "60ML", "qty": 3, "gst": 5.0},
        {"inv": "57089", "name": "ARISTOMOL 250 ORAL SUSP 60ML", "form": "Syrup", "cat": cat_pain, "batch": "13028301", "exp": "05-28", "mrp": 45.00, "rate": 34.29, "pack": "60ML", "qty": 5, "gst": 5.0},
        {"inv": "57089", "name": "ALERID SYP 60ML", "form": "Syrup", "cat": cat_resp, "batch": "13028302", "exp": "05-28", "mrp": 65.00, "rate": 49.52, "pack": "60ML", "qty": 3, "gst": 5.0},
        {"inv": "57089", "name": "ALERID SYP 30ML", "form": "Syrup", "cat": cat_resp, "batch": "13028303", "exp": "05-28", "mrp": 38.00, "rate": 28.95, "pack": "30ML", "qty": 3, "gst": 5.0},
        {"inv": "57089", "name": "AMBRODIL LS SYP 100ML", "form": "Syrup", "cat": cat_resp, "batch": "13028304", "exp": "05-28", "mrp": 115.00, "rate": 87.62, "pack": "100ML", "qty": 3, "gst": 5.0},
        {"inv": "57089", "name": "CHERICOF JR SYP 60ML", "form": "Syrup", "cat": cat_resp, "batch": "13028305", "exp": "05-28", "mrp": 85.00, "rate": 64.76, "pack": "60ML", "qty": 3, "gst": 5.0},
        {"inv": "57089", "name": "DERIPHYLLIN SYP 100ML", "form": "Syrup", "cat": cat_resp, "batch": "13028306", "exp": "05-28", "mrp": 42.00, "rate": 32.00, "pack": "100ML", "qty": 5, "gst": 5.0},
        {"inv": "57089", "name": "ALEX SF SYP 100ML", "form": "Syrup", "cat": cat_resp, "batch": "13028307", "exp": "05-28", "mrp": 145.00, "rate": 110.48, "pack": "100ML", "qty": 3, "gst": 5.0},
        {"inv": "57089", "name": "ENCORATE SYP 100ML", "form": "Syrup", "cat": cat_resp, "batch": "13028308", "exp": "05-28", "mrp": 85.00, "rate": 64.76, "pack": "100ML", "qty": 2, "gst": 5.0},
        {"inv": "57089", "name": "DEXORANGE SYP 200ML", "form": "Syrup", "cat": cat_vit, "batch": "13028309", "exp": "05-28", "mrp": 175.00, "rate": 133.33, "pack": "200ML", "qty": 5, "gst": 12.0},
        {"inv": "57089", "name": "DILO BM SYP 100ML", "form": "Syrup", "cat": cat_resp, "batch": "13028310", "exp": "05-28", "mrp": 65.00, "rate": 49.52, "pack": "100ML", "qty": 3, "gst": 5.0},
        {"inv": "57089", "name": "DOMSTAL SUSP 30ML", "form": "Syrup", "cat": cat_gastro, "batch": "13028311", "exp": "05-28", "mrp": 45.00, "rate": 34.29, "pack": "30ML", "qty": 3, "gst": 5.0},
        {"inv": "57089", "name": "ALEX SYP NEW 100ML", "form": "Syrup", "cat": cat_resp, "batch": "13028312", "exp": "05-28", "mrp": 145.00, "rate": 110.48, "pack": "100ML", "qty": 3, "gst": 5.0},
        {"inv": "57089", "name": "CITRALKA LIQ 100ML", "form": "Syrup", "cat": cat_gastro, "batch": "13028313", "exp": "05-28", "mrp": 125.00, "rate": 95.24, "pack": "100ML", "qty": 3, "gst": 5.0},
        {"inv": "57089", "name": "DUPHALAC SYP 150ML", "form": "Syrup", "cat": cat_gastro, "batch": "13028314", "exp": "05-28", "mrp": 295.00, "rate": 224.76, "pack": "150ML", "qty": 2, "gst": 5.0},
        {"inv": "57089", "name": "CREMAFFIN MINT WHITE 225ML", "form": "Syrup", "cat": cat_gastro, "batch": "13028315", "exp": "05-28", "mrp": 275.00, "rate": 209.52, "pack": "225ML", "qty": 2, "gst": 5.0},
        {"inv": "57089", "name": "CREMAFFIN PLUS 225ML", "form": "Syrup", "cat": cat_gastro, "batch": "13028316", "exp": "05-28", "mrp": 315.00, "rate": 240.00, "pack": "225ML", "qty": 2, "gst": 5.0},
        {"inv": "57089", "name": "DIGENE GEL MINT 200ML", "form": "Syrup", "cat": cat_gastro, "batch": "13028317", "exp": "05-28", "mrp": 165.00, "rate": 125.71, "pack": "200ML", "qty": 5, "gst": 5.0},
        {"inv": "57089", "name": "DIGERAFT SYP 200ML", "form": "Syrup", "cat": cat_gastro, "batch": "13028318", "exp": "05-28", "mrp": 195.00, "rate": 148.57, "pack": "200ML", "qty": 2, "gst": 5.0},

        # Inv 57093
        {"inv": "57093", "name": "CPINK SUSP 150ML", "form": "Syrup", "cat": cat_vit, "batch": "13028320", "exp": "05-28", "mrp": 185.00, "rate": 140.95, "pack": "150ML", "qty": 2, "gst": 12.0},
        {"inv": "57093", "name": "IBUGESIC PLUS SUSP 100ML", "form": "Syrup", "cat": cat_pain, "batch": "13028321", "exp": "05-28", "mrp": 48.50, "rate": 36.95, "pack": "100ML", "qty": 5, "gst": 5.0},
        {"inv": "57093", "name": "IBUGESIC SYP 60ML", "form": "Syrup", "cat": cat_pain, "batch": "13028322", "exp": "05-28", "mrp": 35.00, "rate": 26.67, "pack": "60ML", "qty": 3, "gst": 5.0},
        {"inv": "57093", "name": "LEVOLIN SYP 100ML", "form": "Syrup", "cat": cat_resp, "batch": "13028323", "exp": "05-28", "mrp": 95.00, "rate": 72.38, "pack": "100ML", "qty": 3, "gst": 5.0},
        {"inv": "57093", "name": "CHERICOF 12 SF SYP 100ML", "form": "Syrup", "cat": cat_resp, "batch": "13028324", "exp": "05-28", "mrp": 145.00, "rate": 110.48, "pack": "100ML", "qty": 3, "gst": 5.0},
        {"inv": "57093", "name": "CHERICOF SYP 100ML", "form": "Syrup", "cat": cat_resp, "batch": "13028325", "exp": "05-28", "mrp": 135.00, "rate": 102.86, "pack": "100ML", "qty": 3, "gst": 5.0},
        {"inv": "57093", "name": "COMBIFLAM SYP 100ML", "form": "Syrup", "cat": cat_pain, "batch": "13028326", "exp": "05-28", "mrp": 48.00, "rate": 36.57, "pack": "100ML", "qty": 5, "gst": 5.0},
        {"inv": "57093", "name": "IMOL SUSP 60ML", "form": "Syrup", "cat": cat_pain, "batch": "13028327", "exp": "05-28", "mrp": 42.00, "rate": 32.00, "pack": "60ML", "qty": 3, "gst": 5.0},
        {"inv": "57093", "name": "IBUKIND PLUS SYP 60ML", "form": "Syrup", "cat": cat_pain, "batch": "13028328", "exp": "05-28", "mrp": 38.00, "rate": 28.95, "pack": "60ML", "qty": 3, "gst": 5.0},
        {"inv": "57093", "name": "LECOPE SYP 60ML", "form": "Syrup", "cat": cat_resp, "batch": "13028329", "exp": "05-28", "mrp": 65.00, "rate": 49.52, "pack": "60ML", "qty": 3, "gst": 5.0},
        {"inv": "57093", "name": "CODISTAR DC SYP 100ML", "form": "Syrup", "cat": cat_resp, "batch": "13028330", "exp": "05-28", "mrp": 165.00, "rate": 125.71, "pack": "100ML", "qty": 3, "gst": 5.0},
        {"inv": "57093", "name": "BRO ZEET LS SYP 100ML", "form": "Syrup", "cat": cat_resp, "batch": "13028331", "exp": "05-28", "mrp": 115.00, "rate": 87.62, "pack": "100ML", "qty": 3, "gst": 5.0},
        {"inv": "57093", "name": "CYCLOPAM SYP 60ML", "form": "Syrup", "cat": cat_pain, "batch": "13028332", "exp": "05-28", "mrp": 85.00, "rate": 64.76, "pack": "60ML", "qty": 3, "gst": 5.0},
        {"inv": "57093", "name": "CYSTONE SYP 200ML", "form": "Syrup", "cat": cat_gastro, "batch": "13028333", "exp": "05-28", "mrp": 195.00, "rate": 148.57, "pack": "200ML", "qty": 3, "gst": 12.0},
        {"inv": "57093", "name": "LIV.52 SYP 100ML", "form": "Syrup", "cat": cat_gastro, "batch": "13028334", "exp": "05-28", "mrp": 125.00, "rate": 95.24, "pack": "100ML", "qty": 3, "gst": 12.0},
        {"inv": "57093", "name": "LIV.52 SYP 200ML", "form": "Syrup", "cat": cat_gastro, "batch": "13028335", "exp": "05-28", "mrp": 215.00, "rate": 163.81, "pack": "200ML", "qty": 3, "gst": 12.0},
        {"inv": "57093", "name": "BRO ZEDEX SF SYP 100ML", "form": "Syrup", "cat": cat_resp, "batch": "13028336", "exp": "05-28", "mrp": 145.00, "rate": 110.48, "pack": "100ML", "qty": 3, "gst": 5.0},
        {"inv": "57093", "name": "BRO ZEDEX SYP 100ML", "form": "Syrup", "cat": cat_resp, "batch": "13028337", "exp": "05-28", "mrp": 135.00, "rate": 102.86, "pack": "100ML", "qty": 3, "gst": 5.0},

        # Inv 57087
        {"inv": "57087", "name": "EMESET SYP 30ML", "form": "Syrup", "cat": cat_gastro, "batch": "13028340", "exp": "05-28", "mrp": 42.00, "rate": 32.00, "pack": "30ML", "qty": 3, "gst": 5.0},
        {"inv": "57087", "name": "ASTHALIN SYP 100ML", "form": "Syrup", "cat": cat_resp, "batch": "13028342", "exp": "05-28", "mrp": 22.50, "rate": 17.14, "pack": "100ML", "qty": 5, "gst": 5.0},
        {"inv": "57087", "name": "ASTHAKIND LS JR SYP 60ML", "form": "Syrup", "cat": cat_resp, "batch": "13028344", "exp": "05-28", "mrp": 75.00, "rate": 57.14, "pack": "60ML", "qty": 3, "gst": 5.0},
        {"inv": "57087", "name": "ASTHAKIND DX SYP 100ML", "form": "Syrup", "cat": cat_resp, "batch": "13028345", "exp": "05-28", "mrp": 95.00, "rate": 72.38, "pack": "100ML", "qty": 3, "gst": 5.0},
        {"inv": "57087", "name": "ASTHAKIND EXP 100ML", "form": "Syrup", "cat": cat_resp, "batch": "13028346", "exp": "05-28", "mrp": 95.00, "rate": 72.38, "pack": "100ML", "qty": 3, "gst": 5.0},
        {"inv": "57087", "name": "ASCORIL FLU SYP 60ML", "form": "Syrup", "cat": cat_resp, "batch": "13028347", "exp": "05-28", "mrp": 85.00, "rate": 64.76, "pack": "60ML", "qty": 3, "gst": 5.0},
        {"inv": "57087", "name": "ASCORIL JR SYP 60ML", "form": "Syrup", "cat": cat_resp, "batch": "13028348", "exp": "05-28", "mrp": 75.00, "rate": 57.14, "pack": "60ML", "qty": 3, "gst": 5.0},
        {"inv": "57087", "name": "ASCORIL LS JR SYP 60ML", "form": "Syrup", "cat": cat_resp, "batch": "13028349", "exp": "05-28", "mrp": 85.00, "rate": 64.76, "pack": "60ML", "qty": 3, "gst": 5.0},
        {"inv": "57087", "name": "ASCORIL SF SYP 100ML", "form": "Syrup", "cat": cat_resp, "batch": "13028351", "exp": "05-28", "mrp": 145.00, "rate": 110.48, "pack": "100ML", "qty": 3, "gst": 5.0},
        {"inv": "57087", "name": "ASCORIL D+ SYP 100ML", "form": "Syrup", "cat": cat_resp, "batch": "13028352", "exp": "05-28", "mrp": 135.00, "rate": 102.86, "pack": "100ML", "qty": 3, "gst": 5.0},
        {"inv": "57087", "name": "GRILINCTUS LS SYP 100ML", "form": "Syrup", "cat": cat_resp, "batch": "13028353", "exp": "05-28", "mrp": 125.00, "rate": 95.24, "pack": "100ML", "qty": 3, "gst": 5.0},
        {"inv": "57087", "name": "AMBRODIL SYP 100ML", "form": "Syrup", "cat": cat_resp, "batch": "13028354", "exp": "05-28", "mrp": 38.00, "rate": 28.95, "pack": "100ML", "qty": 3, "gst": 5.0},
        {"inv": "57087", "name": "SENQUEL AD+ MOUTHWASH 100ML", "form": "Other", "cat": cat_derma, "batch": "13028355", "exp": "05-28", "mrp": 145.00, "rate": 110.48, "pack": "100ML", "qty": 2, "gst": 18.0},
        {"inv": "57087", "name": "FLAGYL SYP 60ML", "form": "Syrup", "cat": cat_anti, "batch": "13028356", "exp": "05-28", "mrp": 35.00, "rate": 26.67, "pack": "60ML", "qty": 3, "gst": 5.0},
        {"inv": "57087", "name": "CLOHEX ADS MOUTHWASH 150ML", "form": "Other", "cat": cat_derma, "batch": "13028357", "exp": "05-28", "mrp": 185.00, "rate": 140.95, "pack": "150ML", "qty": 2, "gst": 18.0},

        # Inv 57096 & 57103
        {"inv": "57096", "name": "IBUGESIC PLUS TAB 20'S", "form": "Tablet", "cat": cat_pain, "batch": "13028363", "exp": "05-28", "mrp": 42.00, "rate": 32.00, "pack": "20'S", "qty": 5, "gst": 5.0},
        {"inv": "57096", "name": "DIGENE TAB 15'S", "form": "Tablet", "cat": cat_gastro, "batch": "13028364", "exp": "05-28", "mrp": 25.00, "rate": 19.05, "pack": "15'S", "qty": 10, "gst": 5.0},
        {"inv": "57096", "name": "GELUSIL MPS TAB 15'S", "form": "Tablet", "cat": cat_gastro, "batch": "13028365", "exp": "05-28", "mrp": 22.00, "rate": 16.76, "pack": "15'S", "qty": 10, "gst": 5.0},
        {"inv": "57096", "name": "GELUSIL MPS LIQ 200ML", "form": "Syrup", "cat": cat_gastro, "batch": "13028366", "exp": "05-28", "mrp": 145.00, "rate": 110.48, "pack": "200ML", "qty": 5, "gst": 5.0},
        {"inv": "57096", "name": "PAN RFT ORAL SUSP 30ML", "form": "Syrup", "cat": cat_gastro, "batch": "13028367", "exp": "05-28", "mrp": 65.00, "rate": 49.52, "pack": "30ML", "qty": 3, "gst": 5.0},
        {"inv": "57096", "name": "HATRIC 3MG SYP 60ML", "form": "Syrup", "cat": cat_resp, "batch": "13028368", "exp": "05-28", "mrp": 75.00, "rate": 57.14, "pack": "60ML", "qty": 3, "gst": 5.0},
        {"inv": "57096", "name": "IMOL PLUS TAB 10'S", "form": "Tablet", "cat": cat_pain, "batch": "13028369", "exp": "05-28", "mrp": 35.00, "rate": 26.67, "pack": "10'S", "qty": 5, "gst": 5.0},
        {"inv": "57096", "name": "HICOPE SYP 100ML", "form": "Syrup", "cat": cat_resp, "batch": "13028371", "exp": "05-28", "mrp": 95.00, "rate": 72.38, "pack": "100ML", "qty": 3, "gst": 5.0},
        {"inv": "57096", "name": "GUDLAX PLUS SUSP 100ML", "form": "Syrup", "cat": cat_gastro, "batch": "13028372", "exp": "05-28", "mrp": 175.00, "rate": 133.33, "pack": "100ML", "qty": 2, "gst": 5.0},
        {"inv": "57096", "name": "HISTAFREE SUSP 60ML", "form": "Syrup", "cat": cat_resp, "batch": "13028373", "exp": "05-28", "mrp": 85.00, "rate": 64.76, "pack": "60ML", "qty": 3, "gst": 5.0},
        {"inv": "57096", "name": "RANIDOM MPS SUSP 200ML", "form": "Syrup", "cat": cat_gastro, "batch": "13028374", "exp": "05-28", "mrp": 165.00, "rate": 125.71, "pack": "200ML", "qty": 3, "gst": 5.0},
        {"inv": "57096", "name": "RANIDOM O SUSP 200ML", "form": "Syrup", "cat": cat_gastro, "batch": "13028375", "exp": "05-28", "mrp": 175.00, "rate": 133.33, "pack": "200ML", "qty": 3, "gst": 5.0},
        {"inv": "57096", "name": "GRILINCTUS DX SYP 100ML", "form": "Syrup", "cat": cat_resp, "batch": "13028376", "exp": "05-28", "mrp": 135.00, "rate": 102.86, "pack": "100ML", "qty": 3, "gst": 5.0},
        {"inv": "57096", "name": "GRILINCTUS BM SYP 100ML", "form": "Syrup", "cat": cat_resp, "batch": "13028377", "exp": "05-28", "mrp": 125.00, "rate": 95.24, "pack": "100ML", "qty": 3, "gst": 5.0},
        {"inv": "57096", "name": "GASEX SYP ELAICHI 200ML", "form": "Syrup", "cat": cat_gastro, "batch": "13028378", "exp": "05-28", "mrp": 145.00, "rate": 110.48, "pack": "200ML", "qty": 3, "gst": 12.0},
        {"inv": "57096", "name": "HIMCOCID S.F MINT 200ML", "form": "Syrup", "cat": cat_gastro, "batch": "13028379", "exp": "05-28", "mrp": 135.00, "rate": 102.86, "pack": "200ML", "qty": 3, "gst": 12.0},
        {"inv": "57096", "name": "RANTAC SYP 100ML", "form": "Syrup", "cat": cat_gastro, "batch": "13028382", "exp": "05-28", "mrp": 85.00, "rate": 64.76, "pack": "100ML", "qty": 3, "gst": 5.0},

        # Inv 57103
        {"inv": "57103", "name": "PERLICE CREME RINSE 60ML", "form": "Other", "cat": cat_derma, "batch": "13028383", "exp": "05-28", "mrp": 115.00, "rate": 87.62, "pack": "60ML", "qty": 2, "gst": 18.0},
        {"inv": "57103", "name": "SOLVIN DECONGESTANT TAB 10'S", "form": "Tablet", "cat": cat_resp, "batch": "13028384", "exp": "05-28", "mrp": 65.00, "rate": 49.52, "pack": "10'S", "qty": 5, "gst": 5.0},
        {"inv": "57103", "name": "SOLVIN DECONGESTANT SYP 60ML", "form": "Syrup", "cat": cat_resp, "batch": "13028385", "exp": "05-28", "mrp": 75.00, "rate": 57.14, "pack": "60ML", "qty": 3, "gst": 5.0},
        {"inv": "57103", "name": "GASEX TAB 100'S", "form": "Tablet", "cat": cat_gastro, "batch": "13028386", "exp": "05-28", "mrp": 145.00, "rate": 110.48, "pack": "100'S", "qty": 3, "gst": 12.0},
        {"inv": "57103", "name": "SEPTILIN TAB 60'S", "form": "Tablet", "cat": cat_vit, "batch": "13028387", "exp": "05-28", "mrp": 165.00, "rate": 125.71, "pack": "60'S", "qty": 3, "gst": 12.0},
        {"inv": "57103", "name": "PILEX TAB 60'S", "form": "Tablet", "cat": cat_gastro, "batch": "13028388", "exp": "05-28", "mrp": 155.00, "rate": 118.10, "pack": "60'S", "qty": 3, "gst": 12.0},
        {"inv": "57103", "name": "LIV.52 TAB 100'S", "form": "Tablet", "cat": cat_gastro, "batch": "13028389", "exp": "05-28", "mrp": 165.00, "rate": 125.71, "pack": "100'S", "qty": 5, "gst": 12.0},
        {"inv": "57103", "name": "LIV.52 DS TAB 60'S", "form": "Tablet", "cat": cat_gastro, "batch": "13028391", "exp": "05-28", "mrp": 195.00, "rate": 148.57, "pack": "60'S", "qty": 5, "gst": 12.0},
        {"inv": "57103", "name": "CYSTONE TAB 60'S", "form": "Tablet", "cat": cat_gastro, "batch": "13028392", "exp": "05-28", "mrp": 175.00, "rate": 133.33, "pack": "60'S", "qty": 5, "gst": 12.0},
        {"inv": "57103", "name": "MOISTUREX SOFT LOTION 100ML", "form": "Ointment", "cat": cat_derma, "batch": "13028393", "exp": "05-28", "mrp": 245.00, "rate": 186.67, "pack": "100ML", "qty": 2, "gst": 18.0},
        {"inv": "57103", "name": "CWIN LOTION 50ML", "form": "Ointment", "cat": cat_derma, "batch": "13028394", "exp": "05-28", "mrp": 185.00, "rate": 140.95, "pack": "50ML", "qty": 2, "gst": 12.0},
        {"inv": "57103", "name": "CWIN CREAM 30GM", "form": "Ointment", "cat": cat_derma, "batch": "13028395", "exp": "05-28", "mrp": 145.00, "rate": 110.48, "pack": "30GM", "qty": 2, "gst": 12.0},
        {"inv": "57103", "name": "PACIMOL MF SYP 60ML", "form": "Syrup", "cat": cat_pain, "batch": "13028396", "exp": "05-28", "mrp": 42.00, "rate": 32.00, "pack": "60ML", "qty": 3, "gst": 5.0},
        {"inv": "57103", "name": "PACIMOL DS SYP 60ML", "form": "Syrup", "cat": cat_pain, "batch": "13028397", "exp": "05-28", "mrp": 55.00, "rate": 41.90, "pack": "60ML", "qty": 3, "gst": 5.0},
        {"inv": "57103", "name": "PACIMOL SYP 60ML", "form": "Syrup", "cat": cat_pain, "batch": "13028398", "exp": "05-28", "mrp": 35.00, "rate": 26.67, "pack": "60ML", "qty": 3, "gst": 5.0},
        {"inv": "57103", "name": "SOLVIN COLD AF SYP 60ML", "form": "Syrup", "cat": cat_resp, "batch": "13028399", "exp": "05-28", "mrp": 85.00, "rate": 64.76, "pack": "60ML", "qty": 3, "gst": 5.0},
        {"inv": "57103", "name": "CANDID LOTION 50ML", "form": "Ointment", "cat": cat_derma, "batch": "13028404", "exp": "05-28", "mrp": 195.00, "rate": 148.57, "pack": "50ML", "qty": 2, "gst": 12.0},
        {"inv": "57103", "name": "CANDID B LOTION 30ML", "form": "Ointment", "cat": cat_derma, "batch": "13028405", "exp": "05-28", "mrp": 215.00, "rate": 163.81, "pack": "30ML", "qty": 2, "gst": 12.0},
        {"inv": "57103", "name": "CANDID B CREAM 20GM", "form": "Ointment", "cat": cat_derma, "batch": "13028406", "exp": "05-28", "mrp": 165.00, "rate": 125.71, "pack": "20GM", "qty": 3, "gst": 12.0},
    ]

    # Process GK Items
    gk_count = 0
    for item in gk_items:
        med, _ = Medicine.objects.get_or_create(
            name=item["name"],
            defaults={
                "dosage_form": item.get("form", "Syrup"),
                "category": item.get("cat"),
                "hsn_code": "3004",
                "gst_rate": Decimal(str(item.get("gst", 5.0))),
                "min_stock_alert": 5,
                "is_active": True
            }
        )
        med.category = item.get("cat")
        med.dosage_form = item.get("form", "Syrup")
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
                "supplier": sup_gk,
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
            batch.supplier = sup_gk
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
            notes=f"Purchase from G.K. Pharma Inv #{item['inv']}"
        )
        gk_count += 1
    print(f"  [+] Imported {gk_count} items from G.K. Pharma.")

    # 3. Sri Kateel Agencies Items (Bills 5750 & 5797)
    kateel_items = [
        # Bill 5750
        {"inv": "5750", "name": "ROLLER BANDAGE 7.5CM", "form": "Other", "cat": cat_surg, "batch": "SK5750-01", "exp": "05-29", "mrp": 25.00, "rate": 14.50, "pack": "1NOS", "qty": 20, "gst": 12.0},
        {"inv": "5750", "name": "ROLLER BANDAGE 5CM", "form": "Other", "cat": cat_surg, "batch": "SK5750-02", "exp": "05-29", "mrp": 18.00, "rate": 10.50, "pack": "1NOS", "qty": 20, "gst": 12.0},
        {"inv": "5750", "name": "JAYCOT COTTON 15GM", "form": "Other", "cat": cat_surg, "batch": "SK5750-03", "exp": "05-29", "mrp": 25.00, "rate": 14.50, "pack": "1NOS", "qty": 20, "gst": 12.0},
        {"inv": "5750", "name": "OMNIGEL SPRAY 35G", "form": "Other", "cat": cat_pain, "batch": "SK5750-04", "exp": "05-28", "mrp": 145.00, "rate": 110.48, "pack": "35GM", "qty": 3, "gst": 12.0},
        {"inv": "5750", "name": "OMNIGEL SPRAY 55G", "form": "Other", "cat": cat_pain, "batch": "SK5750-05", "exp": "05-28", "mrp": 215.00, "rate": 163.81, "pack": "55GM", "qty": 3, "gst": 12.0},
        {"inv": "5750", "name": "ABD SUSP 10ML", "form": "Syrup", "cat": cat_anti, "batch": "SK5750-06", "exp": "05-28", "mrp": 25.00, "rate": 19.05, "pack": "10ML", "qty": 5, "gst": 5.0},
        {"inv": "5750", "name": "ABD PLUS SUSP 10ML", "form": "Syrup", "cat": cat_anti, "batch": "SK5750-07", "exp": "05-28", "mrp": 35.00, "rate": 26.67, "pack": "10ML", "qty": 5, "gst": 5.0},
        {"inv": "5750", "name": "ABD PLUS TAB 1'S", "form": "Tablet", "cat": cat_anti, "batch": "SK5750-08", "exp": "05-28", "mrp": 28.00, "rate": 21.33, "pack": "1'S", "qty": 10, "gst": 5.0},
        {"inv": "5750", "name": "CLEARWAX DROPS 10ML", "form": "Drops", "cat": cat_derma, "batch": "SK5750-09", "exp": "05-28", "mrp": 85.00, "rate": 64.76, "pack": "10ML", "qty": 3, "gst": 5.0},
        {"inv": "5750", "name": "NEEM OIL 50ML", "form": "Other", "cat": cat_derma, "batch": "SK5750-10", "exp": "05-28", "mrp": 65.00, "rate": 49.52, "pack": "50ML", "qty": 5, "gst": 12.0},
        {"inv": "5750", "name": "CASTOR NF 100ML", "form": "Other", "cat": cat_derma, "batch": "SK5750-11", "exp": "05-28", "mrp": 95.00, "rate": 72.38, "pack": "100ML", "qty": 5, "gst": 12.0},
        {"inv": "5750", "name": "RESPITHIK TR SYRUP 100ML", "form": "Syrup", "cat": cat_resp, "batch": "SK5750-12", "exp": "05-28", "mrp": 115.00, "rate": 87.62, "pack": "100ML", "qty": 3, "gst": 5.0},
        {"inv": "5750", "name": "ORTHOMAC GEL 30GM", "form": "Ointment", "cat": cat_pain, "batch": "SK5750-13", "exp": "05-28", "mrp": 125.00, "rate": 95.24, "pack": "30GM", "qty": 3, "gst": 12.0},
        {"inv": "5750", "name": "FENACIN GEL 30GM", "form": "Ointment", "cat": cat_pain, "batch": "SK5750-14", "exp": "05-28", "mrp": 115.00, "rate": 87.62, "pack": "30GM", "qty": 3, "gst": 12.0},
        {"inv": "5750", "name": "H2O2 25ML", "form": "Other", "cat": cat_surg, "batch": "SK5750-15", "exp": "05-28", "mrp": 25.00, "rate": 15.00, "pack": "25ML", "qty": 10, "gst": 12.0},
        {"inv": "5750", "name": "SAPAT MULAM 15GM", "form": "Ointment", "cat": cat_derma, "batch": "SK5750-16", "exp": "05-28", "mrp": 45.00, "rate": 34.29, "pack": "15GM", "qty": 5, "gst": 12.0},
        {"inv": "5750", "name": "SAPAT LOTION 20ML", "form": "Other", "cat": cat_derma, "batch": "SK5750-17", "exp": "05-28", "mrp": 55.00, "rate": 41.90, "pack": "20ML", "qty": 5, "gst": 12.0},
        {"inv": "5750", "name": "OKACET-L TAB 10'S", "form": "Tablet", "cat": cat_resp, "batch": "SK5750-18", "exp": "05-28", "mrp": 65.00, "rate": 49.52, "pack": "10'S", "qty": 5, "gst": 5.0},
        {"inv": "5750", "name": "OKACET SYRUP 60ML", "form": "Syrup", "cat": cat_resp, "batch": "SK5750-19", "exp": "05-28", "mrp": 45.00, "rate": 34.29, "pack": "60ML", "qty": 3, "gst": 5.0},
        {"inv": "5750", "name": "NICIP COLD & FLU TAB 10'S", "form": "Tablet", "cat": cat_resp, "batch": "SK5750-20", "exp": "05-28", "mrp": 75.00, "rate": 57.14, "pack": "10'S", "qty": 5, "gst": 5.0},
        {"inv": "5750", "name": "NICIP 100MG TAB 15'S", "form": "Tablet", "cat": cat_pain, "batch": "SK5750-21", "exp": "05-28", "mrp": 45.00, "rate": 34.29, "pack": "15'S", "qty": 5, "gst": 5.0},
        {"inv": "5750", "name": "NICIP PLUS TAB 10'S", "form": "Tablet", "cat": cat_pain, "batch": "SK5750-22", "exp": "05-28", "mrp": 55.00, "rate": 41.90, "pack": "10'S", "qty": 5, "gst": 5.0},
        {"inv": "5750", "name": "LCM TAB 10'S", "form": "Tablet", "cat": cat_resp, "batch": "SK5750-23", "exp": "05-28", "mrp": 65.00, "rate": 49.52, "pack": "10'S", "qty": 5, "gst": 5.0},
        {"inv": "5750", "name": "CEFIX 200 TAB 10'S", "form": "Tablet", "cat": cat_anti, "batch": "SK5750-24", "exp": "05-28", "mrp": 145.00, "rate": 110.48, "pack": "10'S", "qty": 5, "gst": 5.0},
        {"inv": "5750", "name": "HIMAC 50MG TAB 10'S", "form": "Tablet", "cat": cat_pain, "batch": "SK5750-25", "exp": "05-28", "mrp": 65.00, "rate": 49.52, "pack": "10'S", "qty": 5, "gst": 5.0},
        {"inv": "5750", "name": "OMEE 20 CAPS 20'S", "form": "Capsule", "cat": cat_gastro, "batch": "SK5750-26", "exp": "05-28", "mrp": 65.00, "rate": 49.52, "pack": "20'S", "qty": 5, "gst": 5.0},
        {"inv": "5750", "name": "PANTAFOL-DSR CAPS 10'S", "form": "Capsule", "cat": cat_gastro, "batch": "SK5750-27", "exp": "05-28", "mrp": 145.00, "rate": 110.48, "pack": "10'S", "qty": 5, "gst": 5.0},
        {"inv": "5750", "name": "P-40 TAB 15'S", "form": "Tablet", "cat": cat_gastro, "batch": "SK5750-28", "exp": "05-28", "mrp": 135.00, "rate": 102.86, "pack": "15'S", "qty": 5, "gst": 5.0},
        {"inv": "5750", "name": "PARACIP 500 TAB 10'S", "form": "Tablet", "cat": cat_pain, "batch": "SK5750-29", "exp": "05-28", "mrp": 18.00, "rate": 13.71, "pack": "10'S", "qty": 10, "gst": 5.0},
        {"inv": "5750", "name": "PARACIP 650 TAB 15'S", "form": "Tablet", "cat": cat_pain, "batch": "SK5750-30", "exp": "05-28", "mrp": 32.00, "rate": 24.38, "pack": "15'S", "qty": 10, "gst": 5.0},
        {"inv": "5750", "name": "PARACIP 125 SUSP 60ML", "form": "Syrup", "cat": cat_pain, "batch": "SK5750-31", "exp": "05-28", "mrp": 38.00, "rate": 28.95, "pack": "60ML", "qty": 5, "gst": 5.0},
        {"inv": "5750", "name": "COSART 50 TAB 15'S", "form": "Tablet", "cat": cat_cardio, "batch": "SK5750-32", "exp": "05-28", "mrp": 115.00, "rate": 87.62, "pack": "15'S", "qty": 3, "gst": 5.0},
        {"inv": "5750", "name": "COSART H TAB 15'S", "form": "Tablet", "cat": cat_cardio, "batch": "SK5750-33", "exp": "05-28", "mrp": 145.00, "rate": 110.48, "pack": "15'S", "qty": 3, "gst": 5.0},
        {"inv": "5750", "name": "LOPAR TAB 10'S", "form": "Tablet", "cat": cat_gastro, "batch": "SK5750-34", "exp": "05-28", "mrp": 25.00, "rate": 19.05, "pack": "10'S", "qty": 5, "gst": 5.0},
        {"inv": "5750", "name": "ALMOX 500 CAPS 15'S", "form": "Capsule", "cat": cat_anti, "batch": "SK5750-35", "exp": "05-28", "mrp": 115.00, "rate": 87.62, "pack": "15'S", "qty": 3, "gst": 5.0},
        {"inv": "5750", "name": "ALMOX 250 CAPS 15'S", "form": "Capsule", "cat": cat_anti, "batch": "SK5750-36", "exp": "05-28", "mrp": 65.00, "rate": 49.52, "pack": "15'S", "qty": 3, "gst": 5.0},
        {"inv": "5750", "name": "ACCUZITH 500 TAB 5'S", "form": "Tablet", "cat": cat_anti, "batch": "SK5750-37", "exp": "05-28", "mrp": 125.00, "rate": 95.24, "pack": "5'S", "qty": 5, "gst": 5.0},
        {"inv": "5750", "name": "CHESTON COLD TAB 10'S", "form": "Tablet", "cat": cat_resp, "batch": "SK5750-38", "exp": "05-28", "mrp": 55.00, "rate": 41.90, "pack": "10'S", "qty": 5, "gst": 5.0},
        {"inv": "5750", "name": "CIPCAL D3 SOFTGEL 4'S", "form": "Capsule", "cat": cat_vit, "batch": "SK5750-39", "exp": "05-28", "mrp": 145.00, "rate": 110.48, "pack": "4'S", "qty": 5, "gst": 5.0},
        {"inv": "5750", "name": "KOFCLEAR DX+ SYRUP 100ML", "form": "Syrup", "cat": cat_resp, "batch": "SK5750-40", "exp": "05-28", "mrp": 115.00, "rate": 87.62, "pack": "100ML", "qty": 3, "gst": 5.0},
        {"inv": "5750", "name": "KOFCLEAR SF SYRUP 100ML", "form": "Syrup", "cat": cat_resp, "batch": "SK5750-41", "exp": "05-28", "mrp": 125.00, "rate": 95.24, "pack": "100ML", "qty": 3, "gst": 5.0},
        {"inv": "5750", "name": "IBUVENT PLUS SYP 100ML", "form": "Syrup", "cat": cat_pain, "batch": "SK5750-42", "exp": "05-28", "mrp": 48.00, "rate": 36.57, "pack": "100ML", "qty": 5, "gst": 5.0},
        {"inv": "5750", "name": "ROMSONS AERO MIST ADULT", "form": "Other", "cat": cat_surg, "batch": "SK5750-43", "exp": "05-29", "mrp": 668.00, "rate": 75.00, "pack": "1NOS", "qty": 5, "gst": 5.0},
        {"inv": "5750", "name": "ROMSONS AERO MIST CHILD", "form": "Other", "cat": cat_surg, "batch": "SK5750-44", "exp": "05-29", "mrp": 668.00, "rate": 75.00, "pack": "1NOS", "qty": 5, "gst": 5.0},
        {"inv": "5750", "name": "LULIFORD OINT 30GM", "form": "Ointment", "cat": cat_derma, "batch": "SK5750-45", "exp": "05-28", "mrp": 295.00, "rate": 224.76, "pack": "30GM", "qty": 2, "gst": 12.0},

        # Bill 5797
        {"inv": "5797", "name": "OROGARD INSTA ULCER GEL 15GM", "form": "Ointment", "cat": cat_derma, "batch": "SK5797-01", "exp": "05-28", "mrp": 95.00, "rate": 72.38, "pack": "15GM", "qty": 3, "gst": 12.0},
        {"inv": "5797", "name": "CLINSOL GEL 20GM", "form": "Ointment", "cat": cat_derma, "batch": "SK5797-02", "exp": "05-28", "mrp": 125.00, "rate": 95.24, "pack": "20GM", "qty": 2, "gst": 12.0},
        {"inv": "5797", "name": "SUMO GEL 15G", "form": "Ointment", "cat": cat_pain, "batch": "SK5797-03", "exp": "05-28", "mrp": 75.00, "rate": 57.14, "pack": "15GM", "qty": 3, "gst": 12.0},
        {"inv": "5797", "name": "SUMO GEL 30G", "form": "Ointment", "cat": cat_pain, "batch": "SK5797-04", "exp": "05-28", "mrp": 135.00, "rate": 102.86, "pack": "30GM", "qty": 3, "gst": 12.0},
        {"inv": "5797", "name": "REXCOF DX SYP 100ML", "form": "Syrup", "cat": cat_resp, "batch": "SK5797-05", "exp": "05-28", "mrp": 115.00, "rate": 87.62, "pack": "100ML", "qty": 3, "gst": 5.0},
        {"inv": "5797", "name": "ALKOF + SYP 100ML", "form": "Syrup", "cat": cat_resp, "batch": "SK5797-06", "exp": "05-28", "mrp": 115.00, "rate": 87.62, "pack": "100ML", "qty": 3, "gst": 5.0},
        {"inv": "5797", "name": "ALKOF DX SYP 100ML", "form": "Syrup", "cat": cat_resp, "batch": "SK5797-07", "exp": "05-28", "mrp": 125.00, "rate": 95.24, "pack": "100ML", "qty": 3, "gst": 5.0},
        {"inv": "5797", "name": "DERMIFORD OINT 15GM", "form": "Ointment", "cat": cat_derma, "batch": "SK5797-08", "exp": "05-28", "mrp": 95.00, "rate": 72.38, "pack": "15GM", "qty": 3, "gst": 12.0},
        {"inv": "5797", "name": "CLOBET-GM CREAM 20GM", "form": "Ointment", "cat": cat_derma, "batch": "SK5797-09", "exp": "05-28", "mrp": 85.00, "rate": 64.76, "pack": "20GM", "qty": 3, "gst": 12.0},
        {"inv": "5797", "name": "CLOCIP-B OINT 20GM", "form": "Ointment", "cat": cat_derma, "batch": "SK5797-10", "exp": "05-28", "mrp": 95.00, "rate": 72.38, "pack": "20GM", "qty": 3, "gst": 12.0},
        {"inv": "5797", "name": "CLOCIP DUSTING POWDER 100G", "form": "Powder", "cat": cat_derma, "batch": "SK5797-11", "exp": "05-28", "mrp": 135.00, "rate": 102.86, "pack": "100GM", "qty": 3, "gst": 12.0},
        {"inv": "5797", "name": "CLOCIP DUSTING POWDER 75G", "form": "Powder", "cat": cat_derma, "batch": "SK5797-12", "exp": "05-28", "mrp": 105.00, "rate": 80.00, "pack": "75GM", "qty": 3, "gst": 12.0},
        {"inv": "5797", "name": "CLOZOLE OINT 20GM", "form": "Ointment", "cat": cat_derma, "batch": "298", "exp": "05-28", "mrp": 96.04, "rate": 14.25, "pack": "20GM", "qty": 5, "gst": 12.0},
        {"inv": "5797", "name": "FOURDERM OINT 15GM", "form": "Ointment", "cat": cat_derma, "batch": "51162", "exp": "05-28", "mrp": 103.10, "rate": 20.45, "pack": "15GM", "qty": 5, "gst": 12.0},
        {"inv": "5797", "name": "DEXODERM NF CREAM 15GM", "form": "Ointment", "cat": cat_derma, "batch": "SK5797-13", "exp": "05-28", "mrp": 85.00, "rate": 64.76, "pack": "15GM", "qty": 3, "gst": 12.0},
        {"inv": "5797", "name": "OFLATOP-CT CREAM 15GM", "form": "Ointment", "cat": cat_derma, "batch": "SK5797-14", "exp": "05-28", "mrp": 95.00, "rate": 72.38, "pack": "15GM", "qty": 3, "gst": 12.0},
        {"inv": "5797", "name": "FUNGDID B CREAM 15GM", "form": "Ointment", "cat": cat_derma, "batch": "SK5797-15", "exp": "05-28", "mrp": 85.00, "rate": 64.76, "pack": "15GM", "qty": 3, "gst": 12.0},
        {"inv": "5797", "name": "KETOFORD CREAM 30GM", "form": "Ointment", "cat": cat_derma, "batch": "SK5797-16", "exp": "05-28", "mrp": 165.00, "rate": 125.71, "pack": "30GM", "qty": 2, "gst": 12.0},
        {"inv": "5797", "name": "TRIODERM OINT 10G", "form": "Ointment", "cat": cat_derma, "batch": "SK5797-17", "exp": "05-28", "mrp": 95.00, "rate": 72.38, "pack": "10GM", "qty": 3, "gst": 12.0},
        {"inv": "5797", "name": "DERMIKEM OC+ CREAM 20GM", "form": "Ointment", "cat": cat_derma, "batch": "DCC25015ED", "exp": "05-28", "mrp": 112.50, "rate": 26.18, "pack": "20GM", "qty": 5, "gst": 12.0},
        {"inv": "5797", "name": "VENTIMOX CV DS 457 DRY SYP 30ML", "form": "Syrup", "cat": cat_anti, "batch": "54046005", "exp": "05-28", "mrp": 139.68, "rate": 48.15, "pack": "30ML", "qty": 3, "gst": 5.0},
        {"inv": "5797", "name": "AUGULAB 625 TAB 10'S", "form": "Tablet", "cat": cat_anti, "batch": "SK5797-18", "exp": "05-28", "mrp": 215.00, "rate": 163.81, "pack": "10'S", "qty": 5, "gst": 5.0},
        {"inv": "5797", "name": "PARAFAST 250 SUSP 60ML", "form": "Syrup", "cat": cat_pain, "batch": "SK5797-19", "exp": "05-28", "mrp": 45.00, "rate": 34.29, "pack": "60ML", "qty": 5, "gst": 5.0},
        {"inv": "5797", "name": "CYCLOBREX SUSP 60ML", "form": "Syrup", "cat": cat_pain, "batch": "SK5797-20", "exp": "05-28", "mrp": 55.00, "rate": 41.90, "pack": "60ML", "qty": 3, "gst": 5.0},
        {"inv": "5797", "name": "CIPLADINE OINT 15GM", "form": "Ointment", "cat": cat_derma, "batch": "SK5797-21", "exp": "05-28", "mrp": 65.00, "rate": 49.52, "pack": "15GM", "qty": 5, "gst": 12.0},
        {"inv": "5797", "name": "MEDIGRIP PLASTER 100'S", "form": "Other", "cat": cat_surg, "batch": "SK5797-22", "exp": "05-29", "mrp": 250.00, "rate": 140.00, "pack": "100NOS", "qty": 1, "gst": 12.0},
        {"inv": "5797", "name": "LION PLASTER", "form": "Other", "cat": cat_surg, "batch": "SK5797-23", "exp": "05-29", "mrp": 45.00, "rate": 25.00, "pack": "1NOS", "qty": 10, "gst": 12.0},
        {"inv": "5797", "name": "HANSAPLAST 50PCS JAR", "form": "Other", "cat": cat_surg, "batch": "SK5797-24", "exp": "05-29", "mrp": 150.00, "rate": 90.00, "pack": "50NOS", "qty": 2, "gst": 12.0},
        {"inv": "5797", "name": "HOT WATER BAG", "form": "Other", "cat": cat_surg, "batch": "SK5797-25", "exp": "05-29", "mrp": 290.00, "rate": 105.00, "pack": "1NOS", "qty": 2, "gst": 18.0},
        {"inv": "5797", "name": "KETOKEM SHAMPOO 100ML", "form": "Other", "cat": cat_derma, "batch": "SK5797-26", "exp": "05-28", "mrp": 315.00, "rate": 240.00, "pack": "100ML", "qty": 2, "gst": 18.0},
        {"inv": "5797", "name": "SKINSHINE CREAM 15GM", "form": "Ointment", "cat": cat_derma, "batch": "SK5797-27", "exp": "05-28", "mrp": 185.00, "rate": 140.95, "pack": "15GM", "qty": 3, "gst": 12.0},
    ]

    kateel_count = 0
    for item in kateel_items:
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
                "supplier": sup_kateel,
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
            batch.supplier = sup_kateel
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
            reference_id=f"BILL-{item['inv']}",
            notes=f"Purchase from Sri Kateel Agencies Bill #{item['inv']}"
        )
        kateel_count += 1
    print(f"  [+] Imported {kateel_count} items from Sri Kateel Agencies.")

    # 4. Rafais Items
    rafais_items = [
        {"name": "BELLA REGULAR DRY WINGS XL", "cat": cat_hygiene, "mrp": 75.00, "rate": 48.00, "qty": 10, "pack": "6PCS"},
        {"name": "BELLA REGULAR SOFT WINGS XL", "cat": cat_hygiene, "mrp": 75.00, "rate": 48.00, "qty": 10, "pack": "6PCS"},
        {"name": "BELLA SAN MAXI DRY", "cat": cat_hygiene, "mrp": 95.00, "rate": 62.00, "qty": 6, "pack": "8PCS"},
        {"name": "BELLA SAN MAXI SOFT", "cat": cat_hygiene, "mrp": 95.00, "rate": 62.00, "qty": 6, "pack": "8PCS"},
        {"name": "BELLA COTTON BUDS FOIL", "cat": cat_hygiene, "mrp": 45.00, "rate": 28.00, "qty": 12, "pack": "100PCS"},
        {"name": "BELLA COTTON BUDS BOX", "cat": cat_hygiene, "mrp": 65.00, "rate": 40.00, "qty": 6, "pack": "100PCS"},
        {"name": "BELLA TISSUE PAPERS", "cat": cat_hygiene, "mrp": 55.00, "rate": 32.00, "qty": 10, "pack": "100PCS"},
    ]
    for idx, item in enumerate(rafais_items, 1):
        med, _ = Medicine.objects.get_or_create(
            name=item["name"],
            defaults={"dosage_form": "Other", "category": item["cat"], "gst_rate": Decimal("12.0"), "min_stock_alert": 5}
        )
        batch, _ = Batch.objects.get_or_create(
            medicine=med,
            batch_number=f"RAF-{idx}",
            defaults={
                "supplier": sup_rafais,
                "expiry_date": date(2029, 12, 31),
                "purchase_price": Decimal(str(item["rate"])),
                "mrp": Decimal(str(item["mrp"])),
                "selling_price": Decimal(str(item["mrp"])),
                "pack_size": parse_pack_size(item["pack"]),
                "pack_quantity": item["qty"],
                "loose_quantity": 0
            }
        )
        batch.purchase_price = Decimal(str(item["rate"]))
        batch.mrp = Decimal(str(item["mrp"]))
        batch.selling_price = Decimal(str(item["mrp"]))
        batch.pack_quantity = item["qty"]
        batch.save()
    print(f"  [+] Imported {len(rafais_items)} items from Rafais.")

if __name__ == '__main__':
    run()
