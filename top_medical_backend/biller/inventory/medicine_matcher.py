import re
from inventory.models import Medicine, Category

def clean_string(s):
    if not s:
        return ""
    # Strip whitespace, collapse multi-spaces
    return re.sub(r'\s+', ' ', str(s).strip())

def normalize_units(text):
    if not text:
        return ""
    # Normalize spacing between digits and units: e.g. "80 ML" -> "80ML", "650 MG" -> "650MG", "10 GM" -> "10GM"
    text = re.sub(r'(\d+)\s*(ML|MG|GM|G|MCG|IU|KG|L|LTR|PERCENT|%)\b', r'\1\2', text, flags=re.IGNORECASE)
    # Also normalize "0.5 MG" -> "0.5MG"
    text = re.sub(r'(\d+\.\d+)\s*(ML|MG|GM|G|MCG|IU|KG|L|LTR|PERCENT|%)\b', r'\1\2', text, flags=re.IGNORECASE)
    return text

def extract_canonical_tokens(name):
    if not name:
        return ""
    n = name.strip().upper()
    n = re.sub(r'[\'"`]', '', n)
    n = normalize_units(n)
    
    # Remove common pharma suffixes and packaging phrases
    n = re.sub(r'\b(TABLETS|TABLET|TABS|TAB|CAPSULES|CAPSULE|CAPS|CAP|SYRUP|SUSPENSION|SUSP|SYP|DROPS|DROP|INHALER|RESPULES|OINTMENT|OINT|CREAM|CRM|GEL|LOTION|LOT|INJECTION|INJ|POWDER|PWD|SACHET|SAC|DEVICE|KIT|SOLUTION|SOL)\b', ' ', n)
    
    # Remove pack counters like 10'S, 15S, 10S, 30S, 100S, 1'S, 1S, 10TAB, etc.
    n = re.sub(r'\b\d+\s*(S|NOS|PCS|TABS|CAPS|STRIP|STRIPS)\b', ' ', n)
    
    # Clean punctuation symbols
    n = re.sub(r'[()\[\]\-_,./+:*#&|\\]', ' ', n)
    n = re.sub(r'\s+', ' ', n).strip()
    return n

def get_compact_key(name):
    """Produces an alphanumeric-only lowercase string without spaces for exact fuzzy matching."""
    if not name:
        return ""
    canon = extract_canonical_tokens(name)
    return re.sub(r'[^A-Z0-9]', '', canon.upper())

def find_existing_medicine(name, dosage_form=None, barcode=None):
    """
    Intelligently searches for an existing medicine to prevent duplicates.
    Lookup Hierarchy:
    1. Barcode match (if provided)
    2. Exact match (case-insensitive)
    3. Alphanumeric compact match (ignores spaces, punctuation, units spacing)
    4. Canonical token match
    5. Token-set containment match
    6. Prefix / Suffix normalized match
    """
    if not name or not str(name).strip():
        return None

    clean_name = clean_string(name)
    compact_query = get_compact_key(clean_name)
    canonical_query = extract_canonical_tokens(clean_name)

    # 1. Barcode Match
    if barcode:
        barcode_clean = str(barcode).strip()
        if barcode_clean:
            med_by_barcode = Medicine.objects.filter(barcode=barcode_clean, is_active=True).first()
            if med_by_barcode:
                return med_by_barcode

    # 2. Exact Match (case-insensitive)
    med_exact = Medicine.objects.filter(name__iexact=clean_name).first()
    if med_exact:
        return med_exact

    # 3. Compact Alphanumeric Match (checks if names match ignoring all spaces & punctuation)
    if compact_query and len(compact_query) >= 3:
        all_meds = Medicine.objects.filter(is_active=True)
        if dosage_form:
            form_meds = all_meds.filter(dosage_form__iexact=dosage_form.strip())
            if form_meds.exists():
                all_meds = form_meds

        for cand in all_meds:
            cand_compact = get_compact_key(cand.name)
            if cand_compact == compact_query:
                return cand

        # 4. Canonical Token Match
        for cand in all_meds:
            cand_canon = extract_canonical_tokens(cand.name)
            if cand_canon and cand_canon == canonical_query:
                return cand

        # 5. Token-set containment (if all non-trivial tokens in query are present in candidate or vice versa)
        query_words = set(w for w in canonical_query.split() if len(w) >= 2)
        if len(query_words) >= 2:
            for cand in all_meds:
                cand_words = set(w for w in extract_canonical_tokens(cand.name).split() if len(w) >= 2)
                if cand_words and (query_words == cand_words or query_words.issubset(cand_words) or cand_words.issubset(query_words)):
                    return cand

        # 6. Prefix / starts-with matching for longer names
        for cand in all_meds:
            cand_compact = get_compact_key(cand.name)
            if cand_compact and len(compact_query) > 5 and len(cand_compact) > 5:
                if cand_compact.startswith(compact_query) or compact_query.startswith(cand_compact):
                    return cand

    return None
