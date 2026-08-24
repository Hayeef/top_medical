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
  DollarSign
} from 'lucide-react';
import { billingAPI } from '../api';

export default function InvoicesPage({ profile, onOpenReceipt }) {
  const [invoices, setInvoices] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [staffFilter, setStaffFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedInvoiceId, setExpandedInvoiceId] = useState(null);

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

  // Staff summary calculation for active filtered results
  const staffSalesSummary = invoices.reduce((acc, inv) => {
    if (inv.payment_status !== 'CANCELLED') {
      const code = inv.staff_code || 'SC-101';
      const name = inv.staff_name || 'Staff 1';
      if (!acc[code]) acc[code] = { code, name, count: 0, revenue: 0 };
      acc[code].count += 1;
      acc[code].revenue += parseFloat(inv.grand_total) || 0;
    }
    return acc;
  }, {});

  return (
    <div className="main-page-wrapper">
      
      {/* Staff Performance Snapshot Bar */}
      <div className="mobile-scroll-pills" style={{ display: 'flex', gap: '10px' }}>
        {(staffList.length > 0 ? staffList : [
          { charge_code: 'SC-101', name: 'Ahmed (Staff 1)' },
          { charge_code: 'SC-102', name: 'Fatima (Staff 2)' },
          { charge_code: 'SC-103', name: 'Bilal (Staff 3)' },
        ]).map((stf) => {
          const stats = staffSalesSummary[stf.charge_code] || { count: 0, revenue: 0 };
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
                minWidth: '180px',
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
            </div>
          );
        })}
      </div>

      {/* Search & Filter Bar */}
      <div className="glass-panel" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        
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
            style={{ flex: '1 1 120px', height: '38px', fontSize: '12px' }}
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
          >
            <option value="">All Payments</option>
            <option value="CASH">Cash</option>
            <option value="UPI">UPI / QR</option>
            <option value="CARD">Card</option>
            <option value="CREDIT">Credit / Due</option>
          </select>

          <button onClick={loadInvoicesAndStaff} className="btn btn-primary btn-sm" style={{ height: '38px', padding: '0 14px' }}>
            Search
          </button>
        </div>

        {/* Date Filter Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '12px', color: '#475569' }}>
          <span>From:</span>
          <input
            type="date"
            className="input-field"
            style={{ width: '130px', height: '32px', fontSize: '11.5px', padding: '2px 6px' }}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <span>To:</span>
          <input
            type="date"
            className="input-field"
            style={{ width: '130px', height: '32px', fontSize: '11.5px', padding: '2px 6px' }}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          {(startDate || endDate || staffFilter || paymentFilter || search) && (
            <button
              onClick={() => {
                setSearch('');
                setStaffFilter('');
                setPaymentFilter('');
                setStatusFilter('');
                setStartDate('');
                setEndDate('');
              }}
              className="btn btn-secondary btn-sm"
              style={{ padding: '2px 8px', fontSize: '11px' }}
            >
              Clear Filters
            </button>
          )}
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
          background: '#f8fafc'
        }}>
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
            Invoices Ledger Archive ({invoices.length} entries)
          </div>
          <span style={{ fontSize: '11px', color: '#64748b' }}>
            Official pharmacy GST billing log
          </span>
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
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    No invoices matching current filter criteria.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
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
                            {inv.staff_code || 'SC-101'}
                          </span>
                        </td>

                        <td>
                          <span className={`badge ${inv.payment_method === 'CASH' ? 'badge-emerald' : (inv.payment_method === 'UPI' ? 'badge-cyan' : 'badge-purple')}`}>
                            {inv.payment_method}
                          </span>
                        </td>

                        <td style={{ textAlign: 'right', fontWeight: 800, fontSize: '14px', color: isCancelled ? '#e11d48' : '#059669' }} className="mono">
                          {currency}{parseFloat(inv.grand_total).toFixed(2)}
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
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
          {invoices.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
              No bills match your search criteria.
            </div>
          ) : (
            invoices.map((inv) => {
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
                        <span className={`badge ${inv.payment_method === 'CASH' ? 'badge-emerald' : 'badge-cyan'}`}>
                          {inv.payment_method}
                        </span>
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
                      Staff: {inv.staff_code || 'SC-101'}
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
      </div>
    </div>
  );
}
