import React, { useState, useRef } from 'react';
import { 
  Printer, 
  X, 
  CheckCircle, 
  Share2, 
  FileText, 
  Receipt, 
  QrCode,
  Download,
  Stethoscope,
  Building2
} from 'lucide-react';
import PharmacyLogo from './PharmacyLogo';

export default function ReceiptModal({ invoice, profile, onClose }) {
  const [printFormat, setPrintFormat] = useState('thermal'); // 'thermal' or 'a4'

  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const currency = profile?.currency_symbol || '₹';

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: printFormat === 'thermal' ? '440px' : '760px' }}>
        {/* Header Controls (No Print) */}
        <div className="no-print" style={{
          padding: '14px 18px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-main)',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PharmacyLogo size={22} />
            <span style={{ fontWeight: 800, fontSize: '14.5px', color: 'var(--text-main)' }}>Bill #{invoice.invoice_number}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Format Switcher */}
            <div style={{
              display: 'flex',
              background: '#f1f5f9',
              borderRadius: '8px',
              padding: '2px',
              border: '1px solid #e2e8f0'
            }}>
              <button
                onClick={() => setPrintFormat('thermal')}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: 'none',
                  background: printFormat === 'thermal' ? '#0284c7' : 'transparent',
                  color: printFormat === 'thermal' ? '#ffffff' : '#475569',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Thermal 80mm
              </button>
              <button
                onClick={() => setPrintFormat('a4')}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: 'none',
                  background: printFormat === 'a4' ? '#0284c7' : 'transparent',
                  color: printFormat === 'a4' ? '#ffffff' : '#475569',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                A4 / A5 Tax
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="btn btn-emerald btn-sm"
              title="Print receipt"
            >
              <Printer size={14} />
              <span>Print</span>
            </button>

            <button
              onClick={onClose}
              className="btn btn-secondary btn-sm"
              style={{ width: '32px', height: '32px', padding: 0 }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Printable Receipt Body */}
        <div style={{ padding: '20px', backgroundColor: '#ffffff', color: '#111827', fontFamily: 'var(--font-mono)' }}>
          {printFormat === 'thermal' ? (
            /* 80mm THERMAL RECEIPT LAYOUT */
            <div style={{ width: '100%', fontSize: '12px', lineHeight: 1.4 }}>
              {/* Header */}
              <div style={{ textAlign: 'center', borderBottom: '1px dashed #9ca3af', paddingBottom: '10px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6px' }}>
                  <PharmacyLogo size={36} />
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, textTransform: 'uppercase', margin: 0, fontFamily: 'var(--font-main)' }}>
                  {profile?.name || 'TOP MEDICAL PHARMACY'}
                </h3>
                <p style={{ fontSize: '11px', color: '#4b5563', margin: '3px 0' }}>{profile?.address}</p>
                <p style={{ fontSize: '11px', color: '#4b5563', margin: '2px 0' }}>Tel: {profile?.phone}</p>
                <div style={{ fontSize: '10px', color: '#374151', marginTop: '4px', fontWeight: 600 }}>
                  <span>DL: {profile?.dl_number_20b}</span> | <span>GSTIN: {profile?.gstin}</span>
                </div>
              </div>

              {/* Bill Details */}
              <div style={{ fontSize: '11px', borderBottom: '1px dashed #9ca3af', paddingBottom: '8px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span><strong>Bill No:</strong> {invoice.invoice_number}</span>
                  <span>{new Date(invoice.created_at).toLocaleDateString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                  <span><strong>Customer:</strong> {invoice.customer_name || 'Walk-in Customer'}</span>
                  <span>{new Date(invoice.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                  <span><strong>Billed By:</strong> [{invoice.staff_code || 'SC-101'}] {invoice.staff_name || 'Staff 1'}</span>
                  {invoice.customer_phone && <span>Ph: {invoice.customer_phone}</span>}
                </div>
                {invoice.doctor_name && <div style={{ marginTop: '2px' }}><strong>Doctor:</strong> {invoice.doctor_name}</div>}
              </div>

              {/* Items Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '10px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #111827', textAlign: 'left' }}>
                    <th style={{ padding: '4px 0', width: '42%' }}>Item / Batch</th>
                    <th style={{ padding: '4px 0', textAlign: 'center' }}>Exp</th>
                    <th style={{ padding: '4px 0', textAlign: 'center' }}>Qty</th>
                    <th style={{ padding: '4px 0', textAlign: 'right' }}>Amt</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items?.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px dotted #e5e7eb' }}>
                      <td style={{ padding: '4px 0' }}>
                        <div style={{ fontWeight: 700 }}>{item.medicine_name}</div>
                        <div style={{ fontSize: '9.5px', color: '#6b7280' }}>
                          B:{item.batch_number} {item.is_loose ? `(Loose ${item.quantity}u)` : `(${item.pack_size}s/pack)`}
                        </div>
                      </td>
                      <td style={{ padding: '4px 0', textAlign: 'center', fontSize: '10px' }}>
                        {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString('en-GB', { month: '2-digit', year: '2-digit' }) : '-'}
                      </td>
                      <td style={{ padding: '4px 0', textAlign: 'center', fontWeight: 600 }}>
                        {item.quantity}{item.is_loose ? 'u' : 'p'}
                      </td>
                      <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: 700 }}>
                        {currency}{parseFloat(item.total_amount).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals Summary */}
              <div style={{ borderTop: '1px solid #111827', paddingTop: '6px', fontSize: '11.5px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Subtotal:</span>
                  <span>{currency}{parseFloat(invoice.subtotal).toFixed(2)}</span>
                </div>
                {parseFloat(invoice.discount_amount) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
                    <span>Discount:</span>
                    <span>-{currency}{parseFloat(invoice.discount_amount).toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4b5563', fontSize: '10.5px' }}>
                  <span>GST Total (Incl.):</span>
                  <span>{currency}{parseFloat(invoice.tax_amount).toFixed(2)}</span>
                </div>
                {parseFloat(invoice.round_off) !== 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6b7280', fontSize: '10.5px' }}>
                    <span>Round off:</span>
                    <span>{parseFloat(invoice.round_off) > 0 ? `+${invoice.round_off}` : invoice.round_off}</span>
                  </div>
                )}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '15px',
                  fontWeight: 800,
                  borderTop: '1px dashed #111827',
                  borderBottom: '1px dashed #111827',
                  padding: '6px 0',
                  margin: '4px 0'
                }}>
                  <span>NET TOTAL:</span>
                  <span>{currency}{parseFloat(invoice.grand_total).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                  <span>Paid via <strong>{invoice.payment_method}</strong>:</span>
                  <span>{currency}{parseFloat(invoice.amount_paid).toFixed(2)}</span>
                </div>
                {parseFloat(invoice.change_due) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#059669' }}>
                    <span>Change Returned:</span>
                    <span>{currency}{parseFloat(invoice.change_due).toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Thermal Footer */}
              <div style={{ textAlign: 'center', marginTop: '16px', paddingTop: '8px', borderTop: '1px dotted #9ca3af', fontSize: '9.5px', color: '#4b5563' }}>
                <p style={{ margin: '2px 0' }}>{profile?.invoice_footer_note || 'Thank you for choosing Top Medical Pharmacy!'}</p>
                <p style={{ margin: '4px 0 0', fontWeight: 600 }}>*** WISH YOU A SPEEDY RECOVERY ***</p>
              </div>
            </div>
          ) : (
            /* A4 / A5 STANDARD TAX INVOICE FORMAT */
            <div style={{ width: '100%', fontSize: '12px', color: '#1e293b' }}>
              {/* Header Box */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                borderBottom: '2px solid #0284c7',
                paddingBottom: '16px',
                marginBottom: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                  <div style={{ padding: '6px', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                    <PharmacyLogo size={42} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0369a1', textTransform: 'uppercase', margin: 0, fontFamily: 'var(--font-main)' }}>
                      {profile?.name || 'TOP MEDICAL PHARMACY'}
                    </h2>
                    <p style={{ fontSize: '12px', color: '#475569', margin: '4px 0' }}>{profile?.tagline}</p>
                    <p style={{ fontSize: '11.5px', color: '#334155', margin: '2px 0', maxWidth: '380px' }}>{profile?.address}</p>
                  <p style={{ fontSize: '11.5px', color: '#334155', margin: '2px 0' }}>
                    <strong>Phone:</strong> {profile?.phone} | <strong>Email:</strong> {profile?.email}
                  </p>
                    <div style={{ fontSize: '11px', marginTop: '6px', display: 'flex', gap: '12px', color: '#0f172a', fontWeight: 600 }}>
                      <span>DL 20B: {profile?.dl_number_20b}</span>
                      <span>DL 21B: {profile?.dl_number_21b}</span>
                      <span>GSTIN: {profile?.gstin}</span>
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    display: 'inline-block',
                    background: '#e0f2fe',
                    color: '#0369a1',
                    padding: '4px 12px',
                    borderRadius: '4px',
                    fontWeight: 800,
                    fontSize: '13px',
                    marginBottom: '8px'
                  }}>
                    RETAIL TAX INVOICE
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 700 }}>Invoice #: {invoice.invoice_number}</div>
                  <div style={{ fontSize: '11.5px', color: '#475569' }}>
                    Date: {new Date(invoice.created_at).toLocaleString()}
                  </div>
                  <div style={{ fontSize: '11px', color: '#475569', marginTop: '4px' }}>
                    Payment: <strong>{invoice.payment_method}</strong> ({invoice.payment_status})
                  </div>
                  <div style={{ fontSize: '11px', color: '#0369a1', marginTop: '3px', fontWeight: 600 }}>
                    Billed By: [{invoice.staff_code || 'SC-101'}] {invoice.staff_name || 'Staff 1'}
                  </div>
                </div>
              </div>

              {/* Customer & Prescribing Doctor details */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px',
                background: '#f8fafc',
                padding: '12px',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                marginBottom: '16px'
              }}>
                <div>
                  <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Billed To (Patient / Customer):</div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>{invoice.customer_name}</div>
                  {invoice.customer_phone && <div style={{ fontSize: '11.5px', color: '#475569' }}>Phone: {invoice.customer_phone}</div>}
                  {invoice.customer_address && <div style={{ fontSize: '11.5px', color: '#475569' }}>Address: {invoice.customer_address}</div>}
                </div>

                <div>
                  <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Prescribed By:</div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                    {invoice.doctor_name || 'Self / OTC'}
                  </div>
                  {invoice.doctor_details?.registration_number && (
                    <div style={{ fontSize: '11.5px', color: '#475569' }}>Reg No: {invoice.doctor_details.registration_number}</div>
                  )}
                  {invoice.prescription_number && (
                    <div style={{ fontSize: '11.5px', color: '#475569' }}>Rx #: {invoice.prescription_number}</div>
                  )}
                </div>
              </div>

              {/* Line Items Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', marginBottom: '16px' }}>
                <thead>
                  <tr style={{ background: '#0284c7', color: '#ffffff', textAlign: 'left' }}>
                    <th style={{ padding: '8px' }}>#</th>
                    <th style={{ padding: '8px' }}>Item Description</th>
                    <th style={{ padding: '8px' }}>HSN</th>
                    <th style={{ padding: '8px' }}>Batch</th>
                    <th style={{ padding: '8px' }}>Expiry</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>Qty</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>MRP</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Rate</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>GST%</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items?.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                      <td style={{ padding: '8px' }}>{idx + 1}</td>
                      <td style={{ padding: '8px', fontWeight: 600 }}>
                        {item.medicine_name}
                        {item.is_loose && <span style={{ fontSize: '10px', color: '#0284c7', marginLeft: '4px' }}>(Loose)</span>}
                      </td>
                      <td style={{ padding: '8px', color: '#64748b' }}>{item.hsn_code}</td>
                      <td style={{ padding: '8px', fontWeight: 600 }}>{item.batch_number}</td>
                      <td style={{ padding: '8px' }}>
                        {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString('en-GB', { month: '2-digit', year: 'numeric' }) : '-'}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center', fontWeight: 700 }}>{item.quantity}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>{currency}{parseFloat(item.unit_mrp).toFixed(2)}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>{currency}{parseFloat(item.unit_selling_price).toFixed(2)}</td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>{item.gst_rate}%</td>
                      <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700 }}>{currency}{parseFloat(item.total_amount).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Tax Breakup & Grand Totals */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div style={{ padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '11px', background: '#f8fafc' }}>
                  <div style={{ fontWeight: 700, marginBottom: '6px', color: '#334155' }}>GST Tax Breakdown:</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                    <span>CGST (Central Tax):</span>
                    <span>{currency}{parseFloat(invoice.cgst_amount || 0).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                    <span>SGST (State Tax):</span>
                    <span>{currency}{parseFloat(invoice.sgst_amount || 0).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, borderTop: '1px solid #cbd5e1', paddingTop: '4px', marginTop: '4px' }}>
                    <span>Total Tax Liability:</span>
                    <span>{currency}{parseFloat(invoice.tax_amount).toFixed(2)}</span>
                  </div>
                </div>

                <div style={{ fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                    <span>Gross Subtotal:</span>
                    <span style={{ fontWeight: 600 }}>{currency}{parseFloat(invoice.subtotal).toFixed(2)}</span>
                  </div>
                  {parseFloat(invoice.discount_amount) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', color: '#dc2626' }}>
                      <span>Discount ({invoice.discount_type === 'PERCENT' ? `${invoice.discount_value}%` : 'Flat'}):</span>
                      <span>-{currency}{parseFloat(invoice.discount_amount).toFixed(2)}</span>
                    </div>
                  )}
                  {parseFloat(invoice.round_off) !== 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', color: '#64748b' }}>
                      <span>Round Off:</span>
                      <span>{invoice.round_off}</span>
                    </div>
                  )}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 0',
                    borderTop: '2px solid #0f172a',
                    borderBottom: '2px solid #0f172a',
                    marginTop: '6px',
                    fontSize: '16px',
                    fontWeight: 800,
                    color: '#0369a1'
                  }}>
                    <span>Grand Total:</span>
                    <span>{currency}{parseFloat(invoice.grand_total).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '11.5px' }}>
                    <span>Amount Paid ({invoice.payment_method}):</span>
                    <span style={{ fontWeight: 700 }}>{currency}{parseFloat(invoice.amount_paid).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Terms & Signatures */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                borderTop: '1px solid #e2e8f0',
                paddingTop: '16px',
                marginTop: '12px'
              }}>
                <div style={{ fontSize: '10px', color: '#64748b', maxWidth: '420px', lineHeight: 1.4 }}>
                  <strong>Terms & Conditions:</strong>
                  <p style={{ margin: '2px 0' }}>{profile?.invoice_footer_note}</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ height: '40px' }}></div>
                  <div style={{ borderTop: '1px dashed #334155', width: '160px', paddingTop: '4px', fontSize: '11px', fontWeight: 600 }}>
                    Authorized Signatory
                  </div>
                  <div style={{ fontSize: '9.5px', color: '#64748b' }}>For {profile?.name}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
