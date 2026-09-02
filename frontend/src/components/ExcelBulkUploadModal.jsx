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
  Database
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { inventoryAPI } from '../api';

export default function ExcelBulkUploadModal({ onClose, onStockInwarded }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [successResult, setSuccessResult] = useState(null);
  const [previewItems, setPreviewItems] = useState([]);

  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file) => {
    setSelectedFile(file);
    setError(null);
    setSuccessResult(null);

    // If CSV, parse for client-side preview
    if (file.name.endsWith('.csv')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const text = event.target?.result;
          const rows = parseCSVText(text);
          setPreviewItems(rows.slice(0, 50));
        } catch (err) {
          console.error("Preview parse error", err);
        }
      };
      reader.readAsText(file);
    } else {
      // For XLSX, will upload directly to backend openpyxl parser
      setPreviewItems([]);
    }
  };

  const parseCSVText = (csvText) => {
    const lines = csvText.split('\n').filter(l => l.trim().length > 0);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
    const items = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim().replace(/"/g, ''));
      if (cols.length < 2) continue;

      const row = {};
      headers.forEach((h, idx) => {
        row[h] = cols[idx] || '';
      });

      items.push({
        medicine_name: row.medicine_name || row.name || row.drug_name || 'Medicine',
        generic_name: row.generic_name || row.composition || '',
        category: row.category || 'General',
        dosage_form: row.dosage_form || row.form || 'Tablet',
        manufacturer: row.manufacturer || row.company || 'Pharma Co',
        batch_number: row.batch_number || row.batch_no || `EX-${Date.now().toString().slice(-4)}`,
        expiry_date: row.expiry_date || '2028-12-31',
        pack_quantity: parseInt(row.pack_quantity || row.quantity || row.qty || 10),
        pack_size: parseInt(row.pack_size || row.size || 10),
        purchase_price: parseFloat(row.purchase_price || row.cost || 50),
        mrp: parseFloat(row.mrp || 90),
        selling_price: parseFloat(row.selling_price || row.sale_price || row.mrp || 90),
        rack_location: row.rack_location || row.rack || 'Rack A-1'
      });
    }
    return items;
  };

  const handleDownloadTemplate = () => {
    const csvContent = [
      'Medicine Name,Generic Name,Category,Dosage Form,Manufacturer,Batch Number,Expiry Date,Pack Size,Quantity,Purchase Price,MRP,Selling Price,GST Rate,Rack Location,Requires Prescription',
      'Paracetamol 650mg,Paracetamol,Analgesics,Tablet,Micro Labs,B-PARA65,2028-10-31,15,50,18.50,34.00,34.00,12,Rack A-1,No',
      'Amoxicillin 500mg,Amoxicillin,Antibiotics,Capsule,Cipla,B-AMOX50,2028-08-31,10,30,42.00,82.00,82.00,12,Rack B-2,Yes',
      'Pantoprazole 40mg,Pantoprazole Sodium,Gastro,Tablet,Sun Pharma,B-PANT40,2028-12-31,10,40,32.00,68.00,68.00,12,Rack A-3,No',
      'Metformin 500mg,Metformin HCl,Diabetes,Tablet,USV Ltd,B-METF50,2028-11-30,20,35,22.00,48.00,48.00,12,Rack C-1,Yes',
      'Azithromycin 500mg,Azithromycin,Antibiotics,Tablet,Zydus,B-AZITH5,2028-09-30,3,60,45.00,89.00,89.00,12,Rack B-3,Yes',
      'Telmisartan 40mg,Telmisartan,Cardiac,Tablet,Glenmark,B-TELM40,2028-12-31,15,25,38.00,74.00,74.00,12,Rack C-2,Yes',
      'Cetirizine 10mg,Cetirizine HCl,Antiallergic,Tablet,Dr Reddys,B-CETR10,2028-10-31,10,45,12.00,26.00,26.00,12,Rack A-2,No',
      'Montelukast Levocetirizine,Montelukast + Levocetirizine,Respiratory,Tablet,Mankind,B-MONT01,2028-07-31,10,30,55.00,115.00,115.00,12,Rack A-4,Yes'
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'top_medical_inventory_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile && previewItems.length === 0) {
      setError('Please choose an Excel or CSV file to upload.');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      let result;
      if (selectedFile) {
        const formData = new FormData();
        formData.append('excel_file', selectedFile);
        result = await inventoryAPI.uploadExcel(formData);
      } else {
        result = await inventoryAPI.uploadExcel({ items: previewItems });
      }

      confetti({
        particleCount: 60,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#0284c7', '#10b981', '#f59e0b']
      });

      setSuccessResult(result);
      setTimeout(() => {
        onStockInwarded?.();
        onClose();
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to upload inventory spreadsheet.');
    } finally {
      setIsUploading(false);
    }
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
        selling_price: 30.00,
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
        selling_price: 165.00,
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
        selling_price: 130.00,
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
        selling_price: 88.00,
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
        selling_price: 138.00,
        rack_location: 'Rack C-2'
      }
    ];
    setPreviewItems(demoRows);
    setSelectedFile(new File([JSON.stringify(demoRows)], 'demo_pharmacy_stock.xlsx', { type: 'application/vnd.ms-excel' }));
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: '920px', width: '95vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
        
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #059669 0%, #0284c7 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)'
            }}>
              <FileSpreadsheet size={20} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Bulk Excel / CSV Inventory Import
              </h3>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0' }}>
                Upload .xlsx, .xls, or .csv spreadsheet to mass-inward medicines, batches, and prices
              </p>
            </div>
          </div>

          <button onClick={onClose} className="btn btn-secondary btn-sm" style={{ width: '32px', height: '32px', padding: 0 }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Smart Deduplication Notice */}
          <div style={{
            padding: '10px 14px',
            background: 'rgba(5, 150, 105, 0.05)',
            border: '1px solid rgba(5, 150, 105, 0.2)',
            borderRadius: '10px',
            fontSize: '12.5px',
            color: '#065f46',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <Database size={18} color="#059669" style={{ flexShrink: 0 }} />
            <span>
              <strong>Smart Deduplication Active:</strong> If a medicine already exists in the system, its stock count is automatically incremented. New medicines are registered automatically with zero duplicate names.
            </span>
          </div>
          
          {error && (
            <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecdd3', borderRadius: '10px', color: '#e11d48', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {successResult && (
            <div style={{ padding: '14px 18px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '10px', color: '#059669', fontSize: '13.5px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '12px' }}>
              <CheckCircle2 size={22} />
              <div>
                <div>{successResult.message}</div>
                <div style={{ fontSize: '12px', fontWeight: 500, color: '#047857', marginTop: '2px' }}>
                  Total Inward Stock Value: ₹{parseFloat(successResult.total_inward_value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
              padding: '24px 20px',
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
              accept=".xlsx,.xls,.csv"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />

            <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#ffffff', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <Upload size={24} color="#059669" />
            </div>

            <div style={{ fontSize: '15px', fontWeight: 800, color: '#065f46' }}>
              {selectedFile ? `Selected File: ${selectedFile.name}` : 'Click to Upload Excel (.xlsx, .xls) or CSV Spreadsheet'}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
              Supports Microsoft Excel sheets, Google Sheets exports, and Distributor CSV manifests
            </div>

            {/* Quick Actions: Download Template & Demo Test */}
            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownloadTemplate();
                }}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '11.5px', background: '#ffffff' }}
              >
                <Download size={13} color="#059669" /> Download Sample Excel Template (.csv)
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  loadSampleDemoRows();
                }}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '11.5px', background: '#ffffff' }}
              >
                <Sparkles size={13} color="#0284c7" /> Load Demo Pharmacy Dataset (5 Meds)
              </button>
            </div>
          </div>

          {/* Uploading Spinner */}
          {isUploading && (
            <div style={{ padding: '24px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <RefreshCw size={28} color="#059669" className="spin-animation" style={{ margin: '0 auto 10px' }} />
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                Importing & Inwarding Inventory Spreadsheets...
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                Creating missing medicines, registering batch numbers, updating stock balances & writing audit logs
              </div>
            </div>
          )}

          {/* Preview Table */}
          {previewItems.length > 0 && !isUploading && (
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a', marginBottom: '10px' }}>
                Previewing Ready-to-Inward Medicines ({previewItems.length} items):
              </div>

              <div className="data-table-container" style={{ maxHeight: '260px', overflowY: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '25%' }}>Drug Name & Generic</th>
                      <th style={{ width: '13%' }}>Category</th>
                      <th style={{ width: '13%' }}>Batch #</th>
                      <th style={{ width: '12%' }}>Expiry</th>
                      <th style={{ width: '10%', textAlign: 'center' }}>Packs</th>
                      <th style={{ width: '9%', textAlign: 'right' }}>Cost</th>
                      <th style={{ width: '9%', textAlign: 'right' }}>MRP</th>
                      <th style={{ width: '9%', textAlign: 'right' }}>Selling</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewItems.map((it, idx) => (
                      <tr key={idx}>
                        <td>
                          <div style={{ fontWeight: 800, color: '#0f172a' }}>{it.medicine_name}</div>
                          <div style={{ fontSize: '10.5px', color: '#64748b' }}>{it.generic_name}</div>
                        </td>
                        <td><span className="badge badge-cyan">{it.category}</span></td>
                        <td className="mono" style={{ fontWeight: 700 }}>{it.batch_number}</td>
                        <td style={{ fontSize: '11.5px' }}>{it.expiry_date}</td>
                        <td style={{ textAlign: 'center', fontWeight: 800 }} className="mono">{it.pack_quantity}</td>
                        <td style={{ textAlign: 'right' }} className="mono">₹{parseFloat(it.purchase_price).toFixed(2)}</td>
                        <td style={{ textAlign: 'right' }} className="mono">₹{parseFloat(it.mrp).toFixed(2)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: '#059669' }} className="mono">₹{parseFloat(it.selling_price).toFixed(2)}</td>
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
              disabled={isUploading}
              onClick={handleUploadSubmit}
              className="btn btn-emerald btn-lg"
              style={{ padding: '10px 24px', fontSize: '14.5px' }}
            >
              <PackageCheck size={18} />
              <span>{isUploading ? 'Importing Excel...' : `Confirm & Inward ${selectedFile ? selectedFile.name : `${previewItems.length} Medicines`}`}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
