import React, { useState, useRef } from 'react';
import { 
  FileSpreadsheet, 
  Upload, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Plus, 
  Trash2, 
  Sparkles, 
  PackageCheck, 
  RefreshCw,
  Table,
  Layers,
  ArrowRight,
  Database,
  Check,
  Edit3
} from 'lucide-react';
import confetti from 'canvas-confetti';
import * as XLSX from 'xlsx';
import { inventoryAPI } from '../api';

export default function ExcelBulkUploadModal({ onClose, onStockInwarded }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState(null);
  const [successResult, setSuccessResult] = useState(null);
  const [previewItems, setPreviewItems] = useState([]);

  const fileInputRef = useRef(null);

  const formatFlexibleDate = (raw) => {
    const defaultDate = new Date(Date.now() + 730 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    if (!raw) return defaultDate;

    if (raw instanceof Date && !isNaN(raw)) {
      return raw.toISOString().split('T')[0];
    }

    const s = String(raw).trim();
    if (!s) return defaultDate;

    // Standard YYYY-MM-DD
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)) {
      const parts = s.split('-');
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }

    // DD/MM/YYYY or DD-MM-YYYY
    if (/^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(s)) {
      const delim = s.includes('/') ? '/' : '-';
      const parts = s.split(delim);
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }

    // MM/YY or MM-YY
    if (/^\d{1,2}[/-]\d{2}$/.test(s)) {
      const delim = s.includes('/') ? '/' : '-';
      const parts = s.split(delim);
      return `20${parts[1]}-${parts[0].padStart(2, '0')}-28`;
    }

    // MM/YYYY or MM-YYYY
    if (/^\d{1,2}[/-]\d{4}$/.test(s)) {
      const delim = s.includes('/') ? '/' : '-';
      const parts = s.split(delim);
      return `${parts[1]}-${parts[0].padStart(2, '0')}-28`;
    }

    // Month strings e.g. OCT-28, Oct 2028
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
                     jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    const lower = s.toLowerCase();
    for (const [mName, mNum] of Object.entries(months)) {
      if (lower.includes(mName)) {
        const yearMatch = s.match(/\b(20\d{2}|\d{2})\b/);
        let y = yearMatch ? yearMatch[0] : '2028';
        if (y.length === 2) y = `20${y}`;
        return `${y}-${mNum}-28`;
      }
    }

    return defaultDate;
  };

  const parseSpreadsheetFile = async (file) => {
    setIsParsing(true);
    setError(null);
    setSelectedFile(file);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array', cellDates: true });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        throw new Error('Spreadsheet has no sheets.');
      }

      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

      if (!rawRows || rawRows.length === 0) {
        throw new Error('Spreadsheet appears to be empty.');
      }

      // Intelligent header row detection: scan first 20 rows
      const headerKeywords = ['medicine', 'name', 'item', 'drug', 'particulars', 'product', 'batch', 'exp', 'qty', 'rate', 'mrp', 'pack', 'cost'];
      let headerRowIndex = 0;
      let maxScore = 0;

      for (let i = 0; i < Math.min(rawRows.length, 20); i++) {
        const row = rawRows[i];
        if (!Array.isArray(row)) continue;
        let score = 0;
        row.forEach(cell => {
          const str = String(cell || '').trim().toLowerCase();
          if (str && headerKeywords.some(kw => str.includes(kw))) {
            score++;
          }
        });
        if (score > maxScore) {
          maxScore = score;
          headerRowIndex = i;
        }
      }

      const headers = rawRows[headerRowIndex].map(h => String(h || '').trim().toLowerCase());
      const parsedItems = [];

      for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
        const row = rawRows[i];
        if (!Array.isArray(row) || !row.some(c => c !== '' && c !== null && c !== undefined)) {
          continue;
        }

        const rowObj = {};
        headers.forEach((h, colIdx) => {
          if (h) rowObj[h] = row[colIdx];
        });

        const getVal = (...keys) => {
          // 1. Exact match
          for (const k of keys) {
            for (const [actualK, v] of Object.entries(rowObj)) {
              if (actualK.trim() === k.trim() && v !== '' && v !== null && v !== undefined) {
                return v;
              }
            }
          }
          // 2. Substring match
          for (const k of keys) {
            for (const [actualK, v] of Object.entries(rowObj)) {
              if (actualK.includes(k.trim()) && v !== '' && v !== null && v !== undefined) {
                return v;
              }
            }
          }
          return '';
        };

        const name = String(getVal(
          'medicine_name', 'medicine', 'med_name', 'drug_name', 'drug', 'item_name', 
          'particulars', 'product_name', 'product', 'brand_name', 'brand', 
          'description', 'item', 'name', 'tablet_name', 'tablet'
        )).trim();

        if (!name) continue;

        const generic = String(getVal('generic_name', 'generic', 'composition', 'salt', 'molecule', 'formula')).trim();
        const category = String(getVal('category_name', 'category', 'dept', 'department', 'group', 'class') || 'General').trim();
        
        let form = String(getVal('dosage_form', 'dosage', 'form', 'type')).trim();
        if (!form) {
          const uName = name.toUpperCase();
          if (uName.includes('TAB')) form = 'Tablet';
          else if (uName.includes('CAP')) form = 'Capsule';
          else if (uName.includes('SYP') || uName.includes('SYRUP') || uName.includes('SUSP')) form = 'Syrup';
          else if (uName.includes('INJ')) form = 'Injection';
          else if (uName.includes('DROP')) form = 'Drops';
          else if (uName.includes('OINT') || uName.includes('CREAM') || uName.includes('GEL')) form = 'Ointment';
          else form = 'Tablet';
        }

        const manufacturer = String(getVal('manufacturer', 'mfg_by', 'mfg', 'company', 'brand', 'marketed_by', 'make') || 'Standard Pharma').trim();
        const hsn = String(getVal('hsn_code', 'hsn/sac', 'hsn', 'sac') || '3004').trim();
        const batchNo = String(getVal('batch_number', 'batch_no', 'batch_num', 'batch', 'b.no', 'b.no.', 'b_no', 'bno', 'lot_no', 'lot') || `EX-${Date.now().toString().slice(-4)}`).trim();

        const rawExp = getVal('expiry_date', 'expiry', 'exp_date', 'exp_dt', 'exp_date_str', 'exp', 'validity', 'exp.');
        const expDate = formatFlexibleDate(rawExp);

        const rawSize = getVal('pack_size', 'pack_sz', 'size', 'pkg', 'packing', 'pack', 'units_per_pack', 'strip_size');
        const packSize = Math.max(1, parseInt(String(rawSize).replace(/[^0-9.]/g, '')) || 10);

        const rawQty = getVal('pack_quantity', 'quantity', 'qty', 'packs', 'stock', 'bill_qty', 'b_qty', 'tot_qty', 'total_qty', 'nos', 'count', 'inward_qty');
        const packQty = Math.max(1, parseInt(String(rawQty).replace(/[^0-9.]/g, '')) || 10);

        const rawPurchase = getVal('purchase_price', 'purchase_rate', 'purchase', 'cost_price', 'cost', 'ptr', 'rate', 'p_rate', 'net_rate', 'p.rate');
        const purchasePrice = Math.max(0, parseFloat(String(rawPurchase).replace(/[^0-9.]/g, '')) || 50.0);

        const rawMrp = getVal('mrp', 'm.r.p', 'm.r.p.', 'max_retail_price', 'retail_price');
        const mrp = Math.max(0, parseFloat(String(rawMrp).replace(/[^0-9.]/g, '')) || (purchasePrice * 1.4));

        const rawSelling = getVal('selling_price', 'selling_rate', 'sale_price', 'sale_rate', 'sell', 'sp', 's_rate', 's.rate');
        const sellingPrice = Math.max(0, parseFloat(String(rawSelling).replace(/[^0-9.]/g, '')) || mrp);

        const rawGst = getVal('gst_rate', 'gst%', 'gst', 'tax%', 'tax_rate', 'tax', 'igst', 'cgst');
        const gstRate = parseFloat(String(rawGst).replace(/[^0-9.]/g, '')) || 12.0;

        const rackLocation = String(getVal('rack_location', 'rack_no', 'rack', 'shelf_no', 'shelf', 'location', 'bin') || 'Rack A-1').trim();

        parsedItems.push({
          medicine_name: name,
          generic_name: generic,
          category,
          dosage_form: form,
          manufacturer,
          hsn_code: hsn,
          batch_number: batchNo,
          expiry_date: expDate,
          pack_size: packSize,
          pack_quantity: packQty,
          purchase_price: purchasePrice,
          mrp,
          selling_price: sellingPrice,
          gst_rate: gstRate,
          rack_location: rackLocation,
          requires_prescription: false
        });
      }

      if (parsedItems.length === 0) {
        throw new Error('No valid medicine rows could be detected in the spreadsheet. Please verify columns.');
      }

      setPreviewItems(parsedItems);
    } catch (err) {
      console.error("Spreadsheet parse error:", err);
      setError(err.message || 'Failed to parse spreadsheet file.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      parseSpreadsheetFile(file);
    }
  };

  const handleDownloadTemplate = () => {
    const headers = ['Medicine Name', 'Generic Name', 'Category', 'Dosage Form', 'Manufacturer', 'Batch Number', 'Expiry Date', 'Pack Size', 'Quantity', 'Purchase Price', 'MRP', 'Selling Price', 'GST Rate', 'Rack Location'];
    const sampleRows = [
      ['Paracetamol 650mg Dolo', 'Paracetamol', 'Analgesics', 'Tablet', 'Micro Labs', 'B-DOLO101', '2028-10-31', 15, 50, 18.50, 34.00, 34.00, 12, 'Rack A-1'],
      ['Augmentin 625 Duo', 'Amoxicillin + Clavulanic Acid', 'Antibiotics', 'Tablet', 'GSK', 'B-AUGM202', '2028-08-31', 10, 30, 95.00, 185.00, 185.00, 12, 'Rack B-1'],
      ['Pan-D Capsule', 'Pantoprazole + Domperidone', 'Gastro', 'Capsule', 'Alkem Labs', 'B-PAND303', '2028-12-31', 15, 40, 65.00, 145.00, 145.00, 12, 'Rack A-3'],
      ['Glycomet GP 1', 'Glimepiride + Metformin', 'Diabetes', 'Tablet', 'USV Ltd', 'B-GLYC404', '2028-11-30', 15, 45, 45.00, 98.00, 98.00, 12, 'Rack C-1'],
      ['Telma-H 40', 'Telmisartan + Hydrochlorothiazide', 'Cardiac', 'Tablet', 'Glenmark', 'B-TELM505', '2028-12-31', 15, 35, 72.00, 152.00, 152.00, 12, 'Rack C-2'],
      ['Cetirizine 10mg', 'Cetirizine HCl', 'Antiallergic', 'Tablet', 'Dr Reddys', 'B-CETR606', '2028-10-31', 10, 45, 12.00, 26.00, 26.00, 12, 'Rack A-2'],
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory_Template");
    XLSX.writeFile(wb, "top_medical_inventory_template.xlsx");
  };

  const loadSampleDemoRows = () => {
    const demoRows = [
      {
        medicine_name: 'Paracetamol 650mg Dolo',
        generic_name: 'Paracetamol',
        category: 'Analgesics',
        dosage_form: 'Tablet',
        manufacturer: 'Micro Labs',
        batch_number: `B-DOLO${Date.now().toString().slice(-4)}`,
        expiry_date: '2028-10-31',
        pack_quantity: 50,
        pack_size: 15,
        purchase_price: 18.50,
        mrp: 34.00,
        selling_price: 34.00,
        gst_rate: 12.0,
        rack_location: 'Rack A-1'
      },
      {
        medicine_name: 'Augmentin 625 Duo',
        generic_name: 'Amoxicillin + Clavulanic Acid',
        category: 'Antibiotics',
        dosage_form: 'Tablet',
        manufacturer: 'GSK',
        batch_number: `B-AUGM${Date.now().toString().slice(-4)}`,
        expiry_date: '2028-08-31',
        pack_quantity: 30,
        pack_size: 10,
        purchase_price: 95.00,
        mrp: 185.00,
        selling_price: 185.00,
        gst_rate: 12.0,
        rack_location: 'Rack B-1'
      },
      {
        medicine_name: 'Pan-D Capsule',
        generic_name: 'Pantoprazole + Domperidone',
        category: 'Gastro',
        dosage_form: 'Capsule',
        manufacturer: 'Alkem Labs',
        batch_number: `B-PAND${Date.now().toString().slice(-4)}`,
        expiry_date: '2028-12-31',
        pack_quantity: 40,
        pack_size: 15,
        purchase_price: 65.00,
        mrp: 145.00,
        selling_price: 145.00,
        gst_rate: 12.0,
        rack_location: 'Rack A-3'
      },
      {
        medicine_name: 'Glycomet GP 1',
        generic_name: 'Glimepiride + Metformin',
        category: 'Diabetes',
        dosage_form: 'Tablet',
        manufacturer: 'USV Ltd',
        batch_number: `B-GLYC${Date.now().toString().slice(-4)}`,
        expiry_date: '2028-11-30',
        pack_quantity: 45,
        pack_size: 15,
        purchase_price: 45.00,
        mrp: 98.00,
        selling_price: 98.00,
        gst_rate: 12.0,
        rack_location: 'Rack C-1'
      },
      {
        medicine_name: 'Telma-H 40',
        generic_name: 'Telmisartan + Hydrochlorothiazide',
        category: 'Cardiac',
        dosage_form: 'Tablet',
        manufacturer: 'Glenmark',
        batch_number: `B-TELM${Date.now().toString().slice(-4)}`,
        expiry_date: '2028-12-31',
        pack_quantity: 35,
        pack_size: 15,
        purchase_price: 72.00,
        mrp: 152.00,
        selling_price: 152.00,
        gst_rate: 12.0,
        rack_location: 'Rack C-2'
      }
    ];
    setPreviewItems(demoRows);
    setSelectedFile({ name: 'demo_pharmacy_stock.xlsx', size: 1024 });
    setError(null);
  };

  const handleUpdateItemQty = (idx, newQty) => {
    const val = Math.max(1, parseInt(newQty) || 1);
    setPreviewItems(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], pack_quantity: val };
      return copy;
    });
  };

  const handleRemoveItem = (idx) => {
    setPreviewItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleUploadSubmit = async () => {
    if (previewItems.length === 0 && !selectedFile) {
      setError('Please choose an Excel or CSV file to upload.');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      let result;
      if (previewItems.length > 0) {
        // Send structured normalized items
        result = await inventoryAPI.uploadExcel({ items: previewItems });
      } else if (selectedFile && selectedFile instanceof File) {
        const formData = new FormData();
        formData.append('excel_file', selectedFile);
        result = await inventoryAPI.uploadExcel(formData);
      } else {
        throw new Error('No items ready for inwarding.');
      }

      confetti({
        particleCount: 70,
        spread: 90,
        origin: { y: 0.6 },
        colors: ['#0284c7', '#10b981', '#f59e0b']
      });

      setSuccessResult(result);
      setTimeout(() => {
        onStockInwarded?.();
        onClose();
      }, 2200);
    } catch (err) {
      console.error("Bulk upload error:", err);
      setError(err.message || 'Failed to upload inventory spreadsheet.');
    } finally {
      setIsUploading(false);
    }
  };

  // Calculate live summary metrics
  const totalItemsCount = previewItems.length;
  const totalStockPacks = previewItems.reduce((acc, it) => acc + (it.pack_quantity || 0), 0);
  const totalPurchaseValue = previewItems.reduce((acc, it) => acc + ((it.purchase_price || 0) * (it.pack_quantity || 0)), 0);
  const totalMrpValue = previewItems.reduce((acc, it) => acc + ((it.mrp || 0) * (it.pack_quantity || 0)), 0);

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: '980px', width: '96vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
        
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #059669 0%, #0284c7 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)'
            }}>
              <FileSpreadsheet size={22} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Bulk Excel / CSV Inventory Import
              </h3>
              <p style={{ fontSize: '12.5px', color: '#64748b', margin: '2px 0 0' }}>
                Upload .xlsx, .xls, or .csv spreadsheet to mass-inward medicines, update stock counts, and register prices
              </p>
            </div>
          </div>

          <button onClick={onClose} className="btn btn-secondary btn-sm" style={{ width: '32px', height: '32px', padding: 0 }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Smart Deduplication Notice */}
          <div style={{
            padding: '12px 16px',
            background: 'rgba(5, 150, 105, 0.06)',
            border: '1px solid rgba(5, 150, 105, 0.25)',
            borderRadius: '12px',
            fontSize: '13px',
            color: '#065f46',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <Database size={20} color="#059669" style={{ flexShrink: 0 }} />
            <div>
              <strong>Smart Deduplication & Stock Increment:</strong> If a tablet/medicine already exists in your system, its stock count is automatically <strong>increased</strong> by the imported quantity. If it does not exist, a new medicine record is created automatically with zero duplicates.
            </div>
          </div>
          
          {error && (
            <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecdd3', borderRadius: '10px', color: '#e11d48', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {successResult && (
            <div style={{ padding: '16px 20px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '12px', color: '#059669', fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '14px' }}>
              <CheckCircle2 size={26} color="#059669" style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '15px' }}>{successResult.message}</div>
                <div style={{ fontSize: '12.5px', fontWeight: 500, color: '#047857', marginTop: '4px', display: 'flex', gap: '16px' }}>
                  <span>Updated Existing: <strong>{successResult.existing_medicines_updated ?? 0}</strong></span>
                  <span>New Medicines: <strong>{successResult.new_medicines_created ?? 0}</strong></span>
                  <span>Total Inward Value: <strong>₹{parseFloat(successResult.total_inward_value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></span>
                </div>
              </div>
            </div>
          )}

          {/* Upload Dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: '2px dashed #059669',
              background: '#f0fdf4',
              borderRadius: '16px',
              padding: '22px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#dcfce7'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#f0fdf4'}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx,.xls,.csv,.tsv,.ods"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />

            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#ffffff', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
              <Upload size={22} color="#059669" />
            </div>

            <div style={{ fontSize: '15px', fontWeight: 800, color: '#065f46' }}>
              {selectedFile ? `Selected File: ${selectedFile.name}` : 'Click to Upload Excel (.xlsx, .xls) or CSV Spreadsheet'}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
              Instant live preview & smart header recognition for distributor invoices and master lists
            </div>

            {/* Quick Actions: Download Template & Demo Test */}
            <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownloadTemplate();
                }}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '12px', background: '#ffffff', padding: '6px 12px' }}
              >
                <Download size={14} color="#059669" /> Download Excel Template (.xlsx)
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  loadSampleDemoRows();
                }}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '12px', background: '#ffffff', padding: '6px 12px' }}
              >
                <Sparkles size={14} color="#0284c7" /> Load Demo Pharmacy Dataset (5 Meds)
              </button>
            </div>
          </div>

          {/* Parsing or Uploading Spinner */}
          {(isParsing || isUploading) && (
            <div style={{ padding: '24px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <RefreshCw size={28} color="#059669" className="spin-animation" style={{ margin: '0 auto 10px' }} />
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                {isParsing ? 'Parsing Spreadsheet in Browser...' : 'Inwarding Inventory & Updating Stock...'}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                Matching existing tablet names, incrementing counts, registering batches, and updating stock
              </div>
            </div>
          )}

          {/* Preview Table & Metrics */}
          {previewItems.length > 0 && !isUploading && !isParsing && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              {/* Summary Stats Row */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: '10px'
              }}>
                <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Medicines</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>{totalItemsCount}</div>
                </div>

                <div style={{ padding: '10px 14px', background: '#eff6ff', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
                  <div style={{ fontSize: '11px', color: '#1e40af', fontWeight: 600, textTransform: 'uppercase' }}>Total Inward Packs</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#1e40af' }}>{totalStockPacks}</div>
                </div>

                <div style={{ padding: '10px 14px', background: '#f0fdf4', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: '11px', color: '#166534', fontWeight: 600, textTransform: 'uppercase' }}>Total Purchase Cost</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#166534' }}>
                    ₹{totalPurchaseValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>

                <div style={{ padding: '10px 14px', background: '#faf5ff', borderRadius: '10px', border: '1px solid #e9d5ff' }}>
                  <div style={{ fontSize: '11px', color: '#6b21a8', fontWeight: 600, textTransform: 'uppercase' }}>Total MRP Value</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#6b21a8' }}>
                    ₹{totalMrpValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Data Table */}
              <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Ready-to-Inward Medicines List ({previewItems.length}):</span>
                <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748b' }}>
                  You can edit quantities or remove unwanted rows before saving
                </span>
              </div>

              <div className="data-table-container" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '4%' }}>#</th>
                      <th style={{ width: '28%' }}>Drug / Tablet Name</th>
                      <th style={{ width: '12%' }}>Form & Cat</th>
                      <th style={{ width: '13%' }}>Batch #</th>
                      <th style={{ width: '11%' }}>Expiry</th>
                      <th style={{ width: '13%', textAlign: 'center' }}>Qty (Packs)</th>
                      <th style={{ width: '9%', textAlign: 'right' }}>Cost</th>
                      <th style={{ width: '9%', textAlign: 'right' }}>MRP</th>
                      <th style={{ width: '6%', textAlign: 'center' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewItems.map((it, idx) => (
                      <tr key={idx}>
                        <td style={{ color: '#94a3b8', fontSize: '11px' }}>{idx + 1}</td>
                        <td>
                          <div style={{ fontWeight: 800, color: '#0f172a' }}>{it.medicine_name}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{it.generic_name || it.manufacturer}</div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            <span className="badge badge-cyan" style={{ fontSize: '10.5px' }}>{it.dosage_form}</span>
                            <span className="badge badge-gray" style={{ fontSize: '10.5px' }}>{it.category}</span>
                          </div>
                        </td>
                        <td className="mono" style={{ fontWeight: 700, fontSize: '12px' }}>{it.batch_number}</td>
                        <td style={{ fontSize: '11.5px' }}>{it.expiry_date}</td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <button
                              type="button"
                              onClick={() => handleUpdateItemQty(idx, it.pack_quantity - 5)}
                              style={{ width: '22px', height: '22px', padding: 0, borderRadius: '4px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer', fontWeight: 800 }}
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={it.pack_quantity}
                              onChange={(e) => handleUpdateItemQty(idx, e.target.value)}
                              style={{ width: '48px', textAlign: 'center', padding: '2px 4px', border: '1px solid #cbd5e1', borderRadius: '4px', fontWeight: 800, fontSize: '12px' }}
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateItemQty(idx, it.pack_quantity + 5)}
                              style={{ width: '22px', height: '22px', padding: 0, borderRadius: '4px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer', fontWeight: 800 }}
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }} className="mono">₹{parseFloat(it.purchase_price).toFixed(2)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#059669' }} className="mono">₹{parseFloat(it.mrp).toFixed(2)}</td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                            title="Remove from inward"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#f8fafc'
        }}>
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>

          {(selectedFile || previewItems.length > 0) && (
            <button
              type="button"
              disabled={isUploading || isParsing || previewItems.length === 0}
              onClick={handleUploadSubmit}
              className="btn btn-emerald btn-lg"
              style={{ padding: '10px 24px', fontSize: '14.5px', gap: '8px' }}
            >
              <PackageCheck size={18} />
              <span>
                {isUploading 
                  ? 'Importing & Updating Stock...' 
                  : `Confirm & Inward ${previewItems.length} Medicines (${totalStockPacks} Packs)`}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
