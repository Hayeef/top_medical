import re
from inventory.models import Medicine, Category

def clean_string(s):
    if not s:
        return ""
    # Strip whitespace, collapse multi-spaces
    return re.sub(r'\s+', ' ', str(s).strip())

def extract_canonical_tokens(name):
    if not name:
        return ""
    n = name.strip().upper()
    n = re.sub(r'[\'"]', '', n)
    # Remove common pharma suffixes and packaging phrases
    n = re.sub(r'\b(TABLETS|TABLET|TABS|TAB|CAPSULES|CAPSULE|CAPS|CAP|SYRUP|SUSPENSION|SUSP|SYP|DROPS|DROP|INHALER|RESPULES|OINTMENT|CREAM|GEL|LOTION|INJECTION|INJ|POWDER|SACHET|SAC|DEVICE|KIT)\b', '', n)
    # Remove pack counters like 10'S, 15S, 10S, 30S, 100S, 1'S, 1S
    n = re.sub(r'\b\d+\s*(S|NOS|PCS|TABS|CAPS|STRIP|STRIPS)\b', '', n)
    # Clean punctuation symbols
    n = re.sub(r'[()\[\]\-_,./+:]', ' ', n)
    n = re.sub(r'\s+', ' ', n).strip()
    return n

def find_existing_medicine(name, dosage_form=None, barcode=None):
    """
    Intelligently searches for an existing medicine to prevent duplicates.
    Lookup Hierarchy:
    1. Barcode match (if provided)
    2. Exact match (case-insensitive)
    3. Cleaned token / canonical name match
    4. Prefix / Suffix normalized match
    """
    if not name or not str(name).strip():
        return None

    clean_name = clean_string(name)

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

    # 3. Canonical Token Match
    canonical_query = extract_canonical_tokens(clean_name)
    if canonical_query and len(canonical_query) >= 3:
        # Check against active medicines
        candidates = Medicine.objects.filter(is_active=True)
        if dosage_form:
            form_candidates = candidates.filter(dosage_form__iexact=dosage_form.strip())
            if form_candidates.exists():
                candidates = form_candidates

        # First pass: canonical exact match
        for cand in candidates:
            cand_canon = extract_canonical_tokens(cand.name)
            if cand_canon == canonical_query:
                return cand

        # Second pass: candidate starts with or contains query with high similarity
        for cand in candidates:
            cand_canon = extract_canonical_tokens(cand.name)
            if cand_canon and (cand_canon == canonical_query or 
                (len(canonical_query) > 5 and cand_canon.startswith(canonical_query)) or
                (len(cand_canon) > 5 and canonical_query.startswith(cand_canon))):
                return cand

    return None
