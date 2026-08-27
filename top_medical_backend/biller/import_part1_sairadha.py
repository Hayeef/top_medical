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
    print("[1/5] Importing Sai Radha Pharma (India) Pvt. Ltd. invoices...")
    supplier_info = {
        "name": "Sai Radha Pharma (India) Pvt. Ltd.",
        "contact_person": "Sales Executive (01 DIRECT)",
        "phone": "0824-2497757 / 4112757 / 9480838140",
        "email": "srpharmamangalore@gmail.com",
        "gstin": "29AAQCS0711F1ZC",
        "address": "Door No. 4-6-574/15,16,17,18 & 19, Karangalpady, Mangalore - 575003 (DL: 20B-KA-MN2-167244 / 21B-KA-MN2-167243)"
    }
    sup = get_or_create_supplier(supplier_info)

    # Categories
    cat_resp = get_or_create_category("Respiratory & Inhalers", "Inhalers, Respules, Cough & Asthma")
    cat_anti = get_or_create_category("Antibiotics & Anti-Infectives", "Antibiotics, Anti-fungals, Anti-virals")
    cat_cardio = get_or_create_category("Cardiovascular & Hypertension", "Blood pressure, Cardiac, Cholesterol")
    cat_pain = get_or_create_category("Analgesics & Pain Management", "Pain relief, Anti-inflammatory, Spasm")
    cat_derma = get_or_create_category("Dermatology & Topicals", "Ointments, Creams, Gels, Soaps, Shampoos")
    cat_gastro = get_or_create_category("Gastrointestinal & Digestion", "Antacids, Laxatives, Probiotics")
    cat_vit = get_or_create_category("Vitamins & Supplements", "Multivitamins, Calcium, Vitamin D3")
    cat_neuro = get_or_create_category("Neurology & Psychiatry", "Anticonvulsants, Antidepressants")
    cat_diab = get_or_create_category("Diabetes & Endocrine", "Insulins, Oral Hypoglycemics")

    items = [
        # Invoice 260007300125556
        {"inv": "260007300125556", "name": "CORIMINIC DROPS", "form": "Drops", "cat": cat_resp, "batch": "DBS0335", "exp": "01-28", "mrp": 91.50, "rate": 69.72, "pack": "15ML", "qty": 4, "hsn": "30049099", "gst": 5.0},
        {"inv": "260007300125556", "name": "ASTHALIN INHALER", "form": "Inhaler", "cat": cat_resp, "batch": "18028751", "exp": "05-28", "mrp": 182.20, "rate": 138.82, "pack": "200MD", "qty": 3, "hsn": "30049099", "gst": 5.0},
        {"inv": "260007300125556", "name": "ASTHALIN ROTACAP 60'S", "form": "Capsule", "cat": cat_resp, "batch": "20028247", "exp": "03-28", "mrp": 83.33, "rate": 63.49, "pack": "60S", "qty": 2, "hsn": "30049099", "gst": 5.0},
        {"inv": "260007300125556", "name": "AEROCORT INHALER", "form": "Inhaler", "cat": cat_resp, "batch": "18028682", "exp": "04-28", "mrp": 315.82, "rate": 240.64, "pack": "200MD", "qty": 2, "hsn": "30049099", "gst": 5.0},
        {"inv": "260007300125556", "name": "AEROCORT ROTACAPS", "form": "Capsule", "cat": cat_resp, "batch": "20028227", "exp": "02-28", "mrp": 178.69, "rate": 136.14, "pack": "30'S", "qty": 2, "hsn": "30049099", "gst": 5.0},
        {"inv": "260007300125556", "name": "BUDECORT RESP 0.5MG", "form": "Inhaler", "cat": cat_resp, "batch": "40028695", "exp": "05-28", "mrp": 183.00, "rate": 139.43, "pack": "5X2ML", "qty": 2, "hsn": "30049099", "gst": 5.0},
        {"inv": "260007300125556", "name": "DUOLIN RESPULES", "form": "Inhaler", "cat": cat_resp, "batch": "40028608", "exp": "05-28", "mrp": 195.00, "rate": 148.57, "pack": "5X2.5ML", "qty": 2, "hsn": "30049099", "gst": 5.0},

        # Invoice 260007300125505
        {"inv": "260007300125505", "name": "AUGMENTIN 625 DUO TAB", "form": "Tablet", "cat": cat_anti, "batch": "6428", "exp": "06-27", "mrp": 223.36, "rate": 178.69, "pack": "10'S", "qty": 5, "hsn": "30041090", "gst": 5.0},
        {"inv": "260007300125505", "name": "CALPOL 650 PLUS TABS", "form": "Tablet", "cat": cat_pain, "batch": "6648", "exp": "06-29", "mrp": 35.15, "rate": 28.12, "pack": "15'S", "qty": 5, "hsn": "30049069", "gst": 5.0},
        {"inv": "260007300125505", "name": "CALPOL TABS PLUS", "form": "Tablet", "cat": cat_pain, "batch": "7132", "exp": "07-29", "mrp": 18.24, "rate": 14.59, "pack": "15'S", "qty": 5, "hsn": "30049069", "gst": 5.0},
        {"inv": "260007300125505", "name": "CALPOL PEAD SUSP 60ML", "form": "Syrup", "cat": cat_pain, "batch": "1882", "exp": "05-28", "mrp": 42.45, "rate": 33.96, "pack": "60ML", "qty": 3, "hsn": "30049069", "gst": 5.0},
        {"inv": "260007300125505", "name": "CILACAR 10 TABS", "form": "Tablet", "cat": cat_cardio, "batch": "10251147", "exp": "03-28", "mrp": 182.00, "rate": 138.67, "pack": "15'S", "qty": 2, "hsn": "30049079", "gst": 5.0},
        {"inv": "260007300125505", "name": "ALLERCET L TAB", "form": "Tablet", "cat": cat_resp, "batch": "13028292", "exp": "05-28", "mrp": 63.80, "rate": 48.61, "pack": "10'S", "qty": 2, "hsn": "30049099", "gst": 5.0},
        {"inv": "260007300125505", "name": "CILACAR 20 TABS", "form": "Tablet", "cat": cat_cardio, "batch": "10252119", "exp": "03-28", "mrp": 313.00, "rate": 238.48, "pack": "15'S", "qty": 2, "hsn": "30049079", "gst": 5.0},
        {"inv": "260007300125505", "name": "DOLO 120 SUSPENSION 60ML", "form": "Syrup", "cat": cat_pain, "batch": "26B4310", "exp": "01-28", "mrp": 41.97, "rate": 31.98, "pack": "60ML", "qty": 2, "hsn": "30049069", "gst": 5.0},
        {"inv": "260007300125505", "name": "DOLO 250 SUSPENSION 60ML", "form": "Syrup", "cat": cat_pain, "batch": "26B4312", "exp": "01-28", "mrp": 54.34, "rate": 41.40, "pack": "60ML", "qty": 2, "hsn": "30049069", "gst": 5.0},
        {"inv": "260007300125505", "name": "CILACAR 5 TABS", "form": "Tablet", "cat": cat_cardio, "batch": "10260271", "exp": "04-28", "mrp": 105.00, "rate": 80.00, "pack": "15'S", "qty": 2, "hsn": "30049079", "gst": 5.0},
        {"inv": "260007300125505", "name": "ACUCLAV 625 TAB", "form": "Tablet", "cat": cat_anti, "batch": "6SD0149", "exp": "04-28", "mrp": 223.36, "rate": 170.18, "pack": "10'S", "qty": 2, "hsn": "30041090", "gst": 5.0},
        {"inv": "260007300125505", "name": "ALLEGRA 180MG TABS", "form": "Tablet", "cat": cat_resp, "batch": "6GCW001", "exp": "06-28", "mrp": 277.60, "rate": 211.51, "pack": "10'S", "qty": 2, "hsn": "30049099", "gst": 5.0},
        {"inv": "260007300125505", "name": "CILAHEART 10 TABS", "form": "Tablet", "cat": cat_cardio, "batch": "14028308", "exp": "04-28", "mrp": 140.00, "rate": 106.67, "pack": "15'S", "qty": 2, "hsn": "30049079", "gst": 5.0},
        {"inv": "260007300125505", "name": "MOXIKIND CV 625 TAB", "form": "Tablet", "cat": cat_anti, "batch": "14028549", "exp": "04-28", "mrp": 223.36, "rate": 170.18, "pack": "10'S", "qty": 2, "hsn": "30041090", "gst": 5.0},
        {"inv": "260007300125505", "name": "DOLO 650 TABS", "form": "Tablet", "cat": cat_pain, "batch": "26B4319", "exp": "02-28", "mrp": 34.15, "rate": 26.02, "pack": "15'S", "qty": 10, "hsn": "30049069", "gst": 5.0},

        # Invoice 260007300125525
        {"inv": "260007300125525", "name": "ASCORIL LS SYRUP 100ML", "form": "Syrup", "cat": cat_resp, "batch": "11261358", "exp": "05-28", "mrp": 133.00, "rate": 101.33, "pack": "100ML", "qty": 4, "hsn": "30049099", "gst": 5.0},
        {"inv": "260007300125525", "name": "ASCORIL EXPT 120ML", "form": "Syrup", "cat": cat_resp, "batch": "11261386", "exp": "05-28", "mrp": 160.00, "rate": 121.90, "pack": "120ML", "qty": 2, "hsn": "30049099", "gst": 5.0},
        {"inv": "260007300125525", "name": "AZTOGOLD 10 CAPS", "form": "Capsule", "cat": cat_cardio, "batch": "GTH1629A", "exp": "04-28", "mrp": 242.00, "rate": 184.38, "pack": "10'S", "qty": 2, "hsn": "30049079", "gst": 5.0},
        {"inv": "260007300125525", "name": "AZTOGOLD 20 CAPS", "form": "Capsule", "cat": cat_cardio, "batch": "GTH1867A", "exp": "05-28", "mrp": 345.00, "rate": 262.86, "pack": "10'S", "qty": 2, "hsn": "30049079", "gst": 5.0},
        {"inv": "260007300125525", "name": "ASTHALIN 4MG TABS", "form": "Tablet", "cat": cat_resp, "batch": "13028343", "exp": "05-28", "mrp": 9.42, "rate": 7.18, "pack": "30'S", "qty": 2, "hsn": "30049099", "gst": 5.0},
        {"inv": "260007300125525", "name": "AZEE 250 TABS", "form": "Tablet", "cat": cat_anti, "batch": "13028424", "exp": "04-28", "mrp": 78.50, "rate": 59.81, "pack": "6'S", "qty": 2, "hsn": "30042099", "gst": 5.0},
        {"inv": "260007300125525", "name": "AMBRODIL-S SYRUP 100ML", "form": "Syrup", "cat": cat_resp, "batch": "DBS0345", "exp": "04-28", "mrp": 42.92, "rate": 32.70, "pack": "100ML", "qty": 2, "hsn": "30049099", "gst": 5.0},
        {"inv": "260007300125525", "name": "ASTHALIN 2MG TABS", "form": "Tablet", "cat": cat_resp, "batch": "13028341", "exp": "05-28", "mrp": 8.07, "rate": 6.15, "pack": "30'S", "qty": 2, "hsn": "30049099", "gst": 5.0},
        {"inv": "260007300125525", "name": "AZITHRAL 500 TABS", "form": "Tablet", "cat": cat_anti, "batch": "14028312", "exp": "05-28", "mrp": 131.64, "rate": 100.30, "pack": "5'S", "qty": 2, "hsn": "30042099", "gst": 5.0},
        {"inv": "260007300125525", "name": "AZEE 500 TABS", "form": "Tablet", "cat": cat_anti, "batch": "13028456", "exp": "04-28", "mrp": 131.64, "rate": 100.30, "pack": "5'S", "qty": 2, "hsn": "30042099", "gst": 5.0},
        {"inv": "260007300125525", "name": "ARKAMIN TABS", "form": "Tablet", "cat": cat_cardio, "batch": "7144", "exp": "05-28", "mrp": 78.43, "rate": 59.76, "pack": "30'S", "qty": 2, "hsn": "30049079", "gst": 5.0},
        {"inv": "260007300125525", "name": "ATARAX 10MG TABS", "form": "Tablet", "cat": cat_resp, "batch": "2396N001", "exp": "05-28", "mrp": 54.34, "rate": 41.40, "pack": "15'S", "qty": 2, "hsn": "30049099", "gst": 5.0},
        {"inv": "260007300125525", "name": "ATARAX 25MG TABS", "form": "Tablet", "cat": cat_resp, "batch": "2396N002", "exp": "05-28", "mrp": 98.70, "rate": 75.20, "pack": "15'S", "qty": 2, "hsn": "30049099", "gst": 5.0},

        # Invoice 260007300125539
        {"inv": "260007300125539", "name": "ELECTRAL ORANGE 21.80GM", "form": "Powder", "cat": cat_gastro, "batch": "W26E05", "exp": "04-28", "mrp": 25.10, "rate": 19.12, "pack": "21.8GM", "qty": 20, "hsn": "30049099", "gst": 5.0},
        {"inv": "260007300125539", "name": "AMNURITE 10 TABS", "form": "Tablet", "cat": cat_neuro, "batch": "14028340", "exp": "04-28", "mrp": 195.00, "rate": 148.57, "pack": "10'S", "qty": 2, "hsn": "30049099", "gst": 5.0},
        {"inv": "260007300125539", "name": "AMNURITE 25 TABS", "form": "Tablet", "cat": cat_neuro, "batch": "14028341", "exp": "04-28", "mrp": 245.00, "rate": 186.67, "pack": "10'S", "qty": 2, "hsn": "30049099", "gst": 5.0},
        {"inv": "260007300125539", "name": "AMNURITE 5 TABS", "form": "Tablet", "cat": cat_neuro, "batch": "14028339", "exp": "04-28", "mrp": 145.00, "rate": 110.48, "pack": "10'S", "qty": 2, "hsn": "30049099", "gst": 5.0},
        {"inv": "260007300125539", "name": "CILACAR T 10/40 TABS", "form": "Tablet", "cat": cat_cardio, "batch": "10252120", "exp": "03-28", "mrp": 275.00, "rate": 209.52, "pack": "15'S", "qty": 2, "hsn": "30049079", "gst": 5.0},
        {"inv": "260007300125539", "name": "CIPLOX TZ TABS", "form": "Tablet", "cat": cat_anti, "batch": "13028470", "exp": "04-28", "mrp": 125.00, "rate": 95.24, "pack": "10'S", "qty": 2, "hsn": "30042099", "gst": 5.0},
        {"inv": "260007300125539", "name": "NOVAMOX 500 CAPS", "form": "Capsule", "cat": cat_anti, "batch": "13028480", "exp": "04-28", "mrp": 84.50, "rate": 64.38, "pack": "15'S", "qty": 2, "hsn": "30041090", "gst": 5.0},
        {"inv": "260007300125539", "name": "ACECLO SERA TAB", "form": "Tablet", "cat": cat_pain, "batch": "14028350", "exp": "04-28", "mrp": 140.00, "rate": 106.67, "pack": "10'S", "qty": 2, "hsn": "30049069", "gst": 5.0},
        {"inv": "260007300125539", "name": "AMLONG 10 TABS", "form": "Tablet", "cat": cat_cardio, "batch": "14028360", "exp": "04-28", "mrp": 115.00, "rate": 87.62, "pack": "15'S", "qty": 2, "hsn": "30049079", "gst": 5.0},
        {"inv": "260007300125539", "name": "AMLONG 2.5 TABS", "form": "Tablet", "cat": cat_cardio, "batch": "14028361", "exp": "04-28", "mrp": 55.00, "rate": 41.90, "pack": "15'S", "qty": 2, "hsn": "30049079", "gst": 5.0},
        {"inv": "260007300125539", "name": "AMLONG 5 TABS", "form": "Tablet", "cat": cat_cardio, "batch": "14028362", "exp": "04-28", "mrp": 85.00, "rate": 64.76, "pack": "15'S", "qty": 2, "hsn": "30049079", "gst": 5.0},
        {"inv": "260007300125539", "name": "ECOSPRIN AV 150 CAPS", "form": "Capsule", "cat": cat_cardio, "batch": "28028490", "exp": "05-28", "mrp": 75.00, "rate": 57.14, "pack": "15'S", "qty": 2, "hsn": "30049079", "gst": 5.0},
        {"inv": "260007300125539", "name": "ECOSPRIN 150 TABS", "form": "Tablet", "cat": cat_cardio, "batch": "28028491", "exp": "05-28", "mrp": 12.50, "rate": 9.52, "pack": "14'S", "qty": 5, "hsn": "30049079", "gst": 5.0},
        {"inv": "260007300125539", "name": "ECOSPRIN 75 TABS", "form": "Tablet", "cat": cat_cardio, "batch": "28028492", "exp": "05-28", "mrp": 6.50, "rate": 4.95, "pack": "14'S", "qty": 5, "hsn": "30049079", "gst": 5.0},
        {"inv": "260007300125539", "name": "AMLOVAS AT TABS", "form": "Tablet", "cat": cat_cardio, "batch": "14028370", "exp": "04-28", "mrp": 165.00, "rate": 125.71, "pack": "15'S", "qty": 2, "hsn": "30049079", "gst": 5.0},

        # Invoice 260007300126694
        {"inv": "260007300126694", "name": "COE HB PLUS TABS", "form": "Tablet", "cat": cat_vit, "batch": "28028500", "exp": "05-28", "mrp": 215.00, "rate": 163.81, "pack": "10'S", "qty": 2, "hsn": "30049099", "gst": 5.0},
        {"inv": "260007300126694", "name": "CORALIUM D3 TABS", "form": "Tablet", "cat": cat_vit, "batch": "28028501", "exp": "05-28", "mrp": 285.00, "rate": 217.14, "pack": "15'S", "qty": 2, "hsn": "30049099", "gst": 5.0},
        {"inv": "260007300126694", "name": "CONCOR 5MG TABS", "form": "Tablet", "cat": cat_cardio, "batch": "14028380", "exp": "04-28", "mrp": 145.00, "rate": 110.48, "pack": "10'S", "qty": 2, "hsn": "30049079", "gst": 5.0},
        {"inv": "260007300126694", "name": "CONCOR 2.5MG TABS", "form": "Tablet", "cat": cat_cardio, "batch": "14028381", "exp": "04-28", "mrp": 95.00, "rate": 72.38, "pack": "10'S", "qty": 2, "hsn": "30049079", "gst": 5.0},
        {"inv": "260007300126694", "name": "CANSOFT CL VAG SUPP", "form": "Other", "cat": cat_anti, "batch": "28028502", "exp": "04-28", "mrp": 185.00, "rate": 140.95, "pack": "3'S", "qty": 2, "hsn": "30049099", "gst": 5.0},
        {"inv": "260007300126694", "name": "SUSTEN 200 CAPS", "form": "Capsule", "cat": cat_diab, "batch": "28028503", "exp": "04-28", "mrp": 340.00, "rate": 259.05, "pack": "10'S", "qty": 2, "hsn": "30049099", "gst": 5.0},
        {"inv": "260007300126694", "name": "CLINGEN FORTE VAG SUPP", "form": "Other", "cat": cat_anti, "batch": "37226018", "exp": "04-28", "mrp": 215.00, "rate": 163.81, "pack": "7'S", "qty": 2, "hsn": "30049099", "gst": 5.0},
        {"inv": "260007300126694", "name": "CARVIDON MR TABS", "form": "Tablet", "cat": cat_cardio, "batch": "14028390", "exp": "04-28", "mrp": 165.00, "rate": 125.71, "pack": "10'S", "qty": 2, "hsn": "30049079", "gst": 5.0},
        {"inv": "260007300126694", "name": "CUFPRO SYRUP 100ML", "form": "Syrup", "cat": cat_resp, "batch": "28028504", "exp": "04-28", "mrp": 115.00, "rate": 87.62, "pack": "100ML", "qty": 2, "hsn": "30049099", "gst": 5.0},
        {"inv": "260007300126694", "name": "COMBIFLAM TABS", "form": "Tablet", "cat": cat_pain, "batch": "6GCW002", "exp": "05-28", "mrp": 53.60, "rate": 40.84, "pack": "20'S", "qty": 5, "hsn": "30049069", "gst": 5.0},
        {"inv": "260007300126694", "name": "DULCOFLEX 5MG TABS", "form": "Tablet", "cat": cat_gastro, "batch": "6GCW003", "exp": "05-28", "mrp": 14.50, "rate": 11.05, "pack": "10'S", "qty": 5, "hsn": "30049099", "gst": 5.0},
        {"inv": "260007300126694", "name": "DULCOFLEX SUPPOSITORY", "form": "Other", "cat": cat_gastro, "batch": "6GCW004", "exp": "05-28", "mrp": 85.00, "rate": 64.76, "pack": "5'S", "qty": 2, "hsn": "30049099", "gst": 5.0},
        {"inv": "260007300126694", "name": "CANDIFORCE 200 CAPS", "form": "Capsule", "cat": cat_anti, "batch": "14028400", "exp": "04-28", "mrp": 245.00, "rate": 186.67, "pack": "10'S", "qty": 2, "hsn": "30042099", "gst": 5.0},
        {"inv": "260007300126694", "name": "CANDIFORCE 100 CAPS", "form": "Capsule", "cat": cat_anti, "batch": "14028401", "exp": "04-28", "mrp": 145.00, "rate": 110.48, "pack": "10'S", "qty": 2, "hsn": "30042099", "gst": 5.0},
        {"inv": "260007300126694", "name": "CANDIFORCE CREAM 30GM", "form": "Ointment", "cat": cat_derma, "batch": "14028402", "exp": "04-28", "mrp": 175.00, "rate": 133.33, "pack": "30GM", "qty": 2, "hsn": "30049099", "gst": 5.0},
        {"inv": "260007300126694", "name": "CANDIFORCE SB 130 CAPS", "form": "Capsule", "cat": cat_anti, "batch": "14028403", "exp": "04-28", "mrp": 215.00, "rate": 163.81, "pack": "10'S", "qty": 2, "hsn": "30042099", "gst": 5.0},
        {"inv": "260007300126694", "name": "BETT INJ 0.5ML", "form": "Injection", "cat": cat_anti, "batch": "28028505", "exp": "04-28", "mrp": 35.00, "rate": 26.67, "pack": "0.5ML", "qty": 5, "hsn": "30049099", "gst": 5.0},
        {"inv": "260007300126694", "name": "HUMAN ACTRAPID 40IU INJ", "form": "Injection", "cat": cat_diab, "batch": "28028506", "exp": "04-28", "mrp": 185.00, "rate": 140.95, "pack": "10ML", "qty": 2, "hsn": "30043110", "gst": 5.0},
        {"inv": "260007300126694", "name": "HUMAN MIXTARD 40IU INJ", "form": "Injection", "cat": cat_diab, "batch": "28028507", "exp": "04-28", "mrp": 195.00, "rate": 148.57, "pack": "10ML", "qty": 2, "hsn": "30043110", "gst": 5.0},

        # Invoice 260007300126687
        {"inv": "260007300126687", "name": "CYCLOPAM TAB", "form": "Tablet", "cat": cat_pain, "batch": "28028510", "exp": "05-28", "mrp": 62.50, "rate": 47.62, "pack": "10'S", "qty": 5, "hsn": "30049069", "gst": 5.0},
        {"inv": "260007300126687", "name": "CLINISPECT 10 TABS", "form": "Tablet", "cat": cat_cardio, "batch": "28028511", "exp": "05-28", "mrp": 125.00, "rate": 95.24, "pack": "10'S", "qty": 2, "hsn": "30049079", "gst": 5.0},
        {"inv": "260007300126687", "name": "CRESTOR 10MG TABS", "form": "Tablet", "cat": cat_cardio, "batch": "28028512", "exp": "05-28", "mrp": 385.00, "rate": 293.33, "pack": "15'S", "qty": 2, "hsn": "30049079", "gst": 5.0},
        {"inv": "260007300126687", "name": "CRESTOR 5MG TABS", "form": "Tablet", "cat": cat_cardio, "batch": "28028513", "exp": "05-28", "mrp": 245.00, "rate": 186.67, "pack": "15'S", "qty": 2, "hsn": "30049079", "gst": 5.0},
        {"inv": "260007300126687", "name": "DYNAPAR 15'S TABS", "form": "Tablet", "cat": cat_pain, "batch": "28028514", "exp": "05-28", "mrp": 95.00, "rate": 72.38, "pack": "15'S", "qty": 2, "hsn": "30049069", "gst": 5.0},
        {"inv": "260007300126687", "name": "D VENIZ 50 TABS", "form": "Tablet", "cat": cat_neuro, "batch": "28028515", "exp": "05-28", "mrp": 165.00, "rate": 125.71, "pack": "10'S", "qty": 2, "hsn": "30049099", "gst": 5.0},
        {"inv": "260007300126687", "name": "CLOPILET A 75 CAPS", "form": "Capsule", "cat": cat_cardio, "batch": "28028516", "exp": "05-28", "mrp": 85.00, "rate": 64.76, "pack": "15'S", "qty": 2, "hsn": "30049079", "gst": 5.0},
        {"inv": "260007300126687", "name": "CRESAR 40 TABS", "form": "Tablet", "cat": cat_cardio, "batch": "28028517", "exp": "05-28", "mrp": 145.00, "rate": 110.48, "pack": "15'S", "qty": 2, "hsn": "30049079", "gst": 5.0},
        {"inv": "260007300126687", "name": "DEPAKOTE 500 TABS", "form": "Tablet", "cat": cat_neuro, "batch": "28028518", "exp": "05-28", "mrp": 275.00, "rate": 209.52, "pack": "10'S", "qty": 2, "hsn": "30049099", "gst": 5.0},
        {"inv": "260007300126687", "name": "CLINGEN 3 VAGINAL SUP", "form": "Other", "cat": cat_anti, "batch": "26325008", "exp": "05-28", "mrp": 126.56, "rate": 96.42, "pack": "3'S", "qty": 2, "hsn": "30049099", "gst": 5.0},
        {"inv": "260007300126687", "name": "CLOPITAB 75 TABS", "form": "Tablet", "cat": cat_cardio, "batch": "JC01125", "exp": "05-28", "mrp": 107.20, "rate": 81.68, "pack": "15'S", "qty": 2, "hsn": "30049079", "gst": 5.0},
        {"inv": "260007300126687", "name": "CLOPITAB A 150 CAPS", "form": "Capsule", "cat": cat_cardio, "batch": "28028519", "exp": "05-28", "mrp": 115.00, "rate": 87.62, "pack": "15'S", "qty": 2, "hsn": "30049079", "gst": 5.0},
        {"inv": "260007300126687", "name": "CLOPITAB A 75 CAPS", "form": "Capsule", "cat": cat_cardio, "batch": "28028520", "exp": "05-28", "mrp": 95.00, "rate": 72.38, "pack": "15'S", "qty": 2, "hsn": "30049079", "gst": 5.0},
        {"inv": "260007300126687", "name": "DABISTAR 110MG CAPS", "form": "Capsule", "cat": cat_cardio, "batch": "28028521", "exp": "05-28", "mrp": 485.00, "rate": 369.52, "pack": "10'S", "qty": 2, "hsn": "30049079", "gst": 5.0},
        {"inv": "260007300126687", "name": "CEFTAS 200 TABS", "form": "Tablet", "cat": cat_anti, "batch": "28028522", "exp": "05-28", "mrp": 145.00, "rate": 110.48, "pack": "10'S", "qty": 2, "hsn": "30042099", "gst": 5.0},
        {"inv": "260007300126687", "name": "CYRA - D CAPS", "form": "Capsule", "cat": cat_gastro, "batch": "28028523", "exp": "05-28", "mrp": 65.00, "rate": 49.52, "pack": "10'S", "qty": 2, "hsn": "30049099", "gst": 5.0},
        {"inv": "260007300126687", "name": "D RISE 60K CAPS", "form": "Capsule", "cat": cat_vit, "batch": "28028524", "exp": "05-28", "mrp": 175.00, "rate": 133.33, "pack": "4'S", "qty": 2, "hsn": "30049099", "gst": 5.0},
        {"inv": "260007300126687", "name": "CREMALAX 10MG TABS", "form": "Tablet", "cat": cat_gastro, "batch": "28028525", "exp": "05-28", "mrp": 35.00, "rate": 26.67, "pack": "10'S", "qty": 2, "hsn": "30049099", "gst": 5.0},
        {"inv": "260007300126687", "name": "DILZEM 30 TABS", "form": "Tablet", "cat": cat_cardio, "batch": "28028526", "exp": "05-28", "mrp": 55.00, "rate": 41.90, "pack": "30'S", "qty": 2, "hsn": "30049079", "gst": 5.0},
        {"inv": "260007300126687", "name": "DILZEM 60 TABS", "form": "Tablet", "cat": cat_cardio, "batch": "28028527", "exp": "05-28", "mrp": 95.00, "rate": 72.38, "pack": "30'S", "qty": 2, "hsn": "30049079", "gst": 5.0},
        {"inv": "260007300126687", "name": "DILZEM SR 90 TABS", "form": "Tablet", "cat": cat_cardio, "batch": "28028528", "exp": "05-28", "mrp": 165.00, "rate": 125.71, "pack": "10'S", "qty": 2, "hsn": "30049079", "gst": 5.0},
        {"inv": "260007300126687", "name": "DYNAGLIPT M TABS", "form": "Tablet", "cat": cat_diab, "batch": "28028529", "exp": "05-28", "mrp": 195.00, "rate": 148.57, "pack": "10'S", "qty": 2, "hsn": "30049099", "gst": 5.0},
        {"inv": "260007300126687", "name": "D3 MUST 60K CAPS", "form": "Capsule", "cat": cat_vit, "batch": "28028530", "exp": "05-28", "mrp": 165.00, "rate": 125.71, "pack": "4'S", "qty": 2, "hsn": "30049099", "gst": 5.0},
        {"inv": "260007300126687", "name": "CLONAFIT MD 0.50 TABS", "form": "Tablet", "cat": cat_neuro, "batch": "28028531", "exp": "05-28", "mrp": 65.00, "rate": 49.52, "pack": "15'S", "qty": 2, "hsn": "30049099", "gst": 5.0},
        {"inv": "260007300126687", "name": "CLARINOVA 500 TABS", "form": "Tablet", "cat": cat_anti, "batch": "28028532", "exp": "05-28", "mrp": 295.00, "rate": 224.76, "pack": "10'S", "qty": 2, "hsn": "30042099", "gst": 5.0},

        # Invoice 260007300126629
        {"inv": "260007300126629", "name": "KETIL SOAP 75GM", "form": "Other", "cat": cat_derma, "batch": "7900", "exp": "06-27", "mrp": 160.00, "rate": 121.90, "pack": "75GM", "qty": 5, "hsn": "34011190", "gst": 18.0},
        {"inv": "260007300126629", "name": "KETIL CREAM 30GM", "form": "Ointment", "cat": cat_derma, "batch": "7901", "exp": "06-27", "mrp": 240.00, "rate": 182.86, "pack": "30GM", "qty": 2, "hsn": "30049099", "gst": 12.0},

        # Invoice 260007300126630
        {"inv": "260007300126630", "name": "POVI 10 OINT 15 GM", "form": "Ointment", "cat": cat_derma, "batch": "18028760", "exp": "04-28", "mrp": 65.00, "rate": 49.52, "pack": "15GM", "qty": 5, "hsn": "30049099", "gst": 12.0},
        {"inv": "260007300126630", "name": "HEXIGEL 15GM", "form": "Ointment", "cat": cat_derma, "batch": "18028761", "exp": "04-28", "mrp": 75.00, "rate": 57.14, "pack": "15GM", "qty": 3, "hsn": "30049099", "gst": 12.0},
        {"inv": "260007300126630", "name": "FUTOP B CREAM 10GM", "form": "Ointment", "cat": cat_derma, "batch": "18028762", "exp": "04-28", "mrp": 95.00, "rate": 72.38, "pack": "10GM", "qty": 2, "hsn": "30049099", "gst": 12.0},
        {"inv": "260007300126630", "name": "FUTOP CREAM 5GM", "form": "Ointment", "cat": cat_derma, "batch": "FC5002", "exp": "04-28", "mrp": 52.50, "rate": 40.00, "pack": "5GM", "qty": 2, "hsn": "30049099", "gst": 12.0},
        {"inv": "260007300126630", "name": "HALOVATE S OINT 20GM", "form": "Ointment", "cat": cat_derma, "batch": "18028763", "exp": "04-28", "mrp": 295.00, "rate": 224.76, "pack": "20GM", "qty": 2, "hsn": "30049099", "gst": 12.0},
        {"inv": "260007300126630", "name": "CORIMINIC SYP 60ML", "form": "Syrup", "cat": cat_resp, "batch": "DBS0346", "exp": "04-28", "mrp": 85.00, "rate": 64.76, "pack": "60ML", "qty": 3, "hsn": "30049099", "gst": 5.0},
        {"inv": "260007300126630", "name": "T-MINIC COLD DROPS 15ML", "form": "Drops", "cat": cat_resp, "batch": "18028764", "exp": "04-28", "mrp": 75.00, "rate": 57.14, "pack": "15ML", "qty": 3, "hsn": "30049099", "gst": 5.0},
        {"inv": "260007300126630", "name": "SINAREST TAB 15'S", "form": "Tablet", "cat": cat_resp, "batch": "18028765", "exp": "04-28", "mrp": 105.00, "rate": 80.00, "pack": "15'S", "qty": 5, "hsn": "30049069", "gst": 5.0},
        {"inv": "260007300126630", "name": "LULICAN XL CREAM 50GM", "form": "Ointment", "cat": cat_derma, "batch": "18028766", "exp": "04-28", "mrp": 445.00, "rate": 339.05, "pack": "50GM", "qty": 2, "hsn": "30049099", "gst": 12.0},
        {"inv": "260007300126630", "name": "LULIBET CREAM 30GM", "form": "Ointment", "cat": cat_derma, "batch": "18028767", "exp": "04-28", "mrp": 315.00, "rate": 240.00, "pack": "30GM", "qty": 2, "hsn": "30049099", "gst": 12.0},
        {"inv": "260007300126630", "name": "GLYCO 12 CREAM 30GM", "form": "Ointment", "cat": cat_derma, "batch": "18028768", "exp": "04-28", "mrp": 365.00, "rate": 278.10, "pack": "30GM", "qty": 2, "hsn": "30049099", "gst": 12.0},
        {"inv": "260007300126630", "name": "GLYCO 6 CREAM 30GM", "form": "Ointment", "cat": cat_derma, "batch": "18028769", "exp": "04-28", "mrp": 245.00, "rate": 186.67, "pack": "30GM", "qty": 2, "hsn": "30049099", "gst": 12.0},
        {"inv": "260007300126630", "name": "ECOSPRIN GOLD 10MG CAPS", "form": "Capsule", "cat": cat_cardio, "batch": "EGSC26024", "exp": "10-27", "mrp": 139.50, "rate": 111.60, "pack": "15'S", "qty": 2, "hsn": "30049079", "gst": 5.0},
        {"inv": "260007300126630", "name": "HHSALIC OINT 10GM", "form": "Ointment", "cat": cat_derma, "batch": "18028770", "exp": "04-28", "mrp": 185.00, "rate": 140.95, "pack": "10GM", "qty": 2, "hsn": "30049099", "gst": 12.0},
        {"inv": "260007300126630", "name": "HHSONE CREAM 10GM", "form": "Ointment", "cat": cat_derma, "batch": "18028771", "exp": "04-28", "mrp": 165.00, "rate": 125.71, "pack": "10GM", "qty": 2, "hsn": "30049099", "gst": 12.0},
        {"inv": "260007300126630", "name": "ASTHAKIND SYRUP 100ML", "form": "Syrup", "cat": cat_resp, "batch": "18028772", "exp": "04-28", "mrp": 95.00, "rate": 72.38, "pack": "100ML", "qty": 3, "hsn": "30049099", "gst": 5.0},
        {"inv": "260007300126630", "name": "ACNESTAR GEL 20GM", "form": "Ointment", "cat": cat_derma, "batch": "18028773", "exp": "04-28", "mrp": 115.00, "rate": 87.62, "pack": "20GM", "qty": 2, "hsn": "30049099", "gst": 12.0},
        {"inv": "260007300126630", "name": "ACNESTAR FACE WASH 50GM", "form": "Other", "cat": cat_derma, "batch": "18028774", "exp": "04-28", "mrp": 145.00, "rate": 110.48, "pack": "50GM", "qty": 2, "hsn": "33049990", "gst": 18.0},
        {"inv": "260007300126630", "name": "ACNESTAR SOAP 75GM", "form": "Other", "cat": cat_derma, "batch": "18028775", "exp": "04-28", "mrp": 85.00, "rate": 64.76, "pack": "75GM", "qty": 3, "hsn": "34011190", "gst": 18.0},

        # Invoice 260007300126678
        {"inv": "260007300126678", "name": "DEFZA 6 TAB", "form": "Tablet", "cat": cat_anti, "batch": "28028540", "exp": "05-28", "mrp": 95.00, "rate": 72.38, "pack": "10'S", "qty": 2, "hsn": "30049099", "gst": 5.0},
        {"inv": "260007300126678", "name": "DIANE 35 TABS", "form": "Tablet", "cat": cat_diab, "batch": "28028541", "exp": "05-28", "mrp": 395.00, "rate": 300.95, "pack": "21'S", "qty": 2, "hsn": "30049099", "gst": 5.0},
        {"inv": "260007300126678", "name": "DIAMICRON XR 60 TABS", "form": "Tablet", "cat": cat_diab, "batch": "28028542", "exp": "05-28", "mrp": 185.00, "rate": 140.95, "pack": "15'S", "qty": 2, "hsn": "30049099", "gst": 5.0},
        {"inv": "260007300126678", "name": "DOXINATE TABS", "form": "Tablet", "cat": cat_gastro, "batch": "28028543", "exp": "05-28", "mrp": 175.00, "rate": 133.33, "pack": "30'S", "qty": 2, "hsn": "30049099", "gst": 5.0},
        {"inv": "260007300126678", "name": "DOXINATE PLUS TABS", "form": "Tablet", "cat": cat_gastro, "batch": "28028544", "exp": "05-28", "mrp": 215.00, "rate": 163.81, "pack": "30'S", "qty": 2, "hsn": "30049099", "gst": 5.0},
        {"inv": "260007300126678", "name": "DROTIN DS TABS", "form": "Tablet", "cat": cat_pain, "batch": "28028545", "exp": "05-28", "mrp": 165.00, "rate": 125.71, "pack": "15'S", "qty": 2, "hsn": "30049069", "gst": 5.0},
        {"inv": "260007300126678", "name": "DROTIN M TABS", "form": "Tablet", "cat": cat_pain, "batch": "28028546", "exp": "05-28", "mrp": 195.00, "rate": 148.57, "pack": "15'S", "qty": 2, "hsn": "30049069", "gst": 5.0},
        {"inv": "260007300126678", "name": "DROTIN TAB", "form": "Tablet", "cat": cat_pain, "batch": "28028547", "exp": "05-28", "mrp": 135.00, "rate": 102.86, "pack": "15'S", "qty": 2, "hsn": "30049069", "gst": 5.0},
        {"inv": "260007300126678", "name": "DULOTIN 10MG TABS", "form": "Tablet", "cat": cat_neuro, "batch": "28028548", "exp": "05-28", "mrp": 125.00, "rate": 95.24, "pack": "10'S", "qty": 2, "hsn": "30049099", "gst": 5.0},
        {"inv": "260007300126678", "name": "DULOTIN 20MG TABS", "form": "Tablet", "cat": cat_neuro, "batch": "28028549", "exp": "05-28", "mrp": 195.00, "rate": 148.57, "pack": "10'S", "qty": 2, "hsn": "30049099", "gst": 5.0},
        {"inv": "260007300126678", "name": "DEXONA TABS", "form": "Tablet", "cat": cat_anti, "batch": "28028550", "exp": "05-28", "mrp": 9.50, "rate": 7.24, "pack": "30'S", "qty": 5, "hsn": "30049099", "gst": 5.0},
        {"inv": "260007300126678", "name": "DUBINOR TABS", "form": "Tablet", "cat": cat_neuro, "batch": "28028551", "exp": "05-28", "mrp": 265.00, "rate": 201.90, "pack": "10'S", "qty": 2, "hsn": "30049099", "gst": 5.0},
        {"inv": "260007300126678", "name": "ENCORATE 300 TABS", "form": "Tablet", "cat": cat_neuro, "batch": "28028552", "exp": "05-28", "mrp": 95.00, "rate": 72.38, "pack": "10'S", "qty": 2, "hsn": "30049099", "gst": 5.0},
        {"inv": "260007300126678", "name": "DUVANTA 20 TABS", "form": "Tablet", "cat": cat_neuro, "batch": "28028553", "exp": "05-28", "mrp": 145.00, "rate": 110.48, "pack": "10'S", "qty": 2, "hsn": "30049099", "gst": 5.0},
        {"inv": "260007300126678", "name": "DUVANTA 40 TABS", "form": "Tablet", "cat": cat_neuro, "batch": "28028554", "exp": "05-28", "mrp": 245.00, "rate": 186.67, "pack": "10'S", "qty": 2, "hsn": "30049099", "gst": 5.0},
        {"inv": "260007300126678", "name": "DOTHIP 25 TABS", "form": "Tablet", "cat": cat_neuro, "batch": "28028555", "exp": "05-28", "mrp": 125.00, "rate": 95.24, "pack": "15'S", "qty": 2, "hsn": "30049099", "gst": 5.0},
        {"inv": "260007300126678", "name": "DOLOPAR 15'S TABS", "form": "Tablet", "cat": cat_pain, "batch": "28028556", "exp": "05-28", "mrp": 32.00, "rate": 24.38, "pack": "15'S", "qty": 5, "hsn": "30049069", "gst": 5.0},
        {"inv": "260007300126678", "name": "DEPLATT CV CAPS", "form": "Capsule", "cat": cat_cardio, "batch": "28028557", "exp": "05-28", "mrp": 185.00, "rate": 140.95, "pack": "15'S", "qty": 2, "hsn": "30049079", "gst": 5.0},
        {"inv": "260007300126678", "name": "DEPSONIL 25 TABS", "form": "Tablet", "cat": cat_neuro, "batch": "28028558", "exp": "05-28", "mrp": 45.00, "rate": 34.29, "pack": "10'S", "qty": 2, "hsn": "30049099", "gst": 5.0},
        {"inv": "260007300126678", "name": "DROXYL 500 TABS", "form": "Tablet", "cat": cat_anti, "batch": "28028559", "exp": "05-28", "mrp": 295.00, "rate": 224.76, "pack": "10'S", "qty": 2, "hsn": "30042099", "gst": 5.0},
        {"inv": "260007300126678", "name": "DEFCORT 6MG TABS", "form": "Tablet", "cat": cat_anti, "batch": "28028560", "exp": "05-28", "mrp": 115.00, "rate": 87.62, "pack": "10'S", "qty": 2, "hsn": "30049099", "gst": 5.0},
        {"inv": "260007300126678", "name": "ENAM 2.5 TABS", "form": "Tablet", "cat": cat_cardio, "batch": "28028561", "exp": "05-28", "mrp": 45.00, "rate": 34.29, "pack": "15'S", "qty": 2, "hsn": "30049079", "gst": 5.0},
        {"inv": "260007300126678", "name": "ENAM 5 TABS", "form": "Tablet", "cat": cat_cardio, "batch": "28028562", "exp": "05-28", "mrp": 75.00, "rate": 57.14, "pack": "15'S", "qty": 2, "hsn": "30049079", "gst": 5.0},

        # Invoice 260007300126664
        {"inv": "260007300126664", "name": "BECOZYM C FORTE 20'S", "form": "Tablet", "cat": cat_vit, "batch": "MH3872", "exp": "07-28", "mrp": 45.00, "rate": 34.29, "pack": "20'", "qty": 2, "hsn": "30045090", "gst": 5.0},
        {"inv": "260007300126664", "name": "BRILINTA 90 TAB", "form": "Tablet", "cat": cat_cardio, "batch": "60053460", "exp": "03-29", "mrp": 609.25, "rate": 464.19, "pack": "14'S", "qty": 2, "hsn": "30049099", "gst": 5.0},
        {"inv": "260007300126664", "name": "EZEEPAM PLUS 10", "form": "Tablet", "cat": cat_neuro, "batch": "GEZS26002", "exp": "09-28", "mrp": 172.07, "rate": 131.10, "pack": "10'S", "qty": 1, "hsn": "30049081", "gst": 5.0},
        {"inv": "260007300126664", "name": "EZEEPAM PLUS 5", "form": "Tablet", "cat": cat_neuro, "batch": "GEZT26002", "exp": "07-28", "mrp": 117.00, "rate": 89.14, "pack": "10'S", "qty": 1, "hsn": "30049081", "gst": 5.0},
        {"inv": "260007300126664", "name": "ENVAS 2.5 TABS", "form": "Tablet", "cat": cat_cardio, "batch": "JKBT26002", "exp": "04-28", "mrp": 35.16, "rate": 26.79, "pack": "15'S", "qty": 2, "hsn": "30049071", "gst": 5.0},
        {"inv": "260007300126664", "name": "CARDIVAS 3.125 TAB 15'S", "form": "Tablet", "cat": cat_cardio, "batch": "SIH1122A", "exp": "05-29", "mrp": 88.00, "rate": 67.05, "pack": "15'S", "qty": 2, "hsn": "30049079", "gst": 5.0},
        {"inv": "260007300126664", "name": "CARDIVAS 6.25 TAB", "form": "Tablet", "cat": cat_cardio, "batch": "SIH0623A", "exp": "02-29", "mrp": 128.44, "rate": 97.86, "pack": "15'S", "qty": 2, "hsn": "30049079", "gst": 5.0},
        {"inv": "260007300126664", "name": "BETAVERT 16MG 15'S TAB", "form": "Tablet", "cat": cat_neuro, "batch": "LAD0008", "exp": "01-29", "mrp": 287.81, "rate": 219.28, "pack": "15'S", "qty": 2, "hsn": "30049099", "gst": 5.0},
        {"inv": "260007300126664", "name": "CARDIVAS 25 MG TAB", "form": "Tablet", "cat": cat_cardio, "batch": "GTH0904A", "exp": "02-28", "mrp": 245.00, "rate": 186.66, "pack": "10 S", "qty": 2, "hsn": "30049079", "gst": 5.0},
        {"inv": "260007300126664", "name": "CARDIVAS 12.5 TABS", "form": "Tablet", "cat": cat_cardio, "batch": "GTH1641A", "exp": "05-28", "mrp": 151.00, "rate": 115.05, "pack": "10 S", "qty": 2, "hsn": "30049079", "gst": 5.0},
        {"inv": "260007300126664", "name": "CALPOL T TABS", "form": "Tablet", "cat": cat_pain, "batch": "MA605", "exp": "12-27", "mrp": 127.20, "rate": 96.91, "pack": "15'S", "qty": 2, "hsn": "30049069", "gst": 5.0},
        {"inv": "260007300126664", "name": "ETOVA 400", "form": "Tablet", "cat": cat_pain, "batch": "EKH0126002A", "exp": "02-30", "mrp": 132.23, "rate": 100.74, "pack": "10 S", "qty": 1, "hsn": "30049069", "gst": 5.0},
        {"inv": "260007300126664", "name": "ETRIK 60MG TABS", "form": "Tablet", "cat": cat_pain, "batch": "2613000356", "exp": "04-28", "mrp": 142.59, "rate": 108.64, "pack": "10 S", "qty": 2, "hsn": "30049069", "gst": 5.0},
        {"inv": "260007300126664", "name": "BEPLEX FORTE TAB", "form": "Tablet", "cat": cat_vit, "batch": "A26044AF", "exp": "06-28", "mrp": 58.55, "rate": 44.61, "pack": "20'", "qty": 2, "hsn": "30045090", "gst": 5.0},
        {"inv": "260007300126664", "name": "E SYS D", "form": "Capsule", "cat": cat_gastro, "batch": "ED1112", "exp": "05-28", "mrp": 87.00, "rate": 66.28, "pack": "10'S", "qty": 2, "hsn": "30049039", "gst": 5.0},
        {"inv": "260007300126664", "name": "BRIGREL TAB", "form": "Tablet", "cat": cat_cardio, "batch": "BRGY0075", "exp": "10-28", "mrp": 240.00, "rate": 182.86, "pack": "10 S", "qty": 2, "hsn": "30049099", "gst": 5.0},
        {"inv": "260007300126664", "name": "ETIZEP 0.5", "form": "Tablet", "cat": cat_neuro, "batch": "EZBS0047", "exp": "04-28", "mrp": 72.00, "rate": 54.86, "pack": "10'S", "qty": 1, "hsn": "30049088", "gst": 5.0},
        {"inv": "260007300126664", "name": "ELDOPAR CAP 15'S", "form": "Capsule", "cat": cat_gastro, "batch": "ELAS0321", "exp": "10-29", "mrp": 61.09, "rate": 46.54, "pack": "15'S", "qty": 3, "hsn": "30049029", "gst": 5.0},

        # Invoice 260007300125544
        {"inv": "260007300125544", "name": "UV DOUX SILICONE SUNSCREEN SPF 50", "form": "Ointment", "cat": cat_derma, "batch": "28028570", "exp": "05-28", "mrp": 699.00, "rate": 532.57, "pack": "50GM", "qty": 2, "hsn": "33049990", "gst": 18.0},
        {"inv": "260007300125544", "name": "CETAPHIL GENTLE SKIN CLEANSER 118ML", "form": "Other", "cat": cat_derma, "batch": "28028571", "exp": "05-28", "mrp": 375.00, "rate": 285.71, "pack": "118ML", "qty": 2, "hsn": "33049990", "gst": 18.0},
        {"inv": "260007300125544", "name": "CETAPHIL MOISTURISING CREAM 100GM", "form": "Ointment", "cat": cat_derma, "batch": "28028572", "exp": "05-28", "mrp": 550.00, "rate": 419.05, "pack": "100GM", "qty": 2, "hsn": "33049990", "gst": 18.0},
        {"inv": "260007300125544", "name": "ECOSPRIN GOLD 20MG CAPS", "form": "Capsule", "cat": cat_cardio, "batch": "28028573", "exp": "05-28", "mrp": 195.00, "rate": 148.57, "pack": "15'S", "qty": 2, "hsn": "30049079", "gst": 5.0},
        {"inv": "260007300125544", "name": "SPOO BABY SHAMPOO 125ML", "form": "Other", "cat": cat_derma, "batch": "28028574", "exp": "05-28", "mrp": 265.00, "rate": 201.90, "pack": "125ML", "qty": 2, "hsn": "33051090", "gst": 18.0},
        {"inv": "260007300125544", "name": "B4 NAPPI CREAM 30G", "form": "Ointment", "cat": cat_derma, "batch": "28028575", "exp": "05-28", "mrp": 165.00, "rate": 125.71, "pack": "30GM", "qty": 2, "hsn": "30049099", "gst": 12.0},
        {"inv": "260007300125544", "name": "TEDIBAR 75GM", "form": "Other", "cat": cat_derma, "batch": "28028576", "exp": "05-28", "mrp": 185.00, "rate": 140.95, "pack": "75GM", "qty": 3, "hsn": "34011190", "gst": 18.0},
        {"inv": "260007300125544", "name": "ATOGLA LOTION 100ML", "form": "Ointment", "cat": cat_derma, "batch": "28028577", "exp": "05-28", "mrp": 375.00, "rate": 285.71, "pack": "100ML", "qty": 2, "hsn": "33049990", "gst": 18.0},
        {"inv": "260007300125544", "name": "DERMADEW FACE WASH 100ML", "form": "Other", "cat": cat_derma, "batch": "28028578", "exp": "05-28", "mrp": 295.00, "rate": 224.76, "pack": "100ML", "qty": 2, "hsn": "33049990", "gst": 18.0},
        {"inv": "260007300125544", "name": "DERMADEW DIAPER CREAM 50GM", "form": "Ointment", "cat": cat_derma, "batch": "28028579", "exp": "05-28", "mrp": 195.00, "rate": 148.57, "pack": "50GM", "qty": 2, "hsn": "30049099", "gst": 12.0},

        # Invoice 260007300126643
        {"inv": "260007300126643", "name": "REXIDIN M FORTE GEL 15GM", "form": "Ointment", "cat": cat_derma, "batch": "28028580", "exp": "05-28", "mrp": 95.00, "rate": 72.38, "pack": "15GM", "qty": 3, "hsn": "30049099", "gst": 12.0},
        {"inv": "260007300126643", "name": "D.F.O NANO GEL 30GM", "form": "Ointment", "cat": cat_pain, "batch": "28028581", "exp": "05-28", "mrp": 195.00, "rate": 148.57, "pack": "30GM", "qty": 2, "hsn": "30049099", "gst": 12.0},
        {"inv": "260007300126643", "name": "D.F.O GEL 30G", "form": "Ointment", "cat": cat_pain, "batch": "28028582", "exp": "05-28", "mrp": 165.00, "rate": 125.71, "pack": "30GM", "qty": 2, "hsn": "30049099", "gst": 12.0},
        {"inv": "260007300126643", "name": "ICLO GEL 30GM", "form": "Ointment", "cat": cat_pain, "batch": "28028583", "exp": "05-28", "mrp": 145.00, "rate": 110.48, "pack": "30GM", "qty": 2, "hsn": "30049099", "gst": 12.0},
        {"inv": "260007300126643", "name": "MUPIMET OINT 5GM", "form": "Ointment", "cat": cat_derma, "batch": "28028584", "exp": "05-28", "mrp": 135.00, "rate": 102.86, "pack": "5GM", "qty": 2, "hsn": "30049099", "gst": 12.0},
        {"inv": "260007300126643", "name": "MOOV OINT 10GM", "form": "Ointment", "cat": cat_pain, "batch": "28028585", "exp": "05-28", "mrp": 65.00, "rate": 49.52, "pack": "10GM", "qty": 5, "hsn": "30049099", "gst": 12.0},
        {"inv": "260007300126643", "name": "MOOV OINT 20GM", "form": "Ointment", "cat": cat_pain, "batch": "28028586", "exp": "05-28", "mrp": 120.00, "rate": 91.43, "pack": "20GM", "qty": 3, "hsn": "30049099", "gst": 12.0},
        {"inv": "260007300126643", "name": "MOOV SPRAY 35G", "form": "Other", "cat": cat_pain, "batch": "28028587", "exp": "05-28", "mrp": 155.00, "rate": 118.10, "pack": "35GM", "qty": 2, "hsn": "30049099", "gst": 12.0},
        {"inv": "260007300126643", "name": "MOOV SPRAY 50G", "form": "Other", "cat": cat_pain, "batch": "28028588", "exp": "05-28", "mrp": 215.00, "rate": 163.81, "pack": "50GM", "qty": 2, "hsn": "30049099", "gst": 12.0},
        {"inv": "260007300126643", "name": "MOOV COOL SPRAY 50G", "form": "Other", "cat": cat_pain, "batch": "28028589", "exp": "05-28", "mrp": 230.00, "rate": 175.24, "pack": "50GM", "qty": 2, "hsn": "30049099", "gst": 12.0},
        {"inv": "260007300126643", "name": "MOOV OINT 5G", "form": "Ointment", "cat": cat_pain, "batch": "28028590", "exp": "05-28", "mrp": 35.00, "rate": 26.67, "pack": "5GM", "qty": 10, "hsn": "30049099", "gst": 12.0},
        {"inv": "260007300126643", "name": "MOOV COOL SPRAY 15G", "form": "Other", "cat": cat_pain, "batch": "28028591", "exp": "05-28", "mrp": 85.00, "rate": 64.76, "pack": "15GM", "qty": 3, "hsn": "30049099", "gst": 12.0},
        {"inv": "260007300126643", "name": "SKINLITE CREAM 25G", "form": "Ointment", "cat": cat_derma, "batch": "28028592", "exp": "05-28", "mrp": 275.00, "rate": 209.52, "pack": "25GM", "qty": 2, "hsn": "30049099", "gst": 12.0},
        {"inv": "260007300126643", "name": "SKINLITE CREAM 15G", "form": "Ointment", "cat": cat_derma, "batch": "28028593", "exp": "05-28", "mrp": 185.00, "rate": 140.95, "pack": "15GM", "qty": 2, "hsn": "30049099", "gst": 12.0},
        {"inv": "260007300126643", "name": "MOMATE F CREAM 15GM", "form": "Ointment", "cat": cat_derma, "batch": "28028594", "exp": "05-28", "mrp": 245.00, "rate": 186.67, "pack": "15GM", "qty": 2, "hsn": "30049099", "gst": 12.0},
        {"inv": "260007300126643", "name": "TOPISAL 6% LOTION 30ML", "form": "Ointment", "cat": cat_derma, "batch": "28028595", "exp": "05-28", "mrp": 195.00, "rate": 148.57, "pack": "30ML", "qty": 2, "hsn": "30049099", "gst": 12.0},
        {"inv": "260007300126643", "name": "SILODERM CREAM 20GM", "form": "Ointment", "cat": cat_derma, "batch": "28028596", "exp": "05-28", "mrp": 85.00, "rate": 64.76, "pack": "20GM", "qty": 3, "hsn": "30049099", "gst": 12.0},
        {"inv": "260007300126643", "name": "PANDERM ++ CREAM 15GM", "form": "Ointment", "cat": cat_derma, "batch": "28028597", "exp": "05-28", "mrp": 115.00, "rate": 87.62, "pack": "15GM", "qty": 3, "hsn": "30049099", "gst": 12.0},
        {"inv": "260007300126643", "name": "PROPHYSALIC NF6 OINT 20GM", "form": "Ointment", "cat": cat_derma, "batch": "28028598", "exp": "05-28", "mrp": 185.00, "rate": 140.95, "pack": "20GM", "qty": 2, "hsn": "30049099", "gst": 12.0},
        {"inv": "260007300126643", "name": "PROPHYSALIC NF OINT 20GM", "form": "Ointment", "cat": cat_derma, "batch": "28028599", "exp": "05-28", "mrp": 165.00, "rate": 125.71, "pack": "20GM", "qty": 2, "hsn": "30049099", "gst": 12.0},
        {"inv": "260007300126643", "name": "TRETIN 0.025% CREAM 20GM", "form": "Ointment", "cat": cat_derma, "batch": "28028600", "exp": "05-28", "mrp": 195.00, "rate": 148.57, "pack": "20GM", "qty": 2, "hsn": "30049099", "gst": 12.0},
        {"inv": "260007300126643", "name": "TRETIN 0.05% CREAM 20GM", "form": "Ointment", "cat": cat_derma, "batch": "28028601", "exp": "05-28", "mrp": 245.00, "rate": 186.67, "pack": "20GM", "qty": 2, "hsn": "30049099", "gst": 12.0},
        {"inv": "260007300126643", "name": "NOBEL GEL 30GM", "form": "Ointment", "cat": cat_pain, "batch": "28028602", "exp": "05-28", "mrp": 125.00, "rate": 95.24, "pack": "30GM", "qty": 2, "hsn": "30049099", "gst": 12.0},
        {"inv": "260007300126643", "name": "NADOXIN PLUS CREAM 10GM", "form": "Ointment", "cat": cat_derma, "batch": "28028603", "exp": "05-28", "mrp": 115.00, "rate": 87.62, "pack": "10GM", "qty": 2, "hsn": "30049099", "gst": 12.0},

        # Invoice 260007300126637
        {"inv": "260007300126637", "name": "LULY CREAM 30GM", "form": "Ointment", "cat": cat_derma, "batch": "28028610", "exp": "05-28", "mrp": 295.00, "rate": 224.76, "pack": "30GM", "qty": 2, "hsn": "30049099", "gst": 12.0},
        {"inv": "260007300126637", "name": "MEGATRUM OINT 10GM", "form": "Ointment", "cat": cat_derma, "batch": "28028611", "exp": "05-28", "mrp": 145.00, "rate": 110.48, "pack": "10GM", "qty": 2, "hsn": "30049099", "gst": 12.0},
        {"inv": "260007300126637", "name": "MELACARE CREAM 20GM", "form": "Ointment", "cat": cat_derma, "batch": "28028612", "exp": "05-28", "mrp": 275.00, "rate": 209.52, "pack": "20GM", "qty": 2, "hsn": "30049099", "gst": 12.0},
        {"inv": "260007300126637", "name": "MELAFORTE CREAM 20GM", "form": "Ointment", "cat": cat_derma, "batch": "28028613", "exp": "05-28", "mrp": 315.00, "rate": 240.00, "pack": "20GM", "qty": 2, "hsn": "30049099", "gst": 12.0},
        {"inv": "260007300126637", "name": "LOZIVATE MF OINTMENT 20GM", "form": "Ointment", "cat": cat_derma, "batch": "28028614", "exp": "05-28", "mrp": 195.00, "rate": 148.57, "pack": "20GM", "qty": 2, "hsn": "30049099", "gst": 12.0},
        {"inv": "260007300126637", "name": "LOGIFIN CL CREAM 15GM", "form": "Ointment", "cat": cat_derma, "batch": "28028615", "exp": "05-28", "mrp": 165.00, "rate": 125.71, "pack": "15GM", "qty": 2, "hsn": "30049099", "gst": 12.0},
        {"inv": "260007300126637", "name": "KETO B CREAM 20GM", "form": "Ointment", "cat": cat_derma, "batch": "28028616", "exp": "05-28", "mrp": 175.00, "rate": 133.33, "pack": "20GM", "qty": 2, "hsn": "30049099", "gst": 12.0},
        {"inv": "260007300126637", "name": "KETO CREAM 30GM", "form": "Ointment", "cat": cat_derma, "batch": "28028617", "exp": "05-28", "mrp": 245.00, "rate": 186.67, "pack": "30GM", "qty": 2, "hsn": "30049099", "gst": 12.0},
        {"inv": "260007300126637", "name": "LACSOFT CREAM 50GM", "form": "Ointment", "cat": cat_derma, "batch": "28028618", "exp": "05-28", "mrp": 385.00, "rate": 293.33, "pack": "50GM", "qty": 2, "hsn": "30049099", "gst": 12.0},
        {"inv": "260007300126637", "name": "MOMATE CREAM 15GM", "form": "Ointment", "cat": cat_derma, "batch": "28028619", "exp": "05-28", "mrp": 215.00, "rate": 163.81, "pack": "15GM", "qty": 2, "hsn": "30049099", "gst": 12.0},
        {"inv": "260007300126637", "name": "MOMATE OINT 15GM", "form": "Ointment", "cat": cat_derma, "batch": "28028620", "exp": "05-28", "mrp": 215.00, "rate": 163.81, "pack": "15GM", "qty": 2, "hsn": "30049099", "gst": 12.0},
        {"inv": "260007300126637", "name": "LYCOR 1% CREAM 15GM", "form": "Ointment", "cat": cat_derma, "batch": "28028621", "exp": "05-28", "mrp": 115.00, "rate": 87.62, "pack": "15GM", "qty": 2, "hsn": "30049099", "gst": 12.0},
        {"inv": "260007300126637", "name": "LOBATE GM NEO CREAM 15GM", "form": "Ointment", "cat": cat_derma, "batch": "28028622", "exp": "05-28", "mrp": 125.00, "rate": 95.24, "pack": "15GM", "qty": 2, "hsn": "30049099", "gst": 12.0},
        {"inv": "260007300126637", "name": "LOBATE OINT 15GM", "form": "Ointment", "cat": cat_derma, "batch": "28028623", "exp": "05-28", "mrp": 95.00, "rate": 72.38, "pack": "15GM", "qty": 2, "hsn": "30049099", "gst": 12.0},
        {"inv": "260007300126637", "name": "KZ PLUS SOAP 75GM", "form": "Other", "cat": cat_derma, "batch": "28028624", "exp": "05-28", "mrp": 195.00, "rate": 148.57, "pack": "75GM", "qty": 3, "hsn": "34011190", "gst": 18.0},
        {"inv": "260007300126637", "name": "KZ CREAM 30GM", "form": "Ointment", "cat": cat_derma, "batch": "28028625", "exp": "05-28", "mrp": 275.00, "rate": 209.52, "pack": "30GM", "qty": 2, "hsn": "30049099", "gst": 12.0},
        {"inv": "260007300126637", "name": "KZ LOTION (SHAMPOO) 100ML", "form": "Other", "cat": cat_derma, "batch": "28028626", "exp": "05-28", "mrp": 385.00, "rate": 293.33, "pack": "100ML", "qty": 2, "hsn": "33051090", "gst": 18.0},
        {"inv": "260007300126637", "name": "LZHH CREAM 15GM", "form": "Ointment", "cat": cat_derma, "batch": "28028627", "exp": "05-28", "mrp": 165.00, "rate": 125.71, "pack": "15GM", "qty": 2, "hsn": "30049099", "gst": 12.0},
        {"inv": "260007300126637", "name": "MELAMET CREAM 15GM", "form": "Ointment", "cat": cat_derma, "batch": "28028628", "exp": "05-28", "mrp": 145.00, "rate": 110.48, "pack": "15GM", "qty": 2, "hsn": "30049099", "gst": 12.0},

        # Invoice 260007300126652
        {"inv": "260007300126652", "name": "ZN 20 DROPS 15ML", "form": "Drops", "cat": cat_vit, "batch": "28028630", "exp": "05-28", "mrp": 65.00, "rate": 49.52, "pack": "15ML", "qty": 3, "hsn": "30049099", "gst": 5.0},
        {"inv": "260007300126652", "name": "STYNYAC GEL 30GM", "form": "Ointment", "cat": cat_pain, "batch": "28028631", "exp": "05-28", "mrp": 145.00, "rate": 110.48, "pack": "30GM", "qty": 2, "hsn": "30049099", "gst": 12.0},
        {"inv": "260007300126652", "name": "POWERGESIC PLUS GEL 30GM", "form": "Ointment", "cat": cat_pain, "batch": "28028632", "exp": "05-28", "mrp": 135.00, "rate": 102.86, "pack": "30GM", "qty": 2, "hsn": "30049099", "gst": 12.0},
        {"inv": "260007300126652", "name": "CALSHINE P DROPS 15ML", "form": "Drops", "cat": cat_vit, "batch": "28028633", "exp": "05-28", "mrp": 125.00, "rate": 95.24, "pack": "15ML", "qty": 2, "hsn": "30049099", "gst": 5.0},
        {"inv": "260007300126652", "name": "VITANOVA D3 DROPS 15ML", "form": "Drops", "cat": cat_vit, "batch": "28028634", "exp": "05-28", "mrp": 145.00, "rate": 110.48, "pack": "15ML", "qty": 2, "hsn": "30049099", "gst": 5.0},
        {"inv": "260007300126652", "name": "CIPCAL 500 TABS 15'S", "form": "Tablet", "cat": cat_vit, "batch": "28028635", "exp": "05-28", "mrp": 115.00, "rate": 87.62, "pack": "15'S", "qty": 5, "hsn": "30049099", "gst": 5.0},
        {"inv": "260007300126652", "name": "ZINCOVIT TAB 15'S", "form": "Tablet", "cat": cat_vit, "batch": "28028636", "exp": "05-28", "mrp": 105.00, "rate": 80.00, "pack": "15'S", "qty": 5, "hsn": "30049099", "gst": 5.0},
        {"inv": "260007300126652", "name": "ITCH GUARD PLUS 12G", "form": "Ointment", "cat": cat_derma, "batch": "28028637", "exp": "05-28", "mrp": 115.00, "rate": 87.62, "pack": "12GM", "qty": 3, "hsn": "30049099", "gst": 12.0},
        {"inv": "260007300126652", "name": "ITCH GUARD PLUS 5G", "form": "Ointment", "cat": cat_derma, "batch": "28028638", "exp": "05-28", "mrp": 55.00, "rate": 41.90, "pack": "5GM", "qty": 5, "hsn": "30049099", "gst": 12.0},
        {"inv": "260007300126652", "name": "RING GUARD CREAM 5G", "form": "Ointment", "cat": cat_derma, "batch": "28028639", "exp": "05-28", "mrp": 45.00, "rate": 34.29, "pack": "5GM", "qty": 5, "hsn": "30049099", "gst": 12.0},
        {"inv": "260007300126652", "name": "BECOSULES CAPS 20'S", "form": "Capsule", "cat": cat_vit, "batch": "28028640", "exp": "05-28", "mrp": 55.00, "rate": 41.90, "pack": "20'S", "qty": 5, "hsn": "30045090", "gst": 5.0},
        {"inv": "260007300126652", "name": "PILEX FORTE OINTMENT 30GM", "form": "Ointment", "cat": cat_derma, "batch": "28028641", "exp": "05-28", "mrp": 125.00, "rate": 95.24, "pack": "30GM", "qty": 2, "hsn": "30049099", "gst": 12.0},
        {"inv": "260007300126652", "name": "EVION 400 20'S CAPS", "form": "Capsule", "cat": cat_vit, "batch": "28028642", "exp": "05-28", "mrp": 85.00, "rate": 64.76, "pack": "20'S", "qty": 5, "hsn": "30045090", "gst": 5.0},
        {"inv": "260007300126652", "name": "AEROCORT ROTACAPS 60'S", "form": "Capsule", "cat": cat_resp, "batch": "28028643", "exp": "05-28", "mrp": 315.00, "rate": 240.00, "pack": "60S", "qty": 2, "hsn": "30049099", "gst": 5.0},
        {"inv": "260007300126652", "name": "BUDECORT 200 ROTACAPS 30'S", "form": "Capsule", "cat": cat_resp, "batch": "28028644", "exp": "05-28", "mrp": 165.00, "rate": 125.71, "pack": "30S", "qty": 2, "hsn": "30049099", "gst": 5.0},
        {"inv": "260007300126652", "name": "PANTOP 40 TABS", "form": "Tablet", "cat": cat_gastro, "batch": "28028645", "exp": "05-28", "mrp": 148.12, "rate": 112.86, "pack": "15'S", "qty": 5, "hsn": "30049039", "gst": 5.0},
        {"inv": "260007300126652", "name": "PAN 40MG TABS", "form": "Tablet", "cat": cat_gastro, "batch": "28028646", "exp": "05-28", "mrp": 155.00, "rate": 118.10, "pack": "15'S", "qty": 5, "hsn": "30049039", "gst": 5.0},
        {"inv": "260007300126652", "name": "UPRISE D3 DROPS 15ML", "form": "Drops", "cat": cat_vit, "batch": "28028647", "exp": "05-28", "mrp": 175.00, "rate": 133.33, "pack": "15ML", "qty": 2, "hsn": "30049099", "gst": 5.0},
        {"inv": "260007300126652", "name": "ULTRA D3 DROPS 15ML", "form": "Drops", "cat": cat_vit, "batch": "28028648", "exp": "05-28", "mrp": 195.00, "rate": 148.57, "pack": "15ML", "qty": 2, "hsn": "30049099", "gst": 5.0},
        {"inv": "260007300126652", "name": "VOLITRA PLUS GEL 30GM", "form": "Ointment", "cat": cat_pain, "batch": "28028649", "exp": "05-28", "mrp": 185.00, "rate": 140.95, "pack": "30GM", "qty": 2, "hsn": "30049099", "gst": 12.0},
        {"inv": "260007300126652", "name": "VOLINI GEL 30G", "form": "Ointment", "cat": cat_pain, "batch": "28028650", "exp": "05-28", "mrp": 175.00, "rate": 133.33, "pack": "30GM", "qty": 2, "hsn": "30049099", "gst": 12.0},
        {"inv": "260007300126652", "name": "VOLINI GEL 12G", "form": "Ointment", "cat": cat_pain, "batch": "28028651", "exp": "05-28", "mrp": 75.00, "rate": 57.14, "pack": "12GM", "qty": 3, "hsn": "30049099", "gst": 12.0},
        {"inv": "260007300126652", "name": "VOLINI GEL 20G", "form": "Ointment", "cat": cat_pain, "batch": "28028652", "exp": "05-28", "mrp": 125.00, "rate": 95.24, "pack": "20GM", "qty": 3, "hsn": "30049099", "gst": 12.0},
        {"inv": "260007300126652", "name": "VOVERAN EMUGEL 30GM", "form": "Ointment", "cat": cat_pain, "batch": "28028653", "exp": "05-28", "mrp": 185.00, "rate": 140.95, "pack": "30GM", "qty": 2, "hsn": "30049099", "gst": 12.0},
    ]

    count = 0
    for item in items:
        med, _ = Medicine.objects.get_or_create(
            name=item["name"],
            defaults={
                "dosage_form": item.get("form", "Tablet"),
                "category": item.get("cat"),
                "hsn_code": item.get("hsn", "3004"),
                "gst_rate": Decimal(str(item.get("gst", 5.0))),
                "min_stock_alert": 5,
                "is_active": True
            }
        )
        med.category = item.get("cat")
        med.dosage_form = item.get("form", "Tablet")
        med.hsn_code = item.get("hsn", "3004")
        med.gst_rate = Decimal(str(item.get("gst", 5.0)))
        med.save()

        exp_date = parse_expiry(item["exp"])
        pack_sz = parse_pack_size(item["pack"])
        mrp_val = Decimal(str(item["mrp"]))
        pur_val = Decimal(str(item["rate"]))
        sell_val = mrp_val

        batch, created = Batch.objects.get_or_create(
            medicine=med,
            batch_number=item["batch"],
            defaults={
                "supplier": sup,
                "expiry_date": exp_date,
                "purchase_price": pur_val,
                "mrp": mrp_val,
                "selling_price": sell_val,
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
            batch.selling_price = sell_val
            batch.pack_size = pack_sz
            batch.pack_quantity = item["qty"]
            batch.save()

        StockMovement.objects.create(
            batch=batch,
            movement_type='PURCHASE',
            quantity_packs=item["qty"],
            quantity_loose=0,
            reference_id=f"INV-{item['inv']}",
            notes=f"Purchase from Sai Radha Pharma Inv #{item['inv']}"
        )
        count += 1

    print(f"  [+] Successfully processed {count} items for Sai Radha Pharma.")

if __name__ == '__main__':
    run()
