import os
import re
import json
import base64
import urllib.request
import urllib.error
from datetime import date, datetime, timedelta
from decimal import Decimal
from django.conf import settings

def normalize_expiry(exp_str):
    """
    Parses various date formats from invoices into a valid YYYY-MM-DD string:
    - MM-YY, MM/YY, MM-YYYY, MM/YYYY, YYYY-MM-DD, DD/MM/YYYY, etc.
    """
    default_date = (date.today() + timedelta(days=730)).strftime('%Y-%m-%d')
    if not exp_str:
        return default_date
    
    exp_str = str(exp_str).strip()
    
    # Already YYYY-MM-DD
    if re.match(r'^\d{4}-\d{2}-\d{2}$', exp_str):
        return exp_str
        
    # MM-YY or MM/YY or MM-YYYY or MM/YYYY
    m = re.match(r'^(\d{1,2})[-/](\d{2,4})$', exp_str)
    if m:
        month = min(12, max(1, int(m.group(1))))
        year = int(m.group(2))
        if year < 100:
            year += 2000
        if month in [1, 3, 5, 7, 8, 10, 12]:
            day = 31
        elif month in [4, 6, 9, 11]:
            day = 30
        else:
            day = 29 if (year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)) else 28
        return f"{year:04d}-{month:02d}-{day:02d}"
        
    # DD-MM-YYYY or DD/MM/YYYY
    m_full = re.match(r'^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$', exp_str)
    if m_full:
        day = min(31, max(1, int(m_full.group(1))))
        month = min(12, max(1, int(m_full.group(2))))
        year = int(m_full.group(3))
        if year < 100:
            year += 2000
        return f"{year:04d}-{month:02d}-{day:02d}"

    # Month Names e.g. OCT-28, OCT 2028
    months = {
        'JAN': 1, 'FEB': 2, 'MAR': 3, 'APR': 4, 'MAY': 5, 'JUN': 6,
        'JUL': 7, 'AUG': 8, 'SEP': 9, 'OCT': 10, 'NOV': 11, 'DEC': 12
    }
    exp_upper = exp_str.upper()
    for m_name, m_num in months.items():
        if m_name in exp_upper:
            year_match = re.search(r'\b(20\d{2}|\d{2})\b', exp_upper)
            year = int(year_match.group(1)) if year_match else 2028
            if year < 100:
                year += 2000
            day = 31 if m_num in [1, 3, 5, 7, 8, 10, 12] else (30 if m_num in [4, 6, 9, 11] else 28)
            return f"{year:04d}-{m_num:02d}-{day:02d}"
        
    return default_date


def infer_dosage_and_category(medicine_name):
    """
    Infers dosage form, category, and prescription flag based on medicine name and salt.
    """
    name_upper = (medicine_name or '').upper()
    
    # Dosage Form
    dosage = 'Tablet'
    if any(k in name_upper for k in ['TAB', 'TABLET', 'TABS', 'DT', 'DISP', 'COATED', 'UNCOATED']):
        dosage = 'Tablet'
    elif any(k in name_upper for k in ['CAP', 'CAPS', 'CAPSULE', 'CAPSULES', 'ROTACAP', 'SOFTGEL']):
        dosage = 'Capsule'
    elif any(k in name_upper for k in ['SYP', 'SYRUP', 'SUSP', 'SUSPENSION', 'ELIXIR', 'ORAL LIQUID']):
        dosage = 'Syrup'
    elif any(k in name_upper for k in ['DROP', 'DROPS', 'EYE DROP', 'EAR DROP', 'NASAL']):
        dosage = 'Drops'
    elif any(k in name_upper for k in ['RESP', 'RESPULE', 'RESPULES', 'INHALER', 'ROTACAPS', 'AEROCORT', 'BUDECORT', 'ASTHALIN', 'DUOLIN', 'MDI']):
        dosage = 'Inhaler'
    elif any(k in name_upper for k in ['OINT', 'OINTMENT', 'GEL', 'CREAM', 'LOTION', 'EMULSION', 'SERUM', 'FACE WASH', 'POWDER', 'POW']):
        dosage = 'Powder' if ('POWDER' in name_upper or 'POW' in name_upper) else 'Ointment'
    elif any(k in name_upper for k in ['INJ', 'INJECTION', 'VIAL', 'AMP', 'AMPOULE']):
        dosage = 'Injection'
    elif any(k in name_upper for k in ['COTTON', 'STERIPAD', 'PAD', 'GAUZE', 'BANDAGE', 'SYRINGE', 'NEEDLE', 'SPIRIT', 'PEROXIDE', 'TAPE', 'CANNULA', 'PASTE', 'ROLL ON']):
        dosage = 'Device'
        
    # Category
    category = 'General Pharmaceuticals'
    rx_required = False
    
    if any(k in name_upper for k in ['ASTHALIN', 'AEROCORT', 'BUDECORT', 'DUOLIN', 'MONT', 'LEVO', 'CETIRIZINE', 'ALLERCET', 'ALLEGRA', 'CORIMINIC', 'COUGH', 'SOLVIN', 'ASCORIL', 'GRILINCTUS', 'RESP']):
        category = 'Respiratory & Inhalers'
    elif any(k in name_upper for k in ['AUGMENTIN', 'CLAV', 'AMOXY', 'AZITHRAL', 'AZITHROMYCIN', 'CEF', 'OFLOX', 'CIPRO', 'MOXIKIND', 'ACUCLAV', 'MAHACEF', 'MONOCEF', 'TAXIM', 'ANTIBIOTIC', 'CLAMP']):
        category = 'Antibiotics & Anti-Infectives'
        rx_required = True
    elif any(k in name_upper for k in ['CALPOL', 'DOLO', 'PARACETAMOL', 'ARISTOMOL', 'MEFTAL', 'ZERODOL', 'ACECLO', 'DICLO', 'BRUFEN', 'COMBIFLAM', 'TRAMADOL', 'SPAS', 'VOLINI']):
        category = 'Analgesics & Pain Management'
    elif any(k in name_upper for k in ['CILACAR', 'CILAHEART', 'TELMA', 'TELMISARTAN', 'AMLONG', 'AMLODIPINE', 'ATENOLOL', 'ECOSPRIN', 'ROSUVAS', 'ATORVASTATIN']):
        category = 'Cardiovascular & Hypertension'
        rx_required = True
    elif any(k in name_upper for k in ['PAN', 'PANTOP', 'PANTOCID', 'RANTAC', 'ACILOC', 'RABEKIND', 'OMEE', 'GELUSIL', 'DIGENE', 'DUFALAC', 'CREMAFFIN', 'SPORLAC', 'ENTERO', 'CREMADIET']):
        category = 'Gastrointestinal & Digestion'
    elif any(k in name_upper for k in ['CIPLADINE', 'BETADINE', 'CANDID', 'CLOTRIMAZOLE', 'DERMADEW', 'SKIN', 'FOURDERM', 'BETNOVATE', 'SOFRAMYCIN', 'MUPIR', 'ODOMOS', 'GARNIER']):
        category = 'Dermatology & Topicals'
    elif any(k in name_upper for k in ['COTTON', 'SPIRIT', 'PEROXIDE', 'STERIPAD', 'BANDAGE', 'SYRINGE', 'DRESSING', 'SURGICAL']):
        category = 'Surgical & Medical Consumables'
    elif any(k in name_upper for k in ['BECOSULES', 'NEUROBION', 'ZINCONIA', 'CALCIUM', 'SHELCAL', 'VITAMIN', 'LIMCEE', 'D3', 'FERONIA', 'AUTRIN', 'SUPRADYN', 'ZINCOVIT']):
        category = 'Vitamins & Supplements'
    elif any(k in name_upper for k in ['GLYCOMET', 'METFORMIN', 'GLIMEPIRIDE', 'TENELIMAC', 'JANUVIA', 'GALVUS', 'INSULIN', 'HUMALOG', 'LANTUS']):
        category = 'Diabetes & Endocrine'
        rx_required = True
    elif any(k in name_upper for k in ['DABUR', 'GILLETTE', 'OLD SPICE', 'OLAY', 'PASTE', 'TOOTHPASTE', 'DETTOL']):
        category = 'Personal Care & Hygiene'
        
    return dosage, category, rx_required


def parse_pack_size_from_name(pack_str):
    if not pack_str:
        return 10
    pack_str = str(pack_str).strip().upper()
    if any(k in pack_str for k in ['NOS', 'PCS', 'BOTTLE', 'JAR', 'KIT', 'SACH', 'TIN', 'ML', 'GM', '200MD', '15ML', '60ML', '100ML', '10GM', '20GM', '25GM', '50GM', '100GM', '150G', '200G', 'TUBE', 'ROLL ON']):
        return 1
    m = re.search(r'(\d+)', pack_str)
    if m:
        val = int(m.group(1))
        return val if 0 < val <= 500 else 10
    return 10


def suggest_rack_location(category, dosage_form):
    if dosage_form == 'Inhaler':
        return 'Rack R-1 (Inhalers)'
    elif dosage_form in ['Syrup', 'Drops']:
        return 'Rack S-2 (Liquids)'
    elif dosage_form in ['Ointment', 'Powder']:
        return 'Rack O-1 (Topicals & Powders)'
    elif dosage_form == 'Device':
        return 'Rack SURG-1'
    elif category == 'Antibiotics & Anti-Infectives':
        return 'Rack A-1 (Antibiotics)'
    elif category == 'Cardiovascular & Hypertension':
        return 'Rack C-1 (Cardiac)'
    elif category == 'Analgesics & Pain Management':
        return 'Rack P-1 (Analgesics)'
    elif category == 'Gastrointestinal & Digestion':
        return 'Rack G-1 (Gastro)'
    elif category == 'Diabetes & Endocrine':
        return 'Rack D-1 (Diabetes)'
    elif category == 'Vitamins & Supplements':
        return 'Rack V-1 (Vitamins)'
    elif category == 'Personal Care & Hygiene':
        return 'Rack H-1 (Hygiene)'
    return 'Rack A-1'


def get_preset_invoice(sample_type):
    """
    Returns high-accuracy supplier invoices matching actual Mangalore pharma distributors.
    """
    today = date.today()
    
    if sample_type == 'sairadha':
        return {
            "supplier_name": "Sai Radha Pharma (India) Pvt. Ltd.",
            "supplier_gstin": "29AAQCS0711F1ZC",
            "supplier_phone": "0824-2497757 / 9480838140",
            "supplier_address": "Door No. 4-6-574/15-19, Karangalpady, Mangalore - 575003",
            "invoice_number": f"260007300{today.strftime('%y%m%d')}",
            "invoice_date": today.strftime('%Y-%m-%d'),
            "file_name": "Sai_Radha_Pharma_Invoice.pdf",
            "items": [
                {
                    "medicine_name": "Augmentin 625 Duo Tab",
                    "generic_name": "Amoxycillin (500mg) + Potassium Clavulanate (125mg)",
                    "category": "Antibiotics & Anti-Infectives",
                    "dosage_form": "Tablet",
                    "manufacturer": "GlaxoSmithKline Pharmaceuticals",
                    "hsn_code": "30041090",
                    "batch_number": f"AUG{today.strftime('%y%m')}4",
                    "expiry_date": normalize_expiry("06-28"),
                    "pack_size": 10,
                    "pack_quantity": 25,
                    "purchase_price": 178.69,
                    "mrp": 223.36,
                    "selling_price": 223.36,
                    "gst_rate": 5.0,
                    "rack_location": "Rack A-1 (Antibiotics)",
                    "requires_prescription": True
                },
                {
                    "medicine_name": "Asthalin Inhaler 200 MDI",
                    "generic_name": "Salbutamol (100mcg)",
                    "category": "Respiratory & Inhalers",
                    "dosage_form": "Inhaler",
                    "manufacturer": "Cipla Ltd",
                    "hsn_code": "30049099",
                    "batch_number": f"AST{today.strftime('%y%m')}1",
                    "expiry_date": normalize_expiry("05-28"),
                    "pack_size": 1,
                    "pack_quantity": 30,
                    "purchase_price": 138.82,
                    "mrp": 182.20,
                    "selling_price": 182.20,
                    "gst_rate": 5.0,
                    "rack_location": "Rack R-1 (Inhalers)",
                    "requires_prescription": True
                },
                {
                    "medicine_name": "Calpol 650 Plus Tabs",
                    "generic_name": "Paracetamol (650mg)",
                    "category": "Analgesics & Pain Management",
                    "dosage_form": "Tablet",
                    "manufacturer": "GlaxoSmithKline Pharmaceuticals",
                    "hsn_code": "30049069",
                    "batch_number": f"CLP{today.strftime('%y%m')}8",
                    "expiry_date": normalize_expiry("06-29"),
                    "pack_size": 15,
                    "pack_quantity": 50,
                    "purchase_price": 28.12,
                    "mrp": 35.15,
                    "selling_price": 35.15,
                    "gst_rate": 5.0,
                    "rack_location": "Rack P-1 (Analgesics)",
                    "requires_prescription": False
                },
                {
                    "medicine_name": "Aerocort Inhaler 200MD",
                    "generic_name": "Levosalbutamol + Beclomethasone Dipropionate",
                    "category": "Respiratory & Inhalers",
                    "dosage_form": "Inhaler",
                    "manufacturer": "Cipla Ltd",
                    "hsn_code": "30049099",
                    "batch_number": f"AER{today.strftime('%y%m')}7",
                    "expiry_date": normalize_expiry("04-28"),
                    "pack_size": 1,
                    "pack_quantity": 20,
                    "purchase_price": 240.64,
                    "mrp": 315.82,
                    "selling_price": 315.82,
                    "gst_rate": 5.0,
                    "rack_location": "Rack R-1 (Inhalers)",
                    "requires_prescription": True
                },
                {
                    "medicine_name": "Cilacar 10 Tabs",
                    "generic_name": "Cilnidipine (10mg)",
                    "category": "Cardiovascular & Hypertension",
                    "dosage_form": "Tablet",
                    "manufacturer": "J.B. Chemicals & Pharmaceuticals",
                    "hsn_code": "30049079",
                    "batch_number": f"CIL{today.strftime('%y%m')}2",
                    "expiry_date": normalize_expiry("03-28"),
                    "pack_size": 15,
                    "pack_quantity": 30,
                    "purchase_price": 138.67,
                    "mrp": 182.00,
                    "selling_price": 182.00,
                    "gst_rate": 5.0,
                    "rack_location": "Rack C-1 (Cardiac)",
                    "requires_prescription": True
                }
            ]
        }
        
    elif sample_type in ['gkpharma', 'kateel']:
        return {
            "supplier_name": "G.K. Pharma & Sri Kateel Agencies",
            "supplier_gstin": "29AABFG3239N1Z3",
            "supplier_phone": "0824-2426867 / 9448123456",
            "supplier_address": "Door No. 13-9-723/7, K.S. Rao Road, Mangalore - 575001",
            "invoice_number": f"GK-{today.strftime('%y%m%d')}-57",
            "invoice_date": today.strftime('%Y-%m-%d'),
            "file_name": "GK_Pharma_Bill.jpg",
            "items": [
                {
                    "medicine_name": "Allercet M Syrup 60ml",
                    "generic_name": "Levocetirizine (2.5mg) + Montelukast (4mg)",
                    "category": "Respiratory & Inhalers",
                    "dosage_form": "Syrup",
                    "manufacturer": "Micro Labs Ltd",
                    "hsn_code": "30049099",
                    "batch_number": f"ALM{today.strftime('%y%m')}0",
                    "expiry_date": normalize_expiry("05-28"),
                    "pack_size": 1,
                    "pack_quantity": 25,
                    "purchase_price": 102.86,
                    "mrp": 135.00,
                    "selling_price": 135.00,
                    "gst_rate": 5.0,
                    "rack_location": "Rack S-2 (Liquids)",
                    "requires_prescription": True
                },
                {
                    "medicine_name": "Aristomol 250 Oral Susp 60ml",
                    "generic_name": "Paracetamol Paediatric Suspension (250mg/5ml)",
                    "category": "Analgesics & Pain Management",
                    "dosage_form": "Syrup",
                    "manufacturer": "Aristo Pharmaceuticals",
                    "hsn_code": "30049069",
                    "batch_number": f"ARM{today.strftime('%y%m')}1",
                    "expiry_date": normalize_expiry("05-28"),
                    "pack_size": 1,
                    "pack_quantity": 40,
                    "purchase_price": 34.29,
                    "mrp": 45.00,
                    "selling_price": 45.00,
                    "gst_rate": 5.0,
                    "rack_location": "Rack S-2 (Liquids)",
                    "requires_prescription": False
                },
                {
                    "medicine_name": "Pantocid 40mg Tablet",
                    "generic_name": "Pantoprazole Sodium (40mg)",
                    "category": "Gastrointestinal & Digestion",
                    "dosage_form": "Tablet",
                    "manufacturer": "Sun Pharmaceutical Industries Ltd",
                    "hsn_code": "30049099",
                    "batch_number": f"PNT{today.strftime('%y%m')}6",
                    "expiry_date": normalize_expiry("08-28"),
                    "pack_size": 15,
                    "pack_quantity": 30,
                    "purchase_price": 118.50,
                    "mrp": 169.00,
                    "selling_price": 169.00,
                    "gst_rate": 12.0,
                    "rack_location": "Rack G-1 (Gastro)",
                    "requires_prescription": True
                },
                {
                    "medicine_name": "Telma 40mg Tablet",
                    "generic_name": "Telmisartan (40mg)",
                    "category": "Cardiovascular & Hypertension",
                    "dosage_form": "Tablet",
                    "manufacturer": "Glenmark Pharmaceuticals Ltd",
                    "hsn_code": "30049079",
                    "batch_number": f"TLM{today.strftime('%y%m')}3",
                    "expiry_date": normalize_expiry("07-28"),
                    "pack_size": 15,
                    "pack_quantity": 35,
                    "purchase_price": 162.00,
                    "mrp": 235.00,
                    "selling_price": 235.00,
                    "gst_rate": 5.0,
                    "rack_location": "Rack C-1 (Cardiac)",
                    "requires_prescription": True
                }
            ]
        }
        
    elif sample_type in ['kpassociates', 'shakthi']:
        return {
            "supplier_name": "K P Associates & Shakthi Life Lines",
            "supplier_gstin": "29AAVFK8245J1ZF",
            "supplier_phone": "0824-2456789 / 9845011223",
            "supplier_address": "Door No. 1-N-12-892/3, Kottara Chowki, Mangalore - 575006",
            "invoice_number": f"KP-{today.strftime('%y%m%d')}-91",
            "invoice_date": today.strftime('%Y-%m-%d'),
            "file_name": "KP_Shakthi_Invoice.jpg",
            "items": [
                {
                    "medicine_name": "Jay Cotton 125g Roll",
                    "generic_name": "Absorbent Surgical Cotton Wool IP",
                    "category": "Surgical & Medical Consumables",
                    "dosage_form": "Device",
                    "manufacturer": "Jay Cotton Mills",
                    "hsn_code": "30059010",
                    "batch_number": f"JAY{today.strftime('%y%m')}5",
                    "expiry_date": normalize_expiry("12-29"),
                    "pack_size": 1,
                    "pack_quantity": 25,
                    "purchase_price": 80.00,
                    "mrp": 145.00,
                    "selling_price": 145.00,
                    "gst_rate": 12.0,
                    "rack_location": "Rack SURG-1",
                    "requires_prescription": False
                },
                {
                    "medicine_name": "Cipladine Ointment 20g",
                    "generic_name": "Povidone Iodine (5% w/w)",
                    "category": "Dermatology & Topicals",
                    "dosage_form": "Ointment",
                    "manufacturer": "Cipla Ltd",
                    "hsn_code": "30049099",
                    "batch_number": f"CPD{today.strftime('%y%m')}9",
                    "expiry_date": normalize_expiry("09-28"),
                    "pack_size": 1,
                    "pack_quantity": 30,
                    "purchase_price": 62.00,
                    "mrp": 85.00,
                    "selling_price": 85.00,
                    "gst_rate": 12.0,
                    "rack_location": "Rack O-1 (Topicals)",
                    "requires_prescription": False
                },
                {
                    "medicine_name": "Steripad 10cm Sterile Gauze",
                    "generic_name": "Sterile Wound Dressing Pads",
                    "category": "Surgical & Medical Consumables",
                    "dosage_form": "Device",
                    "manufacturer": "Datt Mediproducts",
                    "hsn_code": "30059090",
                    "batch_number": f"STP{today.strftime('%y%m')}2",
                    "expiry_date": normalize_expiry("11-29"),
                    "pack_size": 1,
                    "pack_quantity": 50,
                    "purchase_price": 12.00,
                    "mrp": 25.00,
                    "selling_price": 25.00,
                    "gst_rate": 12.0,
                    "rack_location": "Rack SURG-1",
                    "requires_prescription": False
                },
                {
                    "medicine_name": "Surgi Spirit 100ml",
                    "generic_name": "Surgical Spirit (70% Isopropyl Alcohol)",
                    "category": "Surgical & Medical Consumables",
                    "dosage_form": "Device",
                    "manufacturer": "Standard Healthcare",
                    "hsn_code": "30049089",
                    "batch_number": f"SPT{today.strftime('%y%m')}7",
                    "expiry_date": normalize_expiry("10-28"),
                    "pack_size": 1,
                    "pack_quantity": 20,
                    "purchase_price": 25.00,
                    "mrp": 45.00,
                    "selling_price": 45.00,
                    "gst_rate": 18.0,
                    "rack_location": "Rack SURG-1",
                    "requires_prescription": False
                }
            ]
        }
        
    else: # Default: Micro Labs, Sun Pharma & Cipla Distributors
        return {
            "supplier_name": "Micro Labs & Sun Pharma Distributors",
            "supplier_gstin": "29AABCM8921K1Z3",
            "supplier_phone": "0824-2445566 / 9845112233",
            "supplier_address": "Door No. 5-2-120/4, Hampankatta, Mangalore - 575001",
            "invoice_number": f"INV-ML-{today.strftime('%y%m%d')}-01",
            "invoice_date": today.strftime('%Y-%m-%d'),
            "file_name": "Wholesale_Supplier_Bill.jpg",
            "items": [
                {
                    "medicine_name": "Dolo 650 Tablet",
                    "generic_name": "Paracetamol (650mg)",
                    "category": "Analgesics & Pain Management",
                    "dosage_form": "Tablet",
                    "manufacturer": "Micro Labs Ltd",
                    "hsn_code": "30049069",
                    "batch_number": f"DL{today.strftime('%y%m')}8",
                    "expiry_date": normalize_expiry("08-28"),
                    "pack_size": 15,
                    "pack_quantity": 100,
                    "purchase_price": 22.80,
                    "mrp": 34.16,
                    "selling_price": 34.16,
                    "gst_rate": 12.0,
                    "rack_location": "Rack P-1 (Analgesics)",
                    "requires_prescription": False
                },
                {
                    "medicine_name": "Pan 40 Tablet",
                    "generic_name": "Pantoprazole (40mg)",
                    "category": "Gastrointestinal & Digestion",
                    "dosage_form": "Tablet",
                    "manufacturer": "Alkem Laboratories Ltd",
                    "hsn_code": "30049099",
                    "batch_number": f"PAN{today.strftime('%y%m')}4",
                    "expiry_date": normalize_expiry("09-28"),
                    "pack_size": 15,
                    "pack_quantity": 40,
                    "purchase_price": 95.00,
                    "mrp": 155.00,
                    "selling_price": 155.00,
                    "gst_rate": 12.0,
                    "rack_location": "Rack G-1 (Gastro)",
                    "requires_prescription": True
                },
                {
                    "medicine_name": "Montair LC Tablet",
                    "generic_name": "Montelukast (10mg) + Levocetirizine (5mg)",
                    "category": "Respiratory & Inhalers",
                    "dosage_form": "Tablet",
                    "manufacturer": "Cipla Ltd",
                    "hsn_code": "30049099",
                    "batch_number": f"MLC{today.strftime('%y%m')}9",
                    "expiry_date": normalize_expiry("06-28"),
                    "pack_size": 10,
                    "pack_quantity": 30,
                    "purchase_price": 165.00,
                    "mrp": 248.00,
                    "selling_price": 248.00,
                    "gst_rate": 12.0,
                    "rack_location": "Rack R-1 (Inhalers)",
                    "requires_prescription": True
                },
                {
                    "medicine_name": "Becosules Z Capsules",
                    "generic_name": "Vitamin B-Complex + Vitamin C + Zinc",
                    "category": "Vitamins & Supplements",
                    "dosage_form": "Capsule",
                    "manufacturer": "Pfizer Ltd",
                    "hsn_code": "30045020",
                    "batch_number": f"BCS{today.strftime('%y%m')}3",
                    "expiry_date": normalize_expiry("10-28"),
                    "pack_size": 20,
                    "pack_quantity": 35,
                    "purchase_price": 42.00,
                    "mrp": 62.50,
                    "selling_price": 62.50,
                    "gst_rate": 12.0,
                    "rack_location": "Rack V-1 (Vitamins)",
                    "requires_prescription": False
                }
            ]
        }


def parse_pdf_invoice(file_obj):
    """
    Extracts text from PDF supplier invoice and parses structured line items.
    """
    try:
        import PyPDF2
        reader = PyPDF2.PdfReader(file_obj)
        full_text = ""
        for page in reader.pages:
            full_text += (page.extract_text() or "") + "\n"
            
        if not full_text.strip():
            return None
            
        return parse_text_lines_to_invoice(full_text)
    except Exception as e:
        print("PDF parse error:", e)
        return None


def parse_text_lines_to_invoice(raw_text):
    """
    High-Accuracy Multi-Strategy Parser for Indian pharma and FMCG supplier invoices.
    Supports:
    - Multi-line vertical blocks (Item name, generic salt, form, batch, expiry, rates)
    - Single-line pharma bills with Batch & Expiry
    - FMCG / Cosmetics / Derma Bills with HSN & MRP/Qty/Rate
    - Tabular / Delimited rows (pipe |, tab \t, comma, multi-space)
    """
    if not raw_text or not str(raw_text).strip():
        return {
            "supplier_name": "Wholesale Pharma Supplier",
            "supplier_gstin": "",
            "invoice_number": f"INV-{date.today().strftime('%y%m%d')}",
            "invoice_date": date.today().strftime('%Y-%m-%d'),
            "items": []
        }

    clean_raw = raw_text.replace('\r', '').replace('\u00a0', ' ')
    lines = [l.strip() for l in clean_raw.split('\n') if l.strip()]
    today = date.today()
    today_str = today.strftime('%y%m%d')

    # 1. Supplier Name detection (Check top 18 lines)
    supplier_name = "Wholesale Pharma Distributor"
    supplier_keywords = ['DISTRIBUTORS', 'DISTRIBUTOR', 'PHARMA', 'AGENCIES', 'ENTERPRISES', 'PVT LTD', 'LTD', 'TRADERS', 'ASSOCIATES', 'MEDICAL', 'HEALTHCARE', 'KANARA', 'SHARADA', 'SHREE', 'SAI RADHA', 'MICRO LABS', 'SUN PHARMA', 'G.K.', 'KATEEL', 'SHAKTHI', 'AMAZON']
    
    for line in lines[:18]:
        line_upper = line.upper()
        if any(w in line_upper for w in supplier_keywords) and not any(skip in line_upper for skip in ['TAX INVOICE', 'GST INVOICE', 'GSTIN', 'BILLED TO', 'SHIPPED TO', 'PAGE', 'DISTRIBUTOR / SUPPLIER', 'INVOICE NO', 'BILL NO']):
            cand = re.sub(r'^[#*|:_ -]+', '', line).strip()
            if cand.upper().startswith('HREE SHARADA'):
                cand = 'S' + cand
            supplier_name = cand
            break
            
    # 2. GSTIN detection
    gstin = ""
    m_gst = re.search(r'([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})', clean_raw)
    if m_gst:
        gstin = m_gst.group(1)
        
    # 3. Invoice Number & Date
    invoice_number = f"INV-{today_str}{int(datetime.now().timestamp()) % 1000}"
    m_inv = re.search(r'(?:INV\s*NO|INVOICE\s*NO|BILL\s*NO|BILL\s*#|INV\s*#|DOC\s*NO|MEMO\s*NO)\s*[:.\-#]?\s*([A-Za-z0-9\-_/ ]+?)(?=\s+(?:DATE|DT|TIME|TERMS|BILLED)|$|\n)', clean_raw, re.IGNORECASE)
    if m_inv and m_inv.group(1).strip():
        cand = re.sub(r'[:.\-]', ' ', m_inv.group(1)).strip()
        if cand.upper() not in ['TAX', 'ORIGINAL', 'DATE', 'DETAILS', 'SUPPLY', 'BILL']:
            invoice_number = cand
        
    invoice_date = today.strftime('%Y-%m-%d')
    m_date = re.search(r'(?:DATE|DT|INVOICE\s*DATE|BILL\s*DATE)\s*[:.\-]?\s*(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4})', clean_raw, re.IGNORECASE)
    if m_date:
        invoice_date = normalize_expiry(m_date.group(1))

    # 4. Extract Line Items (Multi-Strategy)
    items = []
    ignored_headers = [
        'SUPPLIER PURCHASE BILL SCANNER', 'AI MULTIMODAL', 'EXTRACTED MEDICINE',
        'TOTAL INWARD COST', 'TOTAL RETAIL VALUE', 'GROSS PROFIT MARGIN', 'TOTAL UNITS',
        'DISTRIBUTOR / SUPPLIER NAME', 'SUPPLIER GSTIN', 'INVOICE / BILL #', 'INVOICE DATE',
        'MEDICINE BRAND & COMPOSITION', 'DOSAGE FORM', 'BATCH #', 'EXPIRY', 'PACKS', 'SIZE', 'COST', 'MRP', 'SELL',
        'TAX INVOICE', 'GST INVOICE', 'BILLED TO', 'SHIPPED TO', 'TERMS & CONDITIONS', 'ROUND OFF',
        'TAXABLE VALUE', 'SGST', 'CGST', 'IGST', 'GRAND TOTAL', 'SUBTOTAL', 'OUR BANK', 'PAGE'
    ]

    line_idx = 0
    while line_idx < len(lines):
        line = lines[line_idx]
        upper_line = line.upper()

        if any(h in upper_line for h in ignored_headers):
            line_idx += 1
            continue
        if any(upper_line.startswith(prefix) for prefix in ['TOTAL', 'SUB TOTAL', 'CGST', 'SGST', 'IGST', 'ROUND OFF', 'GRAND TOTAL', 'TAX PAYABLE', 'BILLED TO', 'SHIPPED TO', 'OUR BANK', 'DOOR NO', 'NEAR ', 'INVOICE NO', 'INV NO', 'BILL NO', 'MEMO NO', 'TAX INVOICE', 'GST INVOICE']):
            line_idx += 1
            continue
        if re.match(r'^(INVOICE|INV|BILL|MEMO|TAX INVOICE|GST INVOICE|DATE|BILLED TO|SHIPPED TO|GSTIN|SL\s+ITEM)\b', upper_line):
            line_idx += 1
            continue

        item_parsed = None

        # -------------------------------------------------------------
        # STRATEGY 1: MULTI-LINE VERTICAL MEDICINE BLOCKS (4-12 lines per item)
        # -------------------------------------------------------------
        if line_idx + 3 < len(lines):
            block_slice = lines[line_idx:line_idx + 12]
            exp_idx_in_block = -1
            exp_date_str = ""

            for b, bl in enumerate(block_slice):
                if re.match(r'^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$|^\d{1,2}[-/]\d{2,4}$|^(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[-/ ]\d{2,4}$', bl, re.IGNORECASE):
                    exp_idx_in_block = b
                    exp_date_str = bl
                    break

            if exp_idx_in_block >= 2:
                name_cand = re.sub(r'^[#*|:_ -]+', '', block_slice[0]).strip()
                generic_cand = ""
                dosage_cand = "Tablet"
                batch_cand = ""

                for p in range(1, exp_idx_in_block):
                    pt = block_slice[p].strip()
                    if re.search(r'\b(TABLET|CAPSULE|SYRUP|DROPS|INHALER|OINTMENT|DEVICE|INJECTION|POWDER)\b', pt, re.IGNORECASE):
                        dosage_cand = pt.capitalize()
                    elif re.match(r'^[A-Za-z0-9\-_]{4,16}$', pt) and not any(c in pt for c in ['(', ')', '+']) and 'MG' not in pt.upper():
                        batch_cand = pt
                    else:
                        generic_cand = pt

                numbers_after_exp = []
                num_line_count = 0
                for n in range(exp_idx_in_block + 1, len(block_slice)):
                    clean_str = block_slice[n].replace('₹', '').replace('Rs.', '').replace('Rs', '').replace(',', '').strip()
                    try:
                        val = float(clean_str)
                        if val > 0:
                            numbers_after_exp.append(val)
                            num_line_count += 1
                        else:
                            break
                    except:
                        break

                if len(numbers_after_exp) >= 2 and len(name_cand) >= 3:
                    qty = int(numbers_after_exp[0])
                    pack_sz = int(numbers_after_exp[1]) if len(numbers_after_exp) >= 3 and numbers_after_exp[1] <= 100 else parse_pack_size_from_name(name_cand)
                    
                    rate = 50.0
                    mrp = 90.0
                    if len(numbers_after_exp) >= 4:
                        rate = numbers_after_exp[2]
                        mrp = numbers_after_exp[3]
                    elif len(numbers_after_exp) == 3:
                        rate = numbers_after_exp[1]
                        mrp = numbers_after_exp[2]
                    elif len(numbers_after_exp) == 2:
                        rate = numbers_after_exp[0]
                        mrp = numbers_after_exp[1]

                    _, category, rx = infer_dosage_and_category(name_cand)

                    item_parsed = {
                        "medicine_name": name_cand,
                        "generic_name": generic_cand or name_cand,
                        "category": category,
                        "dosage_form": dosage_cand,
                        "manufacturer": "Standard Pharma",
                        "hsn_code": "3004",
                        "batch_number": batch_cand or f"B-{today_str}{len(items)+1}",
                        "expiry_date": normalize_expiry(exp_date_str),
                        "pack_size": pack_sz,
                        "pack_quantity": max(1, qty),
                        "purchase_price": round(rate, 2),
                        "mrp": round(mrp, 2),
                        "selling_price": round(mrp, 2),
                        "gst_rate": 12.0,
                        "rack_location": suggest_rack_location(category, dosage_cand),
                        "requires_prescription": rx
                    }

                    items.append(item_parsed)
                    line_idx += (exp_idx_in_block + 1 + num_line_count)
                    continue

        # -------------------------------------------------------------
        # STRATEGY 2: SINGLE-LINE PHARMA WITH EXPIRY & BATCH
        # -------------------------------------------------------------
        exp_match = re.search(r'\b(\d{1,2}[-/]\d{2,4}|\d{4}[-/]\d{1,2}|(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[-/ ]\d{2,4})\b', line, re.IGNORECASE)
        if exp_match and len(line) >= 10:
            exp_str = exp_match.group(1)
            exp_idx = line.find(exp_str)
            before_exp = line[:exp_idx].strip()
            after_exp = line[exp_idx + len(exp_str):].strip()
            
            before_tokens = before_exp.split()
            if len(before_tokens) >= 2:
                batch_num = before_tokens[-1]
                name_tokens = before_tokens[:-1]
                if re.match(r'^\d{6,8}$', batch_num) and len(before_tokens) >= 3:
                    batch_num = before_tokens[-2]
                    name_tokens = before_tokens[:-2]
                    
                med_name = " ".join(name_tokens)
                med_name = re.sub(r'^(?:ABBOTT|ARIST|CIPLA|GSK|ALKEM|SUN|LUPIN|MANKIND|USV|MICRO|PFIZER|DR\.?\s*REDDY)\b\s*', '', med_name, flags=re.IGNORECASE)
                med_name = re.sub(r'^\d{1,4}[\s.)|-]+', '', med_name).strip()
                
                if len(med_name) >= 3:
                    numbers = []
                    for t in after_exp.split():
                        t_clean = t.replace('₹', '').replace('Rs.', '').replace('Rs', '').replace(',', '').strip()
                        if re.match(r'^\d+(\.\d+)?$', t_clean):
                            try: numbers.append(float(t_clean))
                            except: pass
                            
                    mrp = 90.0
                    rate = 50.0
                    qty = 1
                    
                    if len(numbers) >= 3:
                        if numbers[0] > numbers[1]:
                            mrp, rate, qty = numbers[0], numbers[1], int(numbers[2])
                        else:
                            rate, mrp, qty = numbers[0], numbers[1], int(numbers[2])
                    elif len(numbers) == 2:
                        if numbers[0] > numbers[1]:
                            mrp, rate = numbers[0], numbers[1]
                        else:
                            mrp, qty = numbers[0], int(numbers[1])
                            rate = round(mrp * 0.76, 2)
                    elif len(numbers) == 1:
                        mrp = numbers[0]
                        rate = round(mrp * 0.76, 2)
                        
                    dosage, category, rx = infer_dosage_and_category(med_name)
                    pack_sz = parse_pack_size_from_name(med_name)
                    
                    item_parsed = {
                        "medicine_name": med_name.strip(),
                        "generic_name": med_name.strip(),
                        "category": category,
                        "dosage_form": dosage,
                        "manufacturer": "Standard Pharma",
                        "hsn_code": "3004",
                        "batch_number": re.sub(r'[^A-Za-z0-9\-_]', '', batch_num) or f"B-{today_str}{len(items)+1}",
                        "expiry_date": normalize_expiry(exp_str),
                        "pack_size": pack_sz,
                        "pack_quantity": max(1, qty),
                        "purchase_price": round(rate, 2),
                        "mrp": round(mrp, 2),
                        "selling_price": round(mrp, 2),
                        "gst_rate": 12.0,
                        "rack_location": suggest_rack_location(category, dosage),
                        "requires_prescription": rx
                    }

        # -------------------------------------------------------------
        # STRATEGY 3: FMCG / COSMETICS / DERMA FORMAT (With HSN Code)
        # e.g. "1 ODOMOS CREAM 25GM 38089191 34.00 4 26.19 104.76"
        # -------------------------------------------------------------
        if not item_parsed:
            hsn_match = re.search(r'\b(3004\d{0,4}|3005\d{0,4}|3006\d{0,4}|3304\d{0,4}|3306\d{0,4}|3307\d{0,4}|3808\d{0,4}|1901\d{0,4}|2106\d{0,4}|9018\d{0,4}|4818\d{0,4}|3401\d{0,4}|9619\d{0,4})\b', line)
            if hsn_match:
                hsn_code = hsn_match.group(1)
                hsn_idx = line.find(hsn_code)
                before_hsn = line[:hsn_idx].strip()
                after_hsn = line[hsn_idx + len(hsn_code):].strip()
                
                med_name = re.sub(r'^\d{1,4}[\s.)|-]+', '', before_hsn).strip()
                if len(med_name) >= 3 and not re.match(r'^(INVOICE|INV|BILL|MEMO|TAX|GST|DOOR|ROAD|DATE)\b', med_name.upper()):
                    numbers = []
                    for t in after_hsn.split():
                        t_clean = t.replace('₹', '').replace('Rs.', '').replace('Rs', '').replace(',', '').strip()
                        if re.match(r'^\d+(\.\d+)?$', t_clean):
                            try: numbers.append(float(t_clean))
                            except: pass
                            
                    mrp = 90.0
                    qty = 1
                    rate = 50.0
                    
                    if len(numbers) >= 3:
                        mrp = numbers[0]
                        qty = int(numbers[1])
                        rate = numbers[2]
                    elif len(numbers) == 2:
                        mrp = numbers[0]
                        qty = int(numbers[1])
                        rate = round(mrp * 0.77, 2)
                    elif len(numbers) == 1:
                        mrp = numbers[0]
                        rate = round(mrp * 0.77, 2)
                        
                    dosage, category, rx = infer_dosage_and_category(med_name)
                    pack_sz = parse_pack_size_from_name(med_name)
                    
                    item_parsed = {
                        "medicine_name": med_name.strip(),
                        "generic_name": med_name.strip(),
                        "category": category,
                        "dosage_form": dosage,
                        "manufacturer": "Standard Pharma",
                        "hsn_code": hsn_code,
                        "batch_number": f"B-{today_str}{len(items)+1}",
                        "expiry_date": normalize_expiry(""),
                        "pack_size": pack_sz,
                        "pack_quantity": max(1, qty),
                        "purchase_price": round(rate, 2),
                        "mrp": round(mrp, 2),
                        "selling_price": round(mrp, 2),
                        "gst_rate": 18.0,
                        "rack_location": suggest_rack_location(category, dosage),
                        "requires_prescription": rx
                    }

        # -------------------------------------------------------------
        # STRATEGY 4: GENERAL TOKEN / DELIMITED ROW (Pipe |, Tab \t, Multi-Space)
        # -------------------------------------------------------------
        if not item_parsed:
            tokens = re.split(r'[\t|]+|\s{2,}', line)
            row_line = " ".join(tokens) if len(tokens) > 1 else line

            line_tokens = row_line.split()
            numbers = []
            word_tokens = []
            for t in line_tokens:
                t_clean = t.replace('₹', '').replace('Rs.', '').replace('Rs', '').replace(',', '').strip()
                if re.match(r'^\d+(\.\d+)?$', t_clean) and len(t_clean) < 8 and not re.match(r'^\d{6}$', t_clean):
                    numbers.append(float(t_clean))
                else:
                    word_tokens.append(t)
                    
            med_name = " ".join(word_tokens)
            med_name = re.sub(r'^\d{1,4}[\s.)|-]+', '', med_name).strip()
            if len(med_name) >= 4 and len(numbers) >= 2 and not any(skip in med_name.upper() for skip in ['PAGE', 'TOTAL', 'DATE', 'INVOICE', 'INV', 'BILL', 'BILLED', 'TERMS', 'DOOR NO', 'ROAD', 'MANGALORE', 'GSTIN', 'MEMO']):
                mrp = max(numbers)
                rate = next((n for n in numbers if 5 < n < mrp), mrp * 0.75)
                qty = int(next((n for n in numbers if n.is_integer() and 1 <= n <= 1000 and n != mrp), 1))
                
                dosage, category, rx = infer_dosage_and_category(med_name)
                item_parsed = {
                    "medicine_name": med_name,
                    "generic_name": med_name,
                    "category": category,
                    "dosage_form": dosage,
                    "manufacturer": "Standard Pharma",
                    "hsn_code": "3004",
                    "batch_number": f"B-{today_str}{len(items)+1}",
                    "expiry_date": normalize_expiry(""),
                    "pack_size": parse_pack_size_from_name(med_name),
                    "pack_quantity": max(1, qty),
                    "purchase_price": round(rate, 2),
                    "mrp": round(mrp, 2),
                    "selling_price": round(mrp, 2),
                    "gst_rate": 12.0,
                    "rack_location": suggest_rack_location(category, dosage),
                    "requires_prescription": rx
                }

        if item_parsed:
            items.append(item_parsed)

        line_idx += 1

    return {
        "supplier_name": supplier_name,
        "supplier_gstin": gstin,
        "supplier_phone": "",
        "supplier_address": "",
        "invoice_number": invoice_number,
        "invoice_date": invoice_date,
        "items": items
    }


def call_gemini_vision_api_sync(image_bytes, mime_type="image/jpeg", api_key=None):
    """
    Sends the bill photo/document to Google Gemini 2.0 / 1.5 Flash multimodal vision API
    to accurately extract the exact text and medicines on the bill.
    """
    key = api_key or getattr(settings, 'GEMINI_API_KEY', None) or os.environ.get('GEMINI_API_KEY') or os.environ.get('GOOGLE_API_KEY')
    if not key:
        return None
        
    b64_data = base64.b64encode(image_bytes).decode('utf-8')
    
    prompt = """
    You are an expert Indian Pharmaceutical Wholesale Invoice OCR and structured data extraction system.
    Analyze this purchase bill / tax invoice image carefully and extract ONLY the real data present on this bill:
    1. supplier_name: Distributor or Pharma wholesale company name written at the top
    2. supplier_gstin: 15-digit GSTIN if present
    3. supplier_phone: Phone / mobile numbers if present
    4. supplier_address: Address if present
    5. invoice_number: Invoice / Bill / Memo number
    6. invoice_date: Date formatted as YYYY-MM-DD
    7. items: Array of medicine line items actually listed in this bill with:
       - medicine_name: Exact brand name / medicine description
       - generic_name: Salt/chemical composition if present (or brand name)
       - dosage_form: One of ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Ointment', 'Drops', 'Inhaler', 'Device', 'Other']
       - category: Appropriate category e.g. 'Antibiotics & Anti-Infectives', 'Analgesics & Pain Management', 'Gastrointestinal & Digestion', 'Respiratory & Inhalers', 'Cardiovascular & Hypertension', 'Dermatology & Topicals', 'General Pharmaceuticals'
       - manufacturer: Pharma manufacturing company name if present
       - hsn_code: HSN code (e.g. 3004)
       - batch_number: Exact batch number or lot number from the bill
       - expiry_date: Expiry date normalized to YYYY-MM-DD (e.g. MM/YY or MM-YY to last day of that month)
       - pack_size: Units per pack (e.g. 10 for 10's strip, 1 for bottle/tube)
       - pack_quantity: Number of packs purchased / billed qty
       - purchase_price: Purchase rate / PTR / Cost per pack in INR
       - mrp: Maximum Retail Price per pack in INR
       - selling_price: Selling price per pack (strictly equal to MRP)
       - gst_rate: GST % (e.g. 5.0, 12.0, 18.0)
       - rack_location: Suggested rack location e.g. Rack A-1
       - requires_prescription: boolean true/false

    CRITICAL: Extract ONLY the medicines and details that are visibly printed in this bill image.
    Return ONLY a valid JSON object without markdown fences.
    """
    
    models = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-pro']
    
    for model_name in models:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={key}"
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt},
                        {
                            "inline_data": {
                                "mime_type": mime_type,
                                "data": b64_data
                            }
                        }
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.1,
                "responseMimeType": "application/json"
            }
        }
        
        try:
            req_data = json.dumps(payload).encode('utf-8')
            req = urllib.request.Request(
                url,
                data=req_data,
                headers={'Content-Type': 'application/json'}
            )
            with urllib.request.urlopen(req, timeout=30.0) as resp:
                if resp.status == 200:
                    resp_body = resp.read().decode('utf-8')
                    data = json.loads(resp_body)
                    text_content = data['candidates'][0]['content']['parts'][0]['text']
                    clean_json = re.sub(r'^```json\s*|\s*```$', '', text_content.strip())
                    parsed = json.loads(clean_json)
                    if parsed and isinstance(parsed.get('items'), list) and len(parsed['items']) > 0:
                        return parsed
        except Exception as e:
            print(f"Gemini API ({model_name}) error:", e)
            continue

    return None


def extract_supplier_invoice(uploaded_file=None, sample_type=None, image_base64=None, custom_api_key=None, ocr_text=None):
    """
    Primary entry point to process uploaded bills, camera snapshots, client OCR text, or sample distributor presets.
    Guarantees that real bill uploads extract real data from the bill and NEVER fall back to sample dummy items.
    """
    today = date.today()

    # 1. Preset Sample bills (ONLY if explicitly requested by user in demo presets and NO real file/image uploaded)
    if sample_type and sample_type in ['sairadha', 'gkpharma', 'kateel', 'kpassociates', 'shakthi', 'microlabs', 'akpharma'] and not uploaded_file and not image_base64 and not ocr_text:
        return get_preset_invoice(sample_type)

    # 2. Direct OCR Text (from client Tesseract.js or server text extraction)
    if ocr_text and str(ocr_text).strip():
        parsed_from_text = parse_text_lines_to_invoice(ocr_text)
        if parsed_from_text and parsed_from_text.get('items') and len(parsed_from_text['items']) > 0:
            return parsed_from_text

    # 3. Base64 Camera Snapshot
    if image_base64:
        try:
            if ',' in image_base64:
                header, b64_data = image_base64.split(',', 1)
                mime = header.split(';')[0].split(':')[1] if ':' in header else 'image/jpeg'
            else:
                b64_data = image_base64
                mime = 'image/jpeg'
                
            img_bytes = base64.b64decode(b64_data)
            
            gemini_res = call_gemini_vision_api_sync(img_bytes, mime_type=mime, api_key=custom_api_key)
            if gemini_res and gemini_res.get('items') and len(gemini_res['items']) > 0:
                return gemini_res
        except Exception as e:
            print("Failed to process base64 camera image:", e)

    # 4. Uploaded File (Image or PDF)
    if uploaded_file:
        file_name = uploaded_file.name.lower()
        file_bytes = uploaded_file.read()
        uploaded_file.seek(0)
        
        # PDF document parsing
        if file_name.endswith('.pdf'):
            pdf_res = parse_pdf_invoice(uploaded_file)
            if pdf_res and pdf_res.get('items') and len(pdf_res['items']) > 0:
                return pdf_res
                
        # Image file parsing (JPG, PNG, WEBP)
        mime = "image/jpeg"
        if file_name.endswith('.png'):
            mime = "image/png"
        elif file_name.endswith('.webp'):
            mime = "image/webp"
            
        gemini_res = call_gemini_vision_api_sync(file_bytes, mime_type=mime, api_key=custom_api_key)
        if gemini_res and gemini_res.get('items') and len(gemini_res['items']) > 0:
            return gemini_res

    # 5. If OCR text was provided with metadata but 0 items matched yet, still preserve extracted distributor metadata
    if ocr_text and str(ocr_text).strip():
        parsed_from_text = parse_text_lines_to_invoice(ocr_text)
        return {
            "supplier_name": parsed_from_text.get('supplier_name', 'Wholesale Supplier'),
            "supplier_gstin": parsed_from_text.get('supplier_gstin', ''),
            "supplier_phone": "",
            "supplier_address": "",
            "invoice_number": parsed_from_text.get('invoice_number', f"PUR-{today.strftime('%y%m%d')}"),
            "invoice_date": parsed_from_text.get('invoice_date', today.strftime('%Y-%m-%d')),
            "file_name": uploaded_file.name if uploaded_file else "Bill_Image.jpg",
            "items": [],
            "ocr_status": "no_items_detected",
            "warning": "OCR recognized invoice header. Please click '+ Add Row' to quickly enter medicines from the preview, or click 'Rotate 90°' if taken sideways."
        }

    # 6. Fallback
    return {
        "supplier_name": "Wholesale Pharma Supplier",
        "supplier_gstin": "",
        "supplier_phone": "",
        "supplier_address": "",
        "invoice_number": f"PUR-{today.strftime('%y%m%d')}",
        "invoice_date": today.strftime('%Y-%m-%d'),
        "file_name": uploaded_file.name if uploaded_file else "Bill_Image.jpg",
        "items": [],
        "ocr_status": "no_items_detected",
        "warning": "Could not automatically detect medicine line items from this image. Please click '+ Add Row' to quickly enter the medicines or try a clearer, well-lit photo."
    }
