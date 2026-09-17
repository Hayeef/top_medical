import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Search, 
  Printer, 
  XCircle, 
  Eye, 
  ChevronDown, 
  ChevronUp, 
  Package,
  Calendar,
  DollarSign,
  Banknote,
  QrCode,
  Sparkles,
  Users,
  ClipboardList,
  Tag,
  Percent,
  FileSpreadsheet,
  Download
} from 'lucide-react';
import { billingAPI } from '../api';
import UpdateDiscountModal from '../components/UpdateDiscountModal';
import BillsExcelExportModal from '../components/BillsExcelExportModal';

const getTodayStr = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getYesterdayStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export default function InvoicesPage({ profile, user, staffList: propStaffList = [], onOpenReceipt, onOpenDailyReport }) {
  const todayStr = getTodayStr();
  const [invoices, setInvoices] = useState([]);
  const [staffList, setStaffList] = useState(() => {
    if (Array.isArray(propStaffList) && propStaffList.length > 0) return propStaffList;
    try {
      const saved = localStorage.getItem('tm_cached_staff');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      { id: 1, charge_code: 'TP01', name: 'RSH', role: 'Senior Pharmacist' },
      { id: 2, charge_code: 'TP02', name: 'TAS', role: 'Pharmacist / Cashier' },
      { id: 3, charge_code: 'TP03', name: 'RAY', role: 'Assistant Pharmacist' }
    ];
  });

  useEffect(() => {
    if (Array.isArray(propStaffList) && propStaffList.length > 0) {
      setStaffList(propStaffList);
    }
  }, [propStaffList]);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [staffFilter, setStaffFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [dateFilterPreset, setDateFilterPreset] = useState('today'); // 'today' | 'yesterday' | 'week' | 'month' | 'all' | 'custom'
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [expandedInvoiceId, setExpandedInvoiceId] = useState(null);
  const [discountModalInvoice, setDiscountModalInvoice] = useState(null);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [quickDownloading, setQuickDownloading] = useState(false);

  const handleQuickExportCurrentView = async () => {
    setQuickDownloading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (staffFilter) params.append('staff_code', staffFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (paymentFilter) params.append('payment_method', paymentFilter);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      params.append('export_type', 'full');
      await billingAPI.exportBillsExcel(params.toString());
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setQuickDownloading(false);
    }
  };

  const isAdmin = Boolean(
    user?.is_superuser || 
    user?.role === 'admin' || 
    user?.role === 'Owner' || 
    (typeof user?.email === 'string' && (user.email.toLowerCase().includes('admin') || user.email.toLowerCase().includes('owner'))) || 
    (typeof user?.username === 'string' && (user.username.toLowerCase().includes('admin') || user.username.toLowerCase().includes('owner')))
  );

  const currency = profile?.currency_symbol || '₹';

  const loadInvoicesAndStaff = async () => {
    setLoading(true);
    try {
      const [invData, staffData] = await Promise.allSettled([
        (async () => {
          const params = new URLSearchParams();
          if (search) params.append('search', search);
          if (staffFilter) params.append('staff_code', staffFilter);
          if (statusFilter) params.append('status', statusFilter);
          if (paymentFilter) params.append('payment_method', paymentFilter);
          if (startDate) params.append('start_date', startDate);
          if (endDate) params.append('end_date', endDate);
          return await billingAPI.getInvoices(params.toString());
        })(),
        billingAPI.getStaff()
      ]);

      if (invData.status === 'fulfilled') {
        setInvoices(invData.value?.results || invData.value || []);
      }
      if (staffData.status === 'fulfilled') {
        setStaffList(staffData.value?.results || staffData.value || []);
      }
    } catch (err) {
      console.error('Failed to load invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoicesAndStaff();
  }, [staffFilter, statusFilter, paymentFilter, startDate, endDate]);

  // Reset page to 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, staffFilter, statusFilter, paymentFilter, startDate, endDate]);

  const handleCancelInvoice = async (invoiceId, invNum) => {
    if (!window.confirm(`Are you sure you want to CANCEL Invoice #${invNum}? This will restore the sold medicines back to inventory.`)) {
      return;
    }
    try {
      await billingAPI.cancelInvoice(invoiceId);
      alert(`Invoice #${invNum} cancelled and stock successfully restored.`);
      loadInvoicesAndStaff();
    } catch (err) {
      alert(`Failed to cancel invoice: ${err.message}`);
    }
  };

  // Accounting & Settlement Summary for active filtered invoices
  const activeInvoices = invoices.filter(inv => inv.payment_status !== 'CANCELLED');
  const totalInvoiced = activeInvoices.reduce((sum, inv) => sum + (parseFloat(inv.grand_total) || 0), 0);
  const totalCashCollected = activeInvoices.reduce((sum, inv) => {
    const c = parseFloat(inv.cash_amount);
    if (!isNaN(c) && c > 0) return sum + c;
    if (inv.payment_method === 'CASH') return sum + (parseFloat(inv.amount_paid || inv.grand_total) || 0);
    return sum;
  }, 0);
  const totalUpiCollected = activeInvoices.reduce((sum, inv) => {
    const u = parseFloat(inv.upi_amount);
    if (!isNaN(u) && u > 0) return sum + u;
    if (inv.payment_method === 'UPI') return sum + (parseFloat(inv.amount_paid || inv.grand_total) || 0);
    return sum;
  }, 0);
  const totalAmountPaid = activeInvoices.reduce((sum, inv) => sum + (parseFloat(inv.amount_paid) || 0), 0);
  const totalDueAmount = Math.max(0, totalInvoiced - totalAmountPaid);

  // Staff summary calculation for active filtered results
  const staffSalesSummary = invoices.reduce((acc, inv) => {
    if (inv.payment_status !== 'CANCELLED') {
      const code = inv.staff_code || (staffList[0]?.charge_code || 'TP01');
      const name = inv.staff_name || (staffList[0]?.name || 'RSH');
      if (!acc[code]) acc[code] = { code, name, count: 0, revenue: 0, cash: 0, upi: 0 };
      acc[code].count += 1;
      acc[code].revenue += parseFloat(inv.grand_total) || 0;
      acc[code].cash += parseFloat(inv.cash_amount) || (inv.payment_method === 'CASH' ? parseFloat(inv.amount_paid || inv.grand_total) : 0);
      acc[code].upi += parseFloat(inv.upi_amount) || (inv.payment_method === 'UPI' ? parseFloat(inv.amount_paid || inv.grand_total) : 0);
    }
    return acc;
  }, {});

  // Pagination Computations (10 bills per page by default)
  const totalItems = invoices.length;
  const effectivePerPage = itemsPerPage === -1 ? (totalItems || 1) : itemsPerPage;
  const totalPages = Math.max(1, Math.ceil(totalItems / effectivePerPage));
  const validCurrentPage = Math.min(currentPage, totalPages);

  const paginatedInvoices = itemsPerPage === -1
    ? invoices
    : invoices.slice((validCurrentPage - 1) * itemsPerPage, validCurrentPage * itemsPerPage);

  const startItemIndex = totalItems === 0 ? 0 : (validCurrentPage - 1) * effectivePerPage + 1;
  const endItemIndex = itemsPerPage === -1 ? totalItems : Math.min(validCurrentPage * itemsPerPage, totalItems);

  return (
    <div className="main-page-wrapper">
      
      {/* 1. Daily Account & Drawer Settlement Summary Cards (Admin Only) */}
      {isAdmin && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          
          {/* Cash in Counter Drawer */}
          <div className="glass-panel" style={{ padding: '14px 18px', borderLeft: '4px solid #10b981', background: '#f0fdf4' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Cash in Drawer
              </span>
              <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Banknote size={17} color="#059669" />
              </div>
            </div>
            <div className="mono" style={{ fontSize: '22px', fontWeight: 900, color: '#065f46', marginTop: '6px' }}>
              {currency}{totalCashCollected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '11px', color: '#16a34a', marginTop: '2px', fontWeight: 600 }}>
              Physical cash collected
            </div>
          </div>

          {/* UPI / GPay in Account */}
          <div className="glass-panel" style={{ padding: '14px 18px', borderLeft: '4px solid #0284c7', background: '#f0f9ff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                UPI / GPay in Account
              </span>
              <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <QrCode size={17} color="#0284c7" />
              </div>
            </div>
            <div className="mono" style={{ fontSize: '22px', fontWeight: 900, color: '#0369a1', marginTop: '6px' }}>
              {currency}{totalUpiCollected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '11px', color: '#0284c7', marginTop: '2px', fontWeight: 600 }}>
              Digital QR / VPA receipts
            </div>
          </div>

          {/* Total Invoiced Sales */}
          <div className="glass-panel" style={{ padding: '14px 18px', borderLeft: '4px solid #6366f1', background: '#eef2ff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Total Filtered Sales
              </span>
              <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <DollarSign size={17} color="#4f46e5" />
              </div>
            </div>
            <div className="mono" style={{ fontSize: '22px', fontWeight: 900, color: '#3730a3', marginTop: '6px' }}>
              {currency}{totalInvoiced.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '11px', color: '#6366f1', marginTop: '2px', fontWeight: 600 }}>
              {activeInvoices.length} active bills
            </div>
          </div>

          {/* Unpaid / Credit Dues */}
          {totalDueAmount > 0 && (
            <div className="glass-panel" style={{ padding: '14px 18px', borderLeft: '4px solid #e11d48', background: '#fff1f2' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#e11d48', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Credit Dues
                </span>
                <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={17} color="#e11d48" />
                </div>
              </div>
              <div className="mono" style={{ fontSize: '22px', fontWeight: 900, color: '#9f1239', marginTop: '6px' }}>
                {currency}{totalDueAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '11px', color: '#e11d48', marginTop: '2px', fontWeight: 600 }}>
                Unpaid patient balances
              </div>
            </div>
          )}
        </div>
      )}

      {/* Staff Performance Snapshot Bar (Admin Only) */}
      {isAdmin && (
        <div className="mobile-scroll-pills" style={{ display: 'flex', gap: '10px' }}>
          {(staffList.length > 0 ? staffList : [
            { charge_code: 'TP01', name: 'RSH' },
            { charge_code: 'TP02', name: 'TAS' },
            { charge_code: 'TP03', name: 'RAY' },
          ]).map((stf) => {
            const stats = staffSalesSummary[stf.charge_code] || { count: 0, revenue: 0, cash: 0, upi: 0 };
            const isSelected = staffFilter === stf.charge_code;
            return (
              <div 
                key={stf.charge_code}
                onClick={() => setStaffFilter(isSelected ? '' : stf.charge_code)}
                className="glass-panel glass-card-interactive"
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  border: isSelected ? '2px solid #0284c7' : '1px solid #e2e8f0',
                  background: isSelected ? '#f0f9ff' : '#ffffff',
                  minWidth: '200px',
                  flex: '1 0 auto'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="mono" style={{ background: '#0284c7', color: '#ffffff', padding: '1px 5px', borderRadius: '4px', fontSize: '10.5px', fontWeight: 800 }}>
                      {stf.charge_code}
                    </span>
                    <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#0f172a' }}>{stf.name}</span>
                  </div>
                  <span className="badge badge-cyan" style={{ fontSize: '10px' }}>{stats.count} Bills</span>
                </div>
                <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Billed:</span>
                  <span className="mono" style={{ fontSize: '14px', fontWeight: 800, color: '#059669' }}>
                    {currency}{stats.revenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div style={{ marginTop: '4px', fontSize: '10.5px', display: 'flex', justifyContent: 'space-between', color: '#64748b', borderTop: '1px dashed #e2e8f0', paddingTop: '4px' }}>
                  <span style={{ color: '#059669' }}>Cash: {currency}{stats.cash.toFixed(0)}</span>
                  <span style={{ color: '#0284c7' }}>UPI: {currency}{stats.upi.toFixed(0)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="glass-panel" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        
        {/* Quick Date Range Preset Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginRight: '4px' }}>
            📅 View Bills:
          </span>
          <button
            type="button"
            onClick={() => {
              const t = getTodayStr();
              setDateFilterPreset('today');
              setStartDate(t);
              setEndDate(t);
            }}
            className={`btn btn-sm ${dateFilterPreset === 'today' ? 'btn-primary' : 'btn-secondary'}`}
            style={{
              padding: '4px 12px',
              fontSize: '11.5px',
              fontWeight: 800,
              borderRadius: '20px',
              background: dateFilterPreset === 'today' ? '#059669' : undefined,
              borderColor: dateFilterPreset === 'today' ? '#059669' : undefined,
              color: dateFilterPreset === 'today' ? '#ffffff' : undefined
            }}
          >
            ⭐ Today's Bills
          </button>
          <button
            type="button"
            onClick={() => {
              const y = getYesterdayStr();
              setDateFilterPreset('yesterday');
              setStartDate(y);
              setEndDate(y);
            }}
            className={`btn btn-sm ${dateFilterPreset === 'yesterday' ? 'btn-primary' : 'btn-secondary'}`}
            style={{
              padding: '4px 12px',
              fontSize: '11.5px',
              fontWeight: 800,
              borderRadius: '20px'
            }}
          >
            📅 Yesterday
          </button>
          <button
            type="button"
            onClick={() => {
              const d7 = new Date();
              d7.setDate(d7.getDate() - 7);
              const start = `${d7.getFullYear()}-${String(d7.getMonth()+1).padStart(2,'0')}-${String(d7.getDate()).padStart(2,'0')}`;
              const end = getTodayStr();
              setDateFilterPreset('week');
              setStartDate(start);
              setEndDate(end);
            }}
            className={`btn btn-sm ${dateFilterPreset === 'week' ? 'btn-primary' : 'btn-secondary'}`}
            style={{
              padding: '4px 12px',
              fontSize: '11.5px',
              fontWeight: 800,
              borderRadius: '20px'
            }}
          >
            📆 Last 7 Days
          </button>
          <button
            type="button"
            onClick={() => {
              const now = new Date();
              const start = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
              const end = getTodayStr();
              setDateFilterPreset('month');
              setStartDate(start);
              setEndDate(end);
            }}
            className={`btn btn-sm ${dateFilterPreset === 'month' ? 'btn-primary' : 'btn-secondary'}`}
            style={{
              padding: '4px 12px',
              fontSize: '11.5px',
              fontWeight: 800,
              borderRadius: '20px'
            }}
          >
            🗓️ This Month
          </button>
          <button
            type="button"
            onClick={() => {
              setDateFilterPreset('all');
              setStartDate('');
              setEndDate('');
            }}
            className={`btn btn-sm ${dateFilterPreset === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            style={{
              padding: '4px 12px',
              fontSize: '11.5px',
              fontWeight: 800,
              borderRadius: '20px'
            }}
          >
            🌐 All History
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '2 1 220px' }}>
            <Search size={16} color="#0284c7" style={{ position: 'absolute', left: '12px', top: '11px' }} />
            <input
              type="text"
              className="input-field"
              style={{ paddingLeft: '36px', height: '38px', fontSize: '13px', background: '#f8fafc', borderColor: '#cbd5e1' }}
              placeholder="Search Bill #, Patient, Phone, Doctor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadInvoicesAndStaff()}
            />
          </div>

          <select
            className="input-field"
            style={{ flex: '1 1 130px', height: '38px', fontSize: '12px' }}
            value={staffFilter}
            onChange={(e) => setStaffFilter(e.target.value)}
          >
            <option value="">All Staff Codes</option>
            {staffList.map(s => (
              <option key={s.charge_code} value={s.charge_code}>[{s.charge_code}] {s.name}</option>
            ))}
          </select>

          <select
            className="input-field"
            style={{ flex: '1 1 130px', height: '38px', fontSize: '12px' }}
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
          >
            <option value="">All Payments</option>
            <option value="CASH">Cash Only</option>
            <option value="UPI">UPI / GPay Only</option>
            <option value="MIXED">Split (Cash + UPI)</option>
            <option value="CARD">Card</option>
            <option value="CREDIT">Credit / Due</option>
          </select>

          <button onClick={loadInvoicesAndStaff} className="btn btn-primary btn-sm" style={{ height: '38px', padding: '0 14px' }}>
            Search
          </button>
        </div>

        {/* Custom Date Filter Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '12px', color: '#475569' }}>
          <span>Custom Date:</span>
          <input
            type="date"
            className="input-field"
            style={{ width: '130px', height: '32px', fontSize: '11.5px', padding: '2px 6px' }}
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setDateFilterPreset('custom');
            }}
          />
          <span>To:</span>
          <input
            type="date"
            className="input-field"
            style={{ width: '130px', height: '32px', fontSize: '11.5px', padding: '2px 6px' }}
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setDateFilterPreset('custom');
            }}
          />
          {(startDate || endDate || staffFilter || paymentFilter || search) && (
            <button
              onClick={() => {
                setSearch('');
                setStaffFilter('');
                setPaymentFilter('');
                setStatusFilter('');
                setStartDate(getTodayStr());
                setEndDate(getTodayStr());
                setDateFilterPreset('today');
              }}
              className="btn btn-secondary btn-sm"
              style={{ padding: '2px 8px', fontSize: '11px' }}
            >
              Reset to Today
            </button>
          )}

          {/* Excel Export & Report Action Buttons */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleQuickExportCurrentView}
              disabled={quickDownloading}
              className="btn btn-secondary btn-sm"
              title="Download currently filtered table data directly to Excel"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                borderColor: '#10b981',
                color: '#059669',
                background: '#f0fdf4',
                fontSize: '11.5px',
                fontWeight: 700
              }}
            >
              {quickDownloading ? (
                <div className="spinner" style={{ width: '12px', height: '12px', borderColor: '#059669', borderTopColor: 'transparent' }} />
              ) : (
                <Download size={13} color="#059669" />
              )}
              <span>{quickDownloading ? 'Exporting...' : 'Quick Export (.xlsx)'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsExcelModalOpen(true)}
              className="btn btn-primary btn-sm"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                fontSize: '12px',
                fontWeight: 800,
                boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)'
              }}
            >
              <FileSpreadsheet size={14} />
              <span>📊 Download Excel Reports</span>
            </button>

            {onOpenDailyReport && (
              <button
                type="button"
                onClick={onOpenDailyReport}
                className="btn btn-secondary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', borderColor: '#cbd5e1', color: '#475569', fontSize: '11.5px' }}
              >
                <ClipboardList size={13} />
                <span>Daily Sheet (PDF)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Invoice Archive Container */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#f8fafc',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
              Invoices Ledger Archive ({totalItems} {totalItems === 1 ? 'bill' : 'bills'})
            </div>
            {dateFilterPreset === 'today' && (
              <span className="badge badge-emerald" style={{ fontSize: '10px', padding: '2px 8px', fontWeight: 800 }}>
                ⭐ Today's Bills
              </span>
            )}
            {totalPages > 1 && (
              <span className="badge badge-cyan mono" style={{ fontSize: '10px', padding: '2px 6px' }}>
                Page {validCurrentPage} of {totalPages}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsExcelModalOpen(true)}
            className="btn btn-secondary btn-sm"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11.5px',
              fontWeight: 700,
              borderColor: '#0284c7',
              color: '#0284c7',
              background: '#f0f9ff'
            }}
          >
            <FileSpreadsheet size={13} />
            <span>Monthly & Custom Excel Export</span>
          </button>
        </div>

        {/* 1. DESKTOP DATA TABLE */}
        <div className="data-table-container desktop-only" style={{ border: 'none', borderRadius: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '3%' }}></th>
                <th>Invoice #</th>
                <th>Date & Time</th>
                <th>Customer / Patient</th>
                <th>Doctor</th>
                <th>Staff Code</th>
                <th>Payment</th>
                <th style={{ textAlign: 'right' }}>Total ({currency})</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedInvoices.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    {loading ? 'Loading bills...' : "No invoices found for the selected date & filter criteria."}
                  </td>
                </tr>
              ) : (
                paginatedInvoices.map((inv) => {
                  const isExpanded = expandedInvoiceId === inv.id;
                  const isCancelled = inv.payment_status === 'CANCELLED';

                  return (
                    <React.Fragment key={inv.id}>
                      <tr
                        style={{
                          background: isCancelled ? '#fff1f2' : (isExpanded ? '#f0f9ff' : undefined),
                          opacity: isCancelled ? 0.75 : 1
                        }}
                      >
                        <td
                          onClick={() => setExpandedInvoiceId(isExpanded ? null : inv.id)}
                          style={{ cursor: 'pointer', textAlign: 'center', color: '#64748b' }}
                        >
                          {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        </td>

                        <td>
                          <div style={{ fontWeight: 800, color: '#0f172a' }}>{inv.invoice_number}</div>
                          {isCancelled && <span className="badge badge-rose" style={{ fontSize: '10px' }}>CANCELLED</span>}
                        </td>

                        <td style={{ fontSize: '12px' }}>
                          <div>{new Date(inv.created_at).toLocaleDateString()}</div>
                          <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                            {new Date(inv.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>

                        <td>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>{inv.customer_name || 'Walk-in Customer'}</div>
                          {inv.customer_phone && <div style={{ fontSize: '11px', color: '#64748b' }}>{inv.customer_phone}</div>}
                        </td>

                        <td style={{ fontSize: '12px', color: '#475569' }}>
                          {inv.doctor_name || 'OTC / Self'}
                        </td>

                        <td>
                          <span className="mono" style={{ background: '#f1f5f9', color: '#0284c7', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, fontSize: '11px' }}>
                            {inv.staff_code || 'TP01'}
                          </span>
                        </td>

                        <td>
                          {inv.payment_method === 'MIXED' ? (
                            <span className="badge badge-purple" title={`Cash: ${currency}${inv.cash_amount} | UPI: ${currency}${inv.upi_amount}`} style={{ fontSize: '10.5px' }}>
                              Split (C: ₹{parseFloat(inv.cash_amount || 0).toFixed(0)} + U: ₹{parseFloat(inv.upi_amount || 0).toFixed(0)})
                            </span>
                          ) : inv.payment_method === 'CASH' ? (
                            <span className="badge badge-emerald">Cash</span>
                          ) : inv.payment_method === 'UPI' ? (
                            <span className="badge badge-cyan">UPI / GPay</span>
                          ) : inv.payment_method === 'CARD' ? (
                            <span className="badge badge-indigo">Card</span>
                          ) : (
                            <span className="badge badge-amber">Credit / Due</span>
                          )}
                        </td>

                        <td style={{ textAlign: 'right', fontWeight: 800, fontSize: '14px', color: isCancelled ? '#e11d48' : '#059669' }} className="mono">
                          {currency}{parseFloat(inv.grand_total).toFixed(2)}
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            {!isCancelled && (
                              <button
                                onClick={() => setDiscountModalInvoice(inv)}
                                className="btn btn-secondary btn-sm"
                                title="Apply Customer Bargain Discount"
                                style={{
                                  color: '#0284c7',
                                  borderColor: '#bae6fd',
                                  background: '#f0f9ff',
                                  padding: '4px 8px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <Tag size={12} />
                                <span>Discount</span>
                              </button>
                            )}

                            <button
                              onClick={() => onOpenReceipt(inv)}
                              className="btn btn-secondary btn-sm"
                              title="Print / View Receipt"
                            >
                              <Printer size={13} />
                              <span>Receipt</span>
                            </button>

                            {!isCancelled && (
                              <button
                                onClick={() => handleCancelInvoice(inv.id, inv.invoice_number)}
                                className="btn btn-danger btn-sm"
                                title="Cancel Invoice & Restore Stock"
                                style={{ padding: '4px 6px' }}
                              >
                                <XCircle size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Line Items Preview */}
                      {isExpanded && (
                        <tr>
                          <td colSpan="9" style={{ padding: '0', background: '#f8fafc' }}>
                            <div style={{ padding: '14px 20px', borderLeft: '4px solid #0284c7' }}>
                              <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#0369a1', marginBottom: '6px', textTransform: 'uppercase' }}>
                                Dispensed Medicines in Bill #{inv.invoice_number}:
                              </div>

                              <table style={{ width: '100%', fontSize: '11.5px', borderCollapse: 'collapse' }}>
                                <thead>
                                  <tr style={{ color: '#64748b', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                                    <th style={{ padding: '4px 6px' }}>Medicine</th>
                                    <th style={{ padding: '4px 6px' }}>Batch</th>
                                    <th style={{ padding: '4px 6px', textAlign: 'center' }}>Qty</th>
                                    <th style={{ padding: '4px 6px', textAlign: 'right' }}>Unit Price</th>
                                    <th style={{ padding: '4px 6px', textAlign: 'right' }}>Total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {inv.items?.map((item, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px dotted #e2e8f0' }}>
                                      <td style={{ padding: '6px', fontWeight: 700 }}>{item.medicine_name}</td>
                                      <td style={{ padding: '6px' }} className="mono">{item.batch_number}</td>
                                      <td style={{ padding: '6px', textAlign: 'center', fontWeight: 700 }}>
                                        {item.quantity}{item.is_loose ? ' units' : ' packs'}
                                      </td>
                                      <td style={{ padding: '6px', textAlign: 'right' }} className="mono">
                                        {currency}{parseFloat(item.unit_price).toFixed(2)}
                                      </td>
                                      <td style={{ padding: '6px', textAlign: 'right', fontWeight: 800, color: '#059669' }} className="mono">
                                        {currency}{parseFloat(item.total_price).toFixed(2)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 2. MOBILE INVOICE CARDS VIEW */}
        <div className="mobile-only" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px' }}>
          {paginatedInvoices.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
              {loading ? 'Loading bills...' : "No bills match your search criteria."}
            </div>
          ) : (
            paginatedInvoices.map((inv) => {
              const isExpanded = expandedInvoiceId === inv.id;
              const isCancelled = inv.payment_status === 'CANCELLED';

              return (
                <div
                  key={inv.id}
                  style={{
                    background: isCancelled ? '#fff1f2' : '#ffffff',
                    border: `1px solid ${isCancelled ? '#fecdd3' : '#e2e8f0'}`,
                    borderRadius: '12px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)'
                  }}
                >
                  {/* Top Bar: Bill #, Status, Amount */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>
                          #{inv.invoice_number}
                        </span>
                        {inv.payment_method === 'MIXED' ? (
                          <span className="badge badge-purple" style={{ fontSize: '10px' }}>
                            Split (₹{parseFloat(inv.cash_amount || 0).toFixed(0)}+₹{parseFloat(inv.upi_amount || 0).toFixed(0)})
                          </span>
                        ) : (
                          <span className={`badge ${inv.payment_method === 'CASH' ? 'badge-emerald' : (inv.payment_method === 'UPI' ? 'badge-cyan' : 'badge-amber')}`}>
                            {inv.payment_method === 'UPI' ? 'UPI / GPay' : inv.payment_method}
                          </span>
                        )}
                        {isCancelled && <span className="badge badge-rose">CANCELLED</span>}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                        {new Date(inv.created_at).toLocaleDateString()} at {new Date(inv.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    <div className="mono" style={{ fontSize: '16px', fontWeight: 900, color: isCancelled ? '#e11d48' : '#059669' }}>
                      {currency}{parseFloat(inv.grand_total).toFixed(2)}
                    </div>
                  </div>

                  {/* Customer & Staff Details */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#334155' }}>
                    <div>
                      <strong>{inv.customer_name || 'Walk-in'}</strong>
                      {inv.customer_phone && <span> ({inv.customer_phone})</span>}
                    </div>
                    <span className="mono" style={{ fontSize: '10.5px', background: '#f1f5f9', padding: '1px 5px', borderRadius: '4px' }}>
                      Staff: {inv.staff_code || 'TP01'}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f8fafc', paddingTop: '6px' }}>
                    <button
                      onClick={() => setExpandedInvoiceId(isExpanded ? null : inv.id)}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '3px 8px', fontSize: '11px' }}
                    >
                      {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      <span>{inv.items?.length || 0} items</span>
                    </button>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      {!isCancelled && (
                        <button
                          onClick={() => setDiscountModalInvoice(inv)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 8px', fontSize: '11px', color: '#0284c7', borderColor: '#bae6fd', background: '#f0f9ff' }}
                          title="Apply Bargain Discount"
                        >
                          <Tag size={11} />
                          <span>Discount</span>
                        </button>
                      )}

                      <button
                        onClick={() => onOpenReceipt(inv)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 10px', fontSize: '11px' }}
                      >
                        <Printer size={12} />
                        <span>Print Bill</span>
                      </button>

                      {!isCancelled && (
                        <button
                          onClick={() => handleCancelInvoice(inv.id, inv.invoice_number)}
                          className="btn btn-danger btn-sm"
                          style={{ padding: '4px 8px', fontSize: '11px' }}
                        >
                          <XCircle size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expandable items preview */}
                  {isExpanded && (
                    <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '8px', border: '1px solid #e2e8f0' }}>
                      {inv.items?.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', padding: '3px 0', borderBottom: '1px dotted #e2e8f0' }}>
                          <span>{item.medicine_name} (x{item.quantity})</span>
                          <span className="mono" style={{ fontWeight: 700, color: '#059669' }}>
                            {currency}{parseFloat(item.total_price).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* 3. PAGINATION CONTROL BAR */}
        {totalItems > 0 && (
          <div style={{
            padding: '12px 18px',
            borderTop: '1px solid #e2e8f0',
            background: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            fontSize: '12.5px',
            color: '#475569'
          }}>
            {/* Left: Summary Count */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 700, color: '#1e293b' }}>
                Showing <span style={{ color: '#0284c7', fontWeight: 900 }}>{startItemIndex} - {endItemIndex}</span> of <span style={{ color: '#0284c7', fontWeight: 900 }}>{totalItems}</span> bills
              </span>
              {dateFilterPreset === 'today' && (
                <span className="badge badge-emerald" style={{ fontSize: '10px', padding: '2px 6px' }}>
                  Today
                </span>
              )}
            </div>

            {/* Middle: Page navigation buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={validCurrentPage === 1}
                className="btn btn-secondary btn-sm"
                style={{ padding: '4px 8px', fontSize: '11px', opacity: validCurrentPage === 1 ? 0.4 : 1, cursor: validCurrentPage === 1 ? 'not-allowed' : 'pointer' }}
                title="First Page"
              >
                « First
              </button>

              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={validCurrentPage === 1}
                className="btn btn-secondary btn-sm"
                style={{ padding: '4px 8px', fontSize: '11px', opacity: validCurrentPage === 1 ? 0.4 : 1, cursor: validCurrentPage === 1 ? 'not-allowed' : 'pointer' }}
                title="Previous Page"
              >
                ‹ Prev
              </button>

              {/* Numbered Page Buttons */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - validCurrentPage) <= 1)
                .reduce((acc, p, idx, arr) => {
                  if (idx > 0 && p - arr[idx - 1] > 1) {
                    acc.push('...');
                  }
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, idx) => {
                  if (p === '...') {
                    return <span key={`ellipsis-${idx}`} style={{ padding: '0 4px', color: '#94a3b8' }}>...</span>;
                  }
                  const isCur = p === validCurrentPage;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setCurrentPage(p)}
                      style={{
                        padding: '4px 10px',
                        fontSize: '11.5px',
                        fontWeight: isCur ? 900 : 700,
                        background: isCur ? '#0284c7' : '#ffffff',
                        color: isCur ? '#ffffff' : '#334155',
                        border: isCur ? '1.5px solid #0284c7' : '1px solid #cbd5e1',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        minWidth: '28px',
                        textAlign: 'center'
                      }}
                    >
                      {p}
                    </button>
                  );
                })}

              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={validCurrentPage === totalPages}
                className="btn btn-secondary btn-sm"
                style={{ padding: '4px 8px', fontSize: '11px', opacity: validCurrentPage === totalPages ? 0.4 : 1, cursor: validCurrentPage === totalPages ? 'not-allowed' : 'pointer' }}
                title="Next Page"
              >
                Next ›
              </button>

              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={validCurrentPage === totalPages}
                className="btn btn-secondary btn-sm"
                style={{ padding: '4px 8px', fontSize: '11px', opacity: validCurrentPage === totalPages ? 0.4 : 1, cursor: validCurrentPage === totalPages ? 'not-allowed' : 'pointer' }}
                title="Last Page"
              >
                Last »
              </button>
            </div>

            {/* Right: Per-page selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11.5px', color: '#64748b' }}>Rows / page:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="input-field"
                style={{ padding: '3px 8px', fontSize: '11.5px', height: '28px', width: 'auto' }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={-1}>All ({totalItems})</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Post-Generation Discount / Bargaining Modal */}
      <UpdateDiscountModal
        invoice={discountModalInvoice}
        profile={profile}
        isOpen={!!discountModalInvoice}
        onClose={() => setDiscountModalInvoice(null)}
        onUpdated={(updatedInv) => {
          setInvoices(prev => prev.map(inv => inv.id === updatedInv.id ? { ...inv, ...updatedInv } : inv));
          loadInvoicesAndStaff();
        }}
      />

      {/* Monthly & Custom History Excel Export Modal */}
      <BillsExcelExportModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        profile={profile}
        staffList={staffList}
        currentFilters={{
          startDate,
          endDate,
          staffFilter,
          paymentFilter,
          statusFilter,
          search
        }}
      />
    </div>
  );
}
