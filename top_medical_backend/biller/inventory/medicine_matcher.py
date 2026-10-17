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
    exact_matches = Medicine.objects.filter(name__iexact=clean_name, is_active=True)
    if exact_matches.exists():
        if dosage_form and str(dosage_form).strip():
            form_match = exact_matches.filter(dosage_form__iexact=str(dosage_form).strip()).first()
            if form_match:
                return form_match
        return exact_matches.first()

    # 3. Compact Alphanumeric Match (checks if names match ignoring all spaces & punctuation)
    if compact_query and len(compact_query) >= 3:
        all_meds = list(Medicine.objects.filter(is_active=True))

        def pick_best(candidates):
            if not candidates:
                return None
            if dosage_form and str(dosage_form).strip():
                df_lower = str(dosage_form).strip().lower()
                for c in candidates:
                    if (c.dosage_form or '').strip().lower() == df_lower:
                        return c
            return candidates[0]

        # 3a. Exact compact key matches
        compact_matches = [cand for cand in all_meds if get_compact_key(cand.name) == compact_query]
        best = pick_best(compact_matches)
        if best:
            return best

        # 4. Canonical Token Match
        canon_matches = [cand for cand in all_meds if extract_canonical_tokens(cand.name) == canonical_query]
        best = pick_best(canon_matches)
        if best:
            return best

        # 5. Token-set containment (if all non-trivial tokens in query are present in candidate or vice versa)
        query_words = set(w for w in canonical_query.split() if len(w) >= 2)
        if len(query_words) >= 2:
            token_matches = []
            for cand in all_meds:
                cand_words = set(w for w in extract_canonical_tokens(cand.name).split() if len(w) >= 2)
                if cand_words and (query_words == cand_words or query_words.issubset(cand_words) or cand_words.issubset(query_words)):
                    token_matches.append(cand)
            best = pick_best(token_matches)
            if best:
                return best

        # 6. Prefix / starts-with matching for longer names
        if len(compact_query) > 5:
            prefix_matches = []
            for cand in all_meds:
                cand_compact = get_compact_key(cand.name)
                if cand_compact and len(cand_compact) > 5:
                    if cand_compact.startswith(compact_query) or compact_query.startswith(cand_compact):
                        prefix_matches.append(cand)
            best = pick_best(prefix_matches)
            if best:
                return best

    return None
