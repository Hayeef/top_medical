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
  RotateCw,
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
  Info,
  Key,
  Eye,
  EyeOff,
  Edit3,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Search,
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';
import Tesseract from 'tesseract.js';
import { inventoryAPI } from '../api';
import { parseOCRTextToInvoice, preprocessBillImage, inferDosageAndCategory, parsePackSize, suggestRackLocation } from '../utils/billParser';

export default function ScanSupplierBillModal({ onClose, onStockInwarded }) {
  // Modes: 'upload' | 'camera' | 'samples'
  const [activeTab, setActiveTab] = useState('upload');
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' | 'user'
  const [cameraFlash, setCameraFlash] = useState(false);
  
  // Image states, Zoom & Rotation
  const [capturedPreview, setCapturedPreview] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [rotationAngle, setRotationAngle] = useState(0); // 0, 90, 180, 270
  const [imageZoom, setImageZoom] = useState(1);
  const [loadedImageElement, setLoadedImageElement] = useState(null);
  
  // Scan / Progress State
  const [isScanning, setIsScanning] = useState(false);
  const [scanStepMessage, setScanStepMessage] = useState('Initializing Document OCR Engine...');
  const [ocrProgress, setOcrProgress] = useState(0);
  const [isInwarding, setIsInwarding] = useState(false);
  const [error, setError] = useState(null);
  const [warningMessage, setWarningMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Raw OCR Inspector & Editor state
  const [rawOcrText, setRawOcrText] = useState('');
  const [showRawText, setShowRawText] = useState(false);

  // Gemini API Key state
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem('top_medical_gemini_key') || '');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  // Extracted Bill State
  const [supplierName, setSupplierName] = useState('');
  const [supplierGstin, setSupplierGstin] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [supplierAddress, setSupplierAddress] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [items, setItems] = useState([]);

  // Database medicine catalog for autocomplete
  const [dbMedicines, setDbMedicines] = useState([]);
  const [activeSearchRow, setActiveSearchRow] = useState(null);
  const [medicineSuggestions, setMedicineSuggestions] = useState([]);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  const mobileCameraInputRef = useRef(null);

  // Fetch medicines for instant intelligent autocomplete
  useEffect(() => {
    inventoryAPI.getMedicines?.({ limit: 500 })
      .then(res => {
        const list = res.results || res || [];
        setDbMedicines(list);
      })
      .catch(err => console.warn('Could not preload medicines cache:', err));
  }, []);

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

  const handleSaveApiKey = (key) => {
    setGeminiApiKey(key);
    localStorage.setItem('top_medical_gemini_key', key.trim());
    setShowApiKeyModal(false);
  };

  // Rotate canvas image 90 deg clockwise
  const handleRotateImage = () => {
    const newAngle = (rotationAngle + 90) % 360;
    setRotationAngle(newAngle);
    if (loadedImageElement) {
      const rotatedDataUrl = getRotatedImageDataUrl(loadedImageElement, newAngle);
      setCapturedPreview(rotatedDataUrl);
      const newImg = new Image();
      newImg.onload = () => {
        setLoadedImageElement(newImg);
        runOCRAndParse(rotatedDataUrl, null, newImg);
      };
      newImg.src = rotatedDataUrl;
    }
  };

  const getRotatedImageDataUrl = (img, angle) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (angle === 90 || angle === 270) {
      canvas.width = img.naturalHeight || img.height;
      canvas.height = img.naturalWidth || img.width;
    } else {
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
    }

    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((angle * Math.PI) / 180);
    ctx.drawImage(img, -(img.naturalWidth || img.width) / 2, -(img.naturalHeight || img.height) / 2);

    return canvas.toDataURL('image/jpeg', 0.95);
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

    const base64Image = canvas.toDataURL('image/jpeg', 0.95);
    setCapturedPreview(base64Image);
    setRotationAngle(0);
    setImageZoom(1);
    stopCamera();

    const img = new Image();
    img.onload = () => {
      setLoadedImageElement(img);
      runOCRAndParse(base64Image, null, img);
    };
    img.src = base64Image;
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
    setWarningMessage(null);
    setSuccessMessage(null);
    setRotationAngle(0);
    setImageZoom(1);
    stopCamera();

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target.result;
        setCapturedPreview(dataUrl);
        const img = new Image();
        img.onload = () => {
          setLoadedImageElement(img);
          runOCRAndParse(dataUrl, file, img);
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    } else {
      // PDF or document
      runOCRAndParse(file, file, null);
    }
  };

  const runOCRAndParse = async (imageSource, originalFile = null, imgElement = null) => {
    setIsScanning(true);
    setError(null);
    setWarningMessage(null);
    setSuccessMessage(null);
    setOcrProgress(0);

    let clientExtractedText = '';
    let clientParsedBill = null;

    try {
      setScanStepMessage('Pre-processing image contrast & running high-accuracy OCR...');
      
      let ocrInput = imageSource;
      if (imgElement) {
        try {
          ocrInput = preprocessBillImage(imgElement);
        } catch (prepErr) {
          console.warn('Preprocessing notice:', prepErr);
        }
      }

      const { data } = await Tesseract.recognize(
        ocrInput,
        'eng',
        {
          logger: m => {
            if (m.status === 'recognizing text') {
              const pct = Math.round((m.progress || 0) * 100);
              setOcrProgress(pct);
              setScanStepMessage(`OCR Engine reading bill characters (${pct}%)...`);
            }
          }
        }
      );

      clientExtractedText = data?.text || '';
      setRawOcrText(clientExtractedText);

      if (clientExtractedText.trim()) {
        setScanStepMessage('Extracting medicines, batch numbers, HSN, rates & MRP...');
        clientParsedBill = parseOCRTextToInvoice(clientExtractedText);
      }
    } catch (tessErr) {
      console.warn('Client-side Tesseract OCR notice:', tessErr);
    }

    // Call backend OCR / Gemini AI Endpoint with extracted text & image
    try {
      setScanStepMessage('Verifying pharmaceutical catalog & prices with backend...');
      
      const formData = new FormData();
      if (originalFile) {
        formData.append('bill_image', originalFile);
      } else if (typeof imageSource === 'string' && imageSource.startsWith('data:image')) {
        formData.append('image_base64', imageSource);
      }
      
      if (clientExtractedText) {
        formData.append('ocr_text', clientExtractedText);
      }
      if (geminiApiKey) {
        formData.append('gemini_api_key', geminiApiKey);
      }

      const backendResult = await inventoryAPI.scanSupplierBill(formData).catch(err => {
        console.warn('Backend OCR call error:', err);
        return null;
      });

      // Priority 1: Backend AI result if it extracted items
      if (backendResult && backendResult.items && backendResult.items.length > 0) {
        applyExtractedInvoice(backendResult);
        setSuccessMessage(`Successfully extracted ${backendResult.items.length} medicines from bill!`);
        return;
      }

      // Priority 2: Client Tesseract OCR parsed result if it found lines
      if (clientParsedBill && clientParsedBill.items && clientParsedBill.items.length > 0) {
        applyExtractedInvoice(clientParsedBill);
        setSuccessMessage(`Successfully extracted ${clientParsedBill.items.length} medicines from bill!`);
        return;
      }

      // Priority 3: Set metadata from OCR with empty items ready for manual rows
      const baseMeta = clientParsedBill || backendResult || {};
      setSupplierName(baseMeta.supplier_name && baseMeta.supplier_name !== 'Wholesale Pharma Supplier' ? baseMeta.supplier_name : (supplierName || 'Wholesale Supplier'));
      setSupplierGstin(baseMeta.supplier_gstin || supplierGstin || '');
      setSupplierPhone(baseMeta.supplier_phone || '');
      setSupplierAddress(baseMeta.supplier_address || '');
      setInvoiceNumber(baseMeta.invoice_number || invoiceNumber || `INV-${Date.now().toString().slice(-6)}`);
      setInvoiceDate(baseMeta.invoice_date || invoiceDate || new Date().toISOString().split('T')[0]);
      setItems([]);

      setWarningMessage(
        'OCR completed. No tabular medicine rows were automatically matched. If the bill was taken sideways, click "Rotate 90°" above to re-scan, or click "+ Add Row" to quickly type items from your preview.'
      );
    } catch (err) {
      console.error('Scan processing error:', err);
      setError(err.message || 'Failed to extract bill data. Please check image clarity or enter items manually.');
    } finally {
      setIsScanning(false);
    }
  };

  const applyExtractedInvoice = (data) => {
    if (!data) return;
    setSupplierName(data.supplier_name || 'Wholesale Pharma Supplier');
    setSupplierGstin(data.supplier_gstin || '');
    setSupplierPhone(data.supplier_phone || '');
    setSupplierAddress(data.supplier_address || '');
    setInvoiceNumber(data.invoice_number || `INV-${Date.now().toString().slice(-6)}`);
    setInvoiceDate(data.invoice_date || new Date().toISOString().split('T')[0]);
    setItems(data.items || []);
    if (data.warning) {
      setWarningMessage(data.warning);
    }
  };

  // Re-parse raw text if user edited/pasted text
  const handleReParseText = () => {
    if (!rawOcrText.trim()) return;
    const parsed = parseOCRTextToInvoice(rawOcrText);
    applyExtractedInvoice(parsed);
    setSuccessMessage(`Extracted ${parsed.items.length} medicines from text!`);
  };

  // 1-Click Add from Raw OCR line
  const handleAddFromOcrLine = (lineText) => {
    if (!lineText || !lineText.trim()) return;
    const parsed = parseOCRTextToInvoice(lineText);
    if (parsed.items && parsed.items.length > 0) {
      setItems(prev => [...prev, ...parsed.items]);
      setSuccessMessage(`Added "${parsed.items[0].medicine_name}" from bill line.`);
    } else {
      const { dosage, category, rxRequired } = inferDosageAndCategory(lineText);
      const cleanName = lineText.replace(/^\d+[\s.)|-]+/, '').trim();
      const newItem = {
        medicine_name: cleanName,
        generic_name: cleanName,
        category,
        dosage_form: dosage,
        manufacturer: 'Standard Pharma',
        hsn_code: '3004',
        batch_number: `B-${Date.now().toString().slice(-5)}`,
        expiry_date: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        pack_size: parsePackSize(cleanName),
        pack_quantity: 1,
        purchase_price: 50.0,
        mrp: 90.0,
        selling_price: 90.0,
        gst_rate: 12.0,
        rack_location: suggestRackLocation(category, dosage),
        requires_prescription: rxRequired
      };
      setItems(prev => [...prev, newItem]);
    }
  };

  const handleRetake = () => {
    setCapturedPreview(null);
    setSelectedFileName('');
    setLoadedImageElement(null);
    setRotationAngle(0);
    setImageZoom(1);
    setItems([]);
    setRawOcrText('');
    setError(null);
    setWarningMessage(null);
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

    // Dynamic autocomplete suggestion for medicine name
    if (field === 'medicine_name' && value.length >= 2 && dbMedicines.length > 0) {
      const query = value.toUpperCase();
      const matches = dbMedicines.filter(m => m.name.toUpperCase().includes(query)).slice(0, 5);
      setMedicineSuggestions(matches);
      setActiveSearchRow(index);
    } else if (field === 'medicine_name' && value.length < 2) {
      setMedicineSuggestions([]);
      setActiveSearchRow(null);
    }
  };

  const handleSelectMedicineSuggestion = (rowIndex, med) => {
    const updated = [...items];
    updated[rowIndex]['medicine_name'] = med.name;
    updated[rowIndex]['generic_name'] = med.generic_name || med.name;
    updated[rowIndex]['dosage_form'] = med.dosage_form || updated[rowIndex]['dosage_form'];
    updated[rowIndex]['category'] = med.category?.name || updated[rowIndex]['category'];
    updated[rowIndex]['hsn_code'] = med.hsn_code || updated[rowIndex]['hsn_code'];
    updated[rowIndex]['rack_location'] = med.rack_location || updated[rowIndex]['rack_location'];
    setItems(updated);
    setActiveSearchRow(null);
    setMedicineSuggestions([]);
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
      manufacturer: 'Standard Pharma',
      batch_number: `B-${Date.now().toString().slice(-5)}`,
      expiry_date: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      pack_size: 10,
      pack_quantity: 1,
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
        particleCount: 75,
        spread: 90,
        origin: { y: 0.6 },
        colors: ['#0284c7', '#10b981', '#f59e0b', '#8b5cf6']
      });

      setSuccessMessage(result.message || 'Supplier bill successfully processed and inwarded into inventory!');
      setTimeout(() => {
        onStockInwarded?.();
        onClose();
      }, 1400);
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

  // Split lines for inspector
  const ocrLines = rawOcrText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  return (
    <div className="modal-backdrop" style={{ zIndex: 1100 }}>
      {/* Hidden elements for camera capture */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <div 
        className="modal-content glass-panel" 
        style={{ 
          maxWidth: items.length > 0 || capturedPreview ? '1280px' : '820px', 
          width: '98vw', 
          maxHeight: '95vh', 
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
          padding: '14px 22px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #f0f9ff 0%, #ffffff 100%)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0284c7 0%, #10b981 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)'
            }}>
              <Camera size={20} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '16.5px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Supplier Purchase Bill Scanner
                </h3>
                <span className="badge badge-cyan" style={{ fontSize: '10.5px' }}>
                  <Sparkles size={11} /> AI OCR + Multi-Format
                </span>
              </div>
              <p style={{ fontSize: '11.5px', color: '#64748b', margin: '2px 0 0' }}>
                Capture photo with camera, upload distributor bill, or test real wholesale invoices
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setShowApiKeyModal(true)}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '11px', padding: '4px 10px', gap: '5px' }}
              title="Google Gemini AI Vision Key Settings"
            >
              <Key size={13} color={geminiApiKey ? '#059669' : '#64748b'} />
              <span>{geminiApiKey ? 'AI Vision Active' : 'AI Vision Key (Optional)'}</span>
            </button>

            <button
              onClick={onClose}
              className="btn btn-secondary btn-sm"
              style={{ width: '32px', height: '32px', padding: 0, borderRadius: '50%' }}
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Gemini API Key Modal */}
        {showApiKeyModal && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}>
            <div style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '520px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Key size={18} color="#0284c7" /> Google Gemini Vision Key (Optional)
                </h4>
                <button onClick={() => setShowApiKeyModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={18} />
                </button>
              </div>

              <p style={{ fontSize: '12.5px', color: '#64748b', lineHeight: '1.5', margin: '0 0 16px' }}>
                Top Medical already includes our built-in <strong>High-Accuracy Optical OCR Engine</strong> with Indian pharma medicine database matching. For AI handwriting recognition and skewed bill processing, you can paste your free Google AI Studio key below:
              </p>

              <input
                type="password"
                className="input-field"
                placeholder="AIzaSy..."
                defaultValue={geminiApiKey}
                id="gemini_key_input"
                style={{ marginBottom: '16px' }}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => handleSaveApiKey('')}
                  className="btn btn-secondary btn-sm"
                >
                  Clear Key
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const val = document.getElementById('gemini_key_input')?.value || '';
                    handleSaveApiKey(val);
                  }}
                  className="btn btn-primary btn-sm"
                >
                  Save Key
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Subnav Tabs (when no bill is being reviewed) */}
        {items.length === 0 && !capturedPreview && !isScanning && (
          <div style={{
            display: 'flex',
            borderBottom: '1px solid #e2e8f0',
            background: '#f8fafc',
            padding: '0 22px'
          }}>
            <button
              type="button"
              onClick={() => { setActiveTab('upload'); setError(null); }}
              style={{
                padding: '12px 18px',
                border: 'none',
                background: 'transparent',
                fontWeight: 700,
                fontSize: '13px',
                color: activeTab === 'upload' ? '#0284c7' : '#64748b',
                borderBottom: activeTab === 'upload' ? '2.5px solid #0284c7' : '2.5px solid transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Upload size={16} /> Upload Bill Image / PDF
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('camera'); setError(null); }}
              style={{
                padding: '12px 18px',
                border: 'none',
                background: 'transparent',
                fontWeight: 700,
                fontSize: '13px',
                color: activeTab === 'camera' ? '#0284c7' : '#64748b',
                borderBottom: activeTab === 'camera' ? '2.5px solid #0284c7' : '2.5px solid transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Camera size={16} /> Live Camera Scanner
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('samples'); setError(null); }}
              style={{
                padding: '12px 18px',
                border: 'none',
                background: 'transparent',
                fontWeight: 700,
                fontSize: '13px',
                color: activeTab === 'samples' ? '#0284c7' : '#64748b',
                borderBottom: activeTab === 'samples' ? '2.5px solid #0284c7' : '2.5px solid transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Sparkles size={16} /> Test Sample Wholesale Bills
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div style={{ padding: '18px 22px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {error && (
            <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecdd3', borderRadius: '10px', color: '#e11d48', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {warningMessage && (
            <div style={{ padding: '12px 16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', color: '#b45309', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Info size={18} style={{ flexShrink: 0 }} />
                <span>{warningMessage}</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {capturedPreview && (
                  <button
                    type="button"
                    onClick={handleRotateImage}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '11.5px', background: '#ffffff', padding: '4px 10px', gap: '4px' }}
                  >
                    <RotateCw size={12} /> Rotate 90° & Re-Scan
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="btn btn-primary btn-sm"
                  style={{ fontSize: '11.5px', padding: '4px 10px' }}
                >
                  + Add First Medicine
                </button>
              </div>
            </div>
          )}

          {successMessage && (
            <div style={{ padding: '12px 16px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '10px', color: '#059669', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
              <span>{successMessage}</span>
            </div>
          )}

          {/* TAB 1: FILE UPLOAD DROPZONE */}
          {items.length === 0 && !capturedPreview && !isScanning && activeTab === 'upload' && (
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
                  padding: '38px 20px',
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
                  Supports high-resolution JPG, PNG, WEBP, and wholesale PDF invoices
                </div>
                <div style={{ marginTop: '14px' }}>
                  <span className="badge badge-emerald">
                    <FileCheck size={12} /> Extracts medicine names, batches, expiry, rates & MRPs directly from bill image
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LIVE CAMERA SCANNER */}
          {items.length === 0 && !capturedPreview && !isScanning && activeTab === 'camera' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{
                position: 'relative',
                background: '#090d16',
                borderRadius: '14px',
                overflow: 'hidden',
                aspectRatio: '16/10',
                maxHeight: '380px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <video
                  ref={videoRef}
                  playsInline
                  autoPlay
                  muted
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />

                {/* Camera Viewfinder Overlay */}
                <div style={{
                  position: 'absolute',
                  inset: '20px',
                  border: '2px dashed rgba(255, 255, 255, 0.65)',
                  borderRadius: '12px',
                  pointerEvents: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '12px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', color: '#38bdf8', background: 'rgba(0,0,0,0.6)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                      [ INVOICE BOUNDARY ]
                    </span>
                    <span style={{ fontSize: '11px', color: '#4ade80', background: 'rgba(0,0,0,0.6)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                      HD 1080P OCR
                    </span>
                  </div>
                  <div style={{ textAlign: 'center', fontSize: '12px', color: '#ffffff', background: 'rgba(0,0,0,0.6)', padding: '4px 10px', borderRadius: '6px', margin: '0 auto' }}>
                    Align supplier bill inside frame and snap photo
                  </div>
                </div>

                {/* Camera Flip Button */}
                <button
                  type="button"
                  onClick={toggleCameraFacing}
                  style={{
                    position: 'absolute',
                    top: '14px',
                    right: '14px',
                    background: 'rgba(15, 23, 42, 0.75)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: '#ffffff',
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                  title="Switch Camera"
                >
                  <FlipHorizontal size={18} />
                </button>
              </div>

              {/* Camera Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={capturePhoto}
                  disabled={!cameraActive}
                  className="btn btn-primary btn-lg"
                  style={{ padding: '12px 32px', fontSize: '15px', borderRadius: '30px', boxShadow: '0 8px 20px rgba(2, 132, 199, 0.35)' }}
                >
                  <Camera size={20} /> Snap & Scan Bill
                </button>

                {/* Fallback Native Mobile Camera Trigger */}
                <input
                  type="file"
                  ref={mobileCameraInputRef}
                  accept="image/*"
                  capture="environment"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                <button
                  type="button"
                  onClick={() => mobileCameraInputRef.current?.click()}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '12px' }}
                >
                  Use Device Camera App
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: SAMPLE PRESETS */}
          {items.length === 0 && !capturedPreview && !isScanning && activeTab === 'samples' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '13px', color: '#475569', fontWeight: 600 }}>
                Select an authentic pharmaceutical wholesale invoice archetype to test automatic inwarding:
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
                
                {/* Preset 1: Sai Radha Pharma */}
                <div
                  onClick={async () => {
                    setIsScanning(true);
                    try {
                      const res = await inventoryAPI.scanSupplierBill({ sample_type: 'sairadha' });
                      applyExtractedInvoice(res);
                    } finally { setIsScanning(false); }
                  }}
                  style={{ padding: '16px', borderRadius: '12px', border: '1px solid #bae6fd', background: 'linear-gradient(135deg, #f0f9ff 0%, #ffffff 100%)', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span className="badge badge-cyan" style={{ fontSize: '11px' }}>Pharma Bill #1</span>
                    <Sparkles size={14} color="#0284c7" />
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                    Sai Radha Pharma (India) Pvt. Ltd.
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>
                    Mangalore • Augmentin 625, Asthalin, Aerocort, Calpol 650, Cilacar
                  </div>
                </div>

                {/* Preset 2: G.K. Pharma & Sri Kateel */}
                <div
                  onClick={async () => {
                    setIsScanning(true);
                    try {
                      const res = await inventoryAPI.scanSupplierBill({ sample_type: 'gkpharma' });
                      applyExtractedInvoice(res);
                    } finally { setIsScanning(false); }
                  }}
                  style={{ padding: '16px', borderRadius: '12px', border: '1px solid #a7f3d0', background: 'linear-gradient(135deg, #ecfdf5 0%, #ffffff 100%)', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span className="badge badge-emerald" style={{ fontSize: '11px' }}>Pharma Bill #2</span>
                    <Sparkles size={14} color="#059669" />
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                    G.K. Pharma & Sri Kateel Agencies
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>
                    K.S. Rao Road • Allercet M, Aristomol, Pantocid 40, Telma 40
                  </div>
                </div>

                {/* Preset 3: K.P. Associates & Shakthi */}
                <div
                  onClick={async () => {
                    setIsScanning(true);
                    try {
                      const res = await inventoryAPI.scanSupplierBill({ sample_type: 'kpassociates' });
                      applyExtractedInvoice(res);
                    } finally { setIsScanning(false); }
                  }}
                  style={{ padding: '16px', borderRadius: '12px', border: '1px solid #fde68a', background: 'linear-gradient(135deg, #fffbeb 0%, #ffffff 100%)', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span className="badge badge-amber" style={{ fontSize: '11px' }}>Surgical & Topicals</span>
                    <Sparkles size={14} color="#d97706" />
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                    K P Associates & Shakthi Life Lines
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>
                    Mangalore • Jay Cotton, Cipladine Ointment, Steripad Gauze
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SCANNING PROGRESS ANIMATION */}
          {isScanning && (
            <div style={{ padding: '36px 20px', textAlign: 'center', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <RefreshCw size={28} color="#0284c7" className="spin-animation" />
              </div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                Scanning & Extracting Actual Bill Items...
              </div>
              <div style={{ fontSize: '13px', color: '#0284c7', fontWeight: 700, marginTop: '6px' }}>
                {scanStepMessage}
              </div>
              {ocrProgress > 0 && (
                <div style={{ width: '240px', height: '6px', background: '#e2e8f0', borderRadius: '4px', margin: '12px auto 0', overflow: 'hidden' }}>
                  <div style={{ width: `${ocrProgress}%`, height: '100%', background: '#0284c7', transition: 'width 0.2s ease' }} />
                </div>
              )}
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>
                Extracting medicine brands, salt composition, batch numbers, expiry dates, pack quantities & rates directly from bill
              </div>
            </div>
          )}

          {/* SPLIT WORKSPACE: DETECTED BILL & LINE ITEMS */}
          {(items.length > 0 || (capturedPreview && !isScanning)) && !isScanning && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* Financial Metrics Banner */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '10px',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                padding: '12px 16px',
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

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', flexWrap: 'wrap' }}>
                  {capturedPreview && (
                    <button
                      type="button"
                      onClick={handleRotateImage}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '11px', padding: '4px 8px', gap: '4px' }}
                      title="Rotate image 90 degrees if photo was taken sideways"
                    >
                      <RotateCw size={12} />
                      <span>Rotate 90°</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowRawText(prev => !prev)}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '11px', padding: '4px 8px', gap: '4px' }}
                    title="Inspect & edit raw extracted OCR text"
                  >
                    {showRawText ? <EyeOff size={12} /> : <Edit3 size={12} />}
                    <span>{showRawText ? 'Hide Text' : 'Edit / Paste Text'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRetake}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '11px', padding: '4px 8px', gap: '4px' }}
                  >
                    <RefreshCw size={12} /> Re-Upload
                  </button>
                </div>
              </div>

              {/* Raw OCR Text Inspector & Manual Re-Parse Drawer */}
              {showRawText && (
                <div style={{
                  padding: '14px 16px',
                  background: '#0f172a',
                  borderRadius: '12px',
                  border: '1px solid #334155',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#38bdf8', fontSize: '11.5px', fontWeight: 700, textTransform: 'uppercase' }}>
                      Raw OCR Extracted Lines (Click + to add any line as medicine):
                    </span>
                    <button
                      type="button"
                      onClick={handleReParseText}
                      className="btn btn-primary btn-sm"
                      style={{ fontSize: '11px', padding: '3px 10px', gap: '4px' }}
                    >
                      <Zap size={12} /> Re-Extract All from Text
                    </button>
                  </div>

                  <textarea
                    rows={5}
                    value={rawOcrText}
                    onChange={(e) => setRawOcrText(e.target.value)}
                    placeholder="Paste or edit invoice text here..."
                    style={{
                      width: '100%',
                      background: '#1e293b',
                      color: '#f8fafc',
                      fontFamily: 'monospace',
                      fontSize: '12px',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid #475569',
                      resize: 'vertical'
                    }}
                  />

                  {/* 1-Click Line Helper */}
                  {ocrLines.length > 0 && (
                    <div style={{ maxHeight: '130px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {ocrLines.slice(0, 20).map((l, lIdx) => (
                        <div key={lIdx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#1e293b', padding: '4px 8px', borderRadius: '6px' }}>
                          <span style={{ color: '#cbd5e1', fontSize: '11px', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>
                            {l}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAddFromOcrLine(l)}
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '10px', padding: '2px 6px', background: '#334155', color: '#38bdf8', border: 'none' }}
                          >
                            + Add Row
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Distributor Metadata Form */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '10px',
                background: '#f8fafc',
                padding: '12px 16px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0'
              }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                    <Building2 size={12} color="#0284c7" /> Distributor / Supplier Name
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    style={{ height: '32px', fontSize: '12.5px', fontWeight: 600 }}
                    value={supplierName}
                    placeholder="Distributor Name"
                    onChange={(e) => setSupplierName(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                    <Hash size={12} color="#0284c7" /> Supplier GSTIN
                  </label>
                  <input
                    type="text"
                    className="input-field mono"
                    style={{ height: '32px', fontSize: '12px' }}
                    value={supplierGstin}
                    placeholder="29AXNPA5754D1ZE"
                    onChange={(e) => setSupplierGstin(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                    <FileText size={12} color="#0284c7" /> Invoice / Bill #
                  </label>
                  <input
                    type="text"
                    className="input-field mono"
                    style={{ height: '32px', fontSize: '12px', fontWeight: 700 }}
                    value={invoiceNumber}
                    placeholder="INV 538445"
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                    <Calendar size={12} color="#0284c7" /> Invoice Date
                  </label>
                  <input
                    type="date"
                    className="input-field"
                    style={{ height: '32px', fontSize: '12px' }}
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Side-by-Side Split Workspace: Bill Image Preview on Left + Medicine Table on Right */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: capturedPreview ? '300px 1fr' : '1fr',
                gap: '14px',
                alignItems: 'start'
              }}>
                {/* Left: Bill Image Preview with Zoom & Controls */}
                {capturedPreview && (
                  <div style={{
                    background: '#0f172a',
                    borderRadius: '12px',
                    border: '1px solid #334155',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    <div style={{
                      padding: '6px 10px',
                      background: '#1e293b',
                      borderBottom: '1px solid #334155',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>
                        Bill Document Preview
                      </span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          type="button"
                          onClick={() => setImageZoom(prev => Math.min(2.5, prev + 0.25))}
                          style={{ background: 'transparent', border: 'none', color: '#38bdf8', cursor: 'pointer', padding: '2px' }}
                          title="Zoom In"
                        >
                          <ZoomIn size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setImageZoom(prev => Math.max(0.75, prev - 0.25))}
                          style={{ background: 'transparent', border: 'none', color: '#38bdf8', cursor: 'pointer', padding: '2px' }}
                          title="Zoom Out"
                        >
                          <ZoomOut size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={handleRotateImage}
                          style={{ background: 'transparent', border: 'none', color: '#38bdf8', cursor: 'pointer', padding: '2px' }}
                          title="Rotate 90°"
                        >
                          <RotateCw size={14} />
                        </button>
                      </div>
                    </div>
                    <div style={{
                      height: '320px',
                      overflow: 'auto',
                      padding: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#020617'
                    }}>
                      <img
                        src={capturedPreview}
                        alt="Supplier Bill"
                        style={{
                          maxWidth: '100%',
                          transform: `scale(${imageZoom})`,
                          transformOrigin: 'top left',
                          transition: 'transform 0.15s ease',
                          borderRadius: '4px'
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Right: Medicine Batches Table */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>
                      Extracted Medicine Batches ({items.length} Line Items)
                    </div>
                    <button onClick={handleAddItem} className="btn btn-secondary btn-sm" style={{ fontSize: '11px', background: '#ffffff' }}>
                      <Plus size={12} color="#0284c7" /> + Add Row
                    </button>
                  </div>

                  {items.length === 0 ? (
                    <div style={{ padding: '28px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                      <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#475569' }}>
                        No medicine rows listed yet
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                        Click <strong>+ Add Row</strong> above to quickly add the medicine names, batches, and quantities from your bill.
                      </div>
                    </div>
                  ) : (
                    <div className="data-table-container" style={{ maxHeight: '340px', overflowY: 'auto' }}>
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
                              {/* Medicine Name with Instant Autocomplete */}
                              <td style={{ position: 'relative' }}>
                                <input
                                  type="text"
                                  className="input-field"
                                  style={{ height: '28px', fontSize: '12px', fontWeight: 700 }}
                                  value={item.medicine_name}
                                  placeholder="Medicine Name"
                                  onChange={(e) => handleItemChange(idx, 'medicine_name', e.target.value)}
                                />
                                <input
                                  type="text"
                                  className="input-field"
                                  style={{ height: '22px', fontSize: '10px', color: '#64748b', marginTop: '2px', border: 'none', background: 'transparent', padding: '0 2px' }}
                                  value={item.generic_name || ''}
                                  placeholder="Salt composition / generic"
                                  onChange={(e) => handleItemChange(idx, 'generic_name', e.target.value)}
                                />

                                {/* Suggestions dropdown */}
                                {activeSearchRow === idx && medicineSuggestions.length > 0 && (
                                  <div style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    zIndex: 999,
                                    background: '#ffffff',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '8px',
                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                    width: '260px',
                                    maxHeight: '160px',
                                    overflowY: 'auto'
                                  }}>
                                    {medicineSuggestions.map((sug, sIdx) => (
                                      <div
                                        key={sIdx}
                                        onClick={() => handleSelectMedicineSuggestion(idx, sug)}
                                        style={{
                                          padding: '6px 10px',
                                          cursor: 'pointer',
                                          borderBottom: '1px solid #f1f5f9',
                                          fontSize: '11.5px'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = '#f0f9ff'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = '#ffffff'}
                                      >
                                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{sug.name}</div>
                                        <div style={{ fontSize: '10px', color: '#64748b' }}>{sug.generic_name} • {sug.dosage_form}</div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </td>

                              {/* Dosage Form */}
                              <td>
                                <select
                                  className="input-field"
                                  style={{ height: '28px', fontSize: '11px', padding: '2px 4px' }}
                                  value={item.dosage_form || 'Tablet'}
                                  onChange={(e) => handleItemChange(idx, 'dosage_form', e.target.value)}
                                >
                                  <option value="Tablet">Tablet</option>
                                  <option value="Capsule">Capsule</option>
                                  <option value="Syrup">Syrup</option>
                                  <option value="Inhaler">Inhaler</option>
                                  <option value="Drops">Drops</option>
                                  <option value="Ointment">Ointment / Cream</option>
                                  <option value="Powder">Powder</option>
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
                                  style={{ height: '28px', fontSize: '11.5px', fontWeight: 700, color: '#0369a1' }}
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
                                  style={{ height: '28px', fontSize: '11px', padding: '2px 4px' }}
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
                                  style={{ height: '28px', fontSize: '11.5px', width: '50px', textAlign: 'center', fontWeight: 800 }}
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
                                  style={{ height: '28px', fontSize: '11.5px', width: '44px', textAlign: 'center' }}
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
                                  style={{ height: '28px', fontSize: '11.5px', width: '64px', textAlign: 'right', fontWeight: 600 }}
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
                                  style={{ height: '28px', fontSize: '11.5px', width: '64px', textAlign: 'right' }}
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
                                  style={{ height: '28px', fontSize: '11.5px', width: '64px', textAlign: 'right', fontWeight: 800, color: '#059669' }}
                                  value={item.selling_price}
                                  onChange={(e) => handleItemChange(idx, 'selling_price', parseFloat(e.target.value) || 0)}
                                />
                              </td>

                              {/* Actions */}
                              <td style={{ textAlign: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
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
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '12px 22px',
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
              style={{ padding: '10px 28px', fontSize: '14px', borderRadius: '10px' }}
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
