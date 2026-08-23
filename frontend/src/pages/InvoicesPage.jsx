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
  Eye
} from 'lucide-react';
import { billingAPI } from '../api';

export default function InvoicesPage({ profile, onOpenReceipt }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const currency = profile?.currency_symbol || '₹';

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (paymentFilter) params.append('payment_method', paymentFilter);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const data = await billingAPI.getInvoices(params.toString());
      setInvoices(data?.results || data || []);
    } catch (err) {
      console.error('Failed to load invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [statusFilter, paymentFilter, startDate, endDate]);

  const handleCancelInvoice = async (invoiceId, invNum) => {
    if (!window.confirm(`Are you sure you want to CANCEL Invoice #${invNum}? This will immediately restore the sold items back to their stock batches.`)) {
      return;
    }
    try {
      await billingAPI.cancelInvoice(invoiceId);
      alert(`Invoice #${invNum} cancelled and stock successfully restored.`);
      loadInvoices();
    } catch (err) {
      alert(`Failed to cancel invoice: ${err.message}`);
    }
  };

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Search & Date Filter Bar */}
      <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '280px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} color="var(--primary)" style={{ position: 'absolute', left: '12px', top: '11px' }} />
            <input
              type="text"
              className="input-field"
              style={{ paddingLeft: '36px', height: '38px', fontSize: '13px' }}
              placeholder="Search by Bill Number, Patient Name, Phone, Doctor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadInvoices()}
            />
          </div>

          <button onClick={loadInvoices} className="btn btn-secondary btn-sm" style={{ height: '38px' }}>
            Search
          </button>
        </div>

        {/* Date & Status Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
            <span>From:</span>
            <input
              type="date"
              className="input-field"
              style={{ width: '135px', height: '36px', fontSize: '12px', padding: '4px 8px' }}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
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
            style={{ width: '130px', height: '36px', fontSize: '12px' }}
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
            style={{ width: '130px', height: '36px', fontSize: '12px' }}
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
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(15, 23, 42, 0.6)'
        }}>
          <div style={{ fontSize: '13.5px', fontWeight: 700 }}>
            Sales Ledger ({invoices.length} Bills)
          </div>
        </div>

        <div className="data-table-container" style={{ border: 'none', borderRadius: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice #</th>
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
                  <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>
                    No invoices found matching your filters.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const isCancelled = inv.payment_status === 'CANCELLED';

                  return (
                    <tr key={inv.id} style={{ opacity: isCancelled ? 0.6 : 1 }}>
                      <td className="mono" style={{ fontWeight: 700, color: '#38bdf8' }}>
                        {inv.invoice_number}
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {new Date(inv.created_at).toLocaleDateString()} {new Date(inv.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#ffffff' }}>{inv.customer_name}</div>
                        {inv.customer_phone && <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{inv.customer_phone}</div>}
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {inv.doctor_name || 'OTC'}
                      </td>
                      <td>
                        <span className="badge badge-cyan">{inv.payment_method}</span>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>
                        {inv.items?.length || 0}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: isCancelled ? '#94a3b8' : '#34d399', fontSize: '14px' }} className="mono">
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
                            <Printer size={13} color="#06b6d4" />
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
