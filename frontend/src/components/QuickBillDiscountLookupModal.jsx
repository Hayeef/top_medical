import React, { useState, useEffect } from 'react';
import { 
  Tag, 
  Percent, 
  Search, 
  X, 
  Save, 
  AlertCircle, 
  CheckCircle2, 
  Receipt, 
  Sparkles,
  Printer,
  ChevronRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { billingAPI } from '../api';

export default function QuickBillDiscountLookupModal({ 
  isOpen, 
  onClose, 
  profile, 
  onOpenReceipt,
  onReload 
}) {
  if (!isOpen) return null;

  const currency = profile?.currency_symbol || '₹';

  const [invoices, setInvoices] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const [discountType, setDiscountType] = useState('PERCENT'); // 'PERCENT' | 'FIXED'
  const [discountValue, setDiscountValue] = useState('0');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Fetch recent invoices
  const fetchRecentInvoices = async (query = '') => {
    setLoadingList(true);
    try {
      const params = new URLSearchParams();
      if (query) params.append('search', query);
      const res = await billingAPI.getInvoices(params.toString());
      const list = res?.results || res || [];
      setInvoices(list);
      if (list.length > 0 && !selectedInvoice) {
        selectInvoice(list[0]);
      }
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRecentInvoices();
      setError(null);
      setSuccessMsg(null);
    }
  }, [isOpen]);

  const selectInvoice = (inv) => {
    setSelectedInvoice(inv);
    setDiscountType(inv.discount_type || 'PERCENT');
    setDiscountValue(parseFloat(inv.discount_value || 0).toString());
    setError(null);
    setSuccessMsg(null);
  };

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    fetchRecentInvoices(searchQuery.trim());
  };

  const rawSubtotal = selectedInvoice 
    ? (parseFloat(selectedInvoice.subtotal) > 0 ? parseFloat(selectedInvoice.subtotal) : parseFloat(selectedInvoice.grand_total || 0))
    : 0;

  const numericValue = parseFloat(discountValue) || 0;

  // Calculations
  let calculatedDiscountAmt = 0;
  if (discountType === 'PERCENT') {
    calculatedDiscountAmt = Math.round(((rawSubtotal * numericValue) / 100) * 100) / 100;
  } else {
    calculatedDiscountAmt = Math.min(rawSubtotal, Math.round(numericValue * 100) / 100);
  }

  const netAfterDiscount = Math.max(0, rawSubtotal - calculatedDiscountAmt);
  const newGrandTotal = Math.round(netAfterDiscount);
  const roundOff = Math.round((newGrandTotal - netAfterDiscount) * 100) / 100;
  const currentTotal = selectedInvoice ? parseFloat(selectedInvoice.grand_total || 0) : 0;
  const savings = Math.max(0, currentTotal - newGrandTotal);

  const presets = [2, 3, 5, 7.5, 10, 12, 15, 20];

  const handleApplyPreset = (pct) => {
    setDiscountType('PERCENT');
    setDiscountValue(pct.toString());
    setError(null);
  };

  const handleSaveDiscount = async (e) => {
    e?.preventDefault();
    if (!selectedInvoice) return;

    if (numericValue < 0) {
      setError('Discount cannot be negative.');
      return;
    }
    if (discountType === 'PERCENT' && numericValue > 100) {
      setError('Discount percentage cannot exceed 100%.');
      return;
    }
    if (discountType === 'FIXED' && numericValue > rawSubtotal) {
      setError(`Discount amount cannot exceed bill subtotal (${currency}${rawSubtotal.toFixed(2)}).`);
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await billingAPI.updateInvoiceDiscount(selectedInvoice.id, {
        discount_type: discountType,
        discount_value: numericValue
      });

      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.7 }
      });

      const updated = res.invoice || res.data || { ...selectedInvoice, discount_type: discountType, discount_value: numericValue, grand_total: newGrandTotal };
      setSelectedInvoice(updated);
      setInvoices(prev => prev.map(i => i.id === updated.id ? updated : i));
      setSuccessMsg(`Discount updated! Received amount adjusted to ${currency}${newGrandTotal.toFixed(2)}.`);
      
      if (onReload) onReload();
    } catch (err) {
      console.error('Failed to update bill discount:', err);
      setError(err.message || 'Failed to update discount on invoice.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div 
      className="modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
    >
      <div 
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '780px',
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh'
        }}
      >
        {/* Modal Top Bar */}
        <div style={{
          padding: '16px 20px',
          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Tag size={18} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, lineHeight: 1.2 }}>
                Post-Generation Bill Bargain & Discount Adjuster
              </h3>
              <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.85)', marginTop: '2px' }}>
                Update discount after bill generation to record actual received amount in cash/UPI drawer
              </div>
            </div>
          </div>
          
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              borderRadius: '8px',
              color: '#ffffff',
              width: '30px',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body - 2 Columns */}
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', flex: 1, overflow: 'hidden' }}>
          
          {/* Left Column: Recent Bill Selector & Search */}
          <div style={{
            borderRight: '1px solid #e2e8f0',
            background: '#f8fafc',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} style={{ padding: '10px', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} color="#64748b" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  className="input-field"
                  style={{ height: '32px', fontSize: '11.5px', paddingLeft: '30px' }}
                  placeholder="Search Bill # or Patient..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </form>

            {/* Bill List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '6px' }}>
              {loadingList ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '12px' }}>
                  Loading recent bills...
                </div>
              ) : invoices.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '12px' }}>
                  No bills found.
                </div>
              ) : (
                invoices.map((inv) => {
                  const isSelected = selectedInvoice?.id === inv.id;
                  const isCancelled = inv.payment_status === 'CANCELLED';
                  return (
                    <div
                      key={inv.id}
                      onClick={() => !isCancelled && selectInvoice(inv)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '8px',
                        marginBottom: '4px',
                        background: isSelected ? '#e0f2fe' : (isCancelled ? '#fff1f2' : '#ffffff'),
                        border: isSelected ? '1.5px solid #0284c7' : '1px solid #e2e8f0',
                        cursor: isCancelled ? 'not-allowed' : 'pointer',
                        opacity: isCancelled ? 0.6 : 1,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 800, fontSize: '12px', color: isSelected ? '#0369a1' : '#0f172a' }}>
                          #{inv.invoice_number.split('-').slice(-2).join('-')}
                        </span>
                        <span className="mono" style={{ fontWeight: 800, fontSize: '12px', color: '#059669' }}>
                          {currency}{parseFloat(inv.grand_total).toFixed(0)}
                        </span>
                      </div>
                      <div style={{ fontSize: '10.5px', color: '#64748b', display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                          {inv.customer_name || 'Walk-in'}
                        </span>
                        <span>{inv.payment_method}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Discount Calculator & Apply Form */}
          <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {selectedInvoice ? (
              <form onSubmit={handleSaveDiscount} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                
                {/* Active Invoice Header Card */}
                <div style={{
                  padding: '12px 16px',
                  background: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  borderRadius: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px'
                }}>
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0369a1' }}>
                      Bill #{selectedInvoice.invoice_number}
                    </div>
                    <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                      Patient: <strong>{selectedInvoice.customer_name || 'Walk-in Customer'}</strong> • Method: <span className="badge badge-cyan" style={{ fontSize: '10px' }}>{selectedInvoice.payment_method}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '10.5px', color: '#64748b' }}>Current Total Received</div>
                    <div className="mono" style={{ fontSize: '17px', fontWeight: 900, color: '#0f172a' }}>
                      {currency}{parseFloat(selectedInvoice.grand_total).toFixed(2)}
                    </div>
                  </div>
                </div>

                {error && (
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: '#fef2f2',
                    border: '1px solid #fecdd3',
                    color: '#dc2626',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '14px'
                  }}>
                    <AlertCircle size={15} />
                    <span>{error}</span>
                  </div>
                )}

                {successMsg && (
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    color: '#059669',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '14px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CheckCircle2 size={15} />
                      <span>{successMsg}</span>
                    </div>
                    {onOpenReceipt && (
                      <button
                        type="button"
                        onClick={() => onOpenReceipt(selectedInvoice)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '2px 8px', fontSize: '11px' }}
                      >
                        <Printer size={11} /> Print Updated Slip
                      </button>
                    )}
                  </div>
                )}

                {/* Discount Mode Selector */}
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Bargain Discount Mode:
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => { setDiscountType('PERCENT'); setError(null); }}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: discountType === 'PERCENT' ? '2px solid #0284c7' : '1px solid #cbd5e1',
                        background: discountType === 'PERCENT' ? '#f0f9ff' : '#ffffff',
                        color: discountType === 'PERCENT' ? '#0369a1' : '#475569',
                        fontWeight: 800,
                        fontSize: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <Percent size={13} />
                      <span>Percentage (%)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => { setDiscountType('FIXED'); setError(null); }}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: discountType === 'FIXED' ? '2px solid #0284c7' : '1px solid #cbd5e1',
                        background: discountType === 'FIXED' ? '#f0f9ff' : '#ffffff',
                        color: discountType === 'FIXED' ? '#0369a1' : '#475569',
                        fontWeight: 800,
                        fontSize: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <span>Fixed Rupee Discount ({currency})</span>
                    </button>
                  </div>
                </div>

                {/* Quick Presets */}
                {discountType === 'PERCENT' && (
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>
                      ⚡ Quick Bargain Presets:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {presets.map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => handleApplyPreset(pct)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            border: numericValue === pct ? '1.5px solid #0284c7' : '1px solid #e2e8f0',
                            background: numericValue === pct ? '#e0f2fe' : '#f8fafc',
                            color: numericValue === pct ? '#0369a1' : '#334155',
                            cursor: 'pointer'
                          }}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Discount Input */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    {discountType === 'PERCENT' ? 'Discount Percentage (%)' : `Discount Value (${currency})`}:
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max={discountType === 'PERCENT' ? "100" : rawSubtotal}
                      className="input-field mono"
                      style={{
                        height: '40px',
                        fontSize: '16px',
                        fontWeight: 800,
                        paddingLeft: '14px',
                        paddingRight: '36px',
                        borderColor: '#0284c7',
                        background: '#f8fafc'
                      }}
                      value={discountValue}
                      onChange={(e) => {
                        setDiscountValue(e.target.value);
                        setError(null);
                        setSuccessMsg(null);
                      }}
                      placeholder="0"
                    />
                    <div style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: '14px',
                      fontWeight: 800,
                      color: '#64748b'
                    }}>
                      {discountType === 'PERCENT' ? '%' : currency}
                    </div>
                  </div>
                </div>

                {/* Live Recalculated Summary Card */}
                <div style={{
                  padding: '12px 16px',
                  background: '#ecfdf5',
                  border: '1.5px solid #a7f3d0',
                  borderRadius: '12px',
                  marginBottom: '16px',
                  marginTop: 'auto'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#065f46', marginBottom: '4px' }}>
                    <span>Gross Subtotal:</span>
                    <span className="mono font-bold">{currency}{rawSubtotal.toFixed(2)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#dc2626', marginBottom: '4px', fontWeight: 700 }}>
                    <span>Discount Deduction ({discountType === 'PERCENT' ? `${numericValue}%` : `${currency}${numericValue}`}):</span>
                    <span className="mono">- {currency}{calculatedDiscountAmt.toFixed(2)}</span>
                  </div>

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTop: '1px solid #bbf7d0',
                    paddingTop: '6px',
                    marginTop: '4px'
                  }}>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#064e3b' }}>
                      ACTUAL RECEIVED AMOUNT:
                    </span>
                    <span className="mono" style={{ fontSize: '20px', fontWeight: 900, color: '#059669' }}>
                      {currency}{newGrandTotal.toFixed(2)}
                    </span>
                  </div>

                  {savings > 0 && (
                    <div style={{ fontSize: '11px', color: '#047857', fontWeight: 700, marginTop: '3px', textAlign: 'right' }}>
                      ✨ Customer discount concession: {currency}{savings.toFixed(2)}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={onClose}
                    className="btn btn-secondary"
                    style={{ padding: '8px 16px', fontSize: '12.5px' }}
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn btn-emerald"
                    style={{
                      padding: '8px 22px',
                      fontSize: '12.5px',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                    }}
                  >
                    <Save size={15} />
                    <span>{submitting ? 'Applying...' : 'Apply & Update Received Amount'}</span>
                  </button>
                </div>

              </form>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                Select a bill from the left list to update its discount.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
