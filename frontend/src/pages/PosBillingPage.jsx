import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  User, 
  Stethoscope, 
  CreditCard, 
  QrCode, 
  Banknote, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  Percent, 
  MapPin, 
  Clock, 
  Sparkles,
  ArrowRight,
  UserPlus,
  BadgeCheck,
  UserCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { inventoryAPI, billingAPI } from '../api';

export default function PosBillingPage({ 
  profile, 
  customers, 
  doctors, 
  staffList = [],
  onOpenAddCustomer, 
  onOpenAddDoctor, 
  onInvoiceCreated,
  onOpenReceipt 
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [cart, setCart] = useState([]);
  
  // Staff Charge Code State (Default to first staff member or TP01)
  const defaultStaff = staffList[0] || { charge_code: 'TP01', name: 'RSH' };
  const [selectedStaffCode, setSelectedStaffCode] = useState(defaultStaff.charge_code);
  const [selectedStaffName, setSelectedStaffName] = useState(defaultStaff.name);

  // Customer & Doctor (Optional Direct Typing or Select)
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [prescriptionNo, setPrescriptionNo] = useState('');
  const [doctorNotes, setDoctorNotes] = useState('');

  // Discount & Payment
  const [discountType, setDiscountType] = useState('PERCENT'); // 'PERCENT' or 'FIXED'
  const [discountPreset, setDiscountPreset] = useState('0'); // '0', '5', '10', '15', '20', 'custom_pct', 'custom_fixed'
  const [discountValue, setDiscountValue] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [cashTendered, setCashTendered] = useState('');
  const [splitCash, setSplitCash] = useState('');
  const [splitUpi, setSplitUpi] = useState('');
  
  // Checkout status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);

  const searchInputRef = useRef(null);
  const currency = profile?.currency_symbol || '₹';

  // Quick Chocolate / Candy State
  const [customChocolateAmount, setCustomChocolateAmount] = useState('5');
  const [isAddingChocolate, setIsAddingChocolate] = useState(false);
  const chocolateItemRef = useRef(null);

  // Sync staff default & live name updates when staffList is updated in Settings
  useEffect(() => {
    if (staffList.length > 0) {
      const match = staffList.find(s => s.charge_code === selectedStaffCode);
      if (match) {
        if (match.name !== selectedStaffName) {
          setSelectedStaffName(match.name);
        }
      } else {
        setSelectedStaffCode(staffList[0].charge_code);
        setSelectedStaffName(staffList[0].name);
      }
    }
  }, [staffList, selectedStaffCode, selectedStaffName]);

  const catalogCacheRef = useRef([]);

  // Pre-load medicines catalog & designated chocolate item for 0ms instant billing
  useEffect(() => {
    inventoryAPI.searchPOS('')
      .then(res => {
        if (Array.isArray(res) && res.length > 0) {
          catalogCacheRef.current = res;
        }
      })
      .catch(err => console.error('Failed to pre-cache medicines:', err));

    inventoryAPI.getQuickChocolateItem()
      .then(res => {
        if (res && res.id) {
          chocolateItemRef.current = res;
        }
      })
      .catch(err => console.error('Failed to pre-load chocolate item:', err));
  }, []);

  // Instant Alphabet Search: 0ms local in-memory filter + background API sync
  const performSearch = (queryStr) => {
    const q = (queryStr || '').trim().toLowerCase();
    if (!q) {
      setSearchResults([]);
      setSelectedIndex(0);
      return;
    }

    // 1. Instant 0ms Synchronous Filter from local cache
    if (catalogCacheRef.current && catalogCacheRef.current.length > 0) {
      const starts = [];
      const contains = [];

      catalogCacheRef.current.forEach(med => {
        const mName = (med.name || '').toLowerCase();
        const gName = (med.generic_name || '').toLowerCase();
        const barcode = (med.barcode || '').toLowerCase();

        if (mName.startsWith(q)) {
          starts.push(med);
        } else if (gName.startsWith(q) || mName.includes(q) || gName.includes(q) || barcode === q) {
          contains.push(med);
        }
      });

      const immediateResults = [...starts, ...contains].slice(0, 50);
      setSearchResults(immediateResults);
      setSelectedIndex(0);
    }
  };

  // Trigger background search and sync
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      setSelectedIndex(0);
      return;
    }

    // Run instant local filter first
    performSearch(q);

    let isMounted = true;
    setIsSearching(true);

    inventoryAPI.searchPOS(q)
      .then(results => {
        if (isMounted && Array.isArray(results)) {
          setSearchResults(results);
          // Merge newly discovered items into cache
          const existingIds = new Set(catalogCacheRef.current.map(m => m.id));
          results.forEach(m => {
            if (!existingIds.has(m.id)) {
              catalogCacheRef.current.push(m);
            }
          });
        }
      })
      .catch(err => {
        console.error('POS live search error:', err);
      })
      .finally(() => {
        if (isMounted) setIsSearching(false);
      });

    return () => {
      isMounted = false;
    };
  }, [searchQuery]);

  // Keyboard navigation inside search results (Arrow Down/Up + Enter to Add)
  const handleSearchKeyDown = (e) => {
    if (searchResults.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % searchResults.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + searchResults.length) % searchResults.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (searchResults[selectedIndex]) {
          addToCart(searchResults[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        setSearchResults([]);
      }
    }
  };

  // Global Keyboard shortcut listener (F4 to focus search, F8 to checkout)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F4') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'F8') {
        e.preventDefault();
        if (cart.length > 0 && !isSubmitting) {
          handleCheckout();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, isSubmitting, discountType, discountValue, paymentMethod, cashTendered, selectedStaffCode, selectedStaffName, customerName, customerPhone, doctorName]);

  // Add medicine to cart (Auto selects best FEFO batch)
  const addToCart = (medicine) => {
    const activeBatches = (medicine.batches || [])
      .filter(b => !b.is_expired && (b.pack_quantity > 0 || b.loose_quantity > 0))
      .sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date)); // FEFO sort

    if (activeBatches.length === 0) {
      alert(`No active stock available for ${medicine.name}. Please inward stock first.`);
      return;
    }

    const bestBatch = activeBatches[0];
    const packSize = bestBatch.pack_size || 10;
    const isLooseAllowed = !['Syrup', 'Drops', 'Ointment', 'Inhaler', 'Device'].includes(medicine.dosage_form) && packSize > 1;

    const existingIndex = cart.findIndex(item => item.medicine.id === medicine.id && item.batch.id === bestBatch.id);

    if (existingIndex > -1) {
      const updated = [...cart];
      updated[existingIndex].strip_quantity = (updated[existingIndex].strip_quantity || 0) + 1;
      setCart(updated);
    } else {
      const isChoc = medicine.name === 'CHOCOLATE / CANDY (OTC)' || medicine.name?.toLowerCase().includes('chocolate');
      const stripMrp = parseFloat(bestBatch.mrp) || (isChoc ? 1.0 : 0);
      const stripSp = parseFloat(bestBatch.selling_price) || (isChoc ? 1.0 : 0);
      const tabMrp = isChoc ? stripMrp : parseFloat((stripMrp / packSize).toFixed(2));
      const tabSp = isChoc ? stripSp : parseFloat((stripSp / packSize).toFixed(2));

      const newItem = {
        medicine,
        batch: bestBatch,
        availableBatches: activeBatches,
        pack_size: isChoc ? 1 : packSize,
        is_loose_allowed: isChoc ? false : isLooseAllowed,
        is_chocolate: isChoc,
        strip_quantity: 1,
        loose_quantity: 0,
        strip_mrp: stripMrp,
        strip_selling_price: stripSp,
        tab_mrp: tabMrp,
        tab_selling_price: tabSp,
        discount_percent: 0,
        gst_rate: isChoc ? 0.0 : (parseFloat(medicine.gst_rate) || 12.0),
      };
      setCart([...cart, newItem]);
    }

    setSearchQuery('');
    setSearchResults([]);
    searchInputRef.current?.focus();
  };

  const handleBatchChange = (index, batchId) => {
    const updated = [...cart];
    const item = updated[index];
    const newBatch = item.availableBatches.find(b => b.id === parseInt(batchId));
    if (newBatch) {
      const packSize = newBatch.pack_size || 10;
      item.batch = newBatch;
      item.pack_size = packSize;
      item.strip_mrp = parseFloat(newBatch.mrp);
      item.strip_selling_price = parseFloat(newBatch.selling_price);
      item.tab_mrp = parseFloat((parseFloat(newBatch.mrp) / packSize).toFixed(2));
      item.tab_selling_price = parseFloat((parseFloat(newBatch.selling_price) / packSize).toFixed(2));
      setCart(updated);
    }
  };

  const updateStripQuantity = (index, delta) => {
    const updated = [...cart];
    const current = updated[index].strip_quantity || 0;
    const nextVal = Math.max(0, current + delta);
    updated[index].strip_quantity = nextVal;
    if (nextVal === 0 && (updated[index].loose_quantity || 0) === 0) {
      setCart(cart.filter((_, i) => i !== index));
    } else {
      setCart(updated);
    }
  };

  const setDirectStripQuantity = (index, val) => {
    const updated = [...cart];
    const nextVal = Math.max(0, parseInt(val) || 0);
    updated[index].strip_quantity = nextVal;
    if (nextVal === 0 && (updated[index].loose_quantity || 0) === 0) {
      setCart(cart.filter((_, i) => i !== index));
    } else {
      setCart(updated);
    }
  };

  const updateLooseQuantity = (index, delta) => {
    const updated = [...cart];
    const current = updated[index].loose_quantity || 0;
    const nextVal = Math.max(0, current + delta);
    updated[index].loose_quantity = nextVal;
    if (nextVal === 0 && (updated[index].strip_quantity || 0) === 0) {
      setCart(cart.filter((_, i) => i !== index));
    } else {
      setCart(updated);
    }
  };

  const setDirectLooseQuantity = (index, val) => {
    const updated = [...cart];
    const nextVal = Math.max(0, parseInt(val) || 0);
    updated[index].loose_quantity = nextVal;
    if (nextVal === 0 && (updated[index].strip_quantity || 0) === 0) {
      setCart(cart.filter((_, i) => i !== index));
    } else {
      setCart(updated);
    }
  };

  // Handle discount preset change
  const handleDiscountPresetChange = (preset) => {
    setDiscountPreset(preset);
    if (preset === '0') {
      setDiscountType('PERCENT');
      setDiscountValue(0);
    } else if (preset === '5') {
      setDiscountType('PERCENT');
      setDiscountValue(5);
    } else if (preset === '10') {
      setDiscountType('PERCENT');
      setDiscountValue(10);
    } else if (preset === '15') {
      setDiscountType('PERCENT');
      setDiscountValue(15);
    } else if (preset === '20') {
      setDiscountType('PERCENT');
      setDiscountValue(20);
    } else if (preset === 'custom_pct') {
      setDiscountType('PERCENT');
    } else if (preset === 'custom_fixed') {
      setDiscountType('FIXED');
    }
  };

  const updateItemDiscount = (index, disc) => {
    const updated = [...cart];
    updated[index].discount_percent = Math.max(0, Math.min(100, parseFloat(disc) || 0));
    setCart(updated);
  };

  const removeFromCart = (index) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  // Add Quick Chocolate / Counter Candy item to cart
  const addQuickChocolate = async (customAmt = null) => {
    const rawVal = customAmt !== null ? customAmt : customChocolateAmount;
    const amount = Math.max(0.5, parseFloat(rawVal) || 1.0);

    try {
      setIsAddingChocolate(true);
      let chocMed = chocolateItemRef.current;
      if (!chocMed || !chocMed.batches || chocMed.batches.length === 0) {
        chocMed = await inventoryAPI.getQuickChocolateItem();
        chocolateItemRef.current = chocMed;
      }

      const bestBatch = (chocMed?.batches && chocMed.batches.length > 0)
        ? chocMed.batches[0]
        : { id: 1, batch_number: 'CHOC-OTC', mrp: amount, selling_price: amount, pack_size: 1 };

      // 1. If there is an existing chocolate item with 0 price in cart, update it
      const zeroChocIdx = cart.findIndex(item =>
        (item.is_chocolate || item.medicine?.name === 'CHOCOLATE / CANDY (OTC)') &&
        (parseFloat(item.strip_selling_price) || 0) === 0
      );

      if (zeroChocIdx > -1) {
        const updated = [...cart];
        updated[zeroChocIdx].strip_selling_price = amount;
        updated[zeroChocIdx].strip_mrp = amount;
        updated[zeroChocIdx].tab_selling_price = amount;
        updated[zeroChocIdx].tab_mrp = amount;
        if ((updated[zeroChocIdx].strip_quantity || 0) === 0) {
          updated[zeroChocIdx].strip_quantity = 1;
        }
        setCart(updated);
        return;
      }

      // 2. Check if chocolate already in cart with exact same price
      const existingIdx = cart.findIndex(item => 
        (item.is_chocolate || item.medicine?.name === 'CHOCOLATE / CANDY (OTC)') && 
        parseFloat(item.strip_selling_price) === amount
      );

      if (existingIdx > -1) {
        const updated = [...cart];
        updated[existingIdx].strip_quantity = (updated[existingIdx].strip_quantity || 0) + 1;
        setCart(updated);
      } else {
        const newItem = {
          medicine: chocMed,
          batch: bestBatch,
          availableBatches: [bestBatch],
          pack_size: 1,
          is_loose_allowed: false,
          is_chocolate: true,
          strip_quantity: 1,
          loose_quantity: 0,
          strip_mrp: amount,
          strip_selling_price: amount,
          tab_mrp: amount,
          tab_selling_price: amount,
          discount_percent: 0,
          gst_rate: 0.0,
        };
        setCart(prev => [...prev, newItem]);
      }
    } catch (err) {
      console.error('Failed to add quick chocolate:', err);
      alert(`Could not add chocolate: ${err.message}`);
    } finally {
      setIsAddingChocolate(false);
    }
  };

  const updateItemPrice = (index, newPrice) => {
    const updated = [...cart];
    updated[index].strip_selling_price = newPrice;
    updated[index].strip_mrp = newPrice;
    updated[index].tab_selling_price = newPrice;
    updated[index].tab_mrp = newPrice;
    setCart(updated);
  };

  const clearCart = () => {
    setCart([]);
    setDiscountPreset('0');
    setDiscountType('PERCENT');
    setDiscountValue(0);
    setCashTendered('');
    setSplitCash('');
    setSplitUpi('');
    setCustomerName('');
    setCustomerPhone('');
    setDoctorName('');
    setPrescriptionNo('');
    setDoctorNotes('');
    setCheckoutError(null);
  };

  // MRP is Tax-Inclusive (GST is extracted, NOT added additionally on top)
  let grossSubtotal = 0;
  let totalTax = 0;

  cart.forEach(item => {
    const strips = item.strip_quantity || 0;
    const loose = item.loose_quantity || 0;
    const stripPrice = parseFloat(item.strip_selling_price) || 0;
    const tabPrice = parseFloat(item.tab_selling_price) || 0;
    const itemGross = (strips * stripPrice) + (loose * tabPrice);
    const disc = (itemGross * (item.discount_percent || 0)) / 100;
    const net = itemGross - disc; // Net selling amount inclusive of GST
    const gstRate = parseFloat(item.gst_rate) || 0.0;
    const taxableBase = gstRate > 0 ? (net / (1 + (gstRate / 100))) : net;
    const tax = net - taxableBase;
    grossSubtotal += net;
    totalTax += tax;
  });

  const billDiscountAmt = discountType === 'PERCENT'
    ? (grossSubtotal * (parseFloat(discountValue) || 0)) / 100
    : Math.min(grossSubtotal, parseFloat(discountValue) || 0);

  // Grand Total = Gross Subtotal - Discount (Tax inclusive!)
  const totalBeforeRound = Math.max(0, grossSubtotal - billDiscountAmt);
  const grandTotal = Math.round(totalBeforeRound);
  const roundOff = (grandTotal - totalBeforeRound).toFixed(2);
  
  // Tax breakdown components
  const effectiveTax = grossSubtotal > 0 ? (totalTax * (totalBeforeRound / grossSubtotal)) : 0;
  const cgst = (effectiveTax / 2).toFixed(2);
  const sgst = (effectiveTax / 2).toFixed(2);
  const subtotal = grossSubtotal;

  // Smart Change & Round-Off Suggestions (e.g. if Total is ₹21, suggest +₹1 to make ₹22, +₹4 to make ₹25, +₹9 to make ₹30)
  const quickRoundSuggestions = useMemo(() => {
    if (cart.length === 0 || grandTotal <= 0) return [];
    const suggestions = [];
    
    // Suggest +1, +2
    suggestions.push({ diff: 1, target: grandTotal + 1 });
    suggestions.push({ diff: 2, target: grandTotal + 2 });

    // Suggest next multiple of 5
    const next5 = Math.ceil((grandTotal + 0.01) / 5) * 5;
    const diff5 = next5 - grandTotal;
    if (diff5 > 0 && !suggestions.some(s => s.diff === diff5)) {
      suggestions.push({ diff: diff5, target: next5 });
    }

    // Suggest next multiple of 10
    const next10 = Math.ceil((grandTotal + 0.01) / 10) * 10;
    const diff10 = next10 - grandTotal;
    if (diff10 > 0 && diff10 <= 10 && !suggestions.some(s => s.diff === diff10)) {
      suggestions.push({ diff: diff10, target: next10 });
    }

    return suggestions.sort((a, b) => a.diff - b.diff).slice(0, 4);
  }, [cart, grandTotal]);

  const tenderedNum = parseFloat(cashTendered) || 0;
  const changeDue = Math.max(0, tenderedNum - grandTotal);

  const handleCheckout = async () => {
    if (cart.length === 0) {
      setCheckoutError('Cart is empty. Add medicines to bill.');
      return;
    }

    setIsSubmitting(true);
    setCheckoutError(null);

    try {
      const selectedCust = customers?.find(c => c.id === parseInt(selectedCustomerId));
      const selectedDoc = doctors?.find(d => d.id === parseInt(selectedDoctorId));

      const finalCustName = customerName.trim() || (selectedCust ? selectedCust.name : 'Walk-in Customer');
      const finalCustPhone = customerPhone.trim() || (selectedCust ? selectedCust.phone : '');
      const finalDocName = doctorName.trim() || (selectedDoc ? selectedDoc.name : 'Self / OTC');

      // Determine cash and upi breakdown
      let finalCashAmt = '0.00';
      let finalUpiAmt = '0.00';
      let finalCardAmt = '0.00';
      let finalAmtPaid = grandTotal.toFixed(2);

      if (paymentMethod === 'CASH') {
        finalCashAmt = (tenderedNum > 0 ? Math.min(tenderedNum, grandTotal) : grandTotal).toFixed(2);
        finalAmtPaid = finalCashAmt;
      } else if (paymentMethod === 'UPI') {
        finalUpiAmt = grandTotal.toFixed(2);
        finalAmtPaid = finalUpiAmt;
      } else if (paymentMethod === 'CARD') {
        finalCardAmt = grandTotal.toFixed(2);
        finalAmtPaid = finalCardAmt;
      } else if (paymentMethod === 'MIXED') {
        const sCash = parseFloat(splitCash) || 0;
        const sUpi = parseFloat(splitUpi) || (grandTotal - sCash);
        finalCashAmt = sCash.toFixed(2);
        finalUpiAmt = sUpi.toFixed(2);
        finalAmtPaid = (sCash + sUpi).toFixed(2);
      } else if (paymentMethod === 'CREDIT') {
        finalAmtPaid = '0.00';
      }

      const itemsData = [];
      cart.forEach(item => {
        const strips = item.strip_quantity || 0;
        const loose = item.loose_quantity || 0;

        if (strips > 0) {
          itemsData.push({
            medicine_id: item.medicine.id,
            batch_id: item.batch.id,
            is_loose: false,
            quantity: strips,
            pack_size: item.pack_size,
            unit_mrp: parseFloat(item.strip_mrp) || 0,
            unit_selling_price: parseFloat(item.strip_selling_price) || 0,
            discount_percent: parseFloat(item.discount_percent) || 0,
            gst_rate: parseFloat(item.gst_rate) || 0.0,
          });
        }

        if (loose > 0) {
          itemsData.push({
            medicine_id: item.medicine.id,
            batch_id: item.batch.id,
            is_loose: true,
            quantity: loose,
            pack_size: item.pack_size,
            unit_mrp: parseFloat(item.tab_mrp) || 0,
            unit_selling_price: parseFloat(item.tab_selling_price) || 0,
            discount_percent: parseFloat(item.discount_percent) || 0,
            gst_rate: parseFloat(item.gst_rate) || 0.0,
          });
        }
      });

      const payload = {
        staff_code: selectedStaffCode || staffList[0]?.charge_code || 'TP01',
        staff_name: selectedStaffName || staffList[0]?.name || 'RSH',
        customer: selectedCust ? selectedCust.id : null,
        customer_name: finalCustName,
        customer_phone: finalCustPhone,
        doctor: selectedDoc ? selectedDoc.id : null,
        doctor_name: finalDocName,
        prescription_number: prescriptionNo,
        payment_method: paymentMethod,
        payment_status: paymentMethod === 'CREDIT' ? 'DUE' : 'PAID',
        cash_amount: finalCashAmt,
        upi_amount: finalUpiAmt,
        card_amount: finalCardAmt,
        amount_paid: finalAmtPaid,
        subtotal: subtotal.toFixed(2),
        discount_type: discountType,
        discount_value: parseFloat(discountValue) || 0,
        discount_amount: billDiscountAmt.toFixed(2),
        tax_amount: effectiveTax.toFixed(2),
        cgst_amount: cgst,
        sgst_amount: sgst,
        round_off: roundOff,
        grand_total: grandTotal.toFixed(2),
        change_due: changeDue.toFixed(2),
        notes: doctorNotes,
        items_data: itemsData,
      };

      const createdInvoice = await billingAPI.createInvoice(payload);

      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#0284c7', '#10b981', '#06b6d4']
      });

      onInvoiceCreated(createdInvoice);
      onOpenReceipt(createdInvoice);
      clearCart();
    } catch (err) {
      setCheckoutError(err.message || 'Invoice checkout failed. Please check batch quantities.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pos-billing-grid">
      {/* LEFT AREA: Medicine Search & Active Cart Table (WIDER) */}
      <div className="pos-billing-left" style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0, width: '100%' }}>
        
        {/* Top Staff Charge Code Quick Selector Bar */}
        <div className="glass-panel" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', background: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BadgeCheck size={18} color="#0284c7" />
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>
              Billing Staff:
            </span>
          </div>

          <div className="mobile-scroll-pills" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {(staffList.length > 0 ? staffList : [
              { charge_code: 'TP01', name: 'RSH' },
              { charge_code: 'TP02', name: 'TAS' },
              { charge_code: 'TP03', name: 'RAY' },
            ]).map((staff) => {
              const active = selectedStaffCode === staff.charge_code;
              return (
                <button
                  key={staff.charge_code}
                  type="button"
                  onClick={() => {
                    setSelectedStaffCode(staff.charge_code);
                    setSelectedStaffName(staff.name);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '5px 10px',
                    borderRadius: '8px',
                    border: active ? '2px solid #0284c7' : '1px solid #cbd5e1',
                    background: active ? '#f0f9ff' : '#ffffff',
                    color: active ? '#0284c7' : '#475569',
                    fontSize: '11.5px',
                    fontWeight: active ? 800 : 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: active ? '0 2px 6px rgba(2, 132, 199, 0.15)' : 'none',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <span className="mono" style={{ background: active ? '#0284c7' : '#e2e8f0', color: active ? '#ffffff' : '#475569', padding: '1px 4px', borderRadius: '4px', fontSize: '10px' }}>
                    {staff.charge_code}
                  </span>
                  <span>{staff.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Instant Search Bar with Live Recommendation Dropdown */}
        <div className="glass-panel" style={{ padding: '14px', position: 'relative' }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} color="#0284c7" style={{ position: 'absolute', left: '14px', top: '13px' }} />
            <input
              ref={searchInputRef}
              type="text"
              className="input-field"
              style={{ paddingLeft: '42px', height: '44px', fontSize: '14px', background: '#f8fafc', borderColor: '#cbd5e1' }}
              placeholder="Type any letter to instantly list tablets (e.g., 'A', 'P', 'D', 'M')..."
              value={searchQuery}
              onChange={(e) => {
                const val = e.target.value;
                setSearchQuery(val);
                performSearch(val);
              }}
              onKeyDown={handleSearchKeyDown}
              autoFocus
            />
            {isSearching && (
              <span style={{ position: 'absolute', right: '14px', top: '13px', fontSize: '12px', color: '#64748b' }}>
                Searching...
              </span>
            )}
          </div>

          {/* Instant Dropdown Search Results */}
          {searchResults.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '68px',
              left: '14px',
              right: '14px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '12px',
              boxShadow: '0 15px 35px rgba(15, 23, 42, 0.15)',
              zIndex: 100,
              maxHeight: '360px',
              overflowY: 'auto',
              padding: '6px'
            }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', padding: '6px 10px', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#0284c7' }}>Matching Tablets & Medicines ({searchResults.length})</span>
                <span className="desktop-only" style={{ color: '#059669' }}>Use ↑ ↓ keys & press Enter to Bill</span>
              </div>
              {searchResults.map((med, idx) => {
                const totalStock = med.batches?.reduce((acc, b) => acc + (b.is_expired ? 0 : b.pack_quantity), 0) || 0;
                const nextBatch = med.batches?.find(b => !b.is_expired && b.pack_quantity > 0);
                const isHighlighted = idx === selectedIndex;
                
                return (
                  <div
                    key={med.id}
                    onClick={() => {
                      addToCart(med);
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: '1px solid #f1f5f9',
                      background: isHighlighted ? '#f0f9ff' : 'transparent',
                      borderLeft: isHighlighted ? '4px solid #0284c7' : '4px solid transparent',
                      transition: 'all 0.08s ease',
                      gap: '8px'
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>{med.name}</span>
                        <span className="badge badge-cyan" style={{ fontSize: '10.5px' }}>{med.dosage_form}</span>
                        {med.requires_prescription && <span className="badge badge-rose" style={{ fontSize: '10px' }}>Rx</span>}
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#475569', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {med.generic_name || 'Standard Composition'} • <em>{med.manufacturer}</em>
                      </div>
                      <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '3px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {med.rack_location && <span style={{ color: '#0284c7', fontWeight: 600 }}>📍 Rack: {med.rack_location}</span>}
                        {nextBatch && <span>Exp: <strong style={{ color: nextBatch.is_near_expiry ? '#d97706' : '#059669' }}>{nextBatch.expiry_date}</strong></span>}
                        {nextBatch && <span className="mono">Batch: {nextBatch.batch_number}</span>}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div className="mono" style={{ fontSize: '15px', fontWeight: 900, color: '#059669' }}>
                        {currency}{nextBatch ? nextBatch.selling_price : '-'}
                      </div>
                      <div style={{ fontSize: '11px', marginTop: '2px' }}>
                        <strong style={{ color: totalStock > 10 ? '#059669' : (totalStock > 0 ? '#d97706' : '#e11d48') }}>
                          {totalStock > 0 ? `${totalStock} Packs` : 'Out of Stock'}
                        </strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Chocolate / Counter Candy Quick Action Bar */}
        <div className="glass-panel" style={{
          padding: '10px 14px',
          background: 'linear-gradient(135deg, #fffdf5 0%, #fef3c7 100%)',
          borderRadius: '12px',
          border: '1.5px solid #fde68a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          boxShadow: '0 2px 8px rgba(217, 119, 6, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>🍫</span>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 900, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>Quick Chocolate / Counter Candy</span>
                <span className="badge badge-amber" style={{ fontSize: '9.5px', padding: '1px 5px', fontWeight: 800 }}>Change Bill</span>
              </div>
              <div style={{ fontSize: '11px', color: '#b45309' }}>
                Quick 1-click chocolate sale & coin change round-off
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {[1, 2, 5, 10, 20].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => addQuickChocolate(amt)}
                disabled={isAddingChocolate}
                style={{
                  padding: '6px 11px',
                  borderRadius: '8px',
                  border: '1.5px solid #f59e0b',
                  background: '#ffffff',
                  color: '#92400e',
                  fontSize: '12px',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  boxShadow: '0 2px 5px rgba(245, 158, 11, 0.15)',
                  transition: 'all 0.12s'
                }}
                title={`Add ${currency}${amt} Chocolate to bill`}
              >
                <span>+ {currency}{amt}</span>
              </button>
            ))}

            {/* Custom Rupee Amount Input */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              background: '#ffffff',
              borderRadius: '8px',
              padding: '2px 4px',
              border: '1.5px solid #f59e0b'
            }}>
              <span style={{ fontSize: '11.5px', fontWeight: 900, color: '#b45309', paddingLeft: '4px' }}>{currency}</span>
              <input
                type="number"
                min="0.5"
                step="any"
                value={customChocolateAmount}
                onChange={(e) => setCustomChocolateAmount(e.target.value)}
                onFocus={(e) => e.target.select()}
                onClick={(e) => e.target.select()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addQuickChocolate(customChocolateAmount);
                  }
                }}
                placeholder="Amt"
                style={{
                  width: '46px',
                  height: '26px',
                  textAlign: 'center',
                  border: 'none',
                  outline: 'none',
                  fontSize: '12.5px',
                  fontWeight: 900,
                  color: '#92400e',
                  padding: '0'
                }}
              />
              <button
                type="button"
                onClick={() => addQuickChocolate(customChocolateAmount)}
                disabled={isAddingChocolate}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#f59e0b',
                  color: '#ffffff',
                  fontSize: '11.5px',
                  fontWeight: 900,
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(245, 158, 11, 0.25)'
                }}
              >
                + Add
              </button>
            </div>
          </div>
        </div>

        {/* Active Cart Panel */}
        <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#f8fafc'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShoppingCart size={18} color="#0284c7" />
              <span style={{ fontWeight: 800, fontSize: '13.5px', color: '#0f172a' }}>Cart ({cart.length} items)</span>
            </div>
            {cart.length > 0 && (
              <button onClick={clearCart} className="btn btn-secondary btn-sm" style={{ color: '#e11d48', borderColor: '#fecdd3', padding: '4px 8px', fontSize: '11px' }}>
                <Trash2 size={12} /> Clear
              </button>
            )}
          </div>

          {/* Cart Content: Desktop Table & Mobile Cards */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {cart.length === 0 ? (
              <div style={{ padding: '50px 20px', textAlign: 'center', color: '#94a3b8' }}>
                <ShoppingCart size={44} strokeWidth={1} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                <h4 style={{ fontSize: '14.5px', fontWeight: 600, color: '#475569' }}>Cart is Empty</h4>
                <p style={{ fontSize: '12px', marginTop: '4px', color: '#64748b' }}>
                  Type tablet letters in search above to add medicines.
                </p>
              </div>
            ) : (
              <>
                {/* 1. DESKTOP CART TABLE */}
                <div className="data-table-container desktop-only" style={{ border: 'none', borderRadius: 0, width: '100%', overflowX: 'auto' }}>
                  <table className="data-table" style={{ width: '100%', minWidth: '680px', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '25%', minWidth: '150px' }}>Medicine & Composition</th>
                        <th style={{ width: '18%', minWidth: '130px' }}>Batch & Expiry (FEFO)</th>
                        <th style={{ width: '14%', minWidth: '100px', textAlign: 'center' }}>Strips (Pk)</th>
                        <th style={{ width: '19%', minWidth: '135px', textAlign: 'center' }}>Loose (Tabs)</th>
                        <th style={{ width: '10%', minWidth: '75px', textAlign: 'right' }}>Price ({currency})</th>
                        <th style={{ width: '10%', minWidth: '75px', textAlign: 'right' }}>Line Total ({currency})</th>
                        <th style={{ width: '4%', minWidth: '35px', textAlign: 'center' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {cart.map((item, idx) => {
                        const isChoc = item.is_chocolate || item.medicine?.name === 'CHOCOLATE / CANDY (OTC)';
                        const strips = item.strip_quantity || 0;
                        const loose = item.loose_quantity || 0;
                        const stripPrice = parseFloat(item.strip_selling_price) || 0;
                        const tabPrice = parseFloat(item.tab_selling_price) || 0;
                        const lineGross = (strips * stripPrice) + (loose * tabPrice);
                        const lineDisc = (lineGross * (item.discount_percent || 0)) / 100;
                        const lineTotal = lineGross - lineDisc;

                        if (isChoc) {
                          return (
                            <tr key={idx} style={{ background: '#fffdf5' }}>
                              {/* 1. Chocolate Name */}
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontSize: '18px' }}>🍫</span>
                                  <div>
                                    <div style={{ fontWeight: 900, fontSize: '13.5px', color: '#92400e' }}>
                                      CHOCOLATE / CANDY (OTC)
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#b45309', marginTop: '1px' }}>
                                      Counter Change / Round-off Item
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* 2. Batch */}
                              <td>
                                <span className="badge badge-amber mono" style={{ fontSize: '11px', fontWeight: 800 }}>
                                  CHOC-OTC
                                </span>
                                <div style={{ fontSize: '10.5px', color: '#059669', marginTop: '2px', fontWeight: 700 }}>
                                  🟢 Always Available
                                </div>
                              </td>

                              {/* 3. Quantity Controls */}
                              <td style={{ textAlign: 'center' }}>
                                <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                    <button
                                      type="button"
                                      onClick={() => updateStripQuantity(idx, -1)}
                                      style={{ width: '22px', height: '22px', borderRadius: '4px', border: '1.5px solid #f59e0b', background: '#ffffff', color: '#92400e', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                      <Minus size={11} />
                                    </button>
                                    <input
                                      type="number"
                                      min="0"
                                      value={item.strip_quantity}
                                      onChange={(e) => setDirectStripQuantity(idx, e.target.value)}
                                      className="mono"
                                      style={{ width: '38px', height: '22px', textAlign: 'center', border: '1.5px solid #f59e0b', borderRadius: '4px', fontSize: '12px', fontWeight: 900, background: '#fffbeb', color: '#92400e' }}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => updateStripQuantity(idx, 1)}
                                      style={{ width: '22px', height: '22px', borderRadius: '4px', border: '1.5px solid #f59e0b', background: '#ffffff', color: '#92400e', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                      <Plus size={11} />
                                    </button>
                                  </div>
                                  <span style={{ fontSize: '10px', color: '#92400e', fontWeight: 700 }}>
                                    {item.strip_quantity} Unit{item.strip_quantity > 1 ? 's' : ''}
                                  </span>
                                </div>
                              </td>

                              {/* 4. Loose */}
                              <td style={{ textAlign: 'center' }}>
                                <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>Single Unit</span>
                              </td>

                              {/* 5. Editable Unit Price & Quick Pills */}
                              <td style={{ textAlign: 'right' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '3px' }}>
                                    <span style={{ fontSize: '12px', fontWeight: 900, color: '#92400e' }}>{currency}</span>
                                    <input
                                      type="number"
                                      min="0.5"
                                      step="any"
                                      value={item.strip_selling_price}
                                      onChange={(e) => updateItemPrice(idx, e.target.value)}
                                      onFocus={(e) => e.target.select()}
                                      onClick={(e) => e.target.select()}
                                      placeholder="0"
                                      className="mono"
                                      style={{ width: '62px', height: '26px', textAlign: 'right', border: '2px solid #f59e0b', borderRadius: '5px', fontSize: '13px', fontWeight: 900, color: '#92400e', background: '#ffffff', padding: '2px 4px', outline: 'none' }}
                                      title="Type chocolate amount"
                                    />
                                  </div>
                                  <div style={{ display: 'flex', gap: '2px' }}>
                                    {[1, 2, 5, 10, 20].map(p => (
                                      <button
                                        key={p}
                                        type="button"
                                        onClick={() => updateItemPrice(idx, p)}
                                        style={{
                                          padding: '1px 4px',
                                          fontSize: '9.5px',
                                          fontWeight: parseFloat(item.strip_selling_price) === p ? 900 : 700,
                                          borderRadius: '3px',
                                          border: parseFloat(item.strip_selling_price) === p ? '1.5px solid #d97706' : '1px solid #fde68a',
                                          background: parseFloat(item.strip_selling_price) === p ? '#fef3c7' : '#ffffff',
                                          color: '#92400e',
                                          cursor: 'pointer'
                                        }}
                                      >
                                        {currency}{p}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </td>

                              {/* 6. Line Total */}
                              <td style={{ textAlign: 'right' }} className="mono">
                                <span style={{ fontSize: '14px', fontWeight: 900, color: '#92400e' }}>
                                  {currency}{lineTotal.toFixed(2)}
                                </span>
                              </td>

                              {/* 7. Remove */}
                              <td style={{ textAlign: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => removeFromCart(idx)}
                                  style={{ background: '#fef2f2', border: '1px solid #fecdd3', color: '#e11d48', padding: '5px', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                  title="Remove Chocolate"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          );
                        }

                        return (
                          <tr key={idx}>
                            <td>
                              <div style={{ fontWeight: 800, fontSize: '13.5px', color: '#0f172a' }}>{item.medicine.name}</div>
                              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>
                                {item.medicine.generic_name?.slice(0, 40) || 'Standard Salt'}
                              </div>
                              {item.medicine.rack_location && (
                                <div style={{ fontSize: '10.5px', color: '#0284c7', marginTop: '2px', fontWeight: 700 }}>
                                  📍 Rack {item.medicine.rack_location}
                                </div>
                              )}
                            </td>

                            <td>
                              <select
                                className="input-field mono"
                                style={{ padding: '4px 8px', fontSize: '11.5px', height: '30px', width: '100%' }}
                                value={item.batch.id}
                                onChange={(e) => handleBatchChange(idx, e.target.value)}
                              >
                                {item.availableBatches.map(b => (
                                  <option key={b.id} value={b.id}>
                                    {b.batch_number} (Exp: {b.expiry_date}) - {b.pack_quantity}p
                                  </option>
                                ))}
                              </select>
                              <div style={{ fontSize: '10.5px', color: item.batch.is_near_expiry ? '#d97706' : '#059669', marginTop: '2px', fontWeight: 700 }}>
                                {item.batch.is_near_expiry ? '⚠️ Near Expiry' : '🟢 Good Expiry'}
                              </div>
                            </td>

                            {/* 1. STRIPS (PACKS) COLUMN */}
                            <td style={{ textAlign: 'center' }}>
                              <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  <button
                                    type="button"
                                    onClick={() => updateStripQuantity(idx, -1)}
                                    style={{ width: '22px', height: '22px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    title="Decrease full strips"
                                  >
                                    <Minus size={11} />
                                  </button>
                                  <input
                                    type="number"
                                    min="0"
                                    value={item.strip_quantity}
                                    onChange={(e) => setDirectStripQuantity(idx, e.target.value)}
                                    className="mono"
                                    style={{ width: '38px', height: '22px', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px', fontWeight: 800, background: item.strip_quantity > 0 ? '#f0f9ff' : '#ffffff' }}
                                    title="Number of full strips"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => updateStripQuantity(idx, 1)}
                                    style={{ width: '22px', height: '22px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    title="Increase full strips"
                                  >
                                    <Plus size={11} />
                                  </button>
                                </div>
                                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>
                                  {currency}{item.strip_selling_price}/pk ({item.pack_size}s)
                                </span>
                              </div>
                            </td>

                            {/* 2. DEDICATED LOOSE TABLETS COLUMN */}
                            <td style={{ textAlign: 'center' }}>
                              {item.is_loose_allowed ? (
                                <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                    <button
                                      type="button"
                                      onClick={() => updateLooseQuantity(idx, -1)}
                                      style={{ width: '22px', height: '22px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                      title="Decrease loose tablets"
                                    >
                                      <Minus size={11} />
                                    </button>
                                    <input
                                      type="number"
                                      min="0"
                                      value={item.loose_quantity}
                                      onChange={(e) => setDirectLooseQuantity(idx, e.target.value)}
                                      className="mono"
                                      placeholder="0"
                                      style={{ width: '42px', height: '22px', textAlign: 'center', border: item.loose_quantity > 0 ? '1.5px solid #d97706' : '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px', fontWeight: 800, background: item.loose_quantity > 0 ? '#fffbeb' : '#ffffff', color: item.loose_quantity > 0 ? '#92400e' : '#0f172a' }}
                                      title="Type number of loose tablets to bill"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => updateLooseQuantity(idx, 1)}
                                      style={{ width: '22px', height: '22px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                      title="Increase loose tablets"
                                    >
                                      <Plus size={11} />
                                    </button>
                                  </div>

                                  {/* Quick Chips for Odd Tablet Prescriptions */}
                                  <div style={{ display: 'flex', gap: '2px' }}>
                                    {[2, 3, 5, 7, 10].filter(n => n < item.pack_size).map(n => (
                                      <button
                                        key={n}
                                        type="button"
                                        onClick={() => {
                                          if (item.strip_quantity === 1 && item.loose_quantity === 0) {
                                            setDirectStripQuantity(idx, 0);
                                          }
                                          setDirectLooseQuantity(idx, n);
                                        }}
                                        style={{
                                          padding: '1px 4px',
                                          fontSize: '9.5px',
                                          fontWeight: item.loose_quantity === n ? 800 : 600,
                                          borderRadius: '3px',
                                          border: item.loose_quantity === n ? '1px solid #d97706' : '1px solid #e2e8f0',
                                          background: item.loose_quantity === n ? '#fef3c7' : '#ffffff',
                                          color: item.loose_quantity === n ? '#92400e' : '#475569',
                                          cursor: 'pointer'
                                        }}
                                        title={`Bill ${n} loose tablets`}
                                      >
                                        {n}t
                                      </button>
                                    ))}
                                    <span style={{ fontSize: '9.5px', color: '#0284c7', fontWeight: 700, marginLeft: '2px' }}>
                                      @{currency}{item.tab_selling_price}/t
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <span className="badge badge-slate" style={{ fontSize: '10px' }}>Whole Unit</span>
                              )}
                            </td>

                            {/* PRICE BREAKDOWN */}
                            <td style={{ textAlign: 'right' }}>
                              <div className="mono" style={{ fontWeight: 800, fontSize: '12px', color: '#0f172a' }}>
                                {currency}{item.strip_selling_price.toFixed(2)}<span style={{ fontSize: '9.5px', color: '#64748b' }}>/pk</span>
                              </div>
                              {item.is_loose_allowed && (
                                <div className="mono" style={{ fontSize: '11px', color: '#d97706', fontWeight: 700 }}>
                                  {currency}{item.tab_selling_price.toFixed(2)}<span style={{ fontSize: '9px', color: '#92400e' }}>/tab</span>
                                </div>
                              )}
                            </td>

                            {/* LINE TOTAL */}
                            <td style={{ textAlign: 'right' }}>
                              <div className="mono" style={{ fontWeight: 900, color: '#059669', fontSize: '14px' }}>
                                {currency}{lineTotal.toFixed(2)}
                              </div>
                              <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>
                                GST {item.gst_rate}%
                              </div>
                            </td>

                            <td style={{ textAlign: 'center' }}>
                              <button
                                onClick={() => removeFromCart(idx)}
                                style={{ background: '#fef2f2', border: '1px solid #fecdd3', color: '#e11d48', padding: '5px', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                title="Remove item from cart"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* 2. MOBILE CART CARDS VIEW */}
                <div className="mobile-only" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px' }}>
                  {cart.map((item, idx) => {
                    const isChoc = item.is_chocolate || item.medicine?.name === 'CHOCOLATE / CANDY (OTC)';
                    const strips = item.strip_quantity || 0;
                    const loose = item.loose_quantity || 0;
                    const stripPrice = parseFloat(item.strip_selling_price) || 0;
                    const tabPrice = parseFloat(item.tab_selling_price) || 0;
                    const lineGross = (strips * stripPrice) + (loose * tabPrice);
                    const lineDisc = (lineGross * (item.discount_percent || 0)) / 100;
                    const lineTotal = lineGross - lineDisc;

                    if (isChoc) {
                      return (
                        <div
                          key={idx}
                          style={{
                            background: '#fffdf5',
                            border: '1.5px solid #fde68a',
                            borderRadius: '12px',
                            padding: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            boxShadow: '0 2px 6px rgba(217, 119, 6, 0.08)'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '16px' }}>🍫</span>
                              <strong style={{ fontSize: '13.5px', color: '#92400e' }}>CHOCOLATE / CANDY (OTC)</strong>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFromCart(idx)}
                              style={{ background: '#fef2f2', border: '1px solid #fecdd3', color: '#e11d48', padding: '5px', borderRadius: '6px', cursor: 'pointer' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', padding: '8px 10px', borderRadius: '8px', border: '1px solid #fef3c7', flexWrap: 'wrap', gap: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ fontSize: '11px', fontWeight: 800, color: '#92400e' }}>Qty:</span>
                              <button
                                type="button"
                                onClick={() => updateStripQuantity(idx, -1)}
                                style={{ width: '26px', height: '26px', borderRadius: '4px', border: '1px solid #f59e0b', background: '#ffffff', color: '#92400e' }}
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="0"
                                value={item.strip_quantity}
                                onChange={(e) => setDirectStripQuantity(idx, e.target.value)}
                                className="mono"
                                style={{ width: '36px', height: '26px', textAlign: 'center', border: '1px solid #f59e0b', borderRadius: '4px', fontSize: '12px', fontWeight: 900, color: '#92400e' }}
                              />
                              <button
                                type="button"
                                onClick={() => updateStripQuantity(idx, 1)}
                                style={{ width: '26px', height: '26px', borderRadius: '4px', border: '1px solid #f59e0b', background: '#ffffff', color: '#92400e' }}
                              >
                                +
                              </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 800, color: '#92400e' }}>Price: {currency}</span>
                                <input
                                  type="number"
                                  min="0.5"
                                  step="any"
                                  value={item.strip_selling_price}
                                  onChange={(e) => updateItemPrice(idx, e.target.value)}
                                  onFocus={(e) => e.target.select()}
                                  onClick={(e) => e.target.select()}
                                  className="mono"
                                  style={{ width: '56px', height: '26px', textAlign: 'right', border: '1.5px solid #f59e0b', borderRadius: '4px', fontSize: '12.5px', fontWeight: 900, color: '#92400e', padding: '2px 4px' }}
                                />
                              </div>
                              <div style={{ display: 'flex', gap: '2px' }}>
                                {[1, 2, 5, 10, 20].map(p => (
                                  <button
                                    key={p}
                                    type="button"
                                    onClick={() => updateItemPrice(idx, p)}
                                    style={{
                                      padding: '1px 4px',
                                      fontSize: '9.5px',
                                      fontWeight: parseFloat(item.strip_selling_price) === p ? 900 : 700,
                                      borderRadius: '3px',
                                      border: parseFloat(item.strip_selling_price) === p ? '1.5px solid #d97706' : '1px solid #fde68a',
                                      background: parseFloat(item.strip_selling_price) === p ? '#fef3c7' : '#ffffff',
                                      color: '#92400e',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    {currency}{p}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #fef3c7', paddingTop: '4px' }}>
                            <span style={{ fontSize: '11px', color: '#b45309', fontWeight: 700 }}>Total:</span>
                            <span className="mono" style={{ fontSize: '15px', fontWeight: 900, color: '#92400e' }}>
                              {currency}{lineTotal.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={idx}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '12px',
                          padding: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          boxShadow: '0 1px 4px rgba(0, 0, 0, 0.04)'
                        }}
                      >
                        {/* Title & Delete */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '13.5px', color: '#0f172a' }}>{item.medicine.name}</div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>
                              {item.medicine.generic_name?.slice(0, 30)}
                            </div>
                          </div>
                          <button
                            onClick={() => removeFromCart(idx)}
                            style={{ background: '#fef2f2', border: '1px solid #fecdd3', color: '#e11d48', padding: '5px', borderRadius: '6px', cursor: 'pointer' }}
                            title="Remove"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        {/* Batch & Expiry Selector */}
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <select
                            className="input-field mono"
                            style={{ padding: '4px 8px', fontSize: '11.5px', height: '32px', flex: 1 }}
                            value={item.batch.id}
                            onChange={(e) => handleBatchChange(idx, e.target.value)}
                          >
                            {item.availableBatches.map(b => (
                              <option key={b.id} value={b.id}>
                                Batch: {b.batch_number} (Exp: {b.expiry_date})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Strips and Loose Controls */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: '#f8fafc', padding: '8px', borderRadius: '8px' }}>
                          <div>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: '#0369a1', marginBottom: '4px' }}>
                              📦 Strips ({item.pack_size}s)
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <button
                                onClick={() => updateStripQuantity(idx, -1)}
                                style={{ width: '28px', height: '28px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer' }}
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="0"
                                value={item.strip_quantity}
                                onChange={(e) => setDirectStripQuantity(idx, e.target.value)}
                                className="mono"
                                style={{ width: '36px', height: '28px', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px', fontWeight: 800 }}
                              />
                              <button
                                onClick={() => updateStripQuantity(idx, 1)}
                                style={{ width: '28px', height: '28px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer' }}
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {item.is_loose_allowed ? (
                            <div>
                              <div style={{ fontSize: '11px', fontWeight: 700, color: '#d97706', marginBottom: '4px' }}>
                                💊 Loose Tabs (@{currency}{item.tab_selling_price})
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <button
                                  onClick={() => updateLooseQuantity(idx, -1)}
                                  style={{ width: '28px', height: '28px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer' }}
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min="0"
                                  value={item.loose_quantity}
                                  onChange={(e) => setDirectLooseQuantity(idx, e.target.value)}
                                  className="mono"
                                  style={{ width: '36px', height: '28px', textAlign: 'center', border: '1px solid #d97706', borderRadius: '4px', fontSize: '12px', fontWeight: 800, background: '#fffbeb' }}
                                />
                                <button
                                  onClick={() => updateLooseQuantity(idx, 1)}
                                  style={{ width: '28px', height: '28px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer' }}
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center' }}>
                              Whole unit
                            </div>
                          )}
                        </div>

                        {/* Line Total */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px' }}>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            GST {item.gst_rate}%
                          </div>
                          <div className="mono" style={{ fontWeight: 900, color: '#059669', fontSize: '15px' }}>
                            {currency}{lineTotal.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Quick Doctor Rx Notes */}
          {cart.length > 0 && (
            <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', gap: '12px', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: '#475569', whiteSpace: 'nowrap', fontWeight: 600 }}>Rx Dosage Notes:</span>
              <input
                type="text"
                className="input-field"
                style={{ height: '32px', fontSize: '12px', background: '#ffffff' }}
                placeholder="e.g. 1 tab morning & night after meals (5 days)"
                value={doctorNotes}
                onChange={(e) => setDoctorNotes(e.target.value)}
              />
            </div>
          )}
        </div>
      </div>

      {/* RIGHT AREA: Optional Customer & Doctor Typing + Checkout Summary (COMPACT) */}
      <div className="pos-billing-right" style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', maxWidth: '380px' }}>
        
        {/* Optional Patient & Doctor Direct Inputs Card */}
        <div className="glass-panel" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Patient Details (Optional) */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase' }}>
                Patient / Customer Name <span style={{ fontWeight: 400, color: '#64748b', textTransform: 'none' }}>(Optional)</span>
              </label>
              {customers?.length > 0 && (
                <button 
                  onClick={onOpenAddCustomer} 
                  className="btn btn-secondary btn-sm" 
                  style={{ padding: '1px 6px', fontSize: '10.5px' }}
                >
                  <UserPlus size={11} /> Save Record
                </button>
              )}
            </div>
            
            <input
              type="text"
              className="input-field"
              style={{ fontSize: '13px', height: '36px', marginBottom: '6px' }}
              placeholder="Walk-in Customer (or type patient name)..."
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />

            <input
              type="tel"
              className="input-field mono"
              style={{ fontSize: '12px', height: '32px' }}
              placeholder="Mobile Number (Optional)..."
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
            />
          </div>

          {/* Prescribing Doctor Details (Optional) */}
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase' }}>
                Prescribing Doctor <span style={{ fontWeight: 400, color: '#64748b', textTransform: 'none' }}>(Optional)</span>
              </label>
              {doctors?.length > 0 && (
                <button 
                  onClick={onOpenAddDoctor} 
                  className="btn btn-secondary btn-sm" 
                  style={{ padding: '1px 6px', fontSize: '10.5px' }}
                >
                  + Add Doctor
                </button>
              )}
            </div>

            <input
              type="text"
              className="input-field"
              style={{ fontSize: '13px', height: '36px', marginBottom: '6px' }}
              placeholder="Self / OTC (or type Dr. Name)..."
              value={doctorName}
              onChange={(e) => setDoctorName(e.target.value)}
            />

            <input
              type="text"
              className="input-field mono"
              style={{ fontSize: '12px', height: '32px' }}
              placeholder="Rx / Prescription # (Optional)..."
              value={prescriptionNo}
              onChange={(e) => setPrescriptionNo(e.target.value)}
            />
          </div>
        </div>

        {/* Bill Summary & Payment Card */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Bill Summary & Payment
          </div>

          {/* Calculations */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
              <span>Gross Items Subtotal:</span>
              <span className="mono" style={{ fontWeight: 700, color: '#0f172a' }}>{currency}{subtotal.toFixed(2)}</span>
            </div>

            {/* Bill Discount Dropdown & Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: '#f8fafc', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>Bill Discount:</span>
                
                {/* Discount Preset Dropdown */}
                <select
                  style={{
                    background: '#ffffff',
                    color: '#0f172a',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    padding: '3px 8px',
                    cursor: 'pointer'
                  }}
                  value={discountPreset}
                  onChange={(e) => handleDiscountPresetChange(e.target.value)}
                >
                  <option value="0">0% (No Discount)</option>
                  <option value="5">5% Discount</option>
                  <option value="10">10% Discount</option>
                  <option value="15">15% Discount</option>
                  <option value="20">20% Discount</option>
                  <option value="custom_pct">Custom % Discount</option>
                  <option value="custom_fixed">Custom Flat ({currency})</option>
                </select>
              </div>

              {/* Quick Preset Pills & Custom Value Input */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {['0', '5', '10'].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleDiscountPresetChange(val)}
                      style={{
                        padding: '2px 7px',
                        fontSize: '11px',
                        fontWeight: 700,
                        borderRadius: '4px',
                        border: discountPreset === val ? '1px solid #e11d48' : '1px solid #cbd5e1',
                        background: discountPreset === val ? '#ffe4e6' : '#ffffff',
                        color: discountPreset === val ? '#e11d48' : '#475569',
                        cursor: 'pointer'
                      }}
                    >
                      {val === '0' ? 'None' : `${val}%`}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleDiscountPresetChange(discountPreset === 'custom_fixed' ? 'custom_fixed' : 'custom_pct')}
                    style={{
                      padding: '2px 7px',
                      fontSize: '11px',
                      fontWeight: 700,
                      borderRadius: '4px',
                      border: discountPreset.startsWith('custom') ? '1px solid #e11d48' : '1px solid #cbd5e1',
                      background: discountPreset.startsWith('custom') ? '#ffe4e6' : '#ffffff',
                      color: discountPreset.startsWith('custom') ? '#e11d48' : '#475569',
                      cursor: 'pointer'
                    }}
                  >
                    Custom
                  </button>
                </div>

                {/* Custom Input when custom is chosen or custom value is entered */}
                {(discountPreset.startsWith('custom') || (!['0', '5', '10', '15', '20'].includes(discountPreset))) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0"
                      className="mono"
                      style={{
                        width: '65px',
                        height: '28px',
                        textAlign: 'right',
                        background: '#ffffff',
                        border: '1px solid #f43f5e',
                        borderRadius: '4px',
                        color: '#e11d48',
                        fontWeight: 700,
                        fontSize: '12px',
                        padding: '2px 6px'
                      }}
                      value={discountValue}
                      onChange={(e) => {
                        setDiscountValue(e.target.value);
                        if (!discountPreset.startsWith('custom')) {
                          setDiscountPreset('custom_pct');
                        }
                      }}
                    />
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>
                      {discountType === 'PERCENT' ? '%' : currency}
                    </span>
                  </div>
                )}

                {billDiscountAmt > 0 && (
                  <span className="mono" style={{ color: '#e11d48', fontSize: '12px', fontWeight: 800, marginLeft: 'auto' }}>
                    -{currency}{billDiscountAmt.toFixed(2)}
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '11.5px' }}>
              <span>GST Included in MRP:</span>
              <span className="mono">{currency}{effectiveTax.toFixed(2)}</span>
            </div>

            {parseFloat(roundOff) !== 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '11.5px' }}>
                <span>Round Off:</span>
                <span className="mono">{parseFloat(roundOff) > 0 ? `+${roundOff}` : roundOff}</span>
              </div>
            )}

            {/* Grand Total Highlight */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 14px',
              background: 'linear-gradient(135deg, #f0f9ff 0%, #ecfdf5 100%)',
              border: '1px solid #bae6fd',
              borderRadius: '10px',
              margin: '4px 0'
            }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#0369a1', textTransform: 'uppercase' }}>Grand Total</div>
                <div style={{ fontSize: '10.5px', color: '#059669', fontWeight: 600 }}>Tax inclusive</div>
              </div>
              <div className="mono" style={{ fontSize: '24px', fontWeight: 900, color: '#0284c7' }}>
                {currency}{grandTotal.toFixed(2)}
              </div>
            </div>

            {/* Smart Change / Chocolate Round-off Quick Chips */}
            {quickRoundSuggestions.length > 0 && (
              <div style={{
                background: '#fffdf5',
                border: '1.5px dashed #f59e0b',
                borderRadius: '8px',
                padding: '8px 10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11.5px', fontWeight: 900, color: '#92400e', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>🍫</span> Round bill with Chocolate:
                  </span>
                  <span style={{ fontSize: '10px', color: '#b45309', fontWeight: 700 }}>1-Click Coin Change</span>
                </div>
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                  {quickRoundSuggestions.map(s => (
                    <button
                      key={s.diff}
                      type="button"
                      onClick={() => addQuickChocolate(s.diff)}
                      disabled={isAddingChocolate}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: '1px solid #f59e0b',
                        background: '#ffffff',
                        color: '#92400e',
                        fontSize: '11.5px',
                        fontWeight: 900,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        boxShadow: '0 1px 3px rgba(245, 158, 11, 0.15)'
                      }}
                      title={`Add +${currency}${s.diff} chocolate to make ${currency}${s.target}`}
                    >
                      <span>+{currency}{s.diff}</span>
                      <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 700 }}>({currency}{s.target})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Payment Method Selector */}
          <div>
            <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '6px', display: 'block', textTransform: 'uppercase' }}>
              Payment Method
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(105px, 1fr))', gap: '6px' }}>
              {[
                { id: 'CASH', label: 'Cash', icon: Banknote },
                { id: 'UPI', label: 'UPI / GPay', icon: QrCode },
                { id: 'MIXED', label: 'Split (Cash+UPI)', icon: Sparkles },
                { id: 'CARD', label: 'Card', icon: CreditCard },
                { id: 'CREDIT', label: 'Credit / Due', icon: User },
              ].map(m => {
                const Icon = m.icon;
                const active = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setPaymentMethod(m.id);
                      if (m.id === 'MIXED' && !splitCash && !splitUpi) {
                        const half = (grandTotal / 2).toFixed(2);
                        setSplitCash(half);
                        setSplitUpi((grandTotal - parseFloat(half)).toFixed(2));
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: active ? '2px solid #0284c7' : '1px solid #e2e8f0',
                      background: active ? '#f0f9ff' : '#ffffff',
                      color: active ? '#0284c7' : '#475569',
                      fontWeight: active ? 800 : 600,
                      fontSize: '11.5px',
                      cursor: 'pointer'
                    }}
                  >
                    <Icon size={14} />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cash Tendered & Change Calc */}
          {paymentMethod === 'CASH' && (
            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#475569', fontWeight: 600 }}>Cash Received:</span>
                <input
                  type="number"
                  className="input-field mono"
                  style={{ width: '110px', height: '34px', textAlign: 'right', fontSize: '14px', background: '#ffffff', fontWeight: 700 }}
                  placeholder="0.00"
                  value={cashTendered}
                  onChange={(e) => setCashTendered(e.target.value)}
                />
              </div>

              {/* Quick Cash Denomination Chips */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {[
                  { label: 'Exact', val: grandTotal },
                  { label: '+100', val: (parseFloat(cashTendered) || 0) + 100 },
                  { label: '+500', val: (parseFloat(cashTendered) || 0) + 500 },
                  { label: '500', val: 500 },
                  { label: '2000', val: 2000 },
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCashTendered(chip.val.toFixed(2))}
                    style={{
                      padding: '3px 8px',
                      fontSize: '11px',
                      fontWeight: 700,
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#0284c7',
                      cursor: 'pointer'
                    }}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {tenderedNum > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '13px', color: '#059669', fontWeight: 800, borderTop: '1px dashed #cbd5e1', paddingTop: '6px' }}>
                  <span>Change Return:</span>
                  <span className="mono">{currency}{changeDue.toFixed(2)}</span>
                </div>
              )}
            </div>
          )}

          {/* Split Payment (Cash + UPI) Interface */}
          {paymentMethod === 'MIXED' && (
            <div style={{ background: '#fdf4ff', padding: '12px', borderRadius: '10px', border: '1px solid #f0abfc', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#86198f' }}>
                  Split Payment Breakdown
                </span>
                <span className="mono" style={{ fontSize: '11.5px', color: '#a21caf', fontWeight: 700 }}>
                  Total: {currency}{grandTotal.toFixed(2)}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#059669', display: 'block', marginBottom: '3px' }}>
                    Cash Amount ({currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={grandTotal}
                    step="any"
                    className="input-field mono"
                    style={{ height: '34px', fontSize: '13px', background: '#ffffff', fontWeight: 700 }}
                    placeholder="Cash ₹"
                    value={splitCash}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSplitCash(val);
                      const cVal = parseFloat(val) || 0;
                      setSplitUpi(Math.max(0, grandTotal - cVal).toFixed(2));
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#0284c7', display: 'block', marginBottom: '3px' }}>
                    UPI / GPay ({currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={grandTotal}
                    step="any"
                    className="input-field mono"
                    style={{ height: '34px', fontSize: '13px', background: '#ffffff', fontWeight: 700 }}
                    placeholder="UPI ₹"
                    value={splitUpi}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSplitUpi(val);
                      const uVal = parseFloat(val) || 0;
                      setSplitCash(Math.max(0, grandTotal - uVal).toFixed(2));
                    }}
                  />
                </div>
              </div>

              {/* Quick Split Ratio Chips */}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span style={{ fontSize: '10.5px', color: '#701a75' }}>Quick:</span>
                <button
                  type="button"
                  onClick={() => {
                    const half = (grandTotal / 2).toFixed(2);
                    setSplitCash(half);
                    setSplitUpi((grandTotal - parseFloat(half)).toFixed(2));
                  }}
                  style={{
                    padding: '2px 6px',
                    fontSize: '10.5px',
                    fontWeight: 700,
                    borderRadius: '4px',
                    border: '1px solid #d946ef',
                    background: '#ffffff',
                    color: '#86198f',
                    cursor: 'pointer'
                  }}
                >
                  50% / 50%
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSplitCash('100.00');
                    setSplitUpi(Math.max(0, grandTotal - 100).toFixed(2));
                  }}
                  style={{
                    padding: '2px 6px',
                    fontSize: '10.5px',
                    fontWeight: 700,
                    borderRadius: '4px',
                    border: '1px solid #d946ef',
                    background: '#ffffff',
                    color: '#86198f',
                    cursor: 'pointer'
                  }}
                >
                  ₹100 Cash + Rest UPI
                </button>
              </div>
            </div>
          )}

          {/* UPI Dynamic QR Preview */}
          {paymentMethod === 'UPI' && (
            <div style={{ textAlign: 'center', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase' }}>Scan to Pay via UPI</div>
              <div style={{ margin: '8px 0', display: 'flex', justifyContent: 'center' }}>
                <div style={{ width: '100px', height: '100px', border: '2px solid #0f172a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#ffffff', borderRadius: '6px' }}>
                  <QrCode size={64} color="#0f172a" />
                  <span style={{ fontSize: '8px', fontWeight: 800, marginTop: '2px' }}>{currency}{grandTotal}</span>
                </div>
              </div>
              <div style={{ fontSize: '10.5px', color: '#475569' }}>
                VPA: <strong>{profile?.upi_id || 'topmedical@upi'}</strong>
              </div>
            </div>
          )}

          {checkoutError && (
            <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecdd3', borderRadius: '6px', color: '#e11d48', fontSize: '12px' }}>
              {checkoutError}
            </div>
          )}

          {/* Complete Bill Action Button */}
          <button
            onClick={handleCheckout}
            disabled={isSubmitting || cart.length === 0}
            className="btn btn-primary btn-lg"
            style={{ width: '100%', height: '48px', fontSize: '15px' }}
          >
            <CheckCircle size={18} />
            <span>{isSubmitting ? 'Processing...' : 'Complete Bill & Print (F8)'}</span>
          </button>
        </div>
      </div>

      {/* Floating Sticky Mobile Summary Bar if cart has items */}
      {cart.length > 0 && (
        <div className="mobile-only" style={{
          position: 'fixed',
          bottom: '62px',
          left: 0,
          right: 0,
          padding: '10px 16px',
          background: '#0f172a',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 800,
          boxShadow: '0 -4px 15px rgba(0, 0, 0, 0.2)'
        }}>
          <div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>{cart.length} medicines in cart</div>
            <div className="mono" style={{ fontSize: '18px', fontWeight: 900, color: '#38bdf8' }}>
              {currency}{grandTotal.toFixed(2)}
            </div>
          </div>
          <button
            onClick={handleCheckout}
            disabled={isSubmitting}
            className="btn btn-emerald btn-sm"
            style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 800 }}
          >
            <span>Dispense Bill →</span>
          </button>
        </div>
      )}
    </div>
  );
}
