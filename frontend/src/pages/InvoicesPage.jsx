import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Search, 
  Printer, 
  XCircle, 
  CheckCircle, 
  Filter, 
  Calendar, 
  DollarSign, 
  User,
  ArrowRight,
  Eye,
  BadgeCheck,
  ChevronDown,
  ChevronUp,
  Package
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
    if (!window.confirm(`Are you sure you want to CANCEL Invoice #${invNum}? This will immediately restore the sold items back to their stock batches.`)) {
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
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Staff Performance Snapshot Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
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
                padding: '14px 18px',
                cursor: 'pointer',
                border: isSelected ? '2px solid #0284c7' : '1px solid #e2e8f0',
                background: isSelected ? '#f0f9ff' : '#ffffff',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="mono" style={{ background: '#0284c7', color: '#ffffff', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 800 }}>
                    {stf.charge_code}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{stf.name}</span>
                </div>
                <span className="badge badge-cyan" style={{ fontSize: '10.5px' }}>{stats.count} Bills</span>
              </div>
              <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: '11.5px', color: '#64748b' }}>Total Billed:</span>
                <span className="mono" style={{ fontSize: '15px', fontWeight: 800, color: '#059669' }}>
                  {currency}{stats.revenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Search & Filter Bar */}
      <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '280px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} color="#0284c7" style={{ position: 'absolute', left: '12px', top: '11px' }} />
            <input
              type="text"
              className="input-field"
              style={{ paddingLeft: '36px', height: '38px', fontSize: '13px', background: '#f8fafc', borderColor: '#cbd5e1' }}
              placeholder="Search by Bill Number, Patient Name, Phone, Doctor, Staff..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadInvoicesAndStaff()}
            />
          </div>

          <button onClick={loadInvoicesAndStaff} className="btn btn-primary btn-sm" style={{ height: '38px' }}>
            Search
          </button>
        </div>

        {/* Date, Staff & Status Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <select
            className="input-field"
            style={{ width: '150px', height: '36px', fontSize: '12px' }}
            value={staffFilter}
            onChange={(e) => setStaffFilter(e.target.value)}
          >
            <option value="">All Staff Codes</option>
            {staffList.map(s => (
              <option key={s.charge_code} value={s.charge_code}>[{s.charge_code}] {s.name}</option>
            ))}
          </select>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#475569' }}>
            <span>From:</span>
            <input
              type="date"
              className="input-field"
              style={{ width: '135px', height: '36px', fontSize: '12px', padding: '4px 8px' }}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#475569' }}>
            <span>To:</span>
            <input
              type="date"
              className="input-field"
              style={{ width: '135px', height: '36px', fontSize: '12px', padding: '4px 8px' }}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <select
            className="input-field"
            style={{ width: '125px', height: '36px', fontSize: '12px' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="PAID">Paid</option>
            <option value="DUE">Due / Credit</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <select
            className="input-field"
            style={{ width: '120px', height: '36px', fontSize: '12px' }}
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
          >
            <option value="">All Modes</option>
            <option value="CASH">Cash</option>
            <option value="UPI">UPI / QR</option>
            <option value="CARD">Card</option>
            <option value="CREDIT">Credit</option>
          </select>
        </div>
      </div>

      {/* Invoices Ledger Table */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <div style={{
          padding: '14px 20px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#f8fafc'
        }}>
          <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>
            Sales Ledger & Staff Billing Audit ({invoices.length} Bills)
          </div>
        </div>

        <div className="data-table-container" style={{ border: 'none', borderRadius: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}></th>
                <th>Invoice #</th>
                <th>Billed By (Staff)</th>
                <th>Date & Time</th>
                <th>Patient / Customer</th>
                <th>Doctor</th>
                <th>Payment Mode</th>
                <th style={{ textAlign: 'center' }}>Items</th>
                <th style={{ textAlign: 'right' }}>Total Amount</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan="11" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    No invoices found matching your filters.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const isCancelled = inv.payment_status === 'CANCELLED';
                  const isExpanded = expandedInvoiceId === inv.id;

                  return (
                    <React.Fragment key={inv.id}>
                      <tr style={{ opacity: isCancelled ? 0.6 : 1, background: isExpanded ? '#f0f9ff' : 'transparent' }}>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => setExpandedInvoiceId(isExpanded ? null : inv.id)}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#0284c7' }}
                            title="Toggle line items"
                          >
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </td>

                        <td className="mono" style={{ fontWeight: 800, color: '#0284c7' }}>
                          {inv.invoice_number}
                        </td>

                        <td>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <span className="mono" style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 800 }}>
                              {inv.staff_code || 'SC-101'}
                            </span>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a' }}>
                              {inv.staff_name || 'Staff 1'}
                            </span>
                          </div>
                        </td>

                        <td style={{ fontSize: '12px', color: '#475569' }}>
                          {new Date(inv.created_at).toLocaleDateString()} {new Date(inv.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>

                        <td>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{inv.customer_name || 'Walk-in Customer'}</div>
                          {inv.customer_phone && <div style={{ fontSize: '11px', color: '#64748b' }}>{inv.customer_phone}</div>}
                        </td>

                        <td style={{ fontSize: '12px', color: '#475569' }}>
                          {inv.doctor_name || 'Self / OTC'}
                        </td>

                        <td>
                          <span className="badge badge-cyan">{inv.payment_method}</span>
                        </td>

                        <td style={{ textAlign: 'center', fontWeight: 700 }}>
                          {inv.items?.length || 0}
                        </td>

                        <td style={{ textAlign: 'right', fontWeight: 900, color: isCancelled ? '#94a3b8' : '#059669', fontSize: '14px' }} className="mono">
                          {currency}{parseFloat(inv.grand_total).toFixed(2)}
                        </td>

                        <td style={{ textAlign: 'center' }}>
                          <span className={`badge ${inv.payment_status === 'PAID' ? 'badge-emerald' : (isCancelled ? 'badge-rose' : 'badge-amber')}`}>
                            {inv.payment_status}
                          </span>
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              onClick={() => onOpenReceipt(inv)}
                              className="btn btn-secondary btn-sm"
                              title="View & Print Bill"
                            >
                              <Printer size={13} color="#0284c7" />
                              <span>Print</span>
                            </button>

                            {!isCancelled && (
                              <button
                                onClick={() => handleCancelInvoice(inv.id, inv.invoice_number)}
                                className="btn btn-danger btn-sm"
                                title="Cancel bill & return stock"
                              >
                                <XCircle size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Medicines Details Drawer */}
                      {isExpanded && (
                        <tr>
                          <td colSpan="11" style={{ padding: '0 0 16px 40px', background: '#f8fafc' }}>
                            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px', marginTop: '6px' }}>
                              <div style={{ fontSize: '12px', fontWeight: 800, color: '#0369a1', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Package size={14} /> Medicines Billed in this Invoice:
                              </div>
                              <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                                <thead>
                                  <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '11px', textAlign: 'left' }}>
                                    <th style={{ padding: '4px 0' }}>Medicine Name</th>
                                    <th>Batch #</th>
                                    <th>Expiry</th>
                                    <th style={{ textAlign: 'center' }}>Qty</th>
                                    <th style={{ textAlign: 'right' }}>Rate ({currency})</th>
                                    <th style={{ textAlign: 'right' }}>Total ({currency})</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {inv.items?.map((item, i) => (
                                    <tr key={i} style={{ borderBottom: '1px dotted #f1f5f9' }}>
                                      <td style={{ padding: '6px 0', fontWeight: 600 }}>{item.medicine_name} {item.is_loose ? '(Loose)' : ''}</td>
                                      <td className="mono">{item.batch_number}</td>
                                      <td>{item.expiry_date}</td>
                                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{item.quantity}</td>
                                      <td style={{ textAlign: 'right' }} className="mono">{parseFloat(item.unit_selling_price).toFixed(2)}</td>
                                      <td style={{ textAlign: 'right', fontWeight: 800, color: '#059669' }} className="mono">{parseFloat(item.total_amount).toFixed(2)}</td>
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
      </div>
    </div>
  );
}
