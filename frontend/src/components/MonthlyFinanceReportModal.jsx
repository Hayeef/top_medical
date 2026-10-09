import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Download,
  Printer,
  FileSpreadsheet,
  FileText,
  X,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Landmark,
  Banknote,
  QrCode,
  CreditCard,
  Building2,
  Users,
  Truck,
  Coffee,
  CheckCircle2,
  AlertCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  Layers,
  ArrowRight,
  Receipt,
  ExternalLink
} from 'lucide-react';
import { dailyFinanceAPI } from '../api';
import PharmacyLogo from './PharmacyLogo';

export default function MonthlyFinanceReportModal({
  isOpen,
  onClose,
  profile,
  initialMonth,
  initialYear
}) {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(() => initialMonth || (now.getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(() => initialYear || now.getFullYear());
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'payments', 'printable'
  
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [records, setRecords] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [availableMonths, setAvailableMonths] = useState([]);
  const [summary, setSummary] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const currency = profile?.currency_symbol || '₹';
  const pharmacyName = profile?.name || 'TOP MEDICAL PHARMACY';
  const pharmacyAddress = profile?.address || '3-79/4, R.B.COMPLEX, GROUND FLOOR, UNIVERSITY ROAD, DERALAKATTE, ULLAL TALUK, DERALAKATTE, MANGALORE 575018';
  const pharmacyPhone = profile?.phone || '9148240793';
  const pharmacyGstin = profile?.gstin || '29AJPPU6288G1Z7';
  const pharmacyDl = profile?.dl_number_20b || 'KA-MN1-300667';
  const pharmacyDl21 = profile?.dl_number_21b || 'KA-MN1-300667';

  const formatInrCurrency = (val, showSign = false) => {
    const num = parseFloat(val) || 0;
    const isNeg = num < 0;
    const formatted = Math.abs(num).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (isNeg) return `-${currency} ${formatted}`;
    if (showSign && num > 0) return `+${currency} ${formatted}`;
    return `${currency} ${formatted}`;
  };

  const formatInrNumber = (val, showSign = false) => {
    const num = parseFloat(val) || 0;
    const isNeg = num < 0;
    const formatted = Math.abs(num).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (isNeg) return `-${formatted}`;
    if (showSign && num > 0) return `+${formatted}`;
    return formatted;
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Sync initial month / year when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialMonth) setSelectedMonth(Number(initialMonth));
      if (initialYear) setSelectedYear(Number(initialYear));
    }
  }, [isOpen, initialMonth, initialYear]);

  // Load monthly report data whenever month or year changes
  const loadMonthlyData = async () => {
    if (!isOpen) return;
    setLoading(true);
    try {
      const data = await dailyFinanceAPI.getMonthlyReportSummary(`month=${selectedMonth}&year=${selectedYear}`);
      setReportData(data);
      setRecords(data.records || []);
      setSummary(data.summary || {});
      setPaymentHistory(data.payment_history || []);
      if (Array.isArray(data.available_months) && data.available_months.length > 0) {
        setAvailableMonths(data.available_months);
      }
    } catch (err) {
      console.error('Failed to load monthly finance data:', err);
      // Fallback: fetch raw records directly
      try {
        const rawList = await dailyFinanceAPI.getRecords(`month=${selectedMonth}&year=${selectedYear}`);
        const list = Array.isArray(rawList) ? rawList : (rawList?.results || []);
        // Sort chronologically for monthly statement
        const sorted = [...list].sort((a, b) => new Date(a.date) - new Date(b.date));
        setRecords(sorted);
        
        // Compute manual summary
        const totSales = sorted.reduce((acc, r) => acc + (parseFloat(r.daily_sales) || 0), 0);
        const totCash = sorted.reduce((acc, r) => acc + (parseFloat(r.cash_earned) || 0), 0);
        const totUpi = sorted.reduce((acc, r) => acc + (parseFloat(r.upi_earned) || 0), 0);
        const totCapital = sorted.reduce((acc, r) => acc + (parseFloat(r.capital_investment) || 0), 0);
        const totEarned = sorted.reduce((acc, r) => acc + (parseFloat(r.total_earned) || ((parseFloat(r.cash_earned) || 0) + (parseFloat(r.upi_earned) || 0) + (parseFloat(r.capital_investment) || 0))), 0);
        const totPaid = sorted.reduce((acc, r) => acc + (parseFloat(r.total_paid) || 0), 0);
        const totSupp = sorted.reduce((acc, r) => acc + (parseFloat(r.supplier_payments) || 0), 0);
        const totStaff = sorted.reduce((acc, r) => acc + (parseFloat(r.staff_expenses) || 0), 0);
        const totVeh = sorted.reduce((acc, r) => acc + (parseFloat(r.vehicle_expenses) || 0), 0);
        const totExp = sorted.reduce((acc, r) => acc + (parseFloat(r.expenses) || 0), 0);
        const totOth = sorted.reduce((acc, r) => acc + (parseFloat(r.other_outflow) || 0), 0);
        const openBal = sorted.length > 0 ? (parseFloat(sorted[0].opening_balance) || 0) : 0;
        const closeBal = sorted.length > 0 ? (parseFloat(sorted[sorted.length - 1].closing_balance) || 0) : 0;
        
        // Extract payment history
        const pList = [];
        sorted.forEach((r) => {
          if (Array.isArray(r.payment_details)) {
            r.payment_details.forEach((it, idx) => {
              const amt = parseFloat(it.amount) || 0;
              if (amt > 0) {
                pList.push({
                  date: r.date,
                  type: (it.type || 'EXPENSE').toUpperCase(),
                  recipient: it.recipient || it.staff_name || it.vehicle_info || it.category || 'Disbursement',
                  charge_code: it.charge_code || it.staff_code || '',
                  payment_mode: (it.payment_mode || 'CASH').toUpperCase(),
                  note: it.note || it.purpose || it.bill_number || `Payout #${idx + 1}`,
                  amount: amt
                });
              }
            });
          }
        });

        setSummary({
          total_sales: totSales,
          cash_earned: totCash,
          upi_earned: totUpi,
          capital_investment: totCapital,
          total_earned: totEarned,
          total_paid: totPaid,
          supplier_payments: totSupp,
          staff_expenses: totStaff,
          vehicle_expenses: totVeh,
          shop_expenses: totExp,
          other_outflow: totOth,
          opening_balance: openBal,
          closing_balance: closeBal,
          net_change: totEarned - totPaid
        });
        setPaymentHistory(pList);
      } catch (innerErr) {
        showToast('Error loading financial records: ' + innerErr.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadMonthlyData();
    }
  }, [isOpen, selectedMonth, selectedYear]);

  // Direct Backend PDF Download
  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const res = await dailyFinanceAPI.exportPdf(`month=${selectedMonth}&year=${selectedYear}`);
      showToast(`Monthly PDF report downloaded: ${res.filename}`);
    } catch (err) {
      alert(`PDF download failed: ${err.message}`);
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Direct Backend Excel Download
  const handleDownloadExcel = async () => {
    setDownloadingExcel(true);
    try {
      const res = await dailyFinanceAPI.exportExcel(`month=${selectedMonth}&year=${selectedYear}`);
      showToast(`Monthly Excel sheet downloaded: ${res.filename}`);
    } catch (err) {
      alert(`Excel export failed: ${err.message}`);
    } finally {
      setDownloadingExcel(false);
    }
  };

  // Browser Native Print / PDF Save
  const handlePrint = () => {
    window.print();
  };

  // Month navigation helpers
  const handlePrevMonth = () => {
    if (Number(selectedMonth) === 1) {
      setSelectedMonth(12);
      setSelectedYear(prev => Number(prev) - 1);
    } else {
      setSelectedMonth(prev => Number(prev) - 1);
    }
  };

  const handleNextMonth = () => {
    if (Number(selectedMonth) === 12) {
      setSelectedMonth(1);
      setSelectedYear(prev => Number(prev) + 1);
    } else {
      setSelectedMonth(prev => Number(prev) + 1);
    }
  };

  const handleCurrentMonth = () => {
    const today = new Date();
    setSelectedMonth(today.getMonth() + 1);
    setSelectedYear(today.getFullYear());
  };

  // Month name helper
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const currentMonthName = monthNames[Number(selectedMonth) - 1] || 'Current Month';

  // Category breakdown calculations
  const categoryStats = useMemo(() => {
    const stats = {
      vendor: { count: 0, cash: 0, upi: 0, credit: 0, total: 0 },
      staff: { count: 0, cash: 0, upi: 0, credit: 0, total: 0 },
      vehicle: { count: 0, cash: 0, upi: 0, credit: 0, total: 0 },
      shop: { count: 0, cash: 0, upi: 0, credit: 0, total: 0 },
      other: { count: 0, cash: 0, upi: 0, credit: 0, total: 0 },
    };

    paymentHistory.forEach(item => {
      let key = 'other';
      const t = (item.type || '').toUpperCase();
      if (t === 'VENDOR' || t === 'SUPPLIER') key = 'vendor';
      else if (t === 'STAFF') key = 'staff';
      else if (t === 'VEHICLE') key = 'vehicle';
      else if (t === 'SHOP' || t === 'EXPENSE') key = 'shop';

      const amt = parseFloat(item.amount) || 0;
      stats[key].count += 1;
      stats[key].total += amt;

      const mode = (item.payment_mode || 'CASH').toUpperCase();
      if (mode === 'UPI') stats[key].upi += amt;
      else if (mode === 'CREDIT') stats[key].credit += amt;
      else stats[key].cash += amt;
    });

    return stats;
  }, [paymentHistory]);

  // Filtered records based on search query
  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return records;
    const q = searchQuery.toLowerCase();
    return records.filter(r =>
      r.date?.toLowerCase().includes(q) ||
      r.notes?.toLowerCase().includes(q) ||
      (Array.isArray(r.payment_details) && r.payment_details.some(d =>
        d.recipient?.toLowerCase().includes(q) ||
        d.staff_name?.toLowerCase().includes(q) ||
        d.charge_code?.toLowerCase().includes(q) ||
        d.note?.toLowerCase().includes(q)
      ))
    );
  }, [records, searchQuery]);

  // Filtered payment history
  const filteredPayments = useMemo(() => {
    if (!searchQuery.trim()) return paymentHistory;
    const q = searchQuery.toLowerCase();
    return paymentHistory.filter(p =>
      p.date?.toLowerCase().includes(q) ||
      p.recipient?.toLowerCase().includes(q) ||
      p.charge_code?.toLowerCase().includes(q) ||
      p.note?.toLowerCase().includes(q) ||
      p.type?.toLowerCase().includes(q) ||
      p.payment_mode?.toLowerCase().includes(q)
    );
  }, [paymentHistory, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" style={{ zIndex: 1150, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div
        className="modal-content glass-panel"
        style={{
          maxWidth: '1280px',
          width: '100%',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#ffffff',
          overflow: 'hidden',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)'
        }}
      >
        {/* Modal Top Control Bar (Hidden on Print) */}
        <div
          className="no-print"
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #e2e8f0',
            background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px'
          }}
        >
          {/* Header Title & Branding */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 6px -1px rgba(2, 132, 199, 0.3)'
              }}
            >
              <FileText size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Monthly Financial Statement & Cash/UPI Report
                </h2>
                <span
                  style={{
                    background: '#e0f2fe',
                    color: '#0369a1',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '20px'
                  }}
                >
                  Official Audit PDF
                </span>
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                Day-by-day Sales, Cash & UPI Earnings, Outflow Payouts, and Firm Balance for <b>{currentMonthName} {selectedYear}</b>
              </p>
            </div>
          </div>

          {/* Month & Year Selectors with Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '2px' }}>
              <button
                type="button"
                onClick={handlePrevMonth}
                title="Previous Month"
                style={{ background: 'transparent', border: 'none', padding: '6px 8px', cursor: 'pointer', color: '#475569', borderRadius: '6px' }}
              >
                <ChevronLeft size={16} />
              </button>

              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                style={{ border: 'none', fontWeight: 700, fontSize: '13px', color: '#0f172a', padding: '6px 4px', background: 'transparent', cursor: 'pointer', outline: 'none' }}
              >
                {monthNames.map((name, idx) => (
                  <option key={idx + 1} value={idx + 1}>{name}</option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                style={{ border: 'none', fontWeight: 700, fontSize: '13px', color: '#0f172a', padding: '6px 4px', background: 'transparent', cursor: 'pointer', outline: 'none' }}
              >
                <option value="2024">2024</option>
                <option value="2025">2025</option>
                <option value="2026">2026</option>
                <option value="2027">2027</option>
              </select>

              <button
                type="button"
                onClick={handleNextMonth}
                title="Next Month"
                style={{ background: 'transparent', border: 'none', padding: '6px 8px', cursor: 'pointer', color: '#475569', borderRadius: '6px' }}
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <button
              type="button"
              onClick={handleCurrentMonth}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '12px', fontWeight: 600, height: '36px' }}
            >
              Current Month
            </button>

            {/* Quick Month Switcher Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              {availableMonths.length > 0 ? (
                availableMonths.map((m) => {
                  const isSel = Number(selectedMonth) === Number(m.month) && Number(selectedYear) === Number(m.year);
                  return (
                    <button
                      key={`${m.year}-${m.month}`}
                      type="button"
                      onClick={() => {
                        setSelectedMonth(Number(m.month));
                        setSelectedYear(Number(m.year));
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 800,
                        border: '1px solid',
                        cursor: 'pointer',
                        background: isSel ? '#0284c7' : '#ffffff',
                        borderColor: isSel ? '#0284c7' : '#cbd5e1',
                        color: isSel ? '#ffffff' : '#0f172a',
                        boxShadow: isSel ? '0 2px 6px rgba(2, 132, 199, 0.3)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        transition: 'all 0.15s ease'
                      }}
                      title={`${m.month_name}: ${m.invoices_count} POS bills (${currency}${m.sales.toLocaleString('en-IN')})`}
                    >
                      <span>{m.is_current ? '🌟' : '⏪'} {m.month_name}</span>
                      {m.invoices_count > 0 && (
                        <span style={{
                          fontSize: '10.5px',
                          background: isSel ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                          color: isSel ? '#ffffff' : '#334155',
                          padding: '1px 5px',
                          borderRadius: '5px',
                          fontWeight: 700
                        }}>
                          {m.invoices_count} bills
                        </span>
                      )}
                    </button>
                  );
                })
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => { setSelectedMonth(10); setSelectedYear(2026); }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 800,
                      border: '1px solid',
                      cursor: 'pointer',
                      background: (Number(selectedMonth) === 10 && Number(selectedYear) === 2026) ? '#0284c7' : '#ffffff',
                      borderColor: (Number(selectedMonth) === 10 && Number(selectedYear) === 2026) ? '#0284c7' : '#cbd5e1',
                      color: (Number(selectedMonth) === 10 && Number(selectedYear) === 2026) ? '#ffffff' : '#0f172a'
                    }}
                  >
                    🌟 Oct 2026
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSelectedMonth(9); setSelectedYear(2026); }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 800,
                      border: '1px solid',
                      cursor: 'pointer',
                      background: (Number(selectedMonth) === 9 && Number(selectedYear) === 2026) ? '#0284c7' : '#ffffff',
                      borderColor: (Number(selectedMonth) === 9 && Number(selectedYear) === 2026) ? '#0284c7' : '#cbd5e1',
                      color: (Number(selectedMonth) === 9 && Number(selectedYear) === 2026) ? '#ffffff' : '#0f172a'
                    }}
                  >
                    ⏪ Sept 2026
                  </button>
                </>
              )}
            </div>

            {/* Direct PDF Download Button */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf || loading}
              className="btn btn-primary btn-sm"
              style={{
                height: '36px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                boxShadow: '0 2px 4px rgba(2, 132, 199, 0.25)'
              }}
              title="Download High-Resolution Formatted PDF Report"
            >
              <Download size={15} />
              <span>{downloadingPdf ? 'Generating PDF...' : 'Download PDF Report'}</span>
            </button>

            {/* Print / Save A4 PDF Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="btn btn-secondary btn-sm"
              style={{ height: '36px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#0f172a' }}
              title="Print or Save via System Print Dialog"
            >
              <Printer size={15} />
              <span>Print A4</span>
            </button>

            {/* Export Excel Button */}
            <button
              type="button"
              onClick={handleDownloadExcel}
              disabled={downloadingExcel || loading}
              className="btn btn-secondary btn-sm"
              style={{ height: '36px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#059669' }}
              title="Download matching Excel Spreadsheet"
            >
              <FileSpreadsheet size={15} color="#059669" />
              <span>Excel</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#f1f5f9',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tab Navigation & Search Bar (Hidden on Print) */}
        <div
          className="no-print"
          style={{
            padding: '10px 24px',
            borderBottom: '1px solid #e2e8f0',
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: activeTab === 'overview' ? '#0284c7' : '#f1f5f9',
                color: activeTab === 'overview' ? '#ffffff' : '#475569',
                transition: 'all 0.15s ease'
              }}
            >
              📊 Daily Statement & Register ({records.length} Days)
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('payments')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: activeTab === 'payments' ? '#0284c7' : '#f1f5f9',
                color: activeTab === 'payments' ? '#ffffff' : '#475569',
                transition: 'all 0.15s ease'
              }}
            >
              💳 Payment History & Outflows ({paymentHistory.length} Entries)
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('printable')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: activeTab === 'printable' ? '#0284c7' : '#f1f5f9',
                color: activeTab === 'printable' ? '#ffffff' : '#475569',
                transition: 'all 0.15s ease'
              }}
            >
              📄 Printable A4 Audit Sheet
            </button>
          </div>

          {/* Quick Search */}
          <div style={{ position: 'relative', width: '260px' }}>
            <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search day, payee, note, code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 12px 6px 32px',
                fontSize: '12.5px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                outline: 'none',
                background: '#f8fafc'
              }}
            />
          </div>
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div
            className="no-print"
            style={{
              padding: '8px 16px',
              background: '#059669',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 600,
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <CheckCircle2 size={16} />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Scrollable Report Content Area */}
        <div
          className="print-container"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px 24px',
            background: '#ffffff',
            color: '#0f172a'
          }}
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
              <RefreshCw size={32} className="spin" style={{ margin: '0 auto 12px auto', color: '#0284c7' }} />
              <div style={{ fontSize: '15px', fontWeight: 700 }}>Generating Financial Statement for {currentMonthName} {selectedYear}...</div>
            </div>
          ) : (
            <div>
              {/* Database Safety & Period Reassurance Notice (Hidden on print) */}
              <div
                className="no-print"
                style={{
                  padding: '10px 14px',
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '10px',
                  marginBottom: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#166534', fontWeight: 600 }}>
                  <ShieldCheck size={18} color="#16a34a" />
                  <span>
                    Viewing <b>{currentMonthName} {selectedYear}</b> Statement &nbsp;|&nbsp; <b>Database Integrity:</b> 100% Safe &amp; Read-Only (Invoices, stock, and customer data are untouched).
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#0369a1', fontWeight: 700 }}>
                  Active Period: {currentMonthName} {selectedYear} ({records.length} Recorded Days)
                </div>
              </div>

              {/* Branded Official Letterhead Banner for Printing & Clean Display */}
              <div
                style={{
                  borderBottom: '2px solid #0f172a',
                  paddingBottom: '12px',
                  marginBottom: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h1 style={{ fontSize: '22px', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                      {pharmacyName.toUpperCase()}
                    </h1>
                  </div>
                  <div style={{ fontSize: '12px', color: '#475569', marginTop: '3px', maxWidth: '650px', lineHeight: 1.4 }}>
                    {pharmacyAddress} &nbsp;|&nbsp; <b>Phone:</b> {pharmacyPhone}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '3px', display: 'flex', gap: '14px' }}>
                    <span><b>GSTIN:</b> {pharmacyGstin}</span>
                    <span><b>DL No:</b> {pharmacyDl} {pharmacyDl21 && pharmacyDl21 !== pharmacyDl ? `/ ${pharmacyDl21}` : ''}</span>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div
                    style={{
                      background: '#0f172a',
                      color: '#ffffff',
                      padding: '4px 12px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 800,
                      display: 'inline-block',
                      letterSpacing: '0.05em'
                    }}
                  >
                    MONTHLY FINANCIAL STATEMENT
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#0284c7', marginTop: '5px' }}>
                    Period: {currentMonthName} {selectedYear}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                    Generated: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>

              {/* Executive Monthly KPI Summary Metric Cards */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
                  gap: '12px',
                  marginBottom: '20px'
                }}
              >
                {/* Total Inflow (Cash + UPI) */}
                <div
                  style={{
                    background: '#f0fdf4',
                    border: '1.5px solid #86efac',
                    borderRadius: '10px',
                    padding: '12px 14px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Total Inflow (Earned)
                    </span>
                    <TrendingUp size={16} color="#16a34a" />
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: '#15803d' }}>
                    {currency} {Number(summary?.total_earned || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: '11px', color: '#166534', marginTop: '3px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
                    <span>Cash: <b>{currency}{Number(summary?.cash_earned || 0).toLocaleString('en-IN')}</b></span>
                    <span>UPI: <b>{currency}{Number(summary?.upi_earned || 0).toLocaleString('en-IN')}</b></span>
                    {Number(summary?.capital_investment || 0) > 0 && (
                      <span>Capital: <b>{currency}{Number(summary?.capital_investment || 0).toLocaleString('en-IN')}</b></span>
                    )}
                  </div>
                </div>

                {/* Total Sales */}
                <div
                  style={{
                    background: '#f0fdf4',
                    border: '1.5px solid #86efac',
                    borderRadius: '10px',
                    padding: '12px 14px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Total Sales Billed
                    </span>
                    <Receipt size={16} color="#16a34a" />
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: '#15803d' }}>
                    {currency} {Number(summary?.total_sales || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: '11px', color: '#166534', marginTop: '3px' }}>
                    Across <b>{records.length}</b> Recorded Trading Days
                  </div>
                </div>

                {/* Total Outflow (Paid) */}
                <div
                  style={{
                    background: '#fef2f2',
                    border: '1.5px solid #fca5a5',
                    borderRadius: '10px',
                    padding: '12px 14px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Total Outflow (Paid)
                    </span>
                    <TrendingDown size={16} color="#dc2626" />
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: '#dc2626' }}>
                    {currency} {Number(summary?.total_paid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: '11px', color: '#991b1b', marginTop: '3px' }}>
                    Vendors: {currency}{Number(summary?.supplier_payments || 0).toLocaleString('en-IN')} | Ops: {currency}{Number((summary?.total_paid || 0) - (summary?.supplier_payments || 0)).toLocaleString('en-IN')}
                  </div>
                </div>

                {/* Net Cashflow Change */}
                <div
                  style={{
                    background: (summary?.net_change || 0) < 0 ? '#fef2f2' : '#f0fdf4',
                    border: `1.5px solid ${(summary?.net_change || 0) < 0 ? '#fca5a5' : '#86efac'}`,
                    borderRadius: '10px',
                    padding: '12px 14px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11.5px', fontWeight: 700, color: (summary?.net_change || 0) < 0 ? '#991b1b' : '#166534', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {(summary?.net_change || 0) < 0 ? 'Net Cash Deficit' : 'Net Cash Surplus'}
                    </span>
                    <DollarSign size={16} color={(summary?.net_change || 0) < 0 ? '#dc2626' : '#16a34a'} />
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: (summary?.net_change || 0) < 0 ? '#dc2626' : '#15803d' }}>
                    {formatInrCurrency(summary?.net_change, true)}
                  </div>
                  <div style={{ fontSize: '11px', color: (summary?.net_change || 0) < 0 ? '#991b1b' : '#166534', marginTop: '3px' }}>
                    {(summary?.net_change || 0) < 0 ? 'Outflow exceeded Inflow' : 'Total Inflow minus Total Outflow'}
                  </div>
                </div>

                {/* Closing Firm Balance */}
                <div
                  style={{
                    background: '#f0f9ff',
                    border: '1.5px solid #7dd3fc',
                    borderRadius: '10px',
                    padding: '12px 14px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Firm Balance (Closing){(summary?.closing_balance || 0) < 0 ? ' (MINUS)' : ''}
                    </span>
                    <Landmark size={16} color="#0284c7" />
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: '#0284c7' }}>
                    {formatInrCurrency(summary?.closing_balance)}
                  </div>
                  <div style={{ fontSize: '11px', color: '#0369a1', marginTop: '3px' }}>
                    Opening: {formatInrCurrency(summary?.opening_balance)} &bull; {(summary?.closing_balance || 0) < 0 ? 'Deficit / Minus Balance' : 'Healthy Balance'}
                  </div>
                </div>
              </div>

              {/* View 1: Overview & Day-by-Day Statement Table */}
              {(activeTab === 'overview' || activeTab === 'printable') && (
                <div style={{ marginBottom: '28px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                      1. Day-by-Day Financial Register ({records.length} Recorded Days)
                    </h3>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                      Figures strictly categorized into Cash, UPI & Expense Payouts
                    </span>
                  </div>

                  <div style={{ overflowX: 'auto', border: '1px solid #cbd5e1', borderRadius: '10px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: '#0f172a', color: '#ffffff', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                          <th style={{ padding: '10px 8px', borderRight: '1px solid #334155' }}>Date</th>
                          <th style={{ padding: '10px 8px', textAlign: 'right', borderRight: '1px solid #334155', background: '#065f46', color: '#ffffff' }}>Sales / Total Inflow ({currency})</th>
                          <th style={{ padding: '10px 8px', textAlign: 'right', borderRight: '1px solid #334155', background: '#312e81', color: '#ffffff' }}>UPI / GPay ({currency})</th>
                          <th style={{ padding: '10px 8px', textAlign: 'right', borderRight: '1px solid #334155', background: '#064e3b', color: '#ffffff' }}>Cash ({currency})</th>
                          <th style={{ padding: '10px 8px', textAlign: 'right', borderRight: '1px solid #334155' }}>Supplier ({currency})</th>
                          <th style={{ padding: '10px 8px', textAlign: 'right', borderRight: '1px solid #334155' }}>Staff ({currency})</th>
                          <th style={{ padding: '10px 8px', textAlign: 'right', borderRight: '1px solid #334155' }}>Shop Exp ({currency})</th>
                          <th style={{ padding: '10px 8px', textAlign: 'right', borderRight: '1px solid #334155' }}>Vehicle ({currency})</th>
                          <th style={{ padding: '10px 8px', textAlign: 'right', borderRight: '1px solid #334155', background: '#7f1d1d', color: '#ffffff' }}>Total Outflow ({currency})</th>
                          <th style={{ padding: '10px 8px', textAlign: 'right', borderRight: '1px solid #334155' }}>Opening ({currency})</th>
                          <th style={{ padding: '10px 8px', textAlign: 'right', borderRight: '1px solid #334155' }}>Net Change ({currency})</th>
                          <th style={{ padding: '10px 8px', textAlign: 'right', borderRight: '1px solid #334155', background: '#0369a1', color: '#ffffff' }}>Firm Bal ({currency})</th>
                          <th style={{ padding: '10px 8px' }}>Remarks / Summary</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRecords.length === 0 ? (
                          <tr>
                            <td colSpan={13} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                              No financial records found for {currentMonthName} {selectedYear}.
                            </td>
                          </tr>
                        ) : (
                          filteredRecords.map((r, idx) => {
                            const salesVal = parseFloat(r.daily_sales) || 0;
                            const cashVal = parseFloat(r.cash_earned) || 0;
                            const upiVal = parseFloat(r.upi_earned) || 0;
                            const capitalVal = parseFloat(r.capital_investment) || 0;
                            const earnedVal = parseFloat(r.total_earned) || (cashVal + upiVal + capitalVal);
                            const suppVal = parseFloat(r.supplier_payments) || 0;
                            const staffVal = parseFloat(r.staff_expenses) || 0;
                            const vehVal = parseFloat(r.vehicle_expenses) || 0;
                            const expVal = parseFloat(r.expenses) || 0;
                            const paidVal = parseFloat(r.total_paid) || 0;
                            const openVal = parseFloat(r.opening_balance) || 0;
                            const netVal = parseFloat(r.net_day_change) || (earnedVal - paidVal);
                            const closeVal = parseFloat(r.closing_balance) || 0;

                            const isEven = idx % 2 === 0;

                            // Formulate remarks preview
                            const details = Array.isArray(r.payment_details) ? r.payment_details : [];
                            let remarkText = r.notes || '';
                            if (!remarkText && details.length > 0) {
                              const payees = details.slice(0, 2).map(d => d.recipient || d.staff_name || d.category || 'Payout');
                              remarkText = `${details.length} payout(s): ${payees.join(', ')}${details.length > 2 ? '...' : ''}`;
                            }

                            return (
                              <tr
                                key={r.id || idx}
                                style={{
                                  background: isEven ? '#f8fafc' : '#ffffff',
                                  borderBottom: '1px solid #e2e8f0'
                                }}
                              >
                                <td style={{ padding: '8px', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>
                                  {r.date}
                                </td>
                                <td style={{ padding: '8px', textAlign: 'right', color: '#15803d', fontWeight: 800, background: '#f0fdf4' }}>
                                  {earnedVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                                <td style={{ padding: '8px', textAlign: 'right', color: '#4f46e5', fontWeight: 600, background: '#eef2ff' }}>
                                  {upiVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                                <td style={{ padding: '8px', textAlign: 'right', color: '#059669', fontWeight: 600, background: '#f0fdf4' }}>
                                  {cashVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                                <td style={{ padding: '8px', textAlign: 'right', color: '#64748b' }}>
                                  {suppVal > 0 ? suppVal.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                                </td>
                                <td style={{ padding: '8px', textAlign: 'right', color: '#64748b' }}>
                                  {staffVal > 0 ? staffVal.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                                </td>
                                <td style={{ padding: '8px', textAlign: 'right', color: '#64748b' }}>
                                  {expVal > 0 ? expVal.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                                </td>
                                <td style={{ padding: '8px', textAlign: 'right', color: '#64748b' }}>
                                  {vehVal > 0 ? vehVal.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                                </td>
                                <td style={{ padding: '8px', textAlign: 'right', fontWeight: 800, color: '#dc2626', background: '#fef2f2' }}>
                                  {paidVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                                <td style={{ padding: '8px', textAlign: 'right', color: openVal < 0 ? '#dc2626' : '#64748b', fontWeight: openVal < 0 ? 700 : 400 }}>
                                  {formatInrNumber(openVal)}
                                </td>
                                <td
                                  style={{
                                    padding: '8px',
                                    textAlign: 'right',
                                    fontWeight: 700,
                                    color: netVal >= 0 ? '#059669' : '#dc2626'
                                  }}
                                >
                                  {formatInrNumber(netVal, true)}
                                </td>
                                <td style={{
                                  padding: '8px',
                                  textAlign: 'right',
                                  fontWeight: 800,
                                  color: closeVal < 0 ? '#dc2626' : '#0284c7',
                                  background: closeVal < 0 ? '#fef2f2' : '#f0f9ff'
                                }}>
                                  {formatInrNumber(closeVal)}
                                </td>
                                <td style={{ padding: '8px', color: '#475569', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.notes || remarkText}>
                                  {remarkText || '-'}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                      {/* Summary Totals Row */}
                      <tfoot>
                        <tr style={{ background: '#e2e8f0', color: '#0f172a', fontWeight: 900, borderTop: '2px solid #0f172a', borderBottom: '2px solid #0f172a' }}>
                          <td style={{ padding: '10px 8px' }}>MONTH TOTAL</td>
                          <td style={{ padding: '10px 8px', textAlign: 'right', color: '#15803d', background: '#dcfce7' }}>
                            {Number(summary?.total_earned || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'right', color: '#4f46e5' }}>
                            {Number(summary?.upi_earned || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'right', color: '#059669' }}>
                            {Number(summary?.cash_earned || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                            {Number(summary?.supplier_payments || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                            {Number(summary?.staff_expenses || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                            {Number(summary?.shop_expenses || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                            {Number(summary?.vehicle_expenses || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'right', color: '#dc2626', background: '#fee2e2' }}>
                            {Number(summary?.total_paid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'right', color: (summary?.opening_balance || 0) < 0 ? '#dc2626' : '#0f172a' }}>
                            {formatInrNumber(summary?.opening_balance)}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'right', color: (summary?.net_change || 0) >= 0 ? '#059669' : '#dc2626' }}>
                            {formatInrNumber(summary?.net_change, true)}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'right', color: (summary?.closing_balance || 0) < 0 ? '#dc2626' : '#0284c7', background: '#e0f2fe' }}>
                            {formatInrNumber(summary?.closing_balance)}
                          </td>
                          <td style={{ padding: '10px 8px', color: '#475569' }}>
                            {records.length} Active Days
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* View 2: Payment History & Outflow Breakdown */}
              {(activeTab === 'payments' || activeTab === 'printable') && (
                <div style={{ marginBottom: '28px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                      2. Summary of Payment History & Outflow Audit ({paymentHistory.length} Disbursements)
                    </h3>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                      Detailed audit trail of supplier payments, staff disbursements & operations
                    </span>
                  </div>

                  {/* Category Summary Matrix */}
                  <div style={{ overflowX: 'auto', border: '1px solid #cbd5e1', borderRadius: '10px', marginBottom: '16px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ background: '#0f172a', color: '#ffffff', fontSize: '11px', textTransform: 'uppercase' }}>
                          <th style={{ padding: '9px 12px', textAlign: 'left' }}>Disbursement Category</th>
                          <th style={{ padding: '9px 12px', textAlign: 'center' }}>Vouchers</th>
                          <th style={{ padding: '9px 12px', textAlign: 'right' }}>Cash ({currency})</th>
                          <th style={{ padding: '9px 12px', textAlign: 'right' }}>UPI ({currency})</th>
                          <th style={{ padding: '9px 12px', textAlign: 'right' }}>Credit ({currency})</th>
                          <th style={{ padding: '9px 12px', textAlign: 'right' }}>Total Amount ({currency})</th>
                          <th style={{ padding: '9px 12px', textAlign: 'center' }}>% Outflow</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { label: 'Wholesale Supplier & Vendor Bills', data: categoryStats.vendor, color: '#0284c7' },
                          { label: 'Staff Salaries, Allowances & Tea', data: categoryStats.staff, color: '#4f46e5' },
                          { label: 'Delivery Vehicle, Fuel & Logistics', data: categoryStats.vehicle, color: '#059669' },
                          { label: 'Shop Rent, Electricity & Utilities', data: categoryStats.shop, color: '#d97706' },
                          { label: 'Miscellaneous Operations & Drawings', data: categoryStats.other, color: '#64748b' },
                        ].map((row, idx) => {
                          const totPaid = Number(summary?.total_paid || 0);
                          const pct = totPaid > 0 ? (row.data.total / totPaid * 100).toFixed(1) : '0.0';
                          return (
                            <tr key={idx} style={{ background: idx % 2 === 0 ? '#f8fafc' : '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
                              <td style={{ padding: '8px 12px', fontWeight: 700, color: '#0f172a' }}>
                                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: row.color, marginRight: '8px' }} />
                                {row.label}
                              </td>
                              <td style={{ padding: '8px 12px', textAlign: 'center', color: '#64748b' }}>{row.data.count}</td>
                              <td style={{ padding: '8px 12px', textAlign: 'right', color: '#059669', fontWeight: 600 }}>
                                {row.data.cash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                              <td style={{ padding: '8px 12px', textAlign: 'right', color: '#4f46e5', fontWeight: 600 }}>
                                {row.data.upi.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                              <td style={{ padding: '8px 12px', textAlign: 'right', color: '#d97706', fontWeight: 600 }}>
                                {row.data.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                              <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                                {row.data.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                              <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#475569' }}>
                                {pct}%
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Itemized Payment History Log */}
                  <div style={{ overflowX: 'auto', border: '1px solid #cbd5e1', borderRadius: '10px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ background: '#1e293b', color: '#ffffff', fontSize: '11px', textTransform: 'uppercase' }}>
                          <th style={{ padding: '8px 10px', textAlign: 'left' }}>Date</th>
                          <th style={{ padding: '8px 10px', textAlign: 'left' }}>Type</th>
                          <th style={{ padding: '8px 10px', textAlign: 'left' }}>Payee / Staff / Vendor</th>
                          <th style={{ padding: '8px 10px', textAlign: 'center' }}>Staff Code</th>
                          <th style={{ padding: '8px 10px', textAlign: 'left' }}>Bill / Ref #</th>
                          <th style={{ padding: '8px 10px', textAlign: 'center' }}>Mode</th>
                          <th style={{ padding: '8px 10px', textAlign: 'right' }}>Amount ({currency})</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPayments.length === 0 ? (
                          <tr>
                            <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                              No itemized payments logged for this period.
                            </td>
                          </tr>
                        ) : (
                          filteredPayments.map((p, idx) => {
                            const isCash = p.payment_mode === 'CASH';
                            const isUpi = p.payment_mode === 'UPI';
                            const isCredit = p.payment_mode === 'CREDIT';

                            return (
                              <tr key={idx} style={{ background: idx % 2 === 0 ? '#f8fafc' : '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
                                <td style={{ padding: '7px 10px', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap' }}>
                                  {p.date}
                                </td>
                                <td style={{ padding: '7px 10px' }}>
                                  <span
                                    style={{
                                      fontSize: '10.5px',
                                      fontWeight: 700,
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      background: p.type === 'VENDOR' ? '#e0f2fe' : p.type === 'STAFF' ? '#eef2ff' : p.type === 'VEHICLE' ? '#fef3c7' : '#f1f5f9',
                                      color: p.type === 'VENDOR' ? '#0369a1' : p.type === 'STAFF' ? '#4338ca' : p.type === 'VEHICLE' ? '#b45309' : '#475569'
                                    }}
                                  >
                                    {p.type}
                                  </span>
                                </td>
                                <td style={{ padding: '7px 10px', fontWeight: 700, color: '#0f172a' }}>
                                  {p.recipient}
                                </td>
                                <td style={{ padding: '7px 10px', textAlign: 'center', color: '#475569', fontWeight: 600 }}>
                                  {p.charge_code ? (
                                    <span style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                                      {p.charge_code}
                                    </span>
                                  ) : '-'}
                                </td>
                                <td style={{ padding: '7px 10px', color: '#64748b' }}>
                                  {p.note || '-'}
                                </td>
                                <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                                  <span
                                    style={{
                                      fontSize: '11px',
                                      fontWeight: 800,
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      background: isCash ? '#dcfce7' : isUpi ? '#e0e7ff' : '#fef3c7',
                                      color: isCash ? '#15803d' : isUpi ? '#3730a3' : '#b45309'
                                    }}
                                  >
                                    {p.payment_mode}
                                  </span>
                                </td>
                                <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                                  {Number(p.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Official Verification Sign-off Block (2 Signing Authorities) */}
              <div
                style={{
                  marginTop: '30px',
                  paddingTop: '20px',
                  borderTop: '1px dashed #cbd5e1',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '30px',
                  pageBreakInside: 'avoid'
                }}
              >
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, marginBottom: '28px' }}>
                    Prepared & Authorized By
                  </div>
                  <div style={{ borderTop: '1.5px solid #0f172a', paddingTop: '8px', fontSize: '12.5px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Cashier / Co-Founder
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, marginBottom: '28px' }}>
                    Verified & Approved By
                  </div>
                  <div style={{ borderTop: '1.5px solid #0f172a', paddingTop: '8px', fontSize: '12.5px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Co-Founder
                  </div>
                </div>
              </div>

              {/* Footer Audit Disclaimer */}
              <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '10.5px', color: '#94a3b8' }}>
                This is an official monthly statement generated from the Top Medical Pharmacy Cloud Ledger. All rights reserved.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
