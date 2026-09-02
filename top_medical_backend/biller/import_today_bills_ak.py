import os
import sys
from datetime import date
from decimal import Decimal
import django

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'biller.settings')
django.setup()

from inventory.models import Category, Supplier, Medicine, Batch, StockMovement
from data_imports_util import parse_expiry, parse_pack_size, get_or_create_category, get_or_create_supplier

def import_todays_bills():
    print("=" * 80)
    print("TOP MEDICAL PHARMACY - INGESTION FOR TODAY'S BILLS (src/assets/ak)")
    print("=" * 80)

    # Categories
    cat_resp = get_or_create_category("Respiratory & Inhalers", "Inhalers, Respules, Cough, Cold & Asthma")
    cat_anti = get_or_create_category("Antibiotics & Anti-Infectives", "Antibiotics, Anti-fungals, Anti-virals")
    cat_cardio = get_or_create_category("Cardiovascular & Hypertension", "Blood pressure, Cardiac, Cholesterol")
    cat_pain = get_or_create_category("Analgesics & Pain Management", "Pain relief, Anti-inflammatory, Spasm")
    cat_gastro = get_or_create_category("Gastrointestinal & Digestion", "Antacids, Laxatives, Probiotics")
    cat_vit = get_or_create_category("Vitamins & Supplements", "Multivitamins, Calcium, Vitamin D3")
    cat_neuro = get_or_create_category("Neurology & Psychiatry", "Anticonvulsants, Antidepressants, Anxiolytics")
    cat_diab = get_or_create_category("Diabetes & Endocrine", "Insulins, Oral Hypoglycemics")
    cat_derm = get_or_create_category("Dermatology & Topicals", "Ointments, Creams, Skin Lotions, Antiseptics")
    cat_eye = get_or_create_category("Ophthalmology & Eye Drops", "Eye Drops, Ear Drops, ENT drops")
    cat_uro = get_or_create_category("Urology & Men's Health", "Urinary tract, Kidney stone, Bladder")
    cat_oral = get_or_create_category("Personal Care & Hygiene", "Oral care, Mouthwash, Personal care")

    # Suppliers
    sup_gk = get_or_create_supplier({
        "name": "G.K. Pharma",
        "contact_person": "Abdul Shahad (Rep: Ramdas Kumar)",
        "phone": "0824-2217370 / 2217384 / 8548885737 / 9036075737",
        "email": "gkpharmamangalore@gmail.com",
        "gstin": "29AABFG3239N1Z3",
        "address": "Ganesh, 3-30-2484A, Kadri Kambal Road, Mangalore - 575004 (DL: 20B-KA-MN1-148700 / 21B-KA-MN1-148701)"
    })

    sup_shakthi = get_or_create_supplier({
        "name": "Shakthi Life Lines",
        "contact_person": "Sales Desk (Rep: Venu)",
        "phone": "0824-2211758 / 2213358 / 9731984022 / 9844670655",
        "email": "shakthilifelines@gmail.com",
        "gstin": "29ADWFS4792G1Z3",
        "address": "No 25-2-93/1-7, Opp Taj Cycles, Kankanady Bypass Rd, Mangalore - 575002 (DL: 20B-KA-MN1-245616 / 21B-KA-MN1-245617)"
    })

    sup_kanara = get_or_create_supplier({
        "name": "Kanara Distributors",
        "contact_person": "Sandeep (Rep: Megha)",
        "phone": "0824-2210563 / 9740021201 / 8884600833 / 7259876633",
        "email": "kanaradistributors@gmail.com",
        "gstin": "29AAEFA4919Q1ZH",
        "address": "2nd Floor, City Comm. Complex, Kadri, Mangalore - 575003 (DL: 20B/KA-MN2-101053 / 21B KA-MN2-101054)"
    })

    sup_ak = get_or_create_supplier({
        "name": "A.K Pharma (Unit of AKP Healthcare Pvt Ltd)",
        "contact_person": "Prajwal - 9739769028",
        "phone": "08192-272606 / 607 / 608 / 9739769028",
        "email": "akpharmadavangere@gmail.com",
        "gstin": "29AAQCA0774Q1ZS",
        "address": "#480/488, Hadadi Road, Opp Taralabalu School, Davangere - 577005 (DL: 20B KA-DG2-166517 / 21B KA-DG2-166519)"
    })

    sup_aamish = get_or_create_supplier({
        "name": "Aamish Traders",
        "contact_person": "Sales Desk",
        "phone": "9844995857",
        "email": "aamishtraders@gmail.com",
        "gstin": "29ACOFA3906D1ZF",
        "address": "4-5/9(2) Hira Residency, Babbukatte, Permanur, Ullal, Mangalore - 575017"
    })

    all_invoices_data = [
        # =========================================================================
        # 1. G.K. PHARMA - Invoice #58283 (Date: 28/08/2026, 27 items)
        # =========================================================================
        {
            "supplier": sup_gk,
            "inv": "58283",
            "items": [
                {"name": "B4 NAPPI CREAM 30GM", "generic": "Zinc Oxide, Miconazole & D-Panthenol", "mfr": "Torrent Pharma", "form": "Ointment", "cat": cat_derm, "batch": "RN26024", "exp": "05-28", "mrp": 195.00, "rate": 132.20, "pack": "1", "qty": 2, "gst": 18.0, "hsn": "33049990"},
                {"name": "ZERODOL MR TAB", "generic": "Aceclofenac, Paracetamol & Tizanidine", "mfr": "IPCA Laboratories", "form": "Tablet", "cat": cat_pain, "batch": "GGC0426003", "exp": "02-29", "mrp": 128.00, "rate": 97.52, "pack": "10'S", "qty": 2, "gst": 5.0, "hsn": "30049069"},
                {"name": "ZERODOL P TAB", "generic": "Aceclofenac & Paracetamol", "mfr": "IPCA Laboratories", "form": "Tablet", "cat": cat_pain, "batch": "KVBO126053", "exp": "04-28", "mrp": 75.94, "rate": 57.86, "pack": "10'S", "qty": 2, "gst": 5.0, "hsn": "30049069"},
                {"name": "AZITHRAL 100 LIQUID 15ML", "generic": "Azithromycin Oral Suspension 100mg", "mfr": "Alembic Pharmaceuticals", "form": "Syrup", "cat": cat_anti, "batch": "2613000437", "exp": "04-28", "mrp": 62.55, "rate": 47.66, "pack": "1", "qty": 1, "gst": 5.0, "hsn": "30042064"},
                {"name": "AZITHRAL 200 LIQUID 15ML", "generic": "Azithromycin Oral Suspension 200mg", "mfr": "Alembic Pharmaceuticals", "form": "Syrup", "cat": cat_anti, "batch": "2613000552", "exp": "05-28", "mrp": 54.97, "rate": 41.88, "pack": "1", "qty": 1, "gst": 5.0, "hsn": "30042064"},
                {"name": "CWIN LOTION 30ML", "generic": "Ciclopirox Olamine Lotion 1%", "mfr": "Sun Pharma", "form": "Ointment", "cat": cat_derm, "batch": "SGD0103", "exp": "03-28", "mrp": 274.69, "rate": 209.29, "pack": "1", "qty": 1, "gst": 5.0, "hsn": "30049029"},
                {"name": "RAPICLAV FORTE SYRUP 30ML", "generic": "Amoxicillin & Potassium Clavulanate Oral Suspension", "mfr": "IPCA Laboratories", "form": "Syrup", "cat": cat_anti, "batch": "BBL06AAB", "exp": "07-27", "mrp": 154.69, "rate": 117.86, "pack": "1", "qty": 1, "gst": 5.0, "hsn": "30041030"},
                {"name": "XYZAL 10MG TAB", "generic": "Levocetirizine Dihydrochloride 10mg", "mfr": "Dr. Reddy's Laboratories", "form": "Tablet", "cat": cat_resp, "batch": "AKF06AHA", "exp": "01-28", "mrp": 250.31, "rate": 190.71, "pack": "10'S", "qty": 1, "gst": 5.0, "hsn": "30049039"},
                {"name": "ALLERCET DC NEW TAB", "generic": "Cetirizine, Phenylephrine & Dextromethorphan", "mfr": "Micro Labs", "form": "Tablet", "cat": cat_resp, "batch": "ADBS0018", "exp": "02-28", "mrp": 124.60, "rate": 94.94, "pack": "10'S", "qty": 2, "gst": 5.0, "hsn": "30049031"},
                {"name": "LEVOLIN INHALER 200MD", "generic": "Levosalbutamol Inhaler 50mcg", "mfr": "Cipla", "form": "Inhaler", "cat": cat_resp, "batch": "6SN0621", "exp": "08-27", "mrp": 291.35, "rate": 221.98, "pack": "1", "qty": 1, "gst": 5.0, "hsn": "30049091"},
                {"name": "ADVENT DRY SYRUP 30ML", "generic": "Amoxicillin & Potassium Clavulanate 228.5mg", "mfr": "Cipla", "form": "Syrup", "cat": cat_anti, "batch": "6KP0051", "exp": "07-27", "mrp": 64.88, "rate": 49.43, "pack": "1", "qty": 1, "gst": 5.0, "hsn": "30049087"},
                {"name": "TAXIM O CV DRY SYRUP 30ML", "generic": "Cefixime & Potassium Clavulanate Oral Suspension", "mfr": "Alkem Laboratories", "form": "Syrup", "cat": cat_anti, "batch": "26460266", "exp": "07-27", "mrp": 132.00, "rate": 100.57, "pack": "1", "qty": 1, "gst": 5.0, "hsn": "30042019"},
                {"name": "TAXIM O DRY SYRUP 30ML", "generic": "Cefixime Oral Suspension 50mg/5ml", "mfr": "Alkem Laboratories", "form": "Syrup", "cat": cat_anti, "batch": "26460584", "exp": "03-28", "mrp": 52.42, "rate": 39.94, "pack": "1", "qty": 1, "gst": 5.0, "hsn": "30042019"},
                {"name": "TAXIM O FORTE DRY SYRUP 30ML", "generic": "Cefixime Oral Suspension 100mg/5ml", "mfr": "Alkem Laboratories", "form": "Syrup", "cat": cat_anti, "batch": "26460763", "exp": "10-27", "mrp": 77.02, "rate": 58.68, "pack": "1", "qty": 1, "gst": 5.0, "hsn": "30042019"},
                {"name": "XYLOMIST NASAL DROPS 10ML", "generic": "Xylometazoline HCl Adult Nasal Drops 0.1%", "mfr": "Zydus Healthcare", "form": "Drops", "cat": cat_resp, "batch": "DBC1066", "exp": "06-29", "mrp": 55.02, "rate": 41.92, "pack": "1", "qty": 1, "gst": 5.0, "hsn": "30049099"},
                {"name": "XYLOMIST P NASAL DROPS 10ML", "generic": "Xylometazoline HCl Paediatric Nasal Drops 0.05%", "mfr": "Zydus Healthcare", "form": "Drops", "cat": cat_resp, "batch": "DBC1046", "exp": "04-29", "mrp": 45.02, "rate": 34.30, "pack": "1", "qty": 1, "gst": 5.0, "hsn": "30049099"},
                {"name": "MOX CLAV DS SYRUP 30ML", "generic": "Amoxicillin & Potassium Clavulanate 457mg", "mfr": "Sun Pharma", "form": "Syrup", "cat": cat_anti, "batch": "DFH2205A", "exp": "09-27", "mrp": 179.06, "rate": 136.42, "pack": "1", "qty": 1, "gst": 5.0, "hsn": "30041030"},
                {"name": "BACTOCLAV DS 457 SYRUP 30ML", "generic": "Amoxicillin & Potassium Clavulanate 457mg", "mfr": "Micro Labs", "form": "Syrup", "cat": cat_anti, "batch": "BCBID0005", "exp": "09-27", "mrp": 142.90, "rate": 108.88, "pack": "1", "qty": 1, "gst": 5.0, "hsn": "30041090"},
                {"name": "MOX CLAV BD SYRUP 30ML", "generic": "Amoxicillin & Potassium Clavulanate 228.5mg", "mfr": "Sun Pharma", "form": "Syrup", "cat": cat_anti, "batch": "EPD0024", "exp": "09-27", "mrp": 65.10, "rate": 49.60, "pack": "1", "qty": 1, "gst": 5.0, "hsn": "30041030"},
                {"name": "A TO Z NS SYRUP 200ML", "generic": "Multivitamins, Minerals & Zinc Syrup", "mfr": "Alkem Laboratories", "form": "Syrup", "cat": cat_vit, "batch": "26490747", "exp": "12-27", "mrp": 260.00, "rate": 198.10, "pack": "1", "qty": 1, "gst": 5.0, "hsn": "21069099"},
                {"name": "HHCEF 100 DRY SYRUP 30ML", "generic": "Cefpodoxime Proxetil 100mg Oral Suspension", "mfr": "Hegde & Hegde Pharmaceutica", "form": "Syrup", "cat": cat_anti, "batch": "CD-0971A", "exp": "12-27", "mrp": 76.27, "rate": 58.11, "pack": "1", "qty": 1, "gst": 5.0, "hsn": "30042019"},
                {"name": "BENZAC AC 2.5% GEL 30GM", "generic": "Benzoyl Peroxide Gel 2.5%", "mfr": "Galderma India", "form": "Ointment", "cat": cat_derm, "batch": "6AC18", "exp": "04-28", "mrp": 116.25, "rate": 88.57, "pack": "1", "qty": 1, "gst": 5.0, "hsn": "30045090"},
                {"name": "MOXIKIND CV FORTE DRY SYRUP 30ML", "generic": "Amoxicillin & Potassium Clavulanate 457mg", "mfr": "Mankind Pharma", "form": "Syrup", "cat": cat_anti, "batch": "A2AEE008", "exp": "07-27", "mrp": 180.92, "rate": 137.84, "pack": "1", "qty": 1, "gst": 5.0, "hsn": "30049087"},
                {"name": "MOXIKIND CV DRY SYRUP 30ML", "generic": "Amoxicillin & Potassium Clavulanate 228.5mg", "mfr": "Mankind Pharma", "form": "Syrup", "cat": cat_anti, "batch": "B7AEE012", "exp": "07-27", "mrp": 64.39, "rate": 49.06, "pack": "1", "qty": 1, "gst": 5.0, "hsn": "30049087"},
                {"name": "ENSURE DIABETES CARE VANILLA 200GM", "generic": "Diabetes Specific Nutritional Drink Powder", "mfr": "Abbott Healthcare", "form": "Powder", "cat": cat_vit, "batch": "B9025MN1", "exp": "01-27", "mrp": 535.00, "rate": 463.67, "pack": "1", "qty": 1, "gst": 5.0, "hsn": "21069091"},
                {"name": "B-TEX OINTMENT 14GM", "generic": "Salicylic Acid, Gandhak & Kapoor", "mfr": "B-Tex Consumer Products", "form": "Ointment", "cat": cat_derm, "batch": "B020A26", "exp": "03-29", "mrp": 28.00, "rate": 22.05, "pack": "1", "qty": 3, "gst": 5.0, "hsn": "30049011"},
                {"name": "RELENT PLUS SYRUP 60ML", "generic": "Cetirizine, Ambroxol & Phenylephrine Syrup", "mfr": "Dr. Reddy's Laboratories", "form": "Syrup", "cat": cat_resp, "batch": "D260376", "exp": "04-28", "mrp": 134.53, "rate": 102.50, "pack": "1", "qty": 1, "gst": 5.0, "hsn": "30049099"}
            ]
        },

        # =========================================================================
        # 2. SHAKTHI LIFE LINES - Invoice #63417 (Date: 28/08/2026, 40 items)
        # =========================================================================
        {
            "supplier": sup_shakthi,
            "inv": "63417",
            "items": [
                {"name": "DESOWEN LOTION 30ML", "generic": "Desonide Lotion 0.05%", "mfr": "Galderma India", "form": "Ointment", "cat": cat_derm, "batch": "5AX19", "exp": "10-28", "mrp": 290.50, "rate": 221.33, "pack": "1", "qty": 1, "gst": 5.0, "hsn": "33049990"},
                {"name": "DICLOGEL GEL 30GM", "generic": "Diclofenac Diethylamine, Methyl Salicylate & Menthol Gel", "mfr": "Hegde & Hegde", "form": "Ointment", "cat": cat_pain, "batch": "H298", "exp": "02-28", "mrp": 154.69, "rate": 117.86, "pack": "1", "qty": 2, "gst": 5.0, "hsn": "30042200"},
                {"name": "RENOLEN DROPS 10ML", "generic": "Carboxymethylcellulose Eye Drops 0.5%", "mfr": "Centaur Pharmaceuticals", "form": "Drops", "cat": cat_eye, "batch": "26450027", "exp": "03-29", "mrp": 101.80, "rate": 77.56, "pack": "1", "qty": 1, "gst": 5.0, "hsn": "30049010"},
                {"name": "OCUREST DROPS 10ML", "generic": "Naphazoline, Phenylephrine & Zinc Sulphate Eye Drops", "mfr": "Centaur Pharmaceuticals", "form": "Drops", "cat": cat_eye, "batch": "DX0N024", "exp": "09-27", "mrp": 132.59, "rate": 101.02, "pack": "1", "qty": 1, "gst": 5.0, "hsn": "30049099"},
                {"name": "OCUPOL DROPS 5ML", "generic": "Polymyxin B & Chloramphenicol Eye/Ear Drops", "mfr": "Centaur Pharmaceuticals", "form": "Drops", "cat": cat_eye, "batch": "CH116", "exp": "03-27", "mrp": 97.43, "rate": 74.23, "pack": "1", "qty": 1, "gst": 5.0, "hsn": "30042097"},
                {"name": "OCUREST PLUS DROPS 10ML", "generic": "Naphazoline, Chlorpheniramine & Zinc Eye Drops", "mfr": "Centaur Pharmaceuticals", "form": "Drops", "cat": cat_eye, "batch": "D220P013", "exp": "01-28", "mrp": 141.61, "rate": 107.90, "pack": "1", "qty": 1, "gst": 5.0, "hsn": "30049039"},
                {"name": "PARACAIN EYE DROPS 5ML", "generic": "Proparacaine HCl Ophthalmic Solution 0.5%", "mfr": "Sun Pharma", "form": "Drops", "cat": cat_eye, "batch": "PR-2608", "exp": "04-27", "mrp": 52.50, "rate": 40.00, "pack": "1", "qty": 1, "gst": 5.0, "hsn": "30049099"},
                {"name": "REFRESH TEARS EYE DROPS 10ML", "generic": "Carboxymethylcellulose Eye Drops 0.5%", "mfr": "Allergan India", "form": "Drops", "cat": cat_eye, "batch": "125329", "exp": "02-28", "mrp": 131.27, "rate": 107.78, "pack": "1", "qty": 1, "gst": 5.0, "hsn": "30049099"},
                {"name": "MUFF Q DX TABS", "generic": "Dextromethorphan, Phenylephrine & Chlorpheniramine", "mfr": "Generic", "form": "Tablet", "cat": cat_resp, "batch": "IN26H018", "exp": "03-28", "mrp": 77.34, "rate": 14.21, "pack": "10'S", "qty": 3, "gst": 5.0, "hsn": "30049099"},
                {"name": "ABD 400 TABS", "generic": "Albendazole Chewable Tablets 400mg", "mfr": "Intas Pharmaceuticals", "form": "Tablet", "cat": cat_anti, "batch": "IPL25759", "exp": "11-27", "mrp": 7.52, "rate": 4.04, "pack": "1'S", "qty": 30, "gst": 5.0, "hsn": "30049099"},
                {"name": "STREPSILS LOZENGES ORANGE 120'S", "generic": "2,4-Dichlorobenzyl Alcohol & Amylmetacresol", "mfr": "Reckitt Benckiser", "form": "Other", "cat": cat_resp, "batch": "AI567", "exp": "04-28", "mrp": 420.00, "rate": 331.44, "pack": "128", "qty": 1, "gst": 5.0, "hsn": "30049099"},
                {"name": "TARAX DROPS 15ML", "generic": "Tropicamide & Phenylephrine Eye Drops", "mfr": "Mankind Pharma", "form": "Drops", "cat": cat_eye, "batch": "AT6021", "exp": "04-28", "mrp": 95.12, "rate": 72.47, "pack": "1", "qty": 1, "gst": 5.0, "hsn": "30049099"},
                {"name": "MAHATOX EYE DROPS 5ML", "generic": "Moxifloxacin Eye Drops 0.5%", "mfr": "Mankind Pharma", "form": "Drops", "cat": cat_eye, "batch": "A2M2017", "exp": "03-28", "mrp": 106.11, "rate": 80.85, "pack": "1", "qty": 1, "gst": 5.0, "hsn": "30049099"},
                {"name": "MAHAFLOX KT EYE DROPS 5ML", "generic": "Moxifloxacin & Ketorolac Tromethamine Eye Drops", "mfr": "Mankind Pharma", "form": "Drops", "cat": cat_eye, "batch": "BMV2002", "exp": "02-28", "mrp": 176.80, "rate": 134.70, "pack": "1", "qty": 1, "gst": 5.0, "hsn": "30049099"},
                {"name": "MAHAFLOX LP EYE DROPS 5ML", "generic": "Moxifloxacin & Loteprednol Etabonate Eye Drops", "mfr": "Mankind Pharma", "form": "Drops", "cat": cat_eye, "batch": "BMV2006", "exp": "03-28", "mrp": 230.83, "rate": 175.87, "pack": "1", "qty": 1, "gst": 5.0, "hsn": "30049099"},
                {"name": "MAHAFLOX EYE DROPS 5ML", "generic": "Moxifloxacin Ophthalmic Solution 0.5%", "mfr": "Mankind Pharma", "form": "Drops", "cat": cat_eye, "batch": "JGK2006", "exp": "03-28", "mrp": 119.25, "rate": 90.86, "pack": "1", "qty": 1, "gst": 5.0, "hsn": "30042039"},
                {"name": "MOXIGRAM DM EYE DROPS 5ML", "generic": "Moxifloxacin & Dexamethasone Eye Drops", "mfr": "Micro Labs", "form": "Drops", "cat": cat_eye, "batch": "MCC80037", "exp": "03-28", "mrp": 129.30, "rate": 98.51, "pack": "1", "qty": 1, "gst": 5.0, "hsn": "30049087"},
                {"name": "MOXIGRAM EYE DROPS 5ML", "generic": "Moxifloxacin Eye Drops 0.5%", "mfr": "Micro Labs", "form": "Drops", "cat": cat_eye, "batch": "MAS0128", "exp": "09-28", "mrp": 205.30, "rate": 156.42, "pack": "1", "qty": 1, "gst": 5.0, "hsn": "30049087"},
                {"name": "ALLERCET D.C TABS 10'S", "generic": "Cetirizine & Phenylephrine Tablets", "mfr": "Micro Labs", "form": "Tablet", "cat": cat_resp, "batch": "ADB80016", "exp": "12-27", "mrp": 124.60, "rate": 94.94, "pack": "10'S", "qty": 2, "gst": 5.0, "hsn": "30049031"},
                {"name": "WAXONIL ACTIV EAR DROPS 10ML", "generic": "Paradichlorobenzene, Benzocaine & Chlorbutol Ear Drops", "mfr": "Entod Pharmaceuticals", "form": "Drops", "cat": cat_eye, "batch": "DE80012", "exp": "10-27", "mrp": 162.50, "rate": 123.81, "pack": "1", "qty": 1, "gst": 5.0, "hsn": "30033900"},
                {"name": "OTOBIOTIC PLUS EAR DROPS 5ML", "generic": "Neomycin, Polymyxin B & Dexamethasone Ear Drops", "mfr": "Entod Pharmaceuticals", "form": "Drops", "cat": cat_eye, "batch": "DE5K013", "exp": "04-27", "mrp": 141.25, "rate": 107.62, "pack": "1", "qty": 1, "gst": 5.0, "hsn": "30049099"},
                {"name": "BETNOVATE C CREAM 30GM", "generic": "Betamethasone Valerate & Clioquinol Cream", "mfr": "GlaxoSmithKline (GSK)", "form": "Ointment", "cat": cat_derm, "batch": "3W5H", "exp": "03-28", "mrp": 80.30, "rate": 61.18, "pack": "1", "qty": 1, "gst": 5.0, "hsn": "30043200"},
                {"name": "BETNOVATE SKIN CREAM 20GM", "generic": "Betamethasone Valerate Cream 0.1%", "mfr": "GlaxoSmithKline (GSK)", "form": "Ointment", "cat": cat_derm, "batch": "Y8L", "exp": "01-28", "mrp": 22.22, "rate": 16.93, "pack": "1", "qty": 1, "gst": 5.0, "hsn": "30043200"},
                {"name": "SHELCAL XT TABS 15'S", "generic": "Calcium Carbonate, Vitamin D3 & Methylcobalamin", "mfr": "Torrent Pharma", "form": "Tablet", "cat": cat_vit, "batch": "28G6N057", "exp": "04-28", "mrp": 402.15, "rate": 306.40, "pack": "15'S", "qty": 1, "gst": 5.0, "hsn": "30045039"},
                {"name": "SHELCAL 500 TABS 15'S", "generic": "Calcium Carbonate 500mg & Vitamin D3", "mfr": "Torrent Pharma", "form": "Tablet", "cat": cat_vit, "batch": "BLV2N129", "exp": "02-28", "mrp": 163.45, "rate": 124.53, "pack": "15'S", "qty": 1, "gst": 5.0, "hsn": "30045039"},
                {"name": "WINOLAP DROPS 5ML", "generic": "Olopatadine Ophthalmic Solution 0.1%", "mfr": "Sun Pharma", "form": "Drops", "cat": cat_eye, "batch": "GTH0416B", "exp": "01-28", "mrp": 202.50, "rate": 154.29, "pack": "1", "qty": 1, "gst": 5.0, "hsn": "30049099"},
                {"name": "TONACT TG TABS 15'S", "generic": "Atorvastatin 10mg & Fenofibrate 160mg", "mfr": "Lupin", "form": "Tablet", "cat": cat_cardio, "batch": "UC01446", "exp": "11-27", "mrp": 601.45, "rate": 458.25, "pack": "15'S", "qty": 2, "gst": 5.0, "hsn": "30049099"},
                {"name": "FLUTIFLO FT NASAL SPRAY 9.9ML", "generic": "Fluticasone Furoate Nasal Spray", "mfr": "Lupin", "form": "Drops", "cat": cat_resp, "batch": "OND0058A", "exp": "03-28", "mrp": 526.80, "rate": 401.37, "pack": "1", "qty": 1, "gst": 5.0, "hsn": "30049099"},
                {"name": "OCUFLUR EYE DROPS 5ML", "generic": "Flurbiprofen Sodium Ophthalmic Solution 0.03%", "mfr": "FDC Limited", "form": "Drops", "cat": cat_eye, "batch": "0826DQ072", "exp": "01-28", "mrp": 84.19, "rate": 64.14, "pack": "1", "qty": 1, "gst": 5.0, "hsn": "30049069"},
                {"name": "LEVOLIN 0.31 RESPULES 2.5ML", "generic": "Levosalbutamol Respirator Solution 0.31mg", "mfr": "Cipla", "form": "Inhaler", "cat": cat_resp, "batch": "6L80063", "exp": "12-27", "mrp": 6.73, "rate": 5.13, "pack": "1", "qty": 6, "gst": 5.0, "hsn": "30049099"},
                {"name": "LEVOLIN RESP 0.63 RESPULES 2.5ML", "generic": "Levosalbutamol Respirator Solution 0.63mg", "mfr": "Cipla", "form": "Inhaler", "cat": cat_resp, "batch": "6L80380", "exp": "03-28", "mrp": 8.10, "rate": 6.17, "pack": "1", "qty": 6, "gst": 5.0, "hsn": "30049099"},
                {"name": "ROTAHALER DEVICE", "generic": "Rotahaler Dry Powder Inhalation Device", "mfr": "Cipla", "form": "Device", "cat": cat_resp, "batch": "DJ26022", "exp": "05-31", "mrp": 209.50, "rate": 159.62, "pack": "1", "qty": 1, "gst": 5.0, "hsn": "90192090"},
                {"name": "OFLOX EYE DROPS 5ML", "generic": "Ofloxacin Ophthalmic Solution 0.3%", "mfr": "Cipla", "form": "Drops", "cat": cat_eye, "batch": "A00001", "exp": "12-27", "mrp": 50.63, "rate": 38.58, "pack": "1", "qty": 1, "gst": 5.0, "hsn": "30042034"},
                {"name": "ROSEDAY GOLD 10MG CAPS 10'S", "generic": "Rosuvastatin 10mg, Aspirin 75mg & Clopidogrel 75mg", "mfr": "USV Limited", "form": "Capsule", "cat": cat_cardio, "batch": "2682GCA224", "exp": "03-28", "mrp": 168.38, "rate": 128.29, "pack": "10'S", "qty": 1, "gst": 5.0, "hsn": "30049099"},
                {"name": "ROSEDAY GOLD 20MG CAPS 10'S", "generic": "Rosuvastatin 20mg, Aspirin 75mg & Clopidogrel 75mg", "mfr": "USV Limited", "form": "Capsule", "cat": cat_cardio, "batch": "2682GCA247", "exp": "03-28", "mrp": 285.50, "rate": 217.52, "pack": "10'S", "qty": 1, "gst": 5.0, "hsn": "30049099"},
                {"name": "URISPAS TABS 15'S", "generic": "Flavoxate Hydrochloride Tablets 200mg", "mfr": "Walter Bushnell", "form": "Tablet", "cat": cat_uro, "batch": "TUR-2401", "exp": "11-27", "mrp": 569.20, "rate": 433.68, "pack": "15'S", "qty": 2, "gst": 5.0, "hsn": "30031000"},
                {"name": "AZEE 100 DRY SYRUP 15ML", "generic": "Azithromycin Oral Suspension 100mg/5ml", "mfr": "Cipla", "form": "Syrup", "cat": cat_anti, "batch": "ML26071", "exp": "12-27", "mrp": 52.03, "rate": 39.64, "pack": "1", "qty": 1, "gst": 5.0, "hsn": "30042069"},
                {"name": "AZEE 200 DRY SYRUP 15ML", "generic": "Azithromycin Oral Suspension 200mg/5ml", "mfr": "Cipla", "form": "Syrup", "cat": cat_anti, "batch": "ML26217", "exp": "03-28", "mrp": 54.96, "rate": 41.62, "pack": "1", "qty": 1, "gst": 5.0, "hsn": "30042064"},
                {"name": "IBUGESIC SUSPENSION 100ML", "generic": "Ibuprofen Oral Suspension 100mg/5ml", "mfr": "Cipla", "form": "Syrup", "cat": cat_pain, "batch": "6SE0395", "exp": "04-29", "mrp": 23.64, "rate": 18.01, "pack": "1", "qty": 3, "gst": 5.0, "hsn": "30049063"},
                {"name": "CALPOL 250 SUSPENSION 60ML", "generic": "Paracetamol Paediatric Suspension 250mg/5ml", "mfr": "GlaxoSmithKline (GSK)", "form": "Syrup", "cat": cat_pain, "batch": "NA682", "exp": "02-28", "mrp": 42.84, "rate": 32.64, "pack": "1", "qty": 3, "gst": 5.0, "hsn": "30049069"}
            ]
        },

        # =========================================================================
        # 3. KANARA DISTRIBUTORS - Invoice #KJ2425/79837 (Date: 28/08/2026, 12 items)
        # =========================================================================
        {
            "supplier": sup_kanara,
            "inv": "KJ2425/79837",
            "items": [
                {"name": "OLOPAT EYE DROPS 5ML", "generic": "Olopatadine HCl Eye Drops 0.1%", "mfr": "Ajanta Pharma", "form": "Drops", "cat": cat_eye, "batch": "GT07226", "exp": "03-29", "mrp": 223.12, "rate": 170.00, "pack": "1", "qty": 1, "gst": 5.0, "hsn": "30049039"},
                {"name": "OPTIDEW EYE DROPS 10ML", "generic": "Carboxymethylcellulose Lubricant Eye Drops 0.5%", "mfr": "Ajanta Pharma", "form": "Drops", "cat": cat_eye, "batch": "GT08086", "exp": "04-28", "mrp": 324.69, "rate": 255.00, "pack": "1", "qty": 1, "gst": 5.0, "hsn": "30049099"},
                {"name": "MEGAHEAL GEL 15GM", "generic": "Colloidal Silver Topical Wound Gel 32ppm", "mfr": "Aristo Pharmaceuticals", "form": "Ointment", "cat": cat_derm, "batch": "VAB2665", "exp": "04-28", "mrp": 135.93, "rate": 103.57, "pack": "1", "qty": 2, "gst": 5.0, "hsn": "30059090"},
                {"name": "B-PROTIN POWDER (V/F) 500GM", "generic": "Protein Nutritional Powder Vanilla Flavor", "mfr": "British Biologicals", "form": "Powder", "cat": cat_vit, "batch": "BPVAE2603", "exp": "04-28", "mrp": 663.00, "rate": 505.14, "pack": "1", "qty": 1, "gst": 5.0, "hsn": "19019010"},
                {"name": "B-PROTIN CF POWDER 500GM", "generic": "Protein Nutritional Powder Chocolate Flavor", "mfr": "British Biologicals", "form": "Powder", "cat": cat_vit, "batch": "DPDHE2605", "exp": "05-28", "mrp": 652.00, "rate": 496.76, "pack": "1", "qty": 1, "gst": 5.0, "hsn": "21069091"},
                {"name": "OTOGESIC EAR DROPS 10ML", "generic": "Chlorbutol, Benzocaine & Paradichlorobenzene", "mfr": "JRS Pharma", "form": "Drops", "cat": cat_eye, "batch": "DMM22ABB", "exp": "08-27", "mrp": 205.73, "rate": 156.74, "pack": "1", "qty": 1, "gst": 5.0, "hsn": "30049035"},
                {"name": "FLUTIWAYS NASAL SPRAY 16GM", "generic": "Fluticasone Propionate Aqueous Nasal Spray", "mfr": "Mankind Pharma", "form": "Drops", "cat": cat_resp, "batch": "A1LVZ009", "exp": "02-28", "mrp": 534.28, "rate": 407.07, "pack": "1", "qty": 1, "gst": 5.0, "hsn": "30049035"},
                {"name": "VOMIKIND MD 4 TABS 10'S", "generic": "Ondansetron Orally Disintegrating Tablets 4mg", "mfr": "Mankind Pharma", "form": "Tablet", "cat": cat_gastro, "batch": "D45Z008", "exp": "02-28", "mrp": 48.11, "rate": 36.66, "pack": "10'S", "qty": 2, "gst": 5.0, "hsn": "30049069"},
                {"name": "NASIVION S NASAL DROPS 10ML", "generic": "Oxymetazoline HCl Paediatric Drops 0.025%", "mfr": "Procter & Gamble", "form": "Drops", "cat": cat_resp, "batch": "6096C84601", "exp": "03-28", "mrp": 72.49, "rate": 55.23, "pack": "1", "qty": 1, "gst": 5.0, "hsn": "30049069"},
                {"name": "TEAR DROPS EYE DROPS 10ML", "generic": "Carboxymethylcellulose & Glycerin Lubricant Drops", "mfr": "Sun Pharma", "form": "Drops", "cat": cat_eye, "batch": "GTH1666C", "exp": "04-28", "mrp": 132.13, "rate": 100.67, "pack": "1", "qty": 1, "gst": 5.0, "hsn": "30049099"},
                {"name": "CILIZEX 10 TABS 10'S", "generic": "Cilnidipine Tablets 10mg", "mfr": "Sun Pharma", "form": "Tablet", "cat": cat_cardio, "batch": "TT26-698", "exp": "04-28", "mrp": 73.00, "rate": 55.62, "pack": "10'S", "qty": 1, "gst": 5.0, "hsn": "30049099"},
                {"name": "BETADINE SOLUTION 100ML", "generic": "Povidone Iodine Antiseptic Solution 10% w/v", "mfr": "Win-Medicare", "form": "Syrup", "cat": cat_derm, "batch": "MF03926", "exp": "05-28", "mrp": 103.95, "rate": 83.16, "pack": "1", "qty": 1, "gst": 5.0, "hsn": "30049087"}
            ]
        },

        # =========================================================================
        # 4. A.K PHARMA - Invoice #260007300253116 (Date: 28-08-2026, 11 items)
        # =========================================================================
        {
            "supplier": sup_ak,
            "inv": "260007300253116",
            "items": [
                {"name": "CARDACE 2.5 MG TABS 15'S", "generic": "Ramipril Tablets 2.5mg", "mfr": "Emcure Pharmaceuticals", "form": "Tablet", "cat": cat_cardio, "batch": "50AV025", "exp": "10-28", "mrp": 83.48, "rate": 63.60, "pack": "15'S", "qty": 1, "gst": 5.0, "hsn": "30049071"},
                {"name": "DAROLAC SYRUP 30ML", "generic": "Lactobacillus, Zinc & Prebiotic Oral Suspension", "mfr": "Aristo Pharmaceuticals", "form": "Syrup", "cat": cat_gastro, "batch": "SAB2604", "exp": "08-27", "mrp": 186.85, "rate": 142.36, "pack": "1", "qty": 1, "gst": 5.0, "hsn": "21069092"},
                {"name": "MONOCEF O CV 200MG TAB 10'S", "generic": "Cefpodoxime Proxetil 200mg & Potassium Clavulanate 125mg", "mfr": "Aristo Pharmaceuticals", "form": "Tablet", "cat": cat_anti, "batch": "BPD26061", "exp": "09-27", "mrp": 374.06, "rate": 285.00, "pack": "10'S", "qty": 2, "gst": 5.0, "hsn": "30042019"},
                {"name": "ALLEGRA M TAB 10'S", "generic": "Fexofenadine HCl 120mg & Montelukast Sodium 10mg", "mfr": "Sanofi India", "form": "Tablet", "cat": cat_resp, "batch": "6GAA034", "exp": "04-28", "mrp": 301.30, "rate": 229.56, "pack": "10'S", "qty": 2, "gst": 5.0, "hsn": "30049039"},
                {"name": "BILOVAS TABS 10'S", "generic": "Bilastine Tablets 20mg", "mfr": "Zydus Healthcare", "form": "Tablet", "cat": cat_resp, "batch": "IB00121A", "exp": "01-29", "mrp": 327.19, "rate": 249.29, "pack": "10'S", "qty": 1, "gst": 5.0, "hsn": "30049039"},
                {"name": "ANXIT 0.25 MG TABS 15'S", "generic": "Alprazolam Tablets 0.25mg", "mfr": "Micro Labs", "form": "Tablet", "cat": cat_neuro, "batch": "AXAS0086", "exp": "02-29", "mrp": 26.50, "rate": 20.19, "pack": "15'S", "qty": 2, "gst": 5.0, "hsn": "30049089"},
                {"name": "BILASHINE 20 MG TAB 10'S", "generic": "Bilastine Tablets 20mg", "mfr": "Sun Pharma / Ranbaxy", "form": "Tablet", "cat": cat_resp, "batch": "SIH0472A", "exp": "02-28", "mrp": 171.00, "rate": 130.29, "pack": "10'S", "qty": 2, "gst": 5.0, "hsn": "30049039"},
                {"name": "CARDIVAS 12.5 TABS 15'S", "generic": "Carvedilol Tablets 12.5mg", "mfr": "Sun Pharma", "form": "Tablet", "cat": cat_cardio, "batch": "GTH1641A", "exp": "05-28", "mrp": 151.05, "rate": 115.08, "pack": "15'S", "qty": 2, "gst": 5.0, "hsn": "30049079"},
                {"name": "ANXIT 0.5 MG TABS 15'S", "generic": "Alprazolam Tablets 0.5mg", "mfr": "Micro Labs", "form": "Tablet", "cat": cat_neuro, "batch": "AXBS0110", "exp": "03-29", "mrp": 57.50, "rate": 43.81, "pack": "15'S", "qty": 2, "gst": 5.0, "hsn": "30049089"},
                {"name": "UBEXA 40 TABS 15'S", "generic": "Febuxostat Tablets 40mg", "mfr": "Lupin", "form": "Tablet", "cat": cat_pain, "batch": "JC01607", "exp": "05-28", "mrp": 305.70, "rate": 232.91, "pack": "15'S", "qty": 1, "gst": 5.0, "hsn": "30049099"},
                {"name": "VOMISTOP 10MG TAB 10'S", "generic": "Domperidone Tablets 10mg", "mfr": "Cipla", "form": "Tablet", "cat": cat_gastro, "batch": "G25VSA0011", "exp": "08-27", "mrp": 24.67, "rate": 18.79, "pack": "10'S", "qty": 2, "gst": 5.0, "hsn": "30049039"}
            ]
        },

        # =========================================================================
        # 5. A.K PHARMA - Invoice #260007300253258 (Date: 28-08-2026, 3 items)
        # =========================================================================
        {
            "supplier": sup_ak,
            "inv": "260007300253258",
            "items": [
                {"name": "ZADONASE TAB 10'S", "generic": "Ketotifen Tablets 1mg", "mfr": "Alkem Laboratories", "form": "Tablet", "cat": cat_resp, "batch": "26441052", "exp": "02-28", "mrp": 237.15, "rate": 180.69, "pack": "10'S", "qty": 4, "gst": 5.0, "hsn": "30049039"},
                {"name": "CEFODEM-XP 325MG TAB 10'S", "generic": "Cefpodoxime Proxetil 200mg & Potassium Clavulanate 125mg", "mfr": "Sun Pharma / Ranbaxy", "form": "Tablet", "cat": cat_anti, "batch": "DFH2176A", "exp": "09-27", "mrp": 393.00, "rate": 299.43, "pack": "10'S", "qty": 3, "gst": 5.0, "hsn": "30042011"},
                {"name": "HAPPIBIOTIC CAPSULE 5S", "generic": "Rabeprazole Sodium & Multi-Strain Probiotics", "mfr": "Zydus Healthcare", "form": "Capsule", "cat": cat_gastro, "batch": "IB00925A", "exp": "09-27", "mrp": 155.41, "rate": 118.41, "pack": "5'S", "qty": 2, "gst": 5.0, "hsn": "30049099"}
            ]
        },

        # =========================================================================
        # 6. AAMISH TRADERS - Invoice #INV 194 (Date: 28-08-2026, 6 items)
        # =========================================================================
        {
            "supplier": sup_aamish,
            "inv": "194",
            "items": [
                {"name": "COLGATE MW COMPLETE CARE 250ML", "generic": "Colgate Plax Complete Care Antibacterial Mouthwash 250ml", "mfr": "Colgate-Palmolive", "form": "Other", "cat": cat_oral, "batch": "AAM194-01", "exp": "08-28", "mrp": 210.00, "rate": 161.78, "pack": "1", "qty": 1, "gst": 18.0, "hsn": "33069000"},
                {"name": "COLGATE MW FRESH TEA 250ML", "generic": "Colgate Plax Fresh Tea Antibacterial Mouthwash 250ml", "mfr": "Colgate-Palmolive", "form": "Other", "cat": cat_oral, "batch": "AAM194-02", "exp": "08-28", "mrp": 210.00, "rate": 161.78, "pack": "1", "qty": 1, "gst": 18.0, "hsn": "33069000"},
                {"name": "COLGATE MW PEPPERMINT 250ML", "generic": "Colgate Plax Peppermint Fresh Antibacterial Mouthwash 250ml", "mfr": "Colgate-Palmolive", "form": "Other", "cat": cat_oral, "batch": "AAM194-03", "exp": "08-28", "mrp": 210.00, "rate": 161.78, "pack": "1", "qty": 1, "gst": 18.0, "hsn": "33069000"},
                {"name": "COLGATE MW FRESHMINT 100ML", "generic": "Colgate Plax Fresh Mint Mouthwash 100ml", "mfr": "Colgate-Palmolive", "form": "Other", "cat": cat_oral, "batch": "AAM194-04", "exp": "08-28", "mrp": 88.00, "rate": 67.72, "pack": "1", "qty": 3, "gst": 18.0, "hsn": "33069000"},
                {"name": "COLGATE MW FRESHTEA 100ML", "generic": "Colgate Plax Fresh Tea Mouthwash 100ml", "mfr": "Colgate-Palmolive", "form": "Other", "cat": cat_oral, "batch": "AAM194-05", "exp": "08-28", "mrp": 88.00, "rate": 67.79, "pack": "1", "qty": 3, "gst": 18.0, "hsn": "33069000"},
                {"name": "COLGATE MW PEPPERMINT 100ML", "generic": "Colgate Plax Peppermint Mouthwash 100ml", "mfr": "Colgate-Palmolive", "form": "Other", "cat": cat_oral, "batch": "AAM194-06", "exp": "08-28", "mrp": 88.00, "rate": 67.79, "pack": "1", "qty": 3, "gst": 18.0, "hsn": "33069000"}
            ]
        }
    ]

    total_imported_items = 0
    total_imported_packs = 0
    total_purchase_val = Decimal("0.00")
    total_mrp_val = Decimal("0.00")

    for inv_data in all_invoices_data:
        sup = inv_data["supplier"]
        inv_no = inv_data["inv"]
        items = inv_data["items"]
        print(f"\n[*] Processing Invoice #{inv_no} from {sup.name} ({len(items)} items)...")

        for item in items:
            med_name = item["name"].strip()
            med, created_med = Medicine.objects.get_or_create(
                name=med_name,
                defaults={
                    "generic_name": item.get("generic", ""),
                    "manufacturer": item.get("mfr", ""),
                    "dosage_form": item.get("form", "Tablet"),
                    "category": item.get("cat"),
                    "hsn_code": item.get("hsn", "3004"),
                    "gst_rate": Decimal(str(item.get("gst", 5.0))),
                    "min_stock_alert": 5,
                    "is_active": True
                }
            )
            if not created_med:
                if item.get("generic") and not med.generic_name:
                    med.generic_name = item.get("generic")
                if item.get("mfr") and not med.manufacturer:
                    med.manufacturer = item.get("mfr")
                if item.get("cat"):
                    med.category = item.get("cat")
                if item.get("form"):
                    med.dosage_form = item.get("form")
                med.gst_rate = Decimal(str(item.get("gst", 5.0)))
                med.hsn_code = item.get("hsn", med.hsn_code or "3004")
                med.save()

            exp_date = parse_expiry(item["exp"])
            pack_sz = parse_pack_size(item["pack"])
            mrp_val = Decimal(str(item["mrp"]))
            pur_val = Decimal(str(item["rate"]))
            qty_val = int(item["qty"])

            # Check if this batch already exists for this medicine
            batch, created_batch = Batch.objects.get_or_create(
                medicine=med,
                batch_number=item["batch"].strip(),
                defaults={
                    "supplier": sup,
                    "expiry_date": exp_date,
                    "purchase_price": pur_val,
                    "mrp": mrp_val,
                    "selling_price": mrp_val,
                    "pack_size": pack_sz,
                    "pack_quantity": qty_val,
                    "loose_quantity": 0
                }
            )

            if not created_batch:
                # Add quantity to existing batch
                batch.pack_quantity += qty_val
                batch.supplier = sup
                batch.expiry_date = exp_date
                batch.purchase_price = pur_val
                batch.mrp = mrp_val
                batch.selling_price = mrp_val
                batch.pack_size = pack_sz
                batch.save()

            # Record StockMovement
            ref_str = f"INV-{inv_no}"
            StockMovement.objects.create(
                batch=batch,
                movement_type='PURCHASE',
                quantity_packs=qty_val,
                quantity_loose=0,
                reference_id=ref_str,
                notes=f"Stock Inward from {sup.name} Inv #{inv_no} on 2026-08-29"
            )

            cost_total = pur_val * qty_val
            mrp_total = mrp_val * qty_val
            total_purchase_val += cost_total
            total_mrp_val += mrp_total
            total_imported_packs += qty_val
            total_imported_items += 1

            print(f"  + [{med.dosage_form[:4].upper()}] {med.name:<32} | Batch: {batch.batch_number:<12} | Exp: {exp_date} | Qty: {qty_val:>2} | Cost: Rs.{pur_val:>7.2f} | MRP: Rs.{mrp_val:>7.2f}")

    print("\n" + "=" * 80)
    print("INVENTORY INGESTION SUMMARY REPORT")
    print("=" * 80)
    print(f" Total Invoices Processed  : {len(all_invoices_data)}")
    print(f" Total Line Items Imported : {total_imported_items}")
    print(f" Total Stock Packs Added   : {total_imported_packs}")
    print(f" Total Purchase / Cost     : Rs. {total_purchase_val:,.2f}")
    print(f" Total Retail MRP Value    : Rs. {total_mrp_val:,.2f}")
    print("=" * 80)
    print("[SUCCESS] All stock items from today's bills have been successfully added to the database!")

if __name__ == '__main__':
    import_todays_bills()
