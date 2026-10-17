import React, { useState } from 'react';
import {
  X,
  PlusCircle,
  Landmark,
  Banknote,
  QrCode,
  Building2,
  Calendar,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  DollarSign
} from 'lucide-react';
import { dailyFinanceAPI } from '../api';
import '../utils/styles/CapitalInvestmentModal.css';

export default function CapitalInvestmentModal({
  isOpen,
  onClose,
  currentDate,
  currency = '₹',
  onSuccess
}) {
  const [date, setDate] = useState(currentDate || new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('CASH'); // 'CASH' | 'UPI' | 'BANK'
  const [sourceName, setSourceName] = useState('Proprietor / Owner Capital');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const quickAmounts = [10000, 25000, 50000, 100000, 200000, 500000];
  const quickSources = [
    'Proprietor / Owner Capital',
    'Partner Investment',
    'Working Capital Infusion',
    'Shop Reserve Fund',
    'Emergency Cash Loan'
  ];

  const parsedAmount = parseFloat(amount) || 0;

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!date) {
      setError('Please select an accounting date.');
      return;
    }
    if (parsedAmount <= 0) {
      setError('Please enter a valid capital amount greater than zero.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const payload = {
        date,
        amount: parsedAmount,
        payment_mode: paymentMode,
        source_name: sourceName || 'Proprietor / Owner Capital',
        notes: notes.trim()
      };

      const res = await dailyFinanceAPI.addCapitalInvestment(payload);
      if (onSuccess) {
        onSuccess(res);
      }
      onClose();
    } catch (err) {
      console.error('Failed to add capital investment:', err);
      setError(err.message || 'Failed to save capital investment to database.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(15, 23, 42, 0.72)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '16px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        className="modal-panel"
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '540px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 48px rgba(5, 150, 105, 0.2), 0 12px 24px rgba(0, 0, 0, 0.15)',
          border: '1.5px solid #6ee7b7',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out'
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '18px 22px',
            background: 'linear-gradient(135deg, #065f46 0%, #047857 50%, #059669 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255, 255, 255, 0.15)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
              }}
            >
              <Landmark size={22} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 900, letterSpacing: '0.01em', color: '#ffffff' }}>
                Add Capital Investment
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#a7f3d0', fontWeight: 600 }}>
                Owner fund infusion into firm daily money inflow & balance
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              borderRadius: '8px',
              color: '#ffffff',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s'
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)')}
            onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)')}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Error banner */}
            {error && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1.5px solid #fecdd3',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  color: '#dc2626',
                  fontSize: '13px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <AlertCircle size={16} color="#dc2626" />
                <span>{error}</span>
              </div>
            )}

            {/* 1. Date Selector */}
            <div>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12.5px',
                  fontWeight: 800,
                  color: '#065f46',
                  marginBottom: '6px',
                  textTransform: 'uppercase'
                }}
              >
                <Calendar size={15} color="#059669" />
                <span>Accounting Date *</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  fontSize: '14.5px',
                  fontWeight: 700,
                  borderRadius: '10px',
                  border: '1.5px solid #a7f3d0',
                  background: '#f0fdf4',
                  color: '#065f46',
                  outline: 'none'
                }}
              />
            </div>

            {/* 2. Amount Input & Quick Chips */}
            <div>
              <label
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '12.5px',
                  fontWeight: 800,
                  color: '#065f46',
                  marginBottom: '6px',
                  textTransform: 'uppercase'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <TrendingUp size={15} color="#059669" />
                  <span>Capital Inflow Amount ({currency}) *</span>
                </span>
                <span style={{ fontSize: '11px', color: '#059669', fontWeight: 700 }}>Money added to firm</span>
              </label>
              <div style={{ position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '22px',
                    fontWeight: 900,
                    color: '#059669'
                  }}
                >
                  {currency}
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  placeholder="0.00"
                  autoFocus
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="mono"
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 38px',
                    fontSize: '24px',
                    fontWeight: 900,
                    borderRadius: '12px',
                    border: '2px solid #059669',
                    background: '#ffffff',
                    color: '#065f46',
                    outline: 'none',
                    boxShadow: '0 2px 10px rgba(5, 150, 105, 0.08)'
                  }}
                />
              </div>

              {/* Quick Amount Suggestion Chips */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                {quickAmounts.map((qAmt) => (
                  <button
                    key={qAmt}
                    type="button"
                    onClick={() => setAmount(qAmt.toString())}
                    style={{
                      background: parsedAmount === qAmt ? '#059669' : '#f0fdf4',
                      color: parsedAmount === qAmt ? '#ffffff' : '#065f46',
                      border: '1px solid #a7f3d0',
                      borderRadius: '8px',
                      padding: '4px 10px',
                      fontSize: '11.5px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    +{currency}{qAmt >= 100000 ? `${(qAmt / 100000).toFixed(0)} Lakh` : `${(qAmt / 1000).toFixed(0)}k`}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Payment Mode / Destination */}
            <div>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12.5px',
                  fontWeight: 800,
                  color: '#065f46',
                  marginBottom: '8px',
                  textTransform: 'uppercase'
                }}
              >
                <span>Payment Mode & Inflow Channel</span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {/* CASH */}
                <button
                  type="button"
                  onClick={() => setPaymentMode('CASH')}
                  style={{
                    padding: '10px 8px',
                    borderRadius: '10px',
                    border: paymentMode === 'CASH' ? '2px solid #059669' : '1.5px solid #cbd5e1',
                    background: paymentMode === 'CASH' ? '#ecfdf5' : '#ffffff',
                    color: paymentMode === 'CASH' ? '#065f46' : '#475569',
                    fontWeight: 800,
                    fontSize: '12.5px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: paymentMode === 'CASH' ? '0 2px 8px rgba(5, 150, 105, 0.15)' : 'none',
                    transition: 'all 0.15s'
                  }}
                >
                  <Banknote size={18} color={paymentMode === 'CASH' ? '#059669' : '#64748b'} />
                  <span>💵 Cash Drawer</span>
                </button>

                {/* UPI */}
                <button
                  type="button"
                  onClick={() => setPaymentMode('UPI')}
                  style={{
                    padding: '10px 8px',
                    borderRadius: '10px',
                    border: paymentMode === 'UPI' ? '2px solid #0284c7' : '1.5px solid #cbd5e1',
                    background: paymentMode === 'UPI' ? '#f0f9ff' : '#ffffff',
                    color: paymentMode === 'UPI' ? '#0369a1' : '#475569',
                    fontWeight: 800,
                    fontSize: '12.5px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: paymentMode === 'UPI' ? '0 2px 8px rgba(2, 132, 199, 0.15)' : 'none',
                    transition: 'all 0.15s'
                  }}
                >
                  <QrCode size={18} color={paymentMode === 'UPI' ? '#0284c7' : '#64748b'} />
                  <span>📱 UPI / QR</span>
                </button>

                {/* BANK */}
                <button
                  type="button"
                  onClick={() => setPaymentMode('BANK')}
                  style={{
                    padding: '10px 8px',
                    borderRadius: '10px',
                    border: paymentMode === 'BANK' ? '2px solid #7c3aed' : '1.5px solid #cbd5e1',
                    background: paymentMode === 'BANK' ? '#faf5ff' : '#ffffff',
                    color: paymentMode === 'BANK' ? '#6d28d9' : '#475569',
                    fontWeight: 800,
                    fontSize: '12.5px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: paymentMode === 'BANK' ? '0 2px 8px rgba(124, 58, 237, 0.15)' : 'none',
                    transition: 'all 0.15s'
                  }}
                >
                  <Building2 size={18} color={paymentMode === 'BANK' ? '#7c3aed' : '#64748b'} />
                  <span>🏦 Bank Account</span>
                </button>
              </div>
            </div>

            {/* 4. Investor / Source Name */}
            <div>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12.5px',
                  fontWeight: 800,
                  color: '#334155',
                  marginBottom: '6px'
                }}
              >
                <span>Investor / Source Name</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Proprietor / Owner Capital"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#1e293b',
                  outline: 'none'
                }}
              />
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                {quickSources.map((src) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setSourceName(src)}
                    style={{
                      background: sourceName === src ? '#e0f2fe' : '#f8fafc',
                      color: sourceName === src ? '#0284c7' : '#64748b',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      padding: '3px 8px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {src}
                  </button>
                ))}
              </div>
            </div>

            {/* 5. Notes / Reason */}
            <div>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12.5px',
                  fontWeight: 800,
                  color: '#334155',
                  marginBottom: '6px'
                }}
              >
                <span>Notes & Reference (Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Working capital for wholesale stock procurement"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  fontSize: '13px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#1e293b',
                  outline: 'none'
                }}
              />
            </div>

            {/* Live Financial Impact Summary Box */}
            <div
              style={{
                background: 'linear-gradient(135deg, #f0fdf4 0%, #d1fae5 100%)',
                border: '1.5px solid #86efac',
                borderRadius: '12px',
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}
            >
              <div style={{ fontSize: '11.5px', fontWeight: 900, color: '#065f46', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={14} color="#059669" />
                <span>Financial Impact in Database</span>
              </div>
              <div style={{ fontSize: '13px', color: '#047857', display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                <span>Money Inflow for {date}:</span>
                <span className="mono" style={{ fontWeight: 900, fontSize: '15px' }}>
                  +{currency}{parsedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div style={{ fontSize: '11.5px', color: '#059669', borderTop: '1px dashed #a7f3d0', paddingTop: '6px' }}>
                ✅ Updates Total Inflow, Daily Accounts Register, and automatically re-chains Closing Firm Balances in the database.
              </div>
            </div>

          </div>

          {/* Modal Footer Buttons */}
          <div
            style={{
              padding: '14px 22px',
              background: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              alignItems: 'center'
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="btn btn-secondary"
              style={{ padding: '9px 16px', fontWeight: 700, borderRadius: '10px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || parsedAmount <= 0}
              className="btn"
              style={{
                padding: '10px 22px',
                borderRadius: '10px',
                fontWeight: 900,
                fontSize: '13.5px',
                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                color: '#ffffff',
                border: 'none',
                cursor: loading || parsedAmount <= 0 ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(5, 150, 105, 0.35)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {loading ? (
                <span>Saving to Database...</span>
              ) : (
                <>
                  <PlusCircle size={16} />
                  <span>Save Capital Inflow ({currency}{parsedAmount > 0 ? parsedAmount.toLocaleString('en-IN') : '0'})</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
