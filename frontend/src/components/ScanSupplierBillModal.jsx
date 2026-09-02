import React, { useState, useRef, useEffect } from 'react';
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
  RefreshCw,
  FlipHorizontal,
  FileCheck,
  Building2,
  Calendar,
  Hash,
  Layers,
  ArrowRight,
  TrendingUp,
  Percent,
  Copy,
  Scan,
  Zap,
  Info
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { inventoryAPI } from '../api';

export default function ScanSupplierBillModal({ onClose, onStockInwarded }) {
  // Modes: 'camera' | 'upload' | 'samples'
  const [activeTab, setActiveTab] = useState('camera');
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' | 'user'
  const [cameraFlash, setCameraFlash] = useState(false);
  const [capturedPreview, setCapturedPreview] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState('');
  
  const [isScanning, setIsScanning] = useState(false);
  const [scanStepIndex, setScanStepIndex] = useState(0);
  const [isInwarding, setIsInwarding] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Extracted Bill State
  const [supplierName, setSupplierName] = useState('');
  const [supplierGstin, setSupplierGstin] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [supplierAddress, setSupplierAddress] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [items, setItems] = useState([]);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  const mobileCameraInputRef = useRef(null);

  const scanSteps = [
    'Scanning document boundaries & orientation...',
    'Reading distributor details & GSTIN...',
    'Extracting medicine lines, batch numbers & expiry dates...',
    'Calculating purchase costs, MRP & profit margins...'
  ];

  // Initialize or stop camera stream
  useEffect(() => {
    if (activeTab === 'camera' && !capturedPreview && items.length === 0) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [activeTab, facingMode]);

  const startCamera = async () => {
    stopCamera();
    setError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Camera access is not supported on this browser/device. Please use file upload.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err) {
      console.warn('Camera stream error:', err);
      setCameraActive(false);
      if (activeTab === 'camera') {
        setError('Could not access live camera feed. You can take a photo with the Native Camera button or upload a bill image.');
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const toggleCameraFacing = () => {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    setCameraFlash(true);
    setTimeout(() => setCameraFlash(false), 200);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const base64Image = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedPreview(base64Image);
    stopCamera();

    // Trigger AI Scan
    processScanPayload({ image_base64: base64Image });
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const processSelectedFile = (file) => {
    setSelectedFileName(file.name);
    setError(null);
    setSuccessMessage(null);
    stopCamera();

    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setCapturedPreview(url);
    }

    const formData = new FormData();
    formData.append('bill_image', file);
    processScanPayload(formData);
  };

  const processScanPayload = async (payload) => {
    setIsScanning(true);
    setError(null);
    setSuccessMessage(null);
    setScanStepIndex(0);

    const stepInterval = setInterval(() => {
      setScanStepIndex(prev => (prev < scanSteps.length - 1 ? prev + 1 : prev));
    }, 650);

    try {
      const result = await inventoryAPI.scanSupplierBill(payload);
      clearInterval(stepInterval);

      if (result) {
        setSupplierName(result.supplier_name || 'Wholesale Pharma Supplier');
        setSupplierGstin(result.supplier_gstin || '');
        setSupplierPhone(result.supplier_phone || '');
        setSupplierAddress(result.supplier_address || '');
        setInvoiceNumber(result.invoice_number || `INV-${Date.now().toString().slice(-6)}`);
        setInvoiceDate(result.invoice_date || new Date().toISOString().split('T')[0]);
        setItems(result.items || []);
      }
    } catch (err) {
      clearInterval(stepInterval);
      console.error('Scan error:', err);
      setError(err.message || 'Failed to scan and extract invoice details. Please try again or load a sample preset.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleRetake = () => {
    setCapturedPreview(null);
    setSelectedFileName('');
    setItems([]);
    setError(null);
    if (activeTab === 'camera') {
      startCamera();
    }
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    if (field === 'mrp') {
      updated[index]['selling_price'] = value;
    }
    setItems(updated);
  };

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleDuplicateItem = (index) => {
    const item = items[index];
    const duplicated = {
      ...item,
      batch_number: `${item.batch_number || 'B'}-COPY`,
    };
    const updated = [...items];
    updated.splice(index + 1, 0, duplicated);
    setItems(updated);
  };

  const handleAddItem = () => {
    const newItem = {
      medicine_name: '',
      generic_name: '',
      category: 'General Pharmaceuticals',
      dosage_form: 'Tablet',
      manufacturer: 'Pharma Standard',
      batch_number: `B-${Date.now().toString().slice(-5)}`,
      expiry_date: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      pack_size: 10,
      pack_quantity: 10,
      purchase_price: 50.0,
      mrp: 90.0,
      selling_price: 90.0,
      gst_rate: 12.0,
      rack_location: 'Rack A-1',
      requires_prescription: false
    };
    setItems([...items, newItem]);
  };

  const handleConfirmInward = async () => {
    if (items.length === 0) {
      setError('Please add at least one medicine item to inward into inventory.');
      return;
    }

    for (let i = 0; i < items.length; i++) {
      if (!items[i].medicine_name?.trim()) {
        setError(`Row #${i + 1}: Medicine Name cannot be blank.`);
        return;
      }
      if (!items[i].batch_number?.trim()) {
        setError(`Row #${i + 1}: Batch Number is required for "${items[i].medicine_name}".`);
        return;
      }
    }

    setIsInwarding(true);
    setError(null);

    try {
      const payload = {
        supplier_name: supplierName.trim() || 'Wholesale Supplier',
        supplier_gstin: supplierGstin.trim(),
        supplier_phone: supplierPhone.trim(),
        supplier_address: supplierAddress.trim(),
        invoice_number: invoiceNumber.trim() || `PUR-${Date.now().toString().slice(-6)}`,
        invoice_date: invoiceDate || new Date().toISOString().split('T')[0],
        items: items
      };

      const result = await inventoryAPI.bulkInwardFromBill(payload);

      confetti({
        particleCount: 65,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#0284c7', '#10b981', '#f59e0b', '#8b5cf6']
      });

      setSuccessMessage(result.message || 'Supplier bill successfully processed and inwarded into inventory!');
      setTimeout(() => {
        onStockInwarded?.();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to inward bill to inventory. Please check inputs.');
    } finally {
      setIsInwarding(false);
    }
  };

  // Financial Calculations
  const totalCost = items.reduce((acc, it) => acc + (parseFloat(it.purchase_price || 0) * parseInt(it.pack_quantity || 0)), 0);
  const totalMRP = items.reduce((acc, it) => acc + (parseFloat(it.mrp || 0) * parseInt(it.pack_quantity || 0)), 0);
  const totalPacks = items.reduce((acc, it) => acc + (parseInt(it.pack_quantity || 0)), 0);
  const grossProfit = totalMRP - totalCost;
  const marginPct = totalMRP > 0 ? ((grossProfit / totalMRP) * 100).toFixed(1) : 0;

  return (
    <div className="modal-backdrop" style={{ zIndex: 1100 }}>
      {/* Hidden elements for camera capture */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <div 
        className="modal-content glass-panel" 
        style={{ 
          maxWidth: items.length > 0 ? '1100px' : '780px', 
          width: '96vw', 
          maxHeight: '94vh', 
          display: 'flex', 
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)'
        }}
      >
        {/* Flash Effect on photo snap */}
        {cameraFlash && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: '#ffffff',
            opacity: 0.85,
            zIndex: 9999,
            pointerEvents: 'none',
            transition: 'opacity 0.2s ease-out'
          }} />
        )}

        {/* Modal Header */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #f0f9ff 0%, #ffffff 100%)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #0284c7 0%, #10b981 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)'
            }}>
              <Camera size={22} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Supplier Purchase Bill Scanner
                </h3>
                <span className="badge badge-cyan" style={{ fontSize: '10.5px' }}>
                  <Sparkles size={11} /> AI Multimodal OCR
                </span>
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0' }}>
                Capture photo with camera, upload distributor bill, or test real wholesale invoices
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn btn-secondary btn-sm"
            style={{ width: '32px', height: '32px', padding: 0, borderRadius: '50%' }}
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Subnav Tabs (when not in review table) */}
        {items.length === 0 && !isScanning && (
          <div style={{
            display: 'flex',
            borderBottom: '1px solid #e2e8f0',
            background: '#f8fafc',
            padding: '0 24px'
          }}>
            <button
              onClick={() => { setActiveTab('camera'); startCamera(); }}
              style={{
                padding: '12px 18px',
                fontSize: '13px',
                fontWeight: 700,
                color: activeTab === 'camera' ? '#0284c7' : '#64748b',
                borderBottom: activeTab === 'camera' ? '2.5px solid #0284c7' : '2.5px solid transparent',
                background: 'transparent',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Camera size={16} />
              <span>Live Camera Viewfinder</span>
            </button>

            <button
              onClick={() => { setActiveTab('upload'); stopCamera(); }}
              style={{
                padding: '12px 18px',
                fontSize: '13px',
                fontWeight: 700,
                color: activeTab === 'upload' ? '#0284c7' : '#64748b',
                borderBottom: activeTab === 'upload' ? '2.5px solid #0284c7' : '2.5px solid transparent',
                background: 'transparent',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Upload size={16} />
              <span>Upload Bill Image / PDF</span>
            </button>

            <button
              onClick={() => { setActiveTab('samples'); stopCamera(); }}
              style={{
                padding: '12px 18px',
                fontSize: '13px',
                fontWeight: 700,
                color: activeTab === 'samples' ? '#0284c7' : '#64748b',
                borderBottom: activeTab === 'samples' ? '2.5px solid #0284c7' : '2.5px solid transparent',
                background: 'transparent',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Sparkles size={16} color="#f59e0b" />
              <span>Mangalore Distributor Presets</span>
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {error && (
            <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecdd3', borderRadius: '10px', color: '#e11d48', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div style={{ padding: '12px 16px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '10px', color: '#059669', fontSize: '13.5px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckCircle2 size={20} style={{ flexShrink: 0 }} />
              <span>{successMessage}</span>
            </div>
          )}

          {/* TAB 1: LIVE CAMERA VIEWFINDER */}
          {items.length === 0 && !isScanning && activeTab === 'camera' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center' }}>
              
              <div style={{
                position: 'relative',
                width: '100%',
                maxWidth: '640px',
                height: '380px',
                background: '#0f172a',
                borderRadius: '16px',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
                border: '2px solid #0284c7'
              }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />

                {/* Document Alignment Frame Guides */}
                <div style={{
                  position: 'absolute',
                  inset: '24px',
                  border: '2px dashed rgba(255, 255, 255, 0.65)',
                  borderRadius: '12px',
                  pointerEvents: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '12px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ width: '20px', height: '20px', borderTop: '3px solid #10b981', borderLeft: '3px solid #10b981' }} />
                    <div style={{ width: '20px', height: '20px', borderTop: '3px solid #10b981', borderRight: '3px solid #10b981' }} />
                  </div>
                  
                  <div style={{ textAlign: 'center', background: 'rgba(0, 0, 0, 0.55)', padding: '6px 14px', borderRadius: '20px', alignSelf: 'center', backdropFilter: 'blur(4px)' }}>
                    <span style={{ fontSize: '11.5px', color: '#f8fafc', fontWeight: 600, letterSpacing: '0.02em' }}>
                      📐 Align Wholesale Invoice within frame
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ width: '20px', height: '20px', borderBottom: '3px solid #10b981', borderLeft: '3px solid #10b981' }} />
                    <div style={{ width: '20px', height: '20px', borderBottom: '3px solid #10b981', borderRight: '3px solid #10b981' }} />
                  </div>
                </div>

                {/* Camera Control Overlay */}
                <div style={{ position: 'absolute', top: '14px', right: '14px', display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={toggleCameraFacing}
                    className="btn btn-secondary btn-sm"
                    style={{ background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(6px)', padding: '6px 10px', fontSize: '11px' }}
                    title="Flip front/rear camera"
                  >
                    <FlipHorizontal size={13} /> {facingMode === 'environment' ? 'Rear Cam' : 'Front Cam'}
                  </button>
                </div>
              </div>

              {/* Camera Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="btn btn-emerald btn-lg"
                  style={{
                    padding: '12px 32px',
                    fontSize: '15px',
                    borderRadius: '30px',
                    boxShadow: '0 6px 20px rgba(16, 185, 129, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                >
                  <Camera size={20} />
                  <span>Capture & Scan Invoice</span>
                </button>

                {/* Fallback Native Camera Trigger for mobile phones */}
                <button
                  type="button"
                  onClick={() => mobileCameraInputRef.current?.click()}
                  className="btn btn-secondary btn-lg"
                  style={{ borderRadius: '30px', fontSize: '14px' }}
                >
                  <Scan size={16} color="#0284c7" />
                  <span>Native Device Camera</span>
                </button>
                <input
                  type="file"
                  ref={mobileCameraInputRef}
                  accept="image/*"
                  capture="environment"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
              </div>

              <div style={{ fontSize: '12px', color: '#64748b', textAlign: 'center' }}>
                Hold camera steady with adequate lighting over the supplier tax invoice for highest extraction accuracy.
              </div>
            </div>
          )}

          {/* TAB 2: FILE UPLOAD DROPZONE */}
          {items.length === 0 && !isScanning && activeTab === 'upload' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#059669'; }}
                onDragLeave={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#0284c7'; }}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file) processSelectedFile(file);
                }}
                style={{
                  border: '2px dashed #0284c7',
                  background: '#f0f9ff',
                  borderRadius: '16px',
                  padding: '36px 20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*,.pdf"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />

                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#ffffff', border: '1px solid #bae6fd', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.15)' }}>
                  <Upload size={26} color="#0284c7" />
                </div>

                <div style={{ fontSize: '16px', fontWeight: 800, color: '#0369a1' }}>
                  {selectedFileName ? `Selected: ${selectedFileName}` : 'Drag & Drop or Click to Upload Supplier Bill'}
                </div>
                <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '6px' }}>
                  Supports high-resolution JPG, PNG, WEBP and Wholesale PDF invoices
                </div>
                <div style={{ marginTop: '14px' }}>
                  <span className="badge badge-emerald">
                    <FileCheck size={12} /> Auto-detects line items, MRP, batch & expiry
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MANGALORE DISTRIBUTOR PRESETS */}
          {items.length === 0 && !isScanning && activeTab === 'samples' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '13px', color: '#475569', fontWeight: 600 }}>
                Select an authentic pharmaceutical wholesale invoice archetype to immediately test automatic parsing and inwarding:
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
                
                {/* Preset 1: Sai Radha Pharma */}
                <div
                  onClick={() => processScanPayload({ sample_type: 'sairadha' })}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px solid #bae6fd',
                    background: 'linear-gradient(135deg, #f0f9ff 0%, #ffffff 100%)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span className="badge badge-cyan" style={{ fontSize: '11px' }}>Mangalore DL #167244</span>
                    <Sparkles size={14} color="#0284c7" />
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                    Sai Radha Pharma (India) Pvt. Ltd.
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>
                    Karangalpady, Mangalore • Invoices: Augmentin 625, Asthalin, Aerocort, Calpol 650, Cilacar 10
                  </div>
                </div>

                {/* Preset 2: G.K. Pharma & Sri Kateel */}
                <div
                  onClick={() => processScanPayload({ sample_type: 'gkpharma' })}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px solid #a7f3d0',
                    background: 'linear-gradient(135deg, #ecfdf5 0%, #ffffff 100%)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span className="badge badge-emerald" style={{ fontSize: '11px' }}>K.S. Rao Rd / Sharavu</span>
                    <Sparkles size={14} color="#059669" />
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                    G.K. Pharma & Sri Kateel Agencies
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>
                    K.S. Rao Road, Mangalore • Invoices: Allercet M, Aristomol, Pantocid 40, Telma 40
                  </div>
                </div>

                {/* Preset 3: K.P. Associates & Shakthi Life Lines */}
                <div
                  onClick={() => processScanPayload({ sample_type: 'kpassociates' })}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px solid #fde68a',
                    background: 'linear-gradient(135deg, #fffbeb 0%, #ffffff 100%)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span className="badge badge-amber" style={{ fontSize: '11px' }}>Kottara Chowki & Kankanady</span>
                    <Sparkles size={14} color="#d97706" />
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                    K P Associates & Shakthi Life Lines
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>
                    Mangalore • Invoices: Jay Cotton, Cipladine Ointment, Steripad Gauze, Surgi Spirit
                  </div>
                </div>

                {/* Preset 4: Micro Labs & Sun Pharma */}
                <div
                  onClick={() => processScanPayload({ sample_type: 'microlabs' })}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px solid #e9d5ff',
                    background: 'linear-gradient(135deg, #faf5ff 0%, #ffffff 100%)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span className="badge badge-purple" style={{ fontSize: '11px' }}>Hampankatta Distributors</span>
                    <Sparkles size={14} color="#7c3aed" />
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                    Micro Labs & Sun Pharma Distributors
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>
                    Hampankatta, Mangalore • Invoices: Dolo 650, Pan 40, Montair LC, Becosules Z
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* SCANNING PROGRESS ANIMATION */}
          {isScanning && (
            <div style={{ padding: '36px 20px', textAlign: 'center', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <RefreshCw size={30} color="#0284c7" className="spin-animation" />
              </div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                AI Document Intelligence Engine Processing Invoice...
              </div>
              <div style={{ fontSize: '13px', color: '#0284c7', fontWeight: 700, marginTop: '8px' }}>
                {scanSteps[scanStepIndex]}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                Extracting medicine brands, salt composition, batch numbers, expiry dates, pack quantities & rates
              </div>
            </div>
          )}

          {/* REVIEW GRID: DETECTED BILL & LINE ITEMS */}
          {items.length > 0 && !isScanning && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Top Banner: Financial Metrics & Action summary */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: '10px',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                padding: '14px 18px',
                borderRadius: '12px'
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#166534', fontWeight: 700, textTransform: 'uppercase' }}>
                    Total Inward Cost
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#15803d' }}>
                    ₹{totalCost.toFixed(2)}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: '#166534', fontWeight: 700, textTransform: 'uppercase' }}>
                    Total Retail Value (MRP)
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                    ₹{totalMRP.toFixed(2)}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: '#166534', fontWeight: 700, textTransform: 'uppercase' }}>
                    Gross Profit Margin
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#0284c7', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <TrendingUp size={16} /> {marginPct}%
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: '#166534', fontWeight: 700, textTransform: 'uppercase' }}>
                    Total Units
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#475569' }}>
                    {totalPacks} Packs ({items.length} Lines)
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={handleRetake}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '11.5px' }}
                  >
                    <RefreshCw size={12} /> Scan Another Bill
                  </button>
                </div>
              </div>

              {/* Distributor Metadata Form */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px',
                background: '#f8fafc',
                padding: '14px 18px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0'
              }}>
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                    <Building2 size={13} color="#0284c7" /> Distributor / Supplier Name
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    style={{ height: '34px', fontSize: '13px', fontWeight: 600 }}
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                    <Hash size={13} color="#0284c7" /> Supplier GSTIN
                  </label>
                  <input
                    type="text"
                    className="input-field mono"
                    style={{ height: '34px', fontSize: '13px' }}
                    value={supplierGstin}
                    placeholder="29AAQCS0711F1ZC"
                    onChange={(e) => setSupplierGstin(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                    <FileText size={13} color="#0284c7" /> Invoice / Bill #
                  </label>
                  <input
                    type="text"
                    className="input-field mono"
                    style={{ height: '34px', fontSize: '13px', fontWeight: 700 }}
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                    <Calendar size={13} color="#0284c7" /> Invoice Date
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

              {/* Medicine Batches Table */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>
                    Extracted Medicine Batches ({items.length} Line Items)
                  </div>
                  <button onClick={handleAddItem} className="btn btn-secondary btn-sm" style={{ fontSize: '11px' }}>
                    <Plus size={12} color="#0284c7" /> + Add Row
                  </button>
                </div>

                <div className="data-table-container" style={{ maxHeight: '310px', overflowY: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: '22%' }}>Medicine Brand & Composition</th>
                        <th style={{ width: '11%' }}>Dosage Form</th>
                        <th style={{ width: '12%' }}>Batch #</th>
                        <th style={{ width: '12%' }}>Expiry</th>
                        <th style={{ width: '7%', textAlign: 'center' }}>Packs</th>
                        <th style={{ width: '6%', textAlign: 'center' }}>Size</th>
                        <th style={{ width: '9%', textAlign: 'right' }}>Cost (₹)</th>
                        <th style={{ width: '9%', textAlign: 'right' }}>MRP (₹)</th>
                        <th style={{ width: '9%', textAlign: 'right' }}>Sell (₹)</th>
                        <th style={{ width: '3%', textAlign: 'center' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => (
                        <tr key={idx}>
                          {/* Medicine Name */}
                          <td>
                            <input
                              type="text"
                              className="input-field"
                              style={{ height: '30px', fontSize: '12px', fontWeight: 700 }}
                              value={item.medicine_name}
                              placeholder="Medicine Name"
                              onChange={(e) => handleItemChange(idx, 'medicine_name', e.target.value)}
                            />
                            <input
                              type="text"
                              className="input-field"
                              style={{ height: '24px', fontSize: '10.5px', color: '#64748b', marginTop: '2px', border: 'none', background: 'transparent', padding: '0 2px' }}
                              value={item.generic_name || ''}
                              placeholder="Salt composition / generic"
                              onChange={(e) => handleItemChange(idx, 'generic_name', e.target.value)}
                            />
                          </td>

                          {/* Dosage Form */}
                          <td>
                            <select
                              className="input-field"
                              style={{ height: '30px', fontSize: '11px', padding: '2px 4px' }}
                              value={item.dosage_form || 'Tablet'}
                              onChange={(e) => handleItemChange(idx, 'dosage_form', e.target.value)}
                            >
                              <option value="Tablet">Tablet</option>
                              <option value="Capsule">Capsule</option>
                              <option value="Syrup">Syrup</option>
                              <option value="Inhaler">Inhaler</option>
                              <option value="Drops">Drops</option>
                              <option value="Ointment">Ointment</option>
                              <option value="Injection">Injection</option>
                              <option value="Device">Device / Surg</option>
                              <option value="Other">Other</option>
                            </select>
                          </td>

                          {/* Batch # */}
                          <td>
                            <input
                              type="text"
                              className="input-field mono"
                              style={{ height: '30px', fontSize: '12px', fontWeight: 700, color: '#0369a1' }}
                              value={item.batch_number}
                              placeholder="Batch #"
                              onChange={(e) => handleItemChange(idx, 'batch_number', e.target.value)}
                            />
                          </td>

                          {/* Expiry Date */}
                          <td>
                            <input
                              type="date"
                              className="input-field"
                              style={{ height: '30px', fontSize: '11px', padding: '2px 4px' }}
                              value={item.expiry_date}
                              onChange={(e) => handleItemChange(idx, 'expiry_date', e.target.value)}
                            />
                          </td>

                          {/* Packs Qty */}
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="number"
                              min="1"
                              className="input-field mono"
                              style={{ height: '30px', fontSize: '12px', width: '52px', textAlign: 'center', fontWeight: 800 }}
                              value={item.pack_quantity}
                              onChange={(e) => handleItemChange(idx, 'pack_quantity', parseInt(e.target.value) || 1)}
                            />
                          </td>

                          {/* Pack Size */}
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="number"
                              min="1"
                              className="input-field mono"
                              style={{ height: '30px', fontSize: '12px', width: '46px', textAlign: 'center' }}
                              value={item.pack_size}
                              onChange={(e) => handleItemChange(idx, 'pack_size', parseInt(e.target.value) || 1)}
                            />
                          </td>

                          {/* Purchase Price */}
                          <td style={{ textAlign: 'right' }}>
                            <input
                              type="number"
                              step="0.01"
                              className="input-field mono"
                              style={{ height: '30px', fontSize: '12px', width: '68px', textAlign: 'right', fontWeight: 600 }}
                              value={item.purchase_price}
                              onChange={(e) => handleItemChange(idx, 'purchase_price', parseFloat(e.target.value) || 0)}
                            />
                          </td>

                          {/* MRP */}
                          <td style={{ textAlign: 'right' }}>
                            <input
                              type="number"
                              step="0.01"
                              className="input-field mono"
                              style={{ height: '30px', fontSize: '12px', width: '68px', textAlign: 'right' }}
                              value={item.mrp}
                              onChange={(e) => handleItemChange(idx, 'mrp', parseFloat(e.target.value) || 0)}
                            />
                          </td>

                          {/* Selling Price */}
                          <td style={{ textAlign: 'right' }}>
                            <input
                              type="number"
                              step="0.01"
                              className="input-field mono"
                              style={{ height: '30px', fontSize: '12px', width: '68px', textAlign: 'right', fontWeight: 800, color: '#059669' }}
                              value={item.selling_price}
                              onChange={(e) => handleItemChange(idx, 'selling_price', parseFloat(e.target.value) || 0)}
                            />
                          </td>

                          {/* Row Action Buttons */}
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <button
                                type="button"
                                onClick={() => handleDuplicateItem(idx)}
                                style={{ background: 'transparent', border: 'none', color: '#0284c7', cursor: 'pointer', padding: '2px' }}
                                title="Duplicate Row"
                              >
                                <Copy size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                style={{ background: 'transparent', border: 'none', color: '#e11d48', cursor: 'pointer', padding: '2px' }}
                                title="Delete Row"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
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
          padding: '14px 24px',
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
              style={{ padding: '10px 28px', fontSize: '14.5px', borderRadius: '10px' }}
            >
              <PackageCheck size={18} />
              <span>{isInwarding ? 'Inwarding Stock into Inventory...' : `Confirm & Inward All ${items.length} Medicines (₹${totalCost.toFixed(2)})`}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
