import React, { useState, useEffect, useRef } from 'react';
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
  UserPlus
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { inventoryAPI, billingAPI } from '../api';

export default function PosBillingPage({ 
  profile, 
  customers, 
  doctors, 
  onOpenAddCustomer, 
  onOpenAddDoctor, 
  onInvoiceCreated,
  onOpenReceipt 
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [cart, setCart] = useState([]);
  
  // Customer & Doctor
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [walkinName, setWalkinName] = useState('Walk-in Customer');
  const [walkinPhone, setWalkinPhone] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [prescriptionNo, setPrescriptionNo] = useState('');
  const [doctorNotes, setDoctorNotes] = useState('');

  // Discount & Payment
  const [discountType, setDiscountType] = useState('PERCENT'); // 'PERCENT' or 'FIXED'
  const [discountValue, setDiscountValue] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [cashTendered, setCashTendered] = useState('');
  
  // Checkout status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);

  const searchInputRef = useRef(null);
  const currency = profile?.currency_symbol || '₹';

  // Instant POS Search with debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await inventoryAPI.searchPOS(searchQuery);
        setSearchResults(results || []);
      } catch (err) {
        console.error('POS Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Keyboard shortcut listener (F4 to focus search, F8 to checkout)
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
  }, [cart, isSubmitting, discountType, discountValue, paymentMethod, cashTendered, selectedCustomerId, walkinName, walkinPhone, selectedDoctorId]);

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
    const existingIndex = cart.findIndex(item => item.medicine.id === medicine.id && item.batch.id === bestBatch.id);

    if (existingIndex > -1) {
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      setCart(updated);
    } else {
      const newItem = {
        medicine,
        batch: bestBatch,
        availableBatches: activeBatches,
        is_loose: false,
        quantity: 1,
        pack_size: bestBatch.pack_size || 10,
        unit_mrp: parseFloat(bestBatch.mrp),
        unit_selling_price: parseFloat(bestBatch.selling_price),
        discount_percent: 0,
        gst_rate: parseFloat(medicine.gst_rate) || 12.0,
      };
      setCart([...cart, newItem]);
    }

    setSearchQuery('');
    setSearchResults([]);
  };

  const handleBatchChange = (index, batchId) => {
    const updated = [...cart];
    const item = updated[index];
    const newBatch = item.availableBatches.find(b => b.id === parseInt(batchId));
    if (newBatch) {
      item.batch = newBatch;
      item.pack_size = newBatch.pack_size;
      item.unit_mrp = item.is_loose ? parseFloat(newBatch.unit_mrp) : parseFloat(newBatch.mrp);
      item.unit_selling_price = item.is_loose ? parseFloat(newBatch.unit_selling_price) : parseFloat(newBatch.selling_price);
      setCart(updated);
    }
  };

  const toggleLoose = (index) => {
    const updated = [...cart];
    const item = updated[index];
    item.is_loose = !item.is_loose;
    if (item.is_loose) {
      item.unit_mrp = parseFloat(item.batch.unit_mrp);
      item.unit_selling_price = parseFloat(item.batch.unit_selling_price);
    } else {
      item.unit_mrp = parseFloat(item.batch.mrp);
      item.unit_selling_price = parseFloat(item.batch.selling_price);
    }
    setCart(updated);
  };

  const updateQuantity = (index, delta) => {
    const updated = [...cart];
    const newQty = updated[index].quantity + delta;
    if (newQty <= 0) {
      removeFromCart(index);
    } else {
      updated[index].quantity = newQty;
      setCart(updated);
    }
  };

  const removeFromCart = (index) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const clearCart = () => {
    setCart([]);
    setDiscountValue(0);
    setCashTendered('');
    setCheckoutError(null);
  };

  let subtotal = 0;
  let totalTax = 0;

  cart.forEach(item => {
    const gross = item.unit_selling_price * item.quantity;
    const disc = (gross * (item.discount_percent || 0)) / 100;
    const net = gross - disc;
    const tax = (net * item.gst_rate) / 100;
    subtotal += net;
    totalTax += tax;
  });

  const billDiscountAmt = discountType === 'PERCENT'
    ? (subtotal * (parseFloat(discountValue) || 0)) / 100
    : Math.min(subtotal, parseFloat(discountValue) || 0);

  const totalBeforeRound = Math.max(0, subtotal - billDiscountAmt + totalTax);
  const grandTotal = Math.round(totalBeforeRound);
  const roundOff = (grandTotal - totalBeforeRound).toFixed(2);
  const cgst = (totalTax / 2).toFixed(2);
  const sgst = (totalTax / 2).toFixed(2);

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

      const payload = {
        customer: selectedCust ? selectedCust.id : null,
        customer_name: selectedCust ? selectedCust.name : (walkinName || 'Walk-in Customer'),
        customer_phone: selectedCust ? selectedCust.phone : (walkinPhone || ''),
        doctor: selectedDoc ? selectedDoc.id : null,
        doctor_name: selectedDoc ? selectedDoc.name : '',
        prescription_number: prescriptionNo,
        payment_method: paymentMethod,
        payment_status: paymentMethod === 'CREDIT' ? 'DUE' : 'PAID',
        subtotal: subtotal.toFixed(2),
        discount_type: discountType,
        discount_value: parseFloat(discountValue) || 0,
        discount_amount: billDiscountAmt.toFixed(2),
        tax_amount: totalTax.toFixed(2),
        cgst_amount: cgst,
        sgst_amount: sgst,
        round_off: roundOff,
        grand_total: grandTotal.toFixed(2),
        amount_paid: paymentMethod === 'CREDIT' ? '0.00' : (paymentMethod === 'CASH' && tenderedNum > 0 ? Math.min(tenderedNum, grandTotal).toFixed(2) : grandTotal.toFixed(2)),
        change_due: changeDue.toFixed(2),
        notes: doctorNotes,
        items_data: cart.map(item => ({
          medicine_id: item.medicine.id,
          batch_id: item.batch.id,
          is_loose: item.is_loose,
          quantity: item.quantity,
          unit_mrp: item.unit_mrp,
          unit_selling_price: item.unit_selling_price,
          discount_percent: item.discount_percent || 0,
          gst_rate: item.gst_rate || 12.0,
        })),
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
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '20px', padding: '24px', minHeight: 'calc(100vh - 70px)' }}>
      {/* LEFT AREA: Medicine Search & Active Cart Table */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Search Bar with live FEFO lookup */}
        <div className="glass-panel" style={{ padding: '16px', position: 'relative' }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} color="#0284c7" style={{ position: 'absolute', left: '14px', top: '13px' }} />
            <input
              ref={searchInputRef}
              type="text"
              className="input-field"
              style={{ paddingLeft: '42px', height: '44px', fontSize: '14px', background: '#f8fafc', borderColor: '#cbd5e1' }}
              placeholder="Search by Drug Name, Salt Composition, Barcode, or Rack (F4)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
              top: '72px',
              left: '16px',
              right: '16px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '12px',
              boxShadow: '0 12px 30px rgba(15, 23, 42, 0.12)',
              zIndex: 100,
              maxHeight: '340px',
              overflowY: 'auto',
              padding: '8px'
            }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', padding: '6px 10px', textTransform: 'uppercase' }}>
                Medicines in Stock ({searchResults.length} matches)
              </div>
              {searchResults.map((med) => {
                const totalStock = med.batches?.reduce((acc, b) => acc + (b.is_expired ? 0 : b.pack_quantity), 0) || 0;
                const nextBatch = med.batches?.find(b => !b.is_expired && b.pack_quantity > 0);
                
                return (
                  <div
                    key={med.id}
                    onClick={() => addToCart(med)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: '1px solid #f1f5f9',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f0f9ff'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>{med.name}</span>
                        <span className="badge badge-cyan">{med.dosage_form}</span>
                        {med.requires_prescription && <span className="badge badge-rose">Rx Required</span>}
                      </div>
                      <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>
                        {med.generic_name || 'Standard Formulation'} • <em>{med.manufacturer}</em>
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', display: 'flex', gap: '10px' }}>
                        {med.rack_location && <span><MapPin size={11} style={{ display: 'inline' }} /> {med.rack_location}</span>}
                        {nextBatch && <span>Next Expiry: <strong style={{ color: nextBatch.is_near_expiry ? '#d97706' : '#059669' }}>{nextBatch.expiry_date}</strong> (Batch: {nextBatch.batch_number})</span>}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div className="mono" style={{ fontSize: '14px', fontWeight: 800, color: '#059669' }}>
                        {currency}{nextBatch ? nextBatch.selling_price : '-'}
                        <span style={{ fontSize: '10px', color: '#64748b' }}>/pack</span>
                      </div>
                      <div style={{ fontSize: '11px', marginTop: '2px' }}>
                        Stock: <strong style={{ color: totalStock > 10 ? '#059669' : (totalStock > 0 ? '#d97706' : '#e11d48') }}>
                          {totalStock} packs
                        </strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Active Cart Panel */}
        <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{
            padding: '14px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#f8fafc'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShoppingCart size={18} color="#0284c7" />
              <span style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>Dispensing Cart ({cart.length} items)</span>
            </div>
            {cart.length > 0 && (
              <button onClick={clearCart} className="btn btn-secondary btn-sm" style={{ color: '#e11d48', borderColor: '#fecdd3' }}>
                <Trash2 size={13} /> Clear Cart
              </button>
            )}
          </div>

          {/* Cart Table */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {cart.length === 0 ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8' }}>
                <ShoppingCart size={48} strokeWidth={1} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#475569' }}>Cart is Empty</h4>
                <p style={{ fontSize: '12.5px', marginTop: '4px', color: '#64748b' }}>
                  Search medicines above or press <kbd style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', color: '#0284c7', fontWeight: 700 }}>F4</kbd> to add items to this bill.
                </p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '32%' }}>Medicine & Composition</th>
                    <th style={{ width: '22%' }}>Batch & Expiry (FEFO)</th>
                    <th style={{ width: '14%', textAlign: 'center' }}>Type & Qty</th>
                    <th style={{ width: '12%', textAlign: 'right' }}>Price ({currency})</th>
                    <th style={{ width: '14%', textAlign: 'right' }}>Line Total ({currency})</th>
                    <th style={{ width: '6%', textAlign: 'center' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item, idx) => {
                    const lineGross = item.unit_selling_price * item.quantity;
                    const lineDisc = (lineGross * (item.discount_percent || 0)) / 100;
                    const lineTotal = lineGross - lineDisc;

                    return (
                      <tr key={idx}>
                        <td>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.medicine.name}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            {item.medicine.generic_name?.slice(0, 35)}...
                          </div>
                          {item.medicine.rack_location && (
                            <div style={{ fontSize: '10.5px', color: '#0284c7', marginTop: '2px', fontWeight: 600 }}>
                              📍 {item.medicine.rack_location}
                            </div>
                          )}
                        </td>

                        <td>
                          <select
                            className="input-field mono"
                            style={{ padding: '4px 8px', fontSize: '12px', height: '30px' }}
                            value={item.batch.id}
                            onChange={(e) => handleBatchChange(idx, e.target.value)}
                          >
                            {item.availableBatches.map(b => (
                              <option key={b.id} value={b.id}>
                                {b.batch_number} (Exp: {b.expiry_date}) - {b.pack_quantity}p
                              </option>
                            ))}
                          </select>
                          <div style={{ fontSize: '10px', color: item.batch.is_near_expiry ? '#d97706' : '#059669', marginTop: '2px', fontWeight: 600 }}>
                            {item.batch.is_near_expiry ? '⚠️ Near Expiry (<90d)' : '🟢 Good Expiry'}
                          </div>
                        </td>

                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                            <button
                              type="button"
                              onClick={() => toggleLoose(idx)}
                              className={`badge ${item.is_loose ? 'badge-amber' : 'badge-cyan'}`}
                              style={{ cursor: 'pointer', border: 'none' }}
                              title="Click to toggle Pack vs Loose single units"
                            >
                              {item.is_loose ? `Loose (${item.pack_size}s)` : `Full Pack (${item.pack_size}s)`}
                            </button>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <button
                                onClick={() => updateQuantity(idx, -1)}
                                style={{ width: '22px', height: '22px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              >
                                <Minus size={11} />
                              </button>
                              <input
                                type="number"
                                min="1"
                                className="mono"
                                style={{ width: '38px', textAlign: 'center', background: 'transparent', border: 'none', color: '#0f172a', fontWeight: 700, fontSize: '13px' }}
                                value={item.quantity}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 1;
                                  const updated = [...cart];
                                  updated[idx].quantity = val;
                                  setCart(updated);
                                }}
                              />
                              <button
                                onClick={() => updateQuantity(idx, 1)}
                                style={{ width: '22px', height: '22px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              >
                                <Plus size={11} />
                              </button>
                            </div>
                          </div>
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          <div className="mono" style={{ fontWeight: 600, color: '#0f172a' }}>{currency}{item.unit_selling_price.toFixed(2)}</div>
                          <div style={{ fontSize: '10px', color: '#94a3b8', textDecoration: 'line-through' }}>
                            MRP {currency}{item.unit_mrp.toFixed(2)}
                          </div>
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          <div className="mono" style={{ fontWeight: 800, color: '#059669', fontSize: '14px' }}>
                            {currency}{lineTotal.toFixed(2)}
                          </div>
                          <div style={{ fontSize: '10px', color: '#64748b' }}>
                            GST {item.gst_rate}%
                          </div>
                        </td>

                        <td style={{ textAlign: 'center' }}>
                          <button
                            onClick={() => removeFromCart(idx)}
                            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                            title="Remove line item"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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

      {/* RIGHT AREA: Customer / Doctor Selection & Checkout Summary */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Customer & Doctor Card */}
        <div className="glass-panel" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase' }}>
              Patient / Customer
            </div>
            <button onClick={onOpenAddCustomer} className="btn btn-secondary btn-sm" style={{ padding: '2px 8px', fontSize: '11px' }}>
              <UserPlus size={12} /> New
            </button>
          </div>

          <div>
            <select
              className="input-field"
              style={{ fontSize: '12.5px', marginBottom: '8px' }}
              value={selectedCustomerId}
              onChange={(e) => {
                setSelectedCustomerId(e.target.value);
                const cust = customers?.find(c => c.id === parseInt(e.target.value));
                if (cust) {
                  setWalkinName(cust.name);
                  setWalkinPhone(cust.phone);
                  if (cust.preferred_doctor) setSelectedDoctorId(cust.preferred_doctor);
                }
              }}
            >
              <option value="">-- Walk-in Patient (Quick Bill) --</option>
              {customers?.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phone}) {parseFloat(c.credit_balance) > 0 ? `[Due: ₹${c.credit_balance}]` : ''}
                </option>
              ))}
            </select>

            {!selectedCustomerId && (
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px' }}>
                <input
                  type="text"
                  className="input-field"
                  style={{ fontSize: '12px', height: '32px' }}
                  placeholder="Patient Name"
                  value={walkinName}
                  onChange={(e) => setWalkinName(e.target.value)}
                />
                <input
                  type="tel"
                  className="input-field mono"
                  style={{ fontSize: '12px', height: '32px' }}
                  placeholder="Phone No"
                  value={walkinPhone}
                  onChange={(e) => setWalkinPhone(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Doctor selector */}
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#475569' }}>
                Prescribing Doctor
              </label>
              <button onClick={onOpenAddDoctor} className="btn btn-secondary btn-sm" style={{ padding: '1px 6px', fontSize: '10px' }}>
                + Doctor
              </button>
            </div>
            <select
              className="input-field"
              style={{ fontSize: '12.5px' }}
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
            >
              <option value="">-- OTC / Self Medication --</option>
              {doctors?.map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.specialization})</option>
              ))}
            </select>
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

            {/* Bill Discount Input */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: '#475569' }}>Discount:</span>
                <select
                  style={{ background: '#f8fafc', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '11px', padding: '1px 4px' }}
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value)}
                >
                  <option value="PERCENT">%</option>
                  <option value="FIXED">{currency}</option>
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input
                  type="number"
                  min="0"
                  style={{ width: '60px', textAlign: 'right', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '4px', color: '#e11d48', fontWeight: 700, fontSize: '12px', padding: '2px 4px' }}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                />
                <span className="mono" style={{ color: '#e11d48', fontSize: '12px', fontWeight: 600 }}>
                  (-{currency}{billDiscountAmt.toFixed(2)})
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '11.5px' }}>
              <span>GST Total (CGST+SGST):</span>
              <span className="mono">{currency}{totalTax.toFixed(2)}</span>
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
          </div>

          {/* Payment Method Selector */}
          <div>
            <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '6px', display: 'block', textTransform: 'uppercase' }}>
              Payment Method
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              {[
                { id: 'CASH', label: 'Cash', icon: Banknote },
                { id: 'UPI', label: 'UPI / QR', icon: QrCode },
                { id: 'CARD', label: 'Card', icon: CreditCard },
                { id: 'CREDIT', label: 'Credit / Due', icon: User },
              ].map(m => {
                const Icon = m.icon;
                const active = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: active ? '1px solid #0284c7' : '1px solid #e2e8f0',
                      background: active ? '#f0f9ff' : '#ffffff',
                      color: active ? '#0284c7' : '#475569',
                      fontWeight: active ? 700 : 600,
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    <Icon size={15} />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cash Tendered & Change Calc */}
          {paymentMethod === 'CASH' && (
            <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#475569', fontWeight: 600 }}>Cash Received:</span>
                <input
                  type="number"
                  className="input-field mono"
                  style={{ width: '100px', height: '30px', textAlign: 'right', fontSize: '13px', background: '#ffffff' }}
                  placeholder="0.00"
                  value={cashTendered}
                  onChange={(e) => setCashTendered(e.target.value)}
                />
              </div>
              {tenderedNum > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '12px', color: '#059669', fontWeight: 700 }}>
                  <span>Change Return:</span>
                  <span className="mono">{currency}{changeDue.toFixed(2)}</span>
                </div>
              )}
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
    </div>
  );
}
