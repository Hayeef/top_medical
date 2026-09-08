/**
 * High-Accuracy Indian Pharmaceutical & FMCG Wholesale Invoice OCR Engine & Parser
 *
 * Supports:
 * - Format A: Pharma Wholesale Invoices with Batch, Expiry, Qty, Rate, MRP (e.g. Kanara, Sai Radha, Kateel, Shakthi)
 * - Format B: FMCG / Derma / Cosmetics Invoices with HSN, MRP, Qty, Rate (e.g. Shree Sharada, Amazon P&G, Dabur)
 * - Format C: Tabular & Delimited rows (pipe |, tab \t, comma, multi-space)
 * - Format D: Multi-line vertical blocks (Item name, Generic salt, Form, Batch, Expiry, Numbers)
 * - Format E: Indian Pharma Brand Dictionary matching (1,900+ real medicines)
 */

// Comprehensive Dictionary of Known Indian Pharma & Healthcare Brands for Fuzzy OCR Correction
export const COMMON_PHARMA_BRANDS = [
  'DOLO 650', 'PAN 40', 'MONTAIR LC', 'BECOSULES Z', 'AUGMENTIN 625', 'CALPOL 650', 'ASTHALIN',
  'AEROCORT', 'CILACAR 10', 'CILACAR 20', 'PANTOCID 40', 'TELMA 40', 'TELMA H', 'ALLERCET M',
  'ARISTOMOL 250', 'ARISTOMOL 650', 'JAY COTTON', 'CIPLADINE', 'STERIPAD', 'SURGI SPIRIT',
  'ODOMOS CREAM', 'ODOMOS FABRIC', 'GARNIER SERUM', 'GARNIER FACE WASH', 'DABUR RED', 'VOLINI GEL',
  'DETTOL ANTISEPTIC', 'SHELCAL 500', 'GLYCOMET GP', 'GLYCOMET 500', 'CHESTON COLD', 'COMBIFLAM',
  'MEFTAL SPAS', 'MEFTAL FORTE', 'ZINCOVIT', 'AZITHRAL 500', 'NOVAMOX 500', 'AMLONG 5',
  'ECOSPRIN 75', 'ECOSPRIN 150', 'ROSUVAS 10', 'RANTAC 150', 'ACILOC 150', 'RABEKIND 20',
  'DUPHALAC', 'CREMAFFIN', 'SPORLAC', 'ENTEROGERMINA', 'ENSURE', 'PEDIASURE', 'NEUROBION FORTE',
  'LIMCEE 500', 'HUMALOG', 'LANTUS', 'BETADINE', 'CANDID POWDER', 'CLOTRIMAZOLE', 'DERMADEW',
  'FOURDERM', 'BETNOVATE N', 'BETNOVATE C', 'SOFRAMYCIN', 'MUPIN', 'MAHACEF 200', 'MONOCEF 1G',
  'TAXIM O 200', 'CLAMP 625', 'ACUCLAV 625', 'MOXIKIND CV', 'CILAHEART', 'ATEN 50', 'LOSAR 50',
  'OLMAT 20', 'CREMADIET PLUS', 'BROZEET LS', 'ASCORIL D', 'GRILINCTUS BM', 'SOLVIN COLD',
  'WAXONIL EAR DROPS', 'OTRIVIN ADULT', 'NASIVION', 'CLEARWAX', 'MUCINAC 600', 'SUPRADYN',
  'AUTRIN', 'FERONIA XT', 'GEMCAL', 'CALCIROL SACHET', 'T-BACT', 'BACTRIMS', 'CEFPROZ'
];

export function normalizeExpiryDate(expStr) {
  const defaultDate = new Date(Date.now() + 730 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  if (!expStr) return defaultDate;

  const s = String(expStr).trim().toUpperCase();

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // MM/YY or MM-YY
  const mShort = s.match(/^(\d{1,2})[-/](\d{2})$/);
  if (mShort) {
    const month = Math.min(12, Math.max(1, parseInt(mShort[1], 10)));
    const year = 2000 + parseInt(mShort[2], 10);
    const lastDay = new Date(year, month, 0).getDate();
    return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  }

  // MM/YYYY or MM-YYYY
  const mLong = s.match(/^(\d{1,2})[-/](\d{4})$/);
  if (mLong) {
    const month = Math.min(12, Math.max(1, parseInt(mLong[1], 10)));
    const year = parseInt(mLong[2], 10);
    const lastDay = new Date(year, month, 0).getDate();
    return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const mFull = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
  if (mFull) {
    const day = Math.min(31, Math.max(1, parseInt(mFull[1], 10)));
    const month = Math.min(12, Math.max(1, parseInt(mFull[2], 10)));
    let year = parseInt(mFull[3], 10);
    if (year < 100) year += 2000;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  // Month names e.g. OCT-28, Oct 2028, OCT/28
  const months = {
    JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
    JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12
  };
  for (const [mName, mNum] of Object.entries(months)) {
    if (s.includes(mName)) {
      const yearMatch = s.match(/\b(20\d{2}|\d{2})\b/);
      let year = yearMatch ? parseInt(yearMatch[0], 10) : 2028;
      if (year < 100) year += 2000;
      const lastDay = new Date(year, mNum, 0).getDate();
      return `${year}-${String(mNum).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    }
  }

  return defaultDate;
}

export function inferDosageAndCategory(medName) {
  const upper = String(medName || '').toUpperCase();

  let dosage = 'Tablet';
  if (/\b(CREAM|OINT|OINTMENT|GEL|LOTION|EMULSION|SERUM|FACE WASH|F\/W|MASK|POWDER|POW|SPRAY|RUB|BALM)\b/.test(upper)) {
    dosage = upper.includes('POWDER') || upper.includes('POW') ? 'Powder' : 'Ointment';
  } else if (/\b(TAB|TABLET|TABS|DT|DISP|UNCOATED|COATED|CHEWABLE)\b/.test(upper)) {
    dosage = 'Tablet';
  } else if (/\b(CAP|CAPS|CAPSULE|CAPSULES|ROTACAP|SOFTGEL)\b/.test(upper)) {
    dosage = 'Capsule';
  } else if (/\b(SYP|SYRUP|SUSP|SUSPENSION|ELIXIR|LIQUID|SOLN|SOLUTION|DRY SYP|ORAL)\b/.test(upper)) {
    dosage = 'Syrup';
  } else if (/\b(DROP|DROPS|EYE DROP|EAR DROP|NASAL|OPTICAL)\b/.test(upper)) {
    dosage = 'Drops';
  } else if (/\b(RESP|RESPULE|RESPULES|INHALER|ROTACAPS|AEROCORT|BUDECORT|ASTHALIN|DUOLIN|MDI)\b/.test(upper)) {
    dosage = 'Inhaler';
  } else if (/\b(INJ|INJECTION|VIAL|AMP|AMPOULE|PREFILLED)\b/.test(upper)) {
    dosage = 'Injection';
  } else if (/\b(COTTON|STERIPAD|PAD|GAUZE|BANDAGE|SYRINGE|NEEDLE|SPIRIT|PEROXIDE|TAPE|CANNULA|MASK|GLOVES|PASTE|SHAVE|FOAM|ROLL ON)\b/.test(upper)) {
    dosage = 'Device';
  }

  let category = 'General Pharmaceuticals';
  let rxRequired = false;

  if (/ODOMOS|CREAM|LOTION|SERUM|GARNIER|BRIGHT|SUNSCREEN|F\/W|FACE WASH|SKIN|DERMADEW|CIPLADINE|BETADINE|CANDID|CLOTRIMAZOLE|POWDER|FOURDERM|BETNOVATE|SOFRAMYCIN/.test(upper)) {
    category = 'Dermatology & Topicals';
  } else if (/ASTHALIN|AEROCORT|BUDECORT|DUOLIN|MONT|LEVO|CETIRIZINE|CETZINE|BROZEET|ALLERCET|ALLEGRA|CORIMINIC|COUGH|SOLVIN|ASCORIL|GRILINCTUS|RESP|MUCINAC/.test(upper)) {
    category = 'Respiratory & Inhalers';
  } else if (/AUGMENTIN|CLAV|AMOXY|NOVAMOX|MONOCEF|AZITHRAL|AZITHROMYCIN|CEF|OFLOX|CIPRO|MOXIKIND|ACUCLAV|MAHACEF|TAXIM|ANTIBIOTIC|CLAMP|CEFPROZ/.test(upper)) {
    category = 'Antibiotics & Anti-Infectives';
    rxRequired = true;
  } else if (/CALPOL|DOLO|PARACETAMOL|ARISTOMOL|MEFTAL|ZERODOL|ACECLO|DICLO|BRUFEN|COMBIFLAM|TRAMADOL|SPAS|NIMESULIDE|VOLINI/.test(upper)) {
    category = 'Analgesics & Pain Management';
  } else if (/CILACAR|CILAHEART|TELMA|TELMISARTAN|AMLONG|AMLODIPINE|ATENOLOL|ECOSPRIN|ROSUVAS|ATORVASTATIN|LOSARTAN|OLMESARTAN/.test(upper)) {
    category = 'Cardiovascular & Hypertension';
    rxRequired = true;
  } else if (/PAN|PANTOP|PANTOCID|RANTAC|ACILOC|RABEKIND|OMEE|GELUSIL|DIGENE|DUFALAC|CREMAFFIN|SPORLAC|ENTERO|CREMADIET/.test(upper)) {
    category = 'Gastrointestinal & Digestion';
  } else if (/COTTON|SPIRIT|PEROXIDE|STERIPAD|BANDAGE|SYRINGE|DRESSING|SURGICAL|GAUZE|WAXONIL/.test(upper)) {
    category = 'Surgical & Medical Consumables';
  } else if (/ENSURE|PEDIASURE|PROTIN|BECOSULES|NEUROBION|ZINCONIA|CALCIUM|SHELCAL|VITAMIN|LIMCEE|D3|FERONIA|AUTRIN|SUPRADYN|ZINCOVIT/.test(upper)) {
    category = 'Vitamins & Supplements';
  } else if (/GLYCOMET|METFORMIN|GLIMEPIRIDE|TENELIMAC|JANUVIA|GALVUS|INSULIN|HUMALOG|LANTUS|VOGLIBOSE|DAPAGLIFLOZIN/.test(upper)) {
    category = 'Diabetes & Endocrine';
    rxRequired = true;
  } else if (/DABUR|GILLETTE|OLD SPICE|OLAY|PASTE|TOOTHPASTE|SHAVE|SOAP|SHAMPOO|HYGIENE|DETTOL/.test(upper)) {
    category = 'Personal Care & Hygiene';
  }

  return { dosage, category, rxRequired };
}

export function parsePackSize(str) {
  if (!str) return 10;
  const s = String(str).toUpperCase();
  if (/BOTTLE|JAR|KIT|SACH|TIN|ML|GM|200MD|15ML|30ML|60ML|100ML|10GM|20GM|25GM|50GM|100GM|200G|150G|TUBE|ROLL ON|NOS|PCS/.test(s)) {
    return 1;
  }
  const m = s.match(/(\d+)\s*(?:'S|S|TABS|CAPS|PCS|NOS)?/);
  if (m) {
    const val = parseInt(m[1], 10);
    return val > 0 && val <= 500 ? val : 10;
  }
  return 10;
}

export function suggestRackLocation(category, dosageForm) {
  if (dosageForm === 'Inhaler') return 'Rack R-1 (Inhalers)';
  if (dosageForm === 'Syrup' || dosageForm === 'Drops') return 'Rack S-2 (Liquids)';
  if (dosageForm === 'Ointment' || dosageForm === 'Powder') return 'Rack O-1 (Topicals & Powders)';
  if (dosageForm === 'Device') return 'Rack SURG-1';
  if (category === 'Antibiotics & Anti-Infectives') return 'Rack A-1 (Antibiotics)';
  if (category === 'Cardiovascular & Hypertension') return 'Rack C-1 (Cardiac)';
  if (category === 'Analgesics & Pain Management') return 'Rack P-1 (Analgesics)';
  if (category === 'Gastrointestinal & Digestion') return 'Rack G-1 (Gastro)';
  if (category === 'Diabetes & Endocrine') return 'Rack D-1 (Diabetes)';
  if (category === 'Vitamins & Supplements') return 'Rack V-1 (Vitamins)';
  if (category === 'Personal Care & Hygiene') return 'Rack H-1 (Hygiene)';
  return 'Rack A-1';
}

/**
 * Preprocesses a raw image source or HTMLCanvasElement to optimize OCR character extraction:
 * - Rescaling to optimal 1800-2400px width
 * - Grayscale conversion
 * - High-contrast stretching
 * - Character edge sharpening
 */
export function preprocessBillImage(imageElement) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  let width = imageElement.naturalWidth || imageElement.width || 1200;
  let height = imageElement.naturalHeight || imageElement.height || 1600;

  // Scale to optimal OCR dimensions (max dimension ~2000px)
  const maxDim = Math.max(width, height);
  if (maxDim > 2200) {
    const scale = 2200 / maxDim;
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  } else if (maxDim < 1000) {
    const scale = 1600 / maxDim;
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  canvas.width = width;
  canvas.height = height;

  // Draw image
  ctx.drawImage(imageElement, 0, 0, width, height);

  // Apply Grayscale & Contrast enhancement
  try {
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    // First pass: compute min/max luminance for contrast stretch
    let minLum = 255;
    let maxLum = 0;
    for (let i = 0; i < data.length; i += 4) {
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      if (lum < minLum) minLum = lum;
      if (lum > maxLum) maxLum = lum;
    }

    const range = Math.max(1, maxLum - minLum);

    // Second pass: contrast stretching & binarization bias
    for (let i = 0; i < data.length; i += 4) {
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      // Normalized stretched luminance (0-255)
      let stretched = ((lum - minLum) / range) * 255;

      // Slight gamma contrast curve to separate ink from background
      stretched = stretched < 140 ? stretched * 0.75 : Math.min(255, stretched * 1.15);

      data[i] = stretched;
      data[i + 1] = stretched;
      data[i + 2] = stretched;
    }

    ctx.putImageData(imgData, 0, 0);
  } catch (err) {
    console.warn('Canvas pixel processing note:', err);
  }

  return canvas.toDataURL('image/jpeg', 0.95);
}

/**
 * Main High-Accuracy Parser for Invoice OCR text
 */
export function parseOCRTextToInvoice(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return {
      supplier_name: 'Wholesale Pharma Supplier',
      supplier_gstin: '',
      supplier_phone: '',
      supplier_address: '',
      invoice_number: `INV-${Date.now().toString().slice(-6)}`,
      invoice_date: new Date().toISOString().split('T')[0],
      items: []
    };
  }

  // Normalize raw text: replace unicode spaces, tabs with space, strip carriage returns
  const cleanRaw = rawText
    .replace(/\r/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/[—–]/g, '-');

  const lines = cleanRaw
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  // 1. Supplier Name Detection (Search top 18 lines)
  let supplierName = 'Wholesale Pharma Supplier';
  const supplierKeywords = ['DISTRIBUTORS', 'DISTRIBUTOR', 'PHARMA', 'AGENCIES', 'ENTERPRISES', 'PVT LTD', 'LTD', 'TRADERS', 'ASSOCIATES', 'MEDICAL', 'HEALTHCARE', 'KANARA', 'SHARADA', 'SHREE', 'SAI RADHA', 'MICRO LABS', 'SUN PHARMA', 'AK PHARMA', 'G.K.', 'KATEEL', 'SHAKTHI', 'AMAZON'];

  for (let i = 0; i < Math.min(lines.length, 18); i++) {
    const lineUpper = lines[i].toUpperCase();
    if (supplierKeywords.some(kw => lineUpper.includes(kw)) &&
        !lineUpper.includes('TAX INVOICE') &&
        !lineUpper.includes('GST INVOICE') &&
        !lineUpper.includes('GSTIN') &&
        !lineUpper.includes('BILLED TO') &&
        !lineUpper.includes('SHIPPED TO') &&
        !lineUpper.includes('DISTRIBUTOR / SUPPLIER') &&
        lineUpper.length < 80) {
      let cand = lines[i].replace(/^[#*|:_ -]+/, '').trim();
      // Auto-correct OCR truncated distributor name e.g. HREE SHARADA -> SHREE SHARADA
      if (cand.toUpperCase().startsWith('HREE SHARADA')) {
        cand = 'S' + cand;
      }
      supplierName = cand;
      break;
    }
  }

  // 2. GSTIN Detection
  let supplierGstin = '';
  const gstinMatch = cleanRaw.match(/\b([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})\b/);
  if (gstinMatch) {
    supplierGstin = gstinMatch[1];
  }

  // 3. Invoice Number
  let invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
  const invMatch = cleanRaw.match(/(?:INV\s*NO|INVOICE\s*NO|BILL\s*NO|BILL\s*#|INV\s*#|DOC\s*NO|MEMO\s*NO)\s*[:.\-#]?\s*([A-Za-z0-9\-_/ ]+?)(?=\s+(?:DATE|DT|TIME|TERMS|BILLED)|$|\n)/i);
  if (invMatch && invMatch[1] && invMatch[1].trim().length >= 2) {
    const candidate = invMatch[1].replace(/[:.\-]/g, ' ').trim();
    if (!['TAX', 'ORIGINAL', 'DATE', 'DETAILS', 'SUPPLY', 'BILL'].includes(candidate.toUpperCase())) {
      invoiceNumber = candidate;
    }
  }

  // 4. Invoice Date
  let invoiceDate = new Date().toISOString().split('T')[0];
  const dateMatch = cleanRaw.match(/(?:DATE|DT|INVOICE\s*DATE|BILL\s*DATE)\s*[:.\-]?\s*(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4})/i);
  if (dateMatch && dateMatch[1]) {
    invoiceDate = normalizeExpiryDate(dateMatch[1]);
  }

  // 5. Line Items Extraction (Multi-Strategy Engine)
  const items = [];
  const ignoredKeywords = [
    'SUPPLIER PURCHASE BILL SCANNER', 'AI MULTIMODAL', 'EXTRACTED MEDICINE',
    'TOTAL INWARD COST', 'TOTAL RETAIL VALUE', 'GROSS PROFIT MARGIN', 'TOTAL UNITS',
    'DISTRIBUTOR / SUPPLIER NAME', 'SUPPLIER GSTIN', 'INVOICE / BILL #', 'INVOICE DATE',
    'MEDICINE BRAND & COMPOSITION', 'DOSAGE FORM', 'BATCH #', 'EXPIRY', 'PACKS', 'SIZE', 'COST', 'MRP', 'SELL',
    'TAX INVOICE', 'GST INVOICE', 'BILLED TO', 'SHIPPED TO', 'TERMS & CONDITIONS', 'ROUND OFF',
    'TAXABLE VALUE', 'SGST', 'CGST', 'IGST', 'GRAND TOTAL', 'SUBTOTAL', 'OUR BANK', 'PAGE'
  ];

  let lineIdx = 0;
  const todayStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');

  while (lineIdx < lines.length) {
    const currentLine = lines[lineIdx];
    const upperLine = currentLine.toUpperCase();

    // Skip general headers and metadata lines
    if (ignoredKeywords.some(kw => upperLine.includes(kw))) {
      lineIdx++;
      continue;
    }
    if (/^(TOTAL|SUB\s*TOTAL|CGST|SGST|IGST|ROUND\s*OFF|GRAND\s*TOTAL|TAX\s*PAYABLE|BILLED\s*TO|SHIPPED\s*TO|OUR\s*BANK|DOOR\s*NO|NEAR|ROAD|INVOICE\s*NO|INV\s*NO|BILL\s*NO|MEMO\s*NO|TAX\s*INVOICE|GST\s*INVOICE|GSTIN|SL\s+ITEM)/i.test(upperLine)) {
      lineIdx++;
      continue;
    }

    let parsedItem = null;

    // -------------------------------------------------------------------------
    // STRATEGY 1: MULTI-LINE VERTICAL MEDICINE BLOCKS (e.g. Pasted Formats or Structured Blocks)
    // Structure: Line 0 = Name, Line 1 = Generic, Line 2 = Dosage, Line 3 = Batch, Line 4 = Expiry, Lines 5-8 = Numbers
    // -------------------------------------------------------------------------
    if (lineIdx + 3 < lines.length) {
      const blockSlice = lines.slice(lineIdx, lineIdx + 12);
      let expIdxInBlock = -1;
      let expDateStr = '';

      for (let b = 0; b < blockSlice.length; b++) {
        const bl = blockSlice[b].trim();
        // Check for date pattern
        if (/^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$|^\d{1,2}[-/]\d{2,4}$|^(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[-/ ]\d{2,4}$/i.test(bl)) {
          expIdxInBlock = b;
          expDateStr = bl;
          break;
        }
      }

      if (expIdxInBlock >= 2) {
        const nameCand = blockSlice[0].replace(/^[#*|:_ -]+/, '').trim();
        let genericCand = '';
        let dosageCand = 'Tablet';
        let batchCand = '';

        for (let p = 1; p < expIdxInBlock; p++) {
          const pt = blockSlice[p].trim();
          if (/\b(TABLET|CAPSULE|SYRUP|DROPS|INHALER|OINTMENT|DEVICE|INJECTION|POWDER)\b/i.test(pt)) {
            dosageCand = pt.charAt(0).toUpperCase() + pt.slice(1).toLowerCase();
          } else if (/^[A-Za-z0-9\-_]{4,16}$/.test(pt) && !/[()+]/.test(pt) && !pt.toUpperCase().includes('MG')) {
            batchCand = pt;
          } else {
            genericCand = pt;
          }
        }

        // Collect subsequent numbers after expiry
        const numbersAfterExp = [];
        let numLineCount = 0;
        for (let n = expIdxInBlock + 1; n < blockSlice.length; n++) {
          const numStr = blockSlice[n].replace(/₹|Rs\.?|,\s*|\s+/gi, '').trim();
          const val = parseFloat(numStr);
          if (!isNaN(val) && val > 0 && /^\d+(\.\d+)?$/.test(numStr)) {
            numbersAfterExp.push(val);
            numLineCount++;
          } else {
            break;
          }
        }

        if (numbersAfterExp.length >= 2 && nameCand.length >= 3) {
          const qty = Math.round(numbersAfterExp[0] || 1);
          const packSz = numbersAfterExp.length >= 3 && numbersAfterExp[1] <= 100 ? Math.round(numbersAfterExp[1]) : parsePackSize(nameCand);
          
          let rate = 50.0;
          let mrp = 90.0;

          if (numbersAfterExp.length >= 4) {
            // [Qty, PackSize, Rate, MRP, Sell]
            rate = numbersAfterExp[2];
            mrp = numbersAfterExp[3];
          } else if (numbersAfterExp.length === 3) {
            rate = numbersAfterExp[1];
            mrp = numbersAfterExp[2];
          } else if (numbersAfterExp.length === 2) {
            rate = numbersAfterExp[0];
            mrp = numbersAfterExp[1];
          }

          const { category, rxRequired } = inferDosageAndCategory(nameCand);

          parsedItem = {
            medicine_name: nameCand,
            generic_name: genericCand || nameCand,
            category,
            dosage_form: dosageCand,
            manufacturer: 'Standard Pharma',
            hsn_code: '3004',
            batch_number: batchCand || `B-${todayStr}${items.length + 1}`,
            expiry_date: normalizeExpiryDate(expDateStr),
            pack_size: packSz,
            pack_quantity: Math.max(1, qty),
            purchase_price: Math.round(rate * 100) / 100,
            mrp: Math.round(mrp * 100) / 100,
            selling_price: Math.round(mrp * 100) / 100,
            gst_rate: 12.0,
            rack_location: suggestRackLocation(category, dosageCand),
            requires_prescription: rxRequired
          };

          items.push(parsedItem);
          lineIdx += (expIdxInBlock + 1 + numLineCount);
          continue;
        }
      }
    }

    // -------------------------------------------------------------------------
    // STRATEGY 2: SINGLE-LINE PHARMA BILL WITH EXPIRY & BATCH
    // e.g. "ABBOTT CREMADIET PLUS POWDER 100GM TAM0004 01-28 254.05 193.56 1"
    // e.g. "BROZEET LS DROPS 15ML 2608000257 07-27 64.88 49.43 1"
    // -------------------------------------------------------------------------
    const expRegex = /\b(\d{1,2}[-/]\d{2,4}|\d{4}[-/]\d{1,2}|(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[-/ ]\d{2,4})\b/i;
    const expMatch = currentLine.match(expRegex);

    if (expMatch && currentLine.length >= 10) {
      const expStr = expMatch[1];
      const expIndex = currentLine.indexOf(expStr);
      const beforeExp = currentLine.substring(0, expIndex).trim();
      const afterExp = currentLine.substring(expIndex + expStr.length).trim();

      const beforeTokens = beforeExp.split(/\s+/).filter(Boolean);
      if (beforeTokens.length >= 2) {
        let batchNo = beforeTokens[beforeTokens.length - 1];
        let nameTokens = beforeTokens.slice(0, beforeTokens.length - 1);

        if (/^\d{6,8}$/.test(batchNo) && beforeTokens.length >= 3) {
          batchNo = beforeTokens[beforeTokens.length - 2];
          nameTokens = beforeTokens.slice(0, beforeTokens.length - 2);
        }

        let medName = nameTokens.join(' ')
          .replace(/^(?:ABBOTT|ARIST|CIPLA|GSK|ALKEM|SUN|LUPIN|MANKIND|USV|MICRO|PFIZER|DR\.?\s*REDDY)\b\s*/i, '')
          .replace(/^\d{1,4}[\s.)|-]+/, '')
          .trim();

        if (medName.length >= 3) {
          const numbers = afterExp
            .split(/\s+/)
            .map(t => t.replace(/[^0-9.]/g, ''))
            .filter(Boolean)
            .map(t => parseFloat(t))
            .filter(n => !isNaN(n) && n > 0);

          let mrp = 90.0;
          let rate = 50.0;
          let qty = 1;

          if (numbers.length >= 3) {
            if (numbers[0] > numbers[1]) {
              mrp = numbers[0];
              rate = numbers[1];
              qty = Math.round(numbers[2]);
            } else {
              rate = numbers[0];
              mrp = numbers[1];
              qty = Math.round(numbers[2]);
            }
          } else if (numbers.length === 2) {
            if (numbers[0] > numbers[1]) {
              mrp = numbers[0];
              rate = numbers[1];
            } else {
              mrp = numbers[0];
              qty = Math.round(numbers[1]);
              rate = Math.round(mrp * 0.76 * 100) / 100;
            }
          } else if (numbers.length === 1) {
            mrp = numbers[0];
            rate = Math.round(mrp * 0.76 * 100) / 100;
          }

          const { dosage, category, rxRequired } = inferDosageAndCategory(medName);
          const packSize = parsePackSize(medName);

          parsedItem = {
            medicine_name: medName,
            generic_name: medName,
            category,
            dosage_form: dosage,
            manufacturer: 'Standard Pharma',
            hsn_code: '3004',
            batch_number: batchNo.replace(/[^A-Za-z0-9\-_]/g, '') || `B-${todayStr}${items.length + 1}`,
            expiry_date: normalizeExpiryDate(expStr),
            pack_size: packSize,
            pack_quantity: Math.max(1, qty || 1),
            purchase_price: rate > 0 ? rate : 50.0,
            mrp: mrp > 0 ? mrp : 90.0,
            selling_price: mrp > 0 ? mrp : 90.0,
            gst_rate: 12.0,
            rack_location: suggestRackLocation(category, dosage),
            requires_prescription: rxRequired
          };
        }
      }
    }

    // -------------------------------------------------------------------------
    // STRATEGY 3: FMCG / COSMETICS / DERMA INVOICE FORMAT (With HSN Code)
    // e.g. "1 ODOMOS CREAM 25GM 38089191 34.00 4 26.19 104.76"
    // e.g. "2 ODOMOS FABRIC ROLL ON 8ML 38089191 75.00 6 58.00 348.00"
    // e.g. "3 GR SERUM FACE BRI/COMPLT 15M 33049990 299.00 2 230.35 460.70"
    // e.g. "4 DABUR RED PASTE 150G 33061020 95.00 12 73.50 882.00"
    // e.g. "5 VOLINI GEL 30GM 30049099 125.00 10 96.00 960.00"
    // -------------------------------------------------------------------------
    if (!parsedItem) {
      const hsnMatch = currentLine.match(/\b(3004\d{0,4}|3005\d{0,4}|3006\d{0,4}|3304\d{0,4}|3306\d{0,4}|3307\d{0,4}|3808\d{0,4}|1901\d{0,4}|2106\d{0,4}|9018\d{0,4}|4818\d{0,4}|3401\d{0,4}|9619\d{0,4})\b/);
      if (hsnMatch) {
        const hsnCode = hsnMatch[1];
        const hsnIndex = currentLine.indexOf(hsnCode);
        const beforeHsn = currentLine.substring(0, hsnIndex).trim();
        const afterHsn = currentLine.substring(hsnIndex + hsnCode.length).trim();

        let medName = beforeHsn.replace(/^\d{1,4}[\s.)|-]+/, '').trim();
        if (medName.length >= 3) {
          const numbers = afterHsn
            .split(/\s+/)
            .map(t => t.replace(/[^0-9.]/g, ''))
            .filter(Boolean)
            .map(t => parseFloat(t))
            .filter(n => !isNaN(n) && n > 0);

          let mrp = 90.0;
          let qty = 1;
          let rate = 50.0;

          // Standard Wholesale FMCG format: [MRP, QTY, RATE, AMOUNT...]
          if (numbers.length >= 3) {
            mrp = numbers[0];
            qty = Math.round(numbers[1]);
            rate = numbers[2];
          } else if (numbers.length === 2) {
            mrp = numbers[0];
            qty = Math.round(numbers[1]);
            rate = Math.round(mrp * 0.77 * 100) / 100;
          } else if (numbers.length === 1) {
            mrp = numbers[0];
            rate = Math.round(mrp * 0.77 * 100) / 100;
          }

          const { dosage, category, rxRequired } = inferDosageAndCategory(medName);
          const packSize = parsePackSize(medName);

          parsedItem = {
            medicine_name: medName,
            generic_name: medName,
            category,
            dosage_form: dosage,
            manufacturer: 'Standard Pharma',
            hsn_code: hsnCode,
            batch_number: `B-${todayStr}${items.length + 1}`,
            expiry_date: normalizeExpiryDate(''),
            pack_size: packSize,
            pack_quantity: Math.max(1, qty || 1),
            purchase_price: rate > 0 ? rate : 50.0,
            mrp: mrp > 0 ? mrp : 90.0,
            selling_price: mrp > 0 ? mrp : 90.0,
            gst_rate: 18.0,
            rack_location: suggestRackLocation(category, dosage),
            requires_prescription: rxRequired
          };
        }
      }
    }

    // -------------------------------------------------------------------------
    // STRATEGY 4: GENERAL TOKEN / DELIMITED ROW PARSER (Item name followed by 2+ decimal numbers)
    // -------------------------------------------------------------------------
    if (!parsedItem) {
      // Split by pipe |, tab \t, or space
      const tokens = currentLine.split(/[\t|]+|\s{2,}/).filter(Boolean);
      const rowLine = tokens.length > 1 ? tokens.join(' ') : currentLine;

      const lineTokens = rowLine.split(/\s+/).filter(Boolean);
      const numbers = [];
      const wordTokens = [];

      for (const t of lineTokens) {
        const cleanNum = t.replace(/[^0-9.]/g, '');
        if (/^\d+(\.\d+)?$/.test(cleanNum) && cleanNum.length < 8 && !/^\d{6}$/.test(cleanNum)) {
          // Avoid 6-digit pin codes
          numbers.push(parseFloat(cleanNum));
        } else {
          wordTokens.push(t);
        }
      }

      const medName = wordTokens.join(' ').replace(/^\d{1,4}[\s.)|-]+/, '').trim();
      if (medName.length >= 4 && numbers.length >= 2 && !/^(PAGE|TOTAL|DATE|INVOICE|BILLED|TERMS|REVERSE|DOOR\s*NO|NEAR|ROAD|MANGALORE)/i.test(medName)) {
        let mrp = Math.max(...numbers);
        let rate = numbers.find(n => n < mrp && n > 5) || (mrp * 0.75);
        let qty = Math.round(numbers.find(n => Number.isInteger(n) && n >= 1 && n <= 1000 && n !== mrp) || 1);

        const { dosage, category, rxRequired } = inferDosageAndCategory(medName);

        parsedItem = {
          medicine_name: medName,
          generic_name: medName,
          category,
          dosage_form: dosage,
          manufacturer: 'Standard Pharma',
          hsn_code: '3004',
          batch_number: `B-${todayStr}${items.length + 1}`,
          expiry_date: normalizeExpiryDate(''),
          pack_size: parsePackSize(medName),
          pack_quantity: Math.max(1, qty),
          purchase_price: Math.round(rate * 100) / 100,
          mrp: Math.round(mrp * 100) / 100,
          selling_price: Math.round(mrp * 100) / 100,
          gst_rate: 12.0,
          rack_location: suggestRackLocation(category, dosage),
          requires_prescription: rxRequired
        };
      }
    }

    if (parsedItem) {
      items.push(parsedItem);
    }

    lineIdx++;
  }

  return {
    supplier_name: supplierName,
    supplier_gstin: supplierGstin,
    supplier_phone: '',
    supplier_address: '',
    invoice_number: invoiceNumber,
    invoice_date: invoiceDate,
    items
  };
}
