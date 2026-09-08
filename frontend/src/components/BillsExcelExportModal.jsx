import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Calendar, 
  Filter, 
  X, 
  CheckCircle2, 
  Layers, 
  Users, 
  CreditCard, 
  Search, 
  Sparkles,
  Clock,
  ArrowRight,
  TrendingUp,
  FileText,
  AlertCircle
} from 'lucide-react';
import { billingAPI } from '../api';
import PharmacyLogo from './PharmacyLogo';

export default function BillsExcelExportModal({ 
  isOpen, 
  onClose, 
  profile, 
  staffList = [],
  currentFilters = {}
}) {
  const [activeTab, setActiveTab] = useState('monthly'); // 'monthly' or 'custom'
  
  // Monthly Tab State
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [monthlyExportType, setMonthlyExportType] = useState('full'); // 'full', 'ledger', 'items'
  
  // Custom History Tab State
  const [startDate, setStartDate] = useState(() => currentFilters.startDate || '');
  const [endDate, setEndDate] = useState(() => currentFilters.endDate || '');
  const [selectedStaff, setSelectedStaff] = useState(() => currentFilters.staffFilter || '');
  const [selectedPayment, setSelectedPayment] = useState(() => currentFilters.paymentFilter || '');
  const [selectedStatus, setSelectedStatus] = useState(() => currentFilters.statusFilter || '');
  const [searchTerm, setSearchTerm] = useState(() => currentFilters.search || '');
  const [customExportType, setCustomExportType] = useState('full');

  // Download & Feedback State
  const [downloading, setDownloading] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Sync with current filters when opened
  useEffect(() => {
    if (isOpen) {
      if (currentFilters.startDate) setStartDate(currentFilters.startDate);
      if (currentFilters.endDate) setEndDate(currentFilters.endDate);
      if (currentFilters.staffFilter) setSelectedStaff(currentFilters.staffFilter);
      if (currentFilters.paymentFilter) setSelectedPayment(currentFilters.paymentFilter);
      if (currentFilters.statusFilter) setSelectedStatus(currentFilters.statusFilter);
      if (currentFilters.search) setSearchTerm(currentFilters.search);
      setSuccessMessage(null);
      setErrorMessage(null);
    }
  }, [isOpen, currentFilters]);

  if (!isOpen) return null;

  const months = [
    { value: 1, name: 'January' },
    { value: 2, name: 'February' },
    { value: 3, name: 'March' },
    { value: 4, name: 'April' },
    { value: 5, name: 'May' },
    { value: 6, name: 'June' },
    { value: 7, name: 'July' },
    { value: 8, name: 'August' },
    { value: 9, name: 'September' },
    { value: 10, name: 'October' },
    { value: 11, name: 'November' },
    { value: 12, name: 'December' },
  ];

  const currentYear = now.getFullYear();
  const years = [currentYear + 1, currentYear, currentYear - 1, currentYear - 2, currentYear - 3];

  // Quick Presets for Custom History
  const applyDatePreset = (preset) => {
    const today = new Date();
    const formatDate = (d) => d.toISOString().split('T')[0];

    if (preset === 'today') {
      const d = formatDate(today);
      setStartDate(d);
      setEndDate(d);
    } else if (preset === 'yesterday') {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      const d = formatDate(y);
      setStartDate(d);
      setEndDate(d);
    } else if (preset === 'last7') {
      const s = new Date(today);
      s.setDate(s.getDate() - 6);
      setStartDate(formatDate(s));
      setEndDate(formatDate(today));
    } else if (preset === 'thisMonth') {
      const s = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(formatDate(s));
      setEndDate(formatDate(today));
    } else if (preset === 'lastMonth') {
      const s = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const e = new Date(today.getFullYear(), today.getMonth(), 0);
      setStartDate(formatDate(s));
      setEndDate(formatDate(e));
    } else if (preset === 'last90') {
      const s = new Date(today);
      s.setDate(s.getDate() - 89);
      setStartDate(formatDate(s));
      setEndDate(formatDate(today));
    } else if (preset === 'fy') {
      // Indian Financial Year (April 1 to March 31)
      const curMonth = today.getMonth(); // 0-indexed
      const startYr = curMonth >= 3 ? today.getFullYear() : today.getFullYear() - 1;
      setStartDate(`${startYr}-04-01`);
      setEndDate(formatDate(today));
    } else if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  // Quick Monthly Presets
  const applyMonthlyPreset = (mOffset) => {
    const d = new Date(now.getFullYear(), now.getMonth() + mOffset, 1);
    setSelectedMonth(d.getMonth() + 1);
    setSelectedYear(d.getFullYear());
  };

  // Trigger Download
  const handleDownload = async (type) => {
    setDownloading(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const params = new URLSearchParams();

      if (type === 'monthly') {
        params.append('month', selectedMonth);
        params.append('year', selectedYear);
        params.append('export_type', monthlyExportType);
      } else {
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        if (selectedStaff) params.append('staff_code', selectedStaff);
        if (selectedPayment) params.append('payment_method', selectedPayment);
        if (selectedStatus) params.append('status', selectedStatus);
        if (searchTerm) params.append('search', searchTerm);
        params.append('export_type', customExportType);
      }

      const res = await billingAPI.exportBillsExcel(params.toString());
      setSuccessMessage(`Downloaded "${res.filename}" successfully!`);
    } catch (err) {
      console.error('Excel export error:', err);
      setErrorMessage(err.message || 'Failed to download Excel file. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !downloading) onClose();
      }}
    >
      <div 
        style={{
          width: '100%',
          maxWidth: '680px',
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92vh',
          border: '1px solid #e2e8f0'
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: '16px 22px',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #334155'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.35)'
            }}>
              <FileSpreadsheet size={22} color="#ffffff" />
            </div>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: '#ffffff', letterSpacing: '-0.01em' }}>
                Download Bills & Sales Excel (.xlsx)
              </h2>
              <p style={{ fontSize: '12px', margin: '2px 0 0', color: '#94a3b8' }}>
                {profile?.name || 'Top Medical Pharmacy'} • Official Accounting & Audit Reports
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={downloading}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: downloading ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s'
            }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #e2e8f0',
          background: '#f8fafc',
          padding: '4px 12px 0'
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('monthly')}
            style={{
              flex: 1,
              padding: '12px 16px',
              fontSize: '13px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: activeTab === 'monthly' ? '#0284c7' : '#64748b',
              borderBottom: activeTab === 'monthly' ? '3px solid #0284c7' : '3px solid transparent',
              transition: 'all 0.15s'
            }}
          >
            <Calendar size={16} />
            <span>Monthly Bills Excel</span>
            {activeTab === 'monthly' && (
              <span className="badge badge-cyan" style={{ fontSize: '10px', padding: '1px 6px' }}>Monthly</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('custom')}
            style={{
              flex: 1,
              padding: '12px 16px',
              fontSize: '13px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: activeTab === 'custom' ? '#0284c7' : '#64748b',
              borderBottom: activeTab === 'custom' ? '3px solid #0284c7' : '3px solid transparent',
              transition: 'all 0.15s'
            }}
          >
            <Clock size={16} />
            <span>Custom Bill History Excel</span>
            {activeTab === 'custom' && (
              <span className="badge badge-purple" style={{ fontSize: '10px', padding: '1px 6px' }}>Custom</span>
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          
          {/* Success Banner */}
          {successMessage && (
            <div style={{
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              color: '#065f46',
              padding: '12px 16px',
              borderRadius: '10px',
              fontSize: '13px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              animation: 'fadeIn 0.2s'
            }}>
              <CheckCircle2 size={18} color="#059669" />
              <div style={{ fontWeight: 700 }}>{successMessage}</div>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div style={{
              background: '#fff1f2',
              border: '1px solid #fecdd3',
              color: '#9f1239',
              padding: '12px 16px',
              borderRadius: '10px',
              fontSize: '13px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <AlertCircle size={18} color="#e11d48" />
              <div>{errorMessage}</div>
            </div>
          )}

          {/* ----------------- TAB 1: MONTHLY BILLS EXCEL ----------------- */}
          {activeTab === 'monthly' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              
              {/* Quick Monthly Preset Chips */}
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em', display: 'block', marginBottom: '8px' }}>
                  Quick Month Selection:
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => applyMonthlyPreset(0)}
                    className="btn btn-sm"
                    style={{
                      fontSize: '12px',
                      padding: '6px 12px',
                      background: selectedMonth === (now.getMonth() + 1) && selectedYear === now.getFullYear() ? '#0284c7' : '#f1f5f9',
                      color: selectedMonth === (now.getMonth() + 1) && selectedYear === now.getFullYear() ? '#ffffff' : '#334155',
                      border: '1px solid #cbd5e1'
                    }}
                  >
                    ⭐ Current Month ({months[now.getMonth()].name})
                  </button>
                  <button
                    type="button"
                    onClick={() => applyMonthlyPreset(-1)}
                    className="btn btn-sm"
                    style={{
                      fontSize: '12px',
                      padding: '6px 12px',
                      background: selectedMonth === (new Date(now.getFullYear(), now.getMonth() - 1, 1).getMonth() + 1) ? '#0284c7' : '#f1f5f9',
                      color: selectedMonth === (new Date(now.getFullYear(), now.getMonth() - 1, 1).getMonth() + 1) ? '#ffffff' : '#334155',
                      border: '1px solid #cbd5e1'
                    }}
                  >
                    ⏮️ Last Month ({months[(now.getMonth() + 11) % 12].name})
                  </button>
                  <button
                    type="button"
                    onClick={() => applyMonthlyPreset(-2)}
                    className="btn btn-sm"
                    style={{
                      fontSize: '12px',
                      padding: '6px 12px',
                      background: selectedMonth === (new Date(now.getFullYear(), now.getMonth() - 2, 1).getMonth() + 1) ? '#0284c7' : '#f1f5f9',
                      color: selectedMonth === (new Date(now.getFullYear(), now.getMonth() - 2, 1).getMonth() + 1) ? '#ffffff' : '#334155',
                      border: '1px solid #cbd5e1'
                    }}
                  >
                    {months[(now.getMonth() + 10) % 12].name}
                  </button>
                </div>
              </div>

              {/* Month & Year Selectors */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px', display: 'block' }}>
                    Select Billing Month:
                  </label>
                  <select
                    className="input-field"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    style={{ height: '42px', fontSize: '13.5px', fontWeight: 600 }}
                  >
                    {months.map(m => (
                      <option key={m.value} value={m.value}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px', display: 'block' }}>
                    Year:
                  </label>
                  <select
                    className="input-field"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    style={{ height: '42px', fontSize: '13.5px', fontWeight: 600 }}
                  >
                    {years.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Format / Sheet Selection */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '8px', display: 'block' }}>
                  Excel Format & Sheets to Include:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px' }}>
                  
                  <div 
                    onClick={() => setMonthlyExportType('full')}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      border: monthlyExportType === 'full' ? '2px solid #0284c7' : '1px solid #cbd5e1',
                      background: monthlyExportType === 'full' ? '#f0f9ff' : '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#0f172a' }}>🏆 Complete 3-Tab</span>
                      {monthlyExportType === 'full' && <CheckCircle2 size={15} color="#0284c7" />}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                      KPIs Summary + Bills Ledger + Itemized Sales
                    </div>
                  </div>

                  <div 
                    onClick={() => setMonthlyExportType('ledger')}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      border: monthlyExportType === 'ledger' ? '2px solid #0284c7' : '1px solid #cbd5e1',
                      background: monthlyExportType === 'ledger' ? '#f0f9ff' : '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#0f172a' }}>📋 Bills Ledger</span>
                      {monthlyExportType === 'ledger' && <CheckCircle2 size={15} color="#0284c7" />}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                      Single sheet with 1 row per invoice & GST totals
                    </div>
                  </div>

                  <div 
                    onClick={() => setMonthlyExportType('items')}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      border: monthlyExportType === 'items' ? '2px solid #0284c7' : '1px solid #cbd5e1',
                      background: monthlyExportType === 'items' ? '#f0f9ff' : '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#0f172a' }}>💊 Itemized Sales</span>
                      {monthlyExportType === 'items' && <CheckCircle2 size={15} color="#0284c7" />}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                      Every medicine line item sold with batch details
                    </div>
                  </div>

                </div>
              </div>

              {/* Monthly Info Highlights */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <Sparkles size={20} color="#0284c7" style={{ flexShrink: 0 }} />
                <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.4 }}>
                  Generates full monthly audit record for <strong>{months.find(m => m.value === selectedMonth)?.name} {selectedYear}</strong> with automatic Excel SUM formulas, Cash/UPI payment reconciliation, and GST tax columns.
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={() => handleDownload('monthly')}
                disabled={downloading}
                className="btn btn-primary"
                style={{
                  height: '46px',
                  fontSize: '14px',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)'
                }}
              >
                {downloading ? (
                  <>
                    <div className="spinner" style={{ width: '18px', height: '18px' }} />
                    <span>Generating Excel Spreadsheet...</span>
                  </>
                ) : (
                  <>
                    <Download size={18} />
                    <span>Download {months.find(m => m.value === selectedMonth)?.name} {selectedYear} Bills (.xlsx)</span>
                  </>
                )}
              </button>

            </div>
          )}

          {/* ----------------- TAB 2: CUSTOM HISTORY EXCEL ----------------- */}
          {activeTab === 'custom' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Quick Date Presets */}
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em', display: 'block', marginBottom: '8px' }}>
                  Quick Date Range Presets:
                </label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {[
                    { id: 'today', label: 'Today' },
                    { id: 'yesterday', label: 'Yesterday' },
                    { id: 'last7', label: 'Last 7 Days' },
                    { id: 'thisMonth', label: 'This Month' },
                    { id: 'lastMonth', label: 'Last Month' },
                    { id: 'last90', label: 'Last 90 Days' },
                    { id: 'fy', label: 'FY 2026-27' },
                    { id: 'all', label: 'All History' },
                  ].map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => applyDatePreset(p.id)}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '11px', padding: '4px 8px' }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Range Inputs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>
                    From Date (Start):
                  </label>
                  <input
                    type="date"
                    className="input-field"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{ height: '38px', fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>
                    To Date (End):
                  </label>
                  <input
                    type="date"
                    className="input-field"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{ height: '38px', fontSize: '13px' }}
                  />
                </div>
              </div>

              {/* Filter Grid: Staff, Payment Method, Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                
                {/* Staff Member */}
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>
                    Staff / Dispenser:
                  </label>
                  <select
                    className="input-field"
                    value={selectedStaff}
                    onChange={(e) => setSelectedStaff(e.target.value)}
                    style={{ height: '38px', fontSize: '12px' }}
                  >
                    <option value="">All Staff Members</option>
                    {staffList.map(s => (
                      <option key={s.charge_code} value={s.charge_code}>[{s.charge_code}] {s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Payment Method */}
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>
                    Payment Mode:
                  </label>
                  <select
                    className="input-field"
                    value={selectedPayment}
                    onChange={(e) => setSelectedPayment(e.target.value)}
                    style={{ height: '38px', fontSize: '12px' }}
                  >
                    <option value="">All Payment Modes</option>
                    <option value="CASH">Cash Counter Only</option>
                    <option value="UPI">UPI / GPay / QR Only</option>
                    <option value="MIXED">Split (Cash + UPI)</option>
                    <option value="CARD">Card POS</option>
                    <option value="CREDIT">Due / Credit Bills</option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>
                    Bill Status:
                  </label>
                  <select
                    className="input-field"
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    style={{ height: '38px', fontSize: '12px' }}
                  >
                    <option value="">All (Active Bills)</option>
                    <option value="PAID">Fully Paid Only</option>
                    <option value="DUE">Credit / Dues Only</option>
                    <option value="CANCELLED">Cancelled Bills Only</option>
                  </select>
                </div>

              </div>

              {/* Optional Search */}
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>
                  Filter by Patient / Bill # / Doctor (Optional):
                </label>
                <div style={{ position: 'relative' }}>
                  <Search size={15} color="#64748b" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                  <input
                    type="text"
                    className="input-field"
                    style={{ paddingLeft: '34px', height: '38px', fontSize: '12.5px' }}
                    placeholder="Search specific customer, phone number, doctor..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {/* Format / Sheet Selection */}
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '6px', display: 'block' }}>
                  Workbook Type:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  {[
                    { id: 'full', label: '🏆 Multi-Tab Workbook', desc: 'Summary + Ledger + Items' },
                    { id: 'ledger', label: '📋 Ledger Only', desc: 'Financial invoices list' },
                    { id: 'items', label: '💊 Itemized Sales', desc: 'Medicine line details' }
                  ].map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setCustomExportType(f.id)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: customExportType === f.id ? '2px solid #0284c7' : '1px solid #cbd5e1',
                        background: customExportType === f.id ? '#f0f9ff' : '#ffffff',
                        textAlign: 'left',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#0f172a' }}>{f.label}</div>
                      <div style={{ fontSize: '10px', color: '#64748b' }}>{f.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={() => handleDownload('custom')}
                disabled={downloading}
                className="btn btn-primary"
                style={{
                  height: '46px',
                  fontSize: '14px',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  marginTop: '4px',
                  boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)'
                }}
              >
                {downloading ? (
                  <>
                    <div className="spinner" style={{ width: '18px', height: '18px' }} />
                    <span>Exporting Custom Bill History...</span>
                  </>
                ) : (
                  <>
                    <Download size={18} />
                    <span>Download Custom Bill History Excel (.xlsx)</span>
                  </>
                )}
              </button>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '12px 20px',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: '11.5px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileSpreadsheet size={14} color="#0284c7" />
            <span>Format: Microsoft Excel OpenXML (.xlsx)</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary btn-sm"
            style={{ padding: '6px 14px' }}
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
