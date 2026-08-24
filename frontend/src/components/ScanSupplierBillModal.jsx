import React, { useState, useRef } from 'react';
import { 
  Camera, 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Trash2, 
  Plus, 
  Sparkles, 
  PackageCheck, 
  DollarSign,
  Building2,
  Calendar,
  Layers,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { inventoryAPI } from '../api';

export default function ScanSupplierBillModal({ onClose, onStockInwarded }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isInwarding, setIsInwarding] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Extracted Bill State
  const [supplierName, setSupplierName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [items, setItems] = useState([]);

  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const processSelectedFile = async (file) => {
    setSelectedFile(file);
    setError(null);
    setSuccessMessage(null);

    // Create object URL for visual preview if image
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }

    // Automatically trigger AI extraction
    await scanBillFile(file);
  };

  const scanBillFile = async (file, sampleType = 'standard') => {
    setIsScanning(true);
    setError(null);

    try {
      const formData = new FormData();
      if (file) {
        formData.append('bill_image', file);
      }
      formData.append('sample_type', sampleType);

      const result = await inventoryAPI.scanSupplierBill(formData);

      if (result) {
        setSupplierName(result.supplier_name || 'Wholesale Supplier');
        setInvoiceNumber(result.invoice_number || `INV-${Date.now().toString().slice(-6)}`);
        setInvoiceDate(result.invoice_date || new Date().toISOString().split('T')[0]);
        setItems(result.items || []);
      }
    } catch (err) {
      console.error('Scan error:', err);
      setError(err.message || 'Failed to scan invoice image. Please try again.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleAddItem = () => {
    const newItem = {
      medicine_name: '',
      generic_name: '',
      category: 'General',
      dosage_form: 'Tablet',
      manufacturer: 'Pharma Co',
      batch_number: `B-${Date.now().toString().slice(-5)}`,
      expiry_date: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      pack_size: 10,
      pack_quantity: 10,
      purchase_price: 50.0,
      mrp: 90.0,
      selling_price: 80.0,
      gst_rate: 12.0,
      rack_location: 'Rack A-1',
      requires_prescription: false
    };
    setItems([...items, newItem]);
  };

  const handleConfirmInward = async () => {
    if (items.length === 0) {
      setError('Please add at least one medicine item to inward.');
      return;
    }

    setIsInwarding(true);
    setError(null);

    try {
      const payload = {
        supplier_name: supplierName.trim() || 'Wholesale Supplier',
        invoice_number: invoiceNumber.trim() || `PUR-${Date.now().toString().slice(-6)}`,
        invoice_date: invoiceDate || new Date().toISOString().split('T')[0],
        items: items
      };

      const result = await inventoryAPI.bulkInwardFromBill(payload);

      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#0284c7', '#10b981', '#f59e0b']
      });

      setSuccessMessage(result.message || 'Stock successfully added to inventory!');
      setTimeout(() => {
        onStockInwarded?.();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to inward stock.');
    } finally {
      setIsInwarding(false);
    }
  };

  const totalInwardValue = items.reduce((acc, it) => acc + (parseFloat(it.purchase_price || 0) * parseInt(it.pack_quantity || 0)), 0);

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: '950px', width: '95vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
        
        {/* Modal Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #f0f9ff 0%, #ffffff 100%)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0284c7 0%, #10b981 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)'
            }}>
              <Camera size={20} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                AI Supplier Purchase Bill Scanner
              </h3>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0' }}>
                Take a photo or upload distributor invoice to auto-detect and inward medicine stock
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn btn-secondary btn-sm"
            style={{ width: '32px', height: '32px', padding: 0 }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {error && (
            <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecdd3', borderRadius: '10px', color: '#e11d48', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div style={{ padding: '12px 16px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '10px', color: '#059669', fontSize: '13.5px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckCircle2 size={20} />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Upload / Camera Dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: '2px dashed #0284c7',
              background: '#f0f9ff',
              borderRadius: '16px',
              padding: '24px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#e0f2fe'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#f0f9ff'}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*,.pdf"
              capture="environment"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />

            <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#ffffff', border: '1px solid #bae6fd', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <Upload size={24} color="#0284c7" />
            </div>

            <div style={{ fontSize: '15px', fontWeight: 800, color: '#0369a1' }}>
              {selectedFile ? `Selected: ${selectedFile.name}` : 'Click to Take Photo with Camera or Upload Supplier Bill'}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
              Supports JPG, PNG, WEBP & PDF wholesale bills (Micro Labs, Sun Pharma, Cipla, Abbott, etc.)
            </div>

            {/* Quick Demo Pre-fill options */}
            <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  scanBillFile(null, 'microlabs');
                }}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '11px', background: '#ffffff' }}
              >
                <Sparkles size={12} color="#0284c7" /> Load Sample: Micro Labs Bill
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  scanBillFile(null, 'cipla');
                }}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '11px', background: '#ffffff' }}
              >
                <Sparkles size={12} color="#059669" /> Load Sample: Cipla / GSK Bill
              </button>
            </div>
          </div>

          {/* Scanning Progress */}
          {isScanning && (
            <div style={{ padding: '24px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <RefreshCw size={28} color="#0284c7" className="spin-animation" style={{ margin: '0 auto 10px' }} />
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                AI Document Engine Scanning Invoice Line Items...
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                Extracting medicine names, batch codes, expiry dates, pack quantities, purchase rates & MRPs
              </div>
            </div>
          )}

          {/* Detected Invoice Details & Editable Review Table */}
          {items.length > 0 && !isScanning && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Supplier & Bill Metadata */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', background: '#f8fafc', padding: '14px 18px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Supplier / Distributor Name
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    style={{ height: '34px', fontSize: '13px' }}
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Invoice / Bill Number
                  </label>
                  <input
                    type="text"
                    className="input-field mono"
                    style={{ height: '34px', fontSize: '13px' }}
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Invoice Date
                  </label>
                  <input
                    type="date"
                    className="input-field"
                    style={{ height: '34px', fontSize: '13px' }}
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Items Review Table */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>
                    Detected Medicine Batches ({items.length} items) - <span style={{ color: '#059669' }}>Total Inward: ₹{totalInwardValue.toFixed(2)}</span>
                  </div>
                  <button onClick={handleAddItem} className="btn btn-secondary btn-sm" style={{ fontSize: '11px' }}>
                    <Plus size={12} /> + Add Row
                  </button>
                </div>

                <div className="data-table-container" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: '24%' }}>Medicine Name</th>
                        <th style={{ width: '14%' }}>Batch #</th>
                        <th style={{ width: '13%' }}>Expiry</th>
                        <th style={{ width: '9%', textAlign: 'center' }}>Packs</th>
                        <th style={{ width: '9%', textAlign: 'center' }}>Size</th>
                        <th style={{ width: '10%', textAlign: 'right' }}>Cost (₹)</th>
                        <th style={{ width: '10%', textAlign: 'right' }}>MRP (₹)</th>
                        <th style={{ width: '10%', textAlign: 'right' }}>Sell (₹)</th>
                        <th style={{ width: '5%', textAlign: 'center' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => (
                        <tr key={idx}>
                          <td>
                            <input
                              type="text"
                              className="input-field"
                              style={{ height: '30px', fontSize: '12px', fontWeight: 700 }}
                              value={item.medicine_name}
                              onChange={(e) => handleItemChange(idx, 'medicine_name', e.target.value)}
                            />
                            <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '2px' }}>
                              {item.generic_name?.slice(0, 30)}
                            </div>
                          </td>

                          <td>
                            <input
                              type="text"
                              className="input-field mono"
                              style={{ height: '30px', fontSize: '12px', fontWeight: 600 }}
                              value={item.batch_number}
                              onChange={(e) => handleItemChange(idx, 'batch_number', e.target.value)}
                            />
                          </td>

                          <td>
                            <input
                              type="date"
                              className="input-field"
                              style={{ height: '30px', fontSize: '11.5px', padding: '2px 4px' }}
                              value={item.expiry_date}
                              onChange={(e) => handleItemChange(idx, 'expiry_date', e.target.value)}
                            />
                          </td>

                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="number"
                              min="1"
                              className="input-field mono"
                              style={{ height: '30px', fontSize: '12px', width: '55px', textAlign: 'center', fontWeight: 700 }}
                              value={item.pack_quantity}
                              onChange={(e) => handleItemChange(idx, 'pack_quantity', parseInt(e.target.value) || 1)}
                            />
                          </td>

                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="number"
                              min="1"
                              className="input-field mono"
                              style={{ height: '30px', fontSize: '12px', width: '50px', textAlign: 'center' }}
                              value={item.pack_size}
                              onChange={(e) => handleItemChange(idx, 'pack_size', parseInt(e.target.value) || 10)}
                            />
                          </td>

                          <td style={{ textAlign: 'right' }}>
                            <input
                              type="number"
                              step="0.01"
                              className="input-field mono"
                              style={{ height: '30px', fontSize: '12px', width: '70px', textAlign: 'right', fontWeight: 600 }}
                              value={item.purchase_price}
                              onChange={(e) => handleItemChange(idx, 'purchase_price', parseFloat(e.target.value) || 0)}
                            />
                          </td>

                          <td style={{ textAlign: 'right' }}>
                            <input
                              type="number"
                              step="0.01"
                              className="input-field mono"
                              style={{ height: '30px', fontSize: '12px', width: '70px', textAlign: 'right' }}
                              value={item.mrp}
                              onChange={(e) => handleItemChange(idx, 'mrp', parseFloat(e.target.value) || 0)}
                            />
                          </td>

                          <td style={{ textAlign: 'right' }}>
                            <input
                              type="number"
                              step="0.01"
                              className="input-field mono"
                              style={{ height: '30px', fontSize: '12px', width: '70px', textAlign: 'right', fontWeight: 800, color: '#059669' }}
                              value={item.selling_price}
                              onChange={(e) => handleItemChange(idx, 'selling_price', parseFloat(e.target.value) || 0)}
                            />
                          </td>

                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              style={{ background: 'transparent', border: 'none', color: '#e11d48', cursor: 'pointer' }}
                              title="Delete row"
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
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#f8fafc'
        }}>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
          >
            Cancel
          </button>

          {items.length > 0 && (
            <button
              type="button"
              disabled={isInwarding || isScanning}
              onClick={handleConfirmInward}
              className="btn btn-emerald btn-lg"
              style={{ padding: '10px 24px', fontSize: '14.5px' }}
            >
              <PackageCheck size={18} />
              <span>{isInwarding ? 'Inwarding Stock...' : `Confirm & Inward All ${items.length} Medicines`}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
