import React, { useState, useEffect } from 'react';
import { 
  Percent, 
  DollarSign, 
  Tag, 
  X, 
  Check, 
  Save, 
  AlertCircle, 
  ArrowRight,
  TrendingDown,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { billingAPI } from '../api';

export default function UpdateDiscountModal({ invoice, profile, isOpen, onClose, onUpdated }) {
  if (!isOpen || !invoice) return null;

  const currency = profile?.currency_symbol || '₹';
  const rawSubtotal = parseFloat(invoice.subtotal) > 0 ? parseFloat(invoice.subtotal) : parseFloat(invoice.grand_total || 0);

  const [discountType, setDiscountType] = useState(invoice.discount_type || 'PERCENT'); // 'PERCENT' | 'FIXED'
  const [discountValue, setDiscountValue] = useState(parseFloat(invoice.discount_value || 0).toString());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (invoice) {
      setDiscountType(invoice.discount_type || 'PERCENT');
      setDiscountValue(parseFloat(invoice.discount_value || 0).toString());
      setError(null);
    }
  }, [invoice]);

  const numericValue = parseFloat(discountValue) || 0;

  // Live Calculations
  let calculatedDiscountAmt = 0;
  if (discountType === 'PERCENT') {
    calculatedDiscountAmt = Math.round(((rawSubtotal * numericValue) / 100) * 100) / 100;
  } else {
    calculatedDiscountAmt = Math.min(rawSubtotal, Math.round(numericValue * 100) / 100);
  }

  const netAfterDiscount = Math.max(0, rawSubtotal - calculatedDiscountAmt);
  const newGrandTotal = Math.round(netAfterDiscount);
  const roundOff = Math.round((newGrandTotal - netAfterDiscount) * 100) / 100;
  const savings = Math.max(0, parseFloat(invoice.grand_total || 0) - newGrandTotal);

  const presets = [2, 3, 5, 7.5, 10, 12, 15, 20];

  const handleApplyPreset = (pct) => {
    setDiscountType('PERCENT');
    setDiscountValue(pct.toString());
    setError(null);
  };

  const handleSave = async (e) => {
    e?.preventDefault();
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

    setLoading(true);
    setError(null);

    try {
      const res = await billingAPI.updateInvoiceDiscount(invoice.id, {
        discount_type: discountType,
        discount_value: numericValue
      });

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });

      if (onUpdated) {
        onUpdated(res.invoice || res.data || { ...invoice, discount_type: discountType, discount_value: numericValue, grand_total: newGrandTotal });
      }
      onClose();
    } catch (err) {
      console.error('Failed to update discount:', err);
      setError(err.message || 'Failed to update discount on invoice.');
    } finally {
      setLoading(false);
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
          maxWidth: '480px',
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
          border: '1px solid #e2e8f0'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
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
                Update Bill Discount (Bargain)
              </h3>
              <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.85)', marginTop: '2px' }}>
                Bill #{invoice.invoice_number} • {invoice.customer_name || 'Walk-in Customer'}
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
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} style={{ padding: '20px' }}>
          
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
              marginBottom: '16px'
            }}>
              <AlertCircle size={15} flexShrink={0} />
              <span>{error}</span>
            </div>
          )}

          {/* Current Summary Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 14px',
            background: '#f8fafc',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            marginBottom: '16px'
          }}>
            <div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Original Bill Subtotal</div>
              <div className="mono" style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                {currency}{rawSubtotal.toFixed(2)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Current Grand Total</div>
              <div className="mono" style={{ fontSize: '15px', fontWeight: 900, color: '#0369a1' }}>
                {currency}{parseFloat(invoice.grand_total || 0).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Discount Mode Selector */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
              Select Discount Mode:
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
                  fontSize: '12.5px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Percent size={14} />
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
                  fontSize: '12.5px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <span>Fixed Amount ({currency})</span>
              </button>
            </div>
          </div>

          {/* Preset Buttons for Quick Bargaining */}
          {discountType === 'PERCENT' && (
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>
                ⚡ Quick Presets (Click to apply):
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
                      fontSize: '12px',
                      fontWeight: 700,
                      border: numericValue === pct ? '1.5px solid #0284c7' : '1px solid #e2e8f0',
                      background: numericValue === pct ? '#e0f2fe' : '#f8fafc',
                      color: numericValue === pct ? '#0369a1' : '#334155',
                      cursor: 'pointer',
                      transition: 'all 0.1s ease'
                    }}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Custom Discount Input */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
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
                  height: '42px',
                  fontSize: '16px',
                  fontWeight: 800,
                  paddingLeft: '14px',
                  paddingRight: '40px',
                  borderColor: '#0284c7',
                  background: '#f8fafc'
                }}
                value={discountValue}
                onChange={(e) => {
                  setDiscountValue(e.target.value);
                  setError(null);
                }}
                placeholder="0"
                autoFocus
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
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#065f46', marginBottom: '4px' }}>
              <span>Gross Bill Subtotal:</span>
              <span className="mono font-bold">{currency}{rawSubtotal.toFixed(2)}</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#dc2626', marginBottom: '4px', fontWeight: 700 }}>
              <span>Bargain Discount ({discountType === 'PERCENT' ? `${numericValue}%` : `${currency}${numericValue}`}):</span>
              <span className="mono">- {currency}{calculatedDiscountAmt.toFixed(2)}</span>
            </div>

            {roundOff !== 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>
                <span>Round Off:</span>
                <span className="mono">{roundOff > 0 ? `+${roundOff}` : roundOff}</span>
              </div>
            )}

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid #bbf7d0',
              paddingTop: '8px',
              marginTop: '6px'
            }}>
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#064e3b' }}>
                NEW GRAND TOTAL:
              </span>
              <span className="mono" style={{ fontSize: '20px', fontWeight: 900, color: '#059669' }}>
                {currency}{newGrandTotal.toFixed(2)}
              </span>
            </div>

            {savings > 0 && (
              <div style={{ fontSize: '11px', color: '#047857', fontWeight: 700, marginTop: '4px', textAlign: 'right' }}>
                ✨ Customer saves an additional {currency}{savings.toFixed(2)}
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              style={{ padding: '9px 18px', fontSize: '13px' }}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-emerald"
              style={{
                padding: '9px 22px',
                fontSize: '13px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
              }}
            >
              <Save size={15} />
              <span>{loading ? 'Updating Bill...' : 'Apply & Update Bill'}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
