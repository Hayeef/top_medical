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
  Building2,
  Maximize2
} from 'lucide-react';
import PharmacyLogo from './PharmacyLogo';

export default function ReceiptModal({ invoice, profile, onClose }) {
  const [printFormat, setPrintFormat] = useState('thermal-80'); // 'thermal-80', 'thermal-58', 'a4'

  if (!invoice) return null;

  const currency = profile?.currency_symbol || '₹';
  const isThermal = printFormat.startsWith('thermal');
  const is58mm = printFormat === 'thermal-58';

  const pharmacyName = profile?.name || 'TOP MEDICAL PHARMACY';
  const pharmacyAddress = profile?.address || '3-79/4, R.B.COMPLEX, GROUND FLOOR, UNIVERSITY ROAD, DERALAKATTE, ULLAL TALUK, DERALAKATTE, MANGALORE 575018';
  const pharmacyPhone = profile?.phone || '9148240793';
  const pharmacyGstin = profile?.gstin || '29AJPPU6288G1Z7';
  const pharmacyDl = profile?.dl_number_20b || 'KA-MN1-300667';
  const invoiceFooter = profile?.invoice_footer_note || 'Thank you for choosing Top Medical Pharmacy! Wishing you good health!';

  // Format bill date and time
  const billDate = new Date(invoice.created_at || new Date());
  const formattedDate = billDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const formattedTime = billDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  // Direct Isolated Iframe Print Engine (Eliminates ALL top whitespace & browser margins)
  const handlePrint = () => {
    const printElement = document.getElementById('printable-receipt-section');
    if (!printElement) {
      window.print();
      return;
    }

    // Create or reuse hidden isolated print iframe
    let iframe = document.getElementById('receipt-hidden-print-frame');
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'receipt-hidden-print-frame';
      iframe.style.position = 'fixed';
      iframe.style.top = '-9999px';
      iframe.style.left = '-9999px';
      iframe.style.width = '0px';
      iframe.style.height = '0px';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);
    }

    const rollWidth = is58mm ? '58mm' : '80mm';
    const contentWidth = is58mm ? '54mm' : '74mm';
    const pageStyle = printFormat === 'a4' 
      ? `@page { size: A4 portrait; margin: 8mm !important; } body { width: 100%; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }`
      : `@page { size: ${rollWidth} auto; margin: 0mm !important; } body { width: ${rollWidth}; font-family: 'Courier New', Courier, monospace, monospace; }`;

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Bill_${invoice.invoice_number}</title>
          <style>
            ${pageStyle}
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              color: #000000 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .thermal-print-wrapper {
              width: ${contentWidth} !important;
              max-width: 100% !important;
              margin: 0 auto !important;
              padding: 0 1mm 2mm 1mm !important;
              color: #000000 !important;
              font-family: 'Courier New', Courier, monospace !important;
              line-height: 1.35;
            }
            .thermal-print-wrapper * {
              color: #000000 !important;
              border-color: #000000 !important;
              box-shadow: none !important;
            }
            .a4-print-wrapper {
              width: 100% !important;
              padding: 0 !important;
              color: #0f172a !important;
            }
            table {
              width: 100% !important;
              border-collapse: collapse !important;
            }
            img, svg {
              display: block;
              margin: 0 auto;
            }
          </style>
        </head>
        <body>
          ${printElement.outerHTML}
        </body>
      </html>
    `);
    doc.close();

    // Trigger print from the isolated iframe directly
    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }, 150);
  };

  return (
    <div className="modal-backdrop" style={{ zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px' }}>
      
      {/* Scoped Dynamic Print Stylesheet as direct fallback */}
      <style>{`
        @media print {
          @page {
            size: ${printFormat === 'a4' ? 'A4 portrait' : (is58mm ? '58mm auto' : '80mm auto')};
            margin: 0mm !important;
          }
          html, body {
            width: ${printFormat === 'a4' ? '100%' : (is58mm ? '58mm' : '80mm')} !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
          .no-print,
          nav,
          header,
          aside,
          main,
          .sidebar,
          .mobile-bottom-nav,
          .main-page-wrapper,
          .pos-billing-grid,
          .btn,
          button {
            display: none !important;
            height: 0 !important;
            max-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
          }
          .modal-backdrop {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            display: block !important;
            width: 100% !important;
            max-width: ${printFormat === 'a4' ? '100%' : (is58mm ? '58mm' : '80mm')} !important;
            margin: 0 auto !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: #ffffff !important;
            z-index: 999999 !important;
          }
          .modal-content {
            position: static !important;
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: #ffffff !important;
          }
          .thermal-print-wrapper {
            width: ${is58mm ? '54mm' : '76mm'} !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            padding: 0 1mm 2mm 1mm !important;
            color: #000000 !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
          }
          .thermal-print-wrapper * {
            color: #000000 !important;
            border-color: #000000 !important;
            box-shadow: none !important;
          }
          .a4-print-wrapper {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 6mm !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      <div 
        className="modal-content glass-panel" 
        style={{ 
          maxWidth: printFormat === 'a4' ? '820px' : (is58mm ? '360px' : '440px'),
          width: '100%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#ffffff',
          overflow: 'hidden',
          borderRadius: '16px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
        }}
      >
        {/* Modal Controls Bar (Hidden on Print) */}
        <div className="no-print" style={{
          padding: '12px 16px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#f8fafc',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Receipt size={16} color="#0284c7" />
            </div>
            <span style={{ fontWeight: 800, fontSize: '13.5px', color: '#0f172a' }}>
              Bill #{invoice.invoice_number}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {/* Format Switcher */}
            <div style={{ display: 'flex', background: '#e2e8f0', borderRadius: '8px', padding: '2px' }}>
              <button
                type="button"
                onClick={() => setPrintFormat('thermal-80')}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: 'none',
                  background: printFormat === 'thermal-80' ? '#0284c7' : 'transparent',
                  color: printFormat === 'thermal-80' ? '#ffffff' : '#334155',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                80mm Roll (POS)
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat('thermal-58')}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: 'none',
                  background: printFormat === 'thermal-58' ? '#0284c7' : 'transparent',
                  color: printFormat === 'thermal-58' ? '#ffffff' : '#334155',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                58mm Mini
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat('a4')}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: 'none',
                  background: printFormat === 'a4' ? '#0284c7' : 'transparent',
                  color: printFormat === 'a4' ? '#ffffff' : '#334155',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                A4 Tax Sheet
              </button>
            </div>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 12px', fontWeight: 800 }}
              title="Print receipt directly"
            >
              <Printer size={14} />
              <span>Print Slip</span>
            </button>

            <button
              onClick={onClose}
              className="btn btn-secondary btn-sm"
              style={{ padding: '6px', borderRadius: '6px' }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Scrollable Receipt Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: isThermal ? '16px 14px' : '24px', background: '#ffffff' }}>
          
          {isThermal ? (
            /* ============================================================== */
            /* 1. HIGH-LEGIBILITY COMPACT THERMAL RECEIPT (80mm / 58mm)       */
            /* ============================================================== */
            <div 
              id="printable-receipt-section"
              className="thermal-print-wrapper"
              style={{ 
                width: is58mm ? '100%' : '100%', 
                maxWidth: is58mm ? '300px' : '360px',
                margin: '0 auto',
                color: '#000000',
                fontFamily: "'Courier New', Courier, monospace, 'JetBrains Mono', monospace",
                lineHeight: 1.35
              }}
            >
              {/* Pharmacy Brand Header */}
              <div style={{ textAlign: 'center', borderBottom: '2px dashed #000000', paddingBottom: '8px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '4px' }}>
                  <PharmacyLogo size={is58mm ? 32 : 40} />
                </div>
                <div style={{ fontSize: is58mm ? '15px' : '17px', fontWeight: 900, textTransform: 'uppercase', color: '#000000', letterSpacing: '-0.2px' }}>
                  {pharmacyName}
                </div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#000000', margin: '2px 0' }}>
                  {pharmacyAddress}
                </div>
                <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#000000', marginTop: '2px' }}>
                  Tel: {pharmacyPhone}
                </div>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#000000', marginTop: '2px' }}>
                  DL: {pharmacyDl} | GST: {pharmacyGstin}
                </div>
              </div>

              {/* Bill Details */}
              <div style={{ fontSize: '12px', fontWeight: 700, borderBottom: '1px dashed #000000', paddingBottom: '6px', marginBottom: '6px', color: '#000000' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>BILL: <strong>{invoice.invoice_number}</strong></span>
                  <span>{formattedDate}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                  <span>CUST: <strong>{invoice.customer_name || 'Walk-in'}</strong></span>
                  <span>{formattedTime}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                  <span>STAFF: [{invoice.staff_code || 'SC-101'}] {invoice.staff_name || 'Staff 1'}</span>
                  {invoice.customer_phone && <span>Ph: {invoice.customer_phone}</span>}
                </div>
                {invoice.doctor_name && (
                  <div style={{ marginTop: '2px' }}>
                    DOC: {invoice.doctor_name} {invoice.prescription_number ? `(Rx: ${invoice.prescription_number})` : ''}
                  </div>
                )}
              </div>

              {/* Dispensed Items Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', color: '#000000', marginBottom: '8px' }}>
                <thead>
                  <tr style={{ borderBottom: '1.5px solid #000000', textAlign: 'left', fontWeight: 900 }}>
                    <th style={{ padding: '4px 0', width: '50%' }}>ITEM / BATCH</th>
                    <th style={{ padding: '4px 0', textAlign: 'center', width: '18%' }}>EXP</th>
                    <th style={{ padding: '4px 0', textAlign: 'center', width: '14%' }}>QTY</th>
                    <th style={{ padding: '4px 0', textAlign: 'right', width: '18%' }}>AMT</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items?.map((item, idx) => {
                    const expFormatted = item.expiry_date ? new Date(item.expiry_date).toLocaleDateString('en-GB', { month: '2-digit', year: '2-digit' }) : '-';
                    return (
                      <tr key={idx} style={{ borderBottom: '1px dotted #000000' }}>
                        <td style={{ padding: '4px 0' }}>
                          <div style={{ fontWeight: 800, fontSize: '13px', color: '#000000' }}>
                            {item.medicine_name}
                          </div>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: '#000000' }}>
                            B:{item.batch_number} {item.is_loose ? `(Loose ${item.quantity}u)` : `(${item.pack_size || 10}s/pk)`}
                          </div>
                        </td>
                        <td style={{ padding: '4px 0', textAlign: 'center', fontSize: '11.5px', fontWeight: 700 }}>
                          {expFormatted}
                        </td>
                        <td style={{ padding: '4px 0', textAlign: 'center', fontSize: '13px', fontWeight: 900 }}>
                          {item.quantity}{item.is_loose ? 'u' : 'p'}
                        </td>
                        <td style={{ padding: '4px 0', textAlign: 'right', fontSize: '13px', fontWeight: 800 }}>
                          {parseFloat(item.total_amount).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Totals & Net Amount */}
              <div style={{ borderTop: '1.5px solid #000000', paddingTop: '6px', fontSize: '12px', fontWeight: 700, display: 'flex', flexDirection: 'column', gap: '2px', color: '#000000' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Gross Subtotal:</span>
                  <span style={{ fontWeight: 800 }}>{currency}{parseFloat(invoice.subtotal).toFixed(2)}</span>
                </div>

                {parseFloat(invoice.discount_amount) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                    <span>Discount ({invoice.discount_type === 'PERCENT' ? `${invoice.discount_value}%` : 'Flat'}):</span>
                    <span>-{currency}{parseFloat(invoice.discount_amount).toFixed(2)}</span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px' }}>
                  <span>GST Included in MRP:</span>
                  <span>{currency}{parseFloat(invoice.tax_amount || 0).toFixed(2)}</span>
                </div>

                {parseFloat(invoice.round_off) !== 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                    <span>Round Off:</span>
                    <span>{parseFloat(invoice.round_off) > 0 ? `+${invoice.round_off}` : invoice.round_off}</span>
                  </div>
                )}

                {/* Heavy High-Contrast Net Total Box */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: is58mm ? '16px' : '18px',
                  fontWeight: 900,
                  borderTop: '2px solid #000000',
                  borderBottom: '2px solid #000000',
                  padding: '6px 0',
                  margin: '4px 0',
                  color: '#000000'
                }}>
                  <span>NET TOTAL:</span>
                  <span>{currency}{parseFloat(invoice.grand_total).toFixed(2)}</span>
                </div>

                {/* Payment Breakdown */}
                {invoice.payment_method === 'MIXED' ? (
                  <div style={{ fontSize: '11.5px', borderBottom: '1px dashed #000000', paddingBottom: '4px', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                      <span>Split Payment Paid:</span>
                      <span>{currency}{parseFloat(invoice.amount_paid).toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '8px' }}>
                      <span>• Cash Tendered:</span>
                      <span>{currency}{parseFloat(invoice.cash_amount || 0).toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '8px' }}>
                      <span>• UPI / GPay:</span>
                      <span>{currency}{parseFloat(invoice.upi_amount || 0).toFixed(2)}</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 800 }}>
                    <span>PAID VIA {invoice.payment_method === 'UPI' ? 'UPI / GPAY' : invoice.payment_method}:</span>
                    <span>{currency}{parseFloat(invoice.amount_paid).toFixed(2)}</span>
                  </div>
                )}

                {parseFloat(invoice.change_due) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 800 }}>
                    <span>Change Returned:</span>
                    <span>{currency}{parseFloat(invoice.change_due).toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Compact Thermal Footer */}
              <div style={{ textAlign: 'center', marginTop: '10px', paddingTop: '6px', borderTop: '1px dashed #000000', fontSize: '11px', fontWeight: 700, color: '#000000' }}>
                <div style={{ margin: '2px 0' }}>{invoiceFooter}</div>
                <div style={{ margin: '3px 0 0', fontWeight: 900 }}>*** WISH YOU A SPEEDY RECOVERY ***</div>
              </div>
            </div>
          ) : (
            /* ============================================================== */
            /* 2. FULL A4 STANDARD TAX INVOICE FORMAT                         */
            /* ============================================================== */
            <div id="printable-receipt-section" className="a4-print-wrapper" style={{ width: '100%', fontSize: '12px', color: '#0f172a' }}>
              {/* Header Box */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                borderBottom: '2px solid #0284c7',
                paddingBottom: '14px',
                marginBottom: '14px'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ padding: '4px', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
                    <PharmacyLogo size={42} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '19px', fontWeight: 900, color: '#0369a1', textTransform: 'uppercase', margin: 0 }}>
                      {pharmacyName}
                    </h2>
                    <p style={{ fontSize: '11.5px', color: '#475569', margin: '2px 0', maxWidth: '420px' }}>
                      {pharmacyAddress}
                    </p>
                    <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#0f172a', marginTop: '3px', display: 'flex', gap: '14px' }}>
                      <span>DL: <strong>{pharmacyDl}</strong></span>
                      <span>GSTIN: <strong>{pharmacyGstin}</strong></span>
                      <span>Phone: <strong>{pharmacyPhone}</strong></span>
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    display: 'inline-block',
                    background: '#0284c7',
                    color: '#ffffff',
                    padding: '3px 10px',
                    borderRadius: '4px',
                    fontWeight: 800,
                    fontSize: '12px',
                    marginBottom: '6px'
                  }}>
                    RETAIL TAX INVOICE
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 800 }}>Invoice #: {invoice.invoice_number}</div>
                  <div style={{ fontSize: '11.5px', color: '#475569' }}>
                    Date: {formattedDate} {formattedTime}
                  </div>
                  <div style={{ fontSize: '11px', color: '#0284c7', fontWeight: 700, marginTop: '2px' }}>
                    Billed By: [{invoice.staff_code || 'SC-101'}] {invoice.staff_name || 'Staff 1'}
                  </div>
                </div>
              </div>

              {/* Patient & Doctor Box */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '14px',
                background: '#f8fafc',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                marginBottom: '14px'
              }}>
                <div>
                  <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Billed To Patient:</div>
                  <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>{invoice.customer_name || 'Walk-in Customer'}</div>
                  {invoice.customer_phone && <div style={{ fontSize: '11.5px', color: '#475569' }}>Phone: {invoice.customer_phone}</div>}
                </div>

                <div>
                  <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Prescribed By:</div>
                  <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>{invoice.doctor_name || 'Self / OTC'}</div>
                  {invoice.prescription_number && <div style={{ fontSize: '11.5px', color: '#475569' }}>Rx #: {invoice.prescription_number}</div>}
                </div>
              </div>

              {/* Line Items Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', marginBottom: '14px' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderTop: '1px solid #cbd5e1', borderBottom: '2px solid #0f172a', textAlign: 'left' }}>
                    <th style={{ padding: '6px 8px', width: '30px' }}>#</th>
                    <th style={{ padding: '6px 10px' }}>Item Description & Composition</th>
                    <th style={{ padding: '6px 8px' }}>HSN</th>
                    <th style={{ padding: '6px 8px' }}>Batch</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center' }}>Expiry</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center' }}>Qty</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>MRP</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items?.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', background: idx % 2 === 0 ? '#ffffff' : '#fcfdfe' }}>
                      <td style={{ padding: '6px 8px' }}>{idx + 1}</td>
                      <td style={{ padding: '6px 10px' }}>
                        <div style={{ fontWeight: 800, color: '#0f172a' }}>{item.medicine_name}</div>
                        {item.is_loose && <span style={{ fontSize: '10px', color: '#0284c7' }}>(Loose units)</span>}
                      </td>
                      <td style={{ padding: '6px 8px', color: '#64748b' }}>{item.hsn_code || '3004'}</td>
                      <td style={{ padding: '6px 8px', fontWeight: 700 }} className="mono">{item.batch_number}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                        {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString('en-GB', { month: '2-digit', year: 'numeric' }) : '-'}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 800 }}>{item.quantity}{item.is_loose ? 'u' : 'p'}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right' }}>{currency}{parseFloat(item.unit_mrp).toFixed(2)}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 800 }}>{currency}{parseFloat(item.total_amount).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px', marginBottom: '14px' }}>
                <div style={{ padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '11px', background: '#f8fafc' }}>
                  <div style={{ fontWeight: 800, marginBottom: '4px', color: '#0f172a' }}>GST Tax Included in MRP:</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                    <span>CGST (Central Tax):</span>
                    <span>{currency}{parseFloat(invoice.cgst_amount || 0).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                    <span>SGST (State Tax):</span>
                    <span>{currency}{parseFloat(invoice.sgst_amount || 0).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, borderTop: '1px solid #cbd5e1', paddingTop: '4px', marginTop: '4px' }}>
                    <span>Total Tax Extracted:</span>
                    <span>{currency}{parseFloat(invoice.tax_amount || 0).toFixed(2)}</span>
                  </div>
                </div>

                <div style={{ fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                    <span>Items Gross Total:</span>
                    <span style={{ fontWeight: 700 }}>{currency}{parseFloat(invoice.subtotal).toFixed(2)}</span>
                  </div>
                  {parseFloat(invoice.discount_amount) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', color: '#dc2626', fontWeight: 700 }}>
                      <span>Discount ({invoice.discount_type === 'PERCENT' ? `${invoice.discount_value}%` : 'Flat'}):</span>
                      <span>-{currency}{parseFloat(invoice.discount_amount).toFixed(2)}</span>
                    </div>
                  )}
                  {parseFloat(invoice.round_off) !== 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', color: '#64748b' }}>
                      <span>Round Off:</span>
                      <span>{invoice.round_off}</span>
                    </div>
                  )}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '6px 0',
                    borderTop: '2px solid #0f172a',
                    borderBottom: '2px solid #0f172a',
                    marginTop: '4px',
                    fontSize: '16px',
                    fontWeight: 900,
                    color: '#0369a1'
                  }}>
                    <span>GRAND TOTAL:</span>
                    <span>{currency}{parseFloat(invoice.grand_total).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '11.5px', fontWeight: 700 }}>
                    <span>Paid via {invoice.payment_method === 'UPI' ? 'UPI / GPay' : invoice.payment_method}:</span>
                    <span>{currency}{parseFloat(invoice.amount_paid).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Terms & Footer */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                borderTop: '1px solid #e2e8f0',
                paddingTop: '10px'
              }}>
                <div style={{ fontSize: '10.5px', color: '#64748b', maxWidth: '420px', lineHeight: 1.3 }}>
                  <strong>Terms:</strong> {invoiceFooter}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ borderTop: '1px dashed #0f172a', width: '150px', paddingTop: '2px', fontSize: '11px', fontWeight: 800 }}>
                    Authorized Pharmacist
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
