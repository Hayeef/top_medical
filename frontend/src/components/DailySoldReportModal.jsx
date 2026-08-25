import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Printer, 
  Download, 
  Calendar, 
  Search, 
  Filter, 
  RefreshCw, 
  X, 
  Package, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  Building2, 
  Layers,
  MapPin,
  ClipboardList
} from 'lucide-react';
import PharmacyLogo from './PharmacyLogo';
import { analyticsAPI } from '../api';

export default function DailySoldReportModal({ 
  isOpen, 
  onClose, 
  profile,
  suppliers = [],
  categories = []
}) {
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [datePreset, setDatePreset] = useState('today'); // 'today', 'yesterday', 'custom'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [stockFilter, setStockFilter] = useState('ALL'); // 'ALL', 'LOW_STOCK', 'OUT_OF_STOCK'
  
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState(null);
  
  const printRef = useRef(null);

  // Fetch report data when filters or date changes
  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedDate) params.append('date', selectedDate);
      if (searchTerm) params.append('search', searchTerm);
      if (selectedSupplier) params.append('supplier_id', selectedSupplier);
      if (selectedCategory) params.append('category_id', selectedCategory);

      const res = await analyticsAPI.getDailySoldReport(params.toString());
      setReportData(res);
    } catch (err) {
      console.error('Failed to load daily sold report:', err);
      setError(err.message || 'Failed to load report data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchReport();
    }
  }, [isOpen, selectedDate, selectedSupplier, selectedCategory]);

  if (!isOpen) return null;

  // Handle Preset Date changes
  const handlePresetChange = (preset) => {
    setDatePreset(preset);
    const d = new Date();
    if (preset === 'today') {
      setSelectedDate(d.toISOString().split('T')[0]);
    } else if (preset === 'yesterday') {
      d.setDate(d.getDate() - 1);
      setSelectedDate(d.toISOString().split('T')[0]);
    }
  };

  // Filter items based on local search & stock status filter
  const items = (reportData?.items || []).filter(item => {
    if (stockFilter === 'LOW_STOCK' && item.stock_status !== 'LOW_STOCK' && item.stock_status !== 'OUT_OF_STOCK') {
      return false;
    }
    if (stockFilter === 'OUT_OF_STOCK' && item.stock_status !== 'OUT_OF_STOCK') {
      return false;
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const mName = (item.name || '').toLowerCase();
      const gName = (item.generic_name || '').toLowerCase();
      const mfg = (item.manufacturer || '').toLowerCase();
      const supp = (item.primary_supplier || '').toLowerCase();
      return mName.includes(term) || gName.includes(term) || mfg.includes(term) || supp.includes(term);
    }
    return true;
  });

  // Export to CSV for Excel / WhatsApp Reorder Sheet
  const handleExportCSV = () => {
    if (!items.length) {
      alert('No medicines found in report to export.');
      return;
    }

    const headers = [
      'Sl No',
      'Medicine Name',
      'Generic / Composition',
      'Dosage Form',
      'Strength',
      'Packs Sold',
      'Loose Units Sold',
      'Current Balance Stock (Packs)',
      'Suggested Reorder Qty (Packs)',
      'Stock Status',
      'Manufacturer / Company',
      'Primary Supplier',
      'Rack Location',
      'Unit MRP (Rs)',
      'Total Dispensed Amount (Rs)'
    ];

    const rows = items.map((item, idx) => [
      idx + 1,
      `"${item.name.replace(/"/g, '""')}"`,
      `"${item.generic_name.replace(/"/g, '""')}"`,
      `"${item.dosage_form}"`,
      `"${item.strength || '-'}"`,
      item.packs_sold,
      item.loose_sold,
      item.current_stock_packs,
      item.suggested_reorder_packs,
      item.stock_status,
      `"${item.manufacturer || '-'}"`,
      `"${item.primary_supplier || '-'}"`,
      `"${item.rack_location || '-'}"`,
      item.unit_mrp,
      item.total_sales_amount
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [
      `Top Medical Pharmacy - Daily Sold Medicines & Supplier Reorder Report (${reportData?.formatted_date || selectedDate})`,
      `Generated On: ${new Date().toLocaleString()}`,
      `DL No: ${profile?.dl_number_20b || 'KA-MN1-300667'} | GSTIN: ${profile?.gstin || '29AJPPU6288G1Z7'} | Phone: ${profile?.phone || '9148240793'}`,
      '',
      headers.join(','),
      ...rows.map(e => e.join(','))
    ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `TopMedical_Daily_Reorder_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Trigger Native Print / PDF Save
  const handlePrintPDF = () => {
    window.print();
  };

  const pharmacyName = profile?.name || 'TOP MEDICAL PHARMACY';
  const pharmacyAddress = profile?.address || '3-79/4, R.B.COMPLEX, GROUND FLOOR, UNIVERSITY ROAD, DERALAKATTE, ULLAL TALUK, DERALAKATTE, MANGALORE 575018';
  const pharmacyPhone = profile?.phone || '9148240793';
  const pharmacyGstin = profile?.gstin || '29AJPPU6288G1Z7';
  const pharmacyDl = profile?.dl_number_20b || 'KA-MN1-300667';

  return (
    <div className="modal-backdrop" style={{ zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div 
        className="modal-content glass-panel" 
        style={{ 
          maxWidth: '1200px', 
          width: '100%', 
          maxHeight: '92vh', 
          display: 'flex', 
          flexDirection: 'column',
          background: '#ffffff',
          overflow: 'hidden'
        }}
      >
        {/* Modal Header Controls (Hidden during print) */}
        <div className="no-print" style={{
          padding: '16px 20px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#f8fafc',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: '#e0f2fe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0284c7'
            }}>
              <ClipboardList size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Daily Sold Medicines & Supplier Reorder Report
              </h3>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                Detailed list of tablets sold today to review and reorder from suppliers
              </p>
            </div>
          </div>

          {/* Top Actions: Print / PDF & CSV & Close */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button 
              onClick={handleExportCSV} 
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              title="Export as CSV for Excel / WhatsApp Reorder Sheet"
            >
              <Download size={15} /> Export CSV / Excel
            </button>
            <button 
              onClick={handlePrintPDF} 
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              title="Print or Save as Official PDF Report"
            >
              <Printer size={15} /> Print / Save PDF
            </button>
            <button 
              onClick={onClose} 
              className="btn btn-secondary btn-sm"
              style={{ padding: '6px', borderRadius: '8px', color: '#64748b' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Filter & Date Selection Bar (Hidden during print) */}
        <div className="no-print" style={{
          padding: '14px 20px',
          borderBottom: '1px solid #e2e8f0',
          background: '#ffffff',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {/* Left: Date Presets & Date Picker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
              <button
                type="button"
                onClick={() => handlePresetChange('today')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: datePreset === 'today' ? 800 : 500,
                  background: datePreset === 'today' ? '#ffffff' : 'transparent',
                  color: datePreset === 'today' ? '#0284c7' : '#64748b',
                  boxShadow: datePreset === 'today' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  cursor: 'pointer'
                }}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => handlePresetChange('yesterday')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: datePreset === 'yesterday' ? 800 : 500,
                  background: datePreset === 'yesterday' ? '#ffffff' : 'transparent',
                  color: datePreset === 'yesterday' ? '#0284c7' : '#64748b',
                  boxShadow: datePreset === 'yesterday' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  cursor: 'pointer'
                }}
              >
                Yesterday
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={15} color="#0284c7" />
              <input
                type="date"
                className="input-field"
                style={{ height: '32px', fontSize: '12px', padding: '4px 8px', width: '140px' }}
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setDatePreset('custom');
                }}
              />
            </div>

            {/* Quick stock status filter pills */}
            <div style={{ display: 'flex', gap: '4px', marginLeft: '10px' }}>
              <button
                type="button"
                onClick={() => setStockFilter('ALL')}
                className={`btn btn-sm ${stockFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '3px 8px', fontSize: '11px' }}
              >
                All Sold ({reportData?.total_distinct_medicines || 0})
              </button>
              <button
                type="button"
                onClick={() => setStockFilter('LOW_STOCK')}
                className={`btn btn-sm ${stockFilter === 'LOW_STOCK' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '3px 8px', fontSize: '11px', color: stockFilter === 'LOW_STOCK' ? '#ffffff' : '#d97706' }}
              >
                ⚠️ Needs Reorder ({reportData?.low_stock_reorder_count || 0})
              </button>
            </div>
          </div>

          {/* Right: Search & Supplier Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: '220px' }}>
              <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '9px' }} />
              <input
                type="text"
                className="input-field"
                style={{ height: '32px', paddingLeft: '30px', fontSize: '12px' }}
                placeholder="Search tablet / salt..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  style={{ position: 'absolute', right: '6px', top: '7px', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {suppliers?.length > 0 && (
              <select
                className="input-field"
                style={{ height: '32px', fontSize: '12px', padding: '4px 8px', width: '160px' }}
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
              >
                <option value="">All Suppliers</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}

            <button
              onClick={fetchReport}
              className="btn btn-secondary btn-sm"
              style={{ padding: '6px', borderRadius: '6px' }}
              title="Refresh Report Data"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Report Content Body: Scrollable Screen View & Printable A4 PDF */}
        <div 
          ref={printRef}
          className="print-container"
          style={{ 
            flex: 1, 
            overflowY: 'auto', 
            padding: '24px 28px',
            background: '#ffffff',
            color: '#0f172a'
          }}
        >
          {/* Printable Official Pharmacy Letterhead */}
          <div style={{ 
            borderBottom: '2px solid #0f172a', 
            paddingBottom: '14px', 
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                background: '#ffffff',
                flexShrink: 0
              }}>
                <PharmacyLogo size={46} />
              </div>
              <div>
                <h1 style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a', margin: 0, textTransform: 'uppercase', letterSpacing: '-0.3px' }}>
                  {pharmacyName}
                </h1>
                <p style={{ fontSize: '11px', color: '#475569', margin: '2px 0 0 0', maxWidth: '520px', lineHeight: 1.3 }}>
                  {pharmacyAddress}
                </p>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#0f172a', marginTop: '4px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <span>DL No: <strong>{pharmacyDl}</strong></span>
                  <span>GSTIN: <strong>{pharmacyGstin}</strong></span>
                  <span>Contact: <strong>{pharmacyPhone}</strong></span>
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ 
                display: 'inline-block', 
                background: '#0284c7', 
                color: '#ffffff', 
                padding: '4px 10px', 
                borderRadius: '6px', 
                fontWeight: 800, 
                fontSize: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                DAILY DISPENSED REPORT
              </div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                {reportData?.formatted_date || selectedDate}
              </div>
              <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '2px' }}>
                Printed: {new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
              </div>
            </div>
          </div>

          {/* KPI Summary Statistics Strip */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
            marginBottom: '18px',
          }}>
            <div style={{ padding: '10px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Distinct Medicines Sold</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#0284c7', marginTop: '2px' }}>
                {reportData?.total_distinct_medicines || 0}
              </div>
            </div>

            <div style={{ padding: '10px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Quantity Sold</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>
                {reportData?.total_packs_sold || 0} pk {reportData?.total_loose_sold > 0 ? `+ ${reportData?.total_loose_sold} un` : ''}
              </div>
            </div>

            <div style={{ padding: '10px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Urgent Reorders Needed</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: (reportData?.low_stock_reorder_count || 0) > 0 ? '#e11d48' : '#059669', marginTop: '2px' }}>
                {reportData?.low_stock_reorder_count || 0} items
              </div>
            </div>

            <div style={{ padding: '10px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Sales Value</div>
              <div className="mono" style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                Rs. {(reportData?.total_sales_value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Loading or Error State */}
          {loading && (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px' }} />
              <div>Generating daily sold medicines report...</div>
            </div>
          )}

          {error && (
            <div style={{ padding: '16px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#b91c1c', marginBottom: '16px' }}>
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* Medicines Reorder Table */}
          {!loading && !error && (
            <>
              {items.length === 0 ? (
                <div style={{ padding: '50px 20px', textAlign: 'center', color: '#94a3b8', border: '1px dashed #cbd5e1', borderRadius: '8px' }}>
                  <Package size={40} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                  <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#475569' }}>No Medicines Dispensed</h4>
                  <p style={{ fontSize: '12px', marginTop: '4px', color: '#64748b' }}>
                    No medicine sales were recorded for {reportData?.formatted_date || selectedDate}.
                  </p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9', borderTop: '1px solid #cbd5e1', borderBottom: '2px solid #0f172a', textAlign: 'left' }}>
                        <th style={{ padding: '8px 6px', width: '30px', textAlign: 'center' }}>#</th>
                        <th style={{ padding: '8px 10px', width: '28%' }}>Medicine Name & Salt Composition</th>
                        <th style={{ padding: '8px 8px', width: '10%' }}>Dosage & Form</th>
                        <th style={{ padding: '8px 8px', width: '12%', textAlign: 'center', background: '#e0f2fe' }}>Qty Sold Today</th>
                        <th style={{ padding: '8px 8px', width: '11%', textAlign: 'center' }}>Current Stock</th>
                        <th style={{ padding: '8px 8px', width: '12%', textAlign: 'center', background: '#fef3c7' }}>Suggested Reorder</th>
                        <th style={{ padding: '8px 10px', width: '16%' }}>Manufacturer / Supplier</th>
                        <th style={{ padding: '8px 8px', width: '11%', textAlign: 'right' }}>Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => {
                        const isOutOfStock = item.stock_status === 'OUT_OF_STOCK';
                        const isLowStock = item.stock_status === 'LOW_STOCK';

                        return (
                          <tr 
                            key={item.medicine_id}
                            style={{ 
                              borderBottom: '1px solid #e2e8f0',
                              background: idx % 2 === 0 ? '#ffffff' : '#fcfdfe',
                              pageBreakInside: 'avoid'
                            }}
                          >
                            <td style={{ padding: '8px 6px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>
                              {idx + 1}
                            </td>

                            <td style={{ padding: '8px 10px' }}>
                              <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '13px' }}>
                                {item.name}
                              </div>
                              <div style={{ fontSize: '11px', color: '#475569', marginTop: '1px' }}>
                                {item.generic_name}
                              </div>
                              <div style={{ fontSize: '10px', color: '#0284c7', marginTop: '2px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {item.rack_location && <span>📍 {item.rack_location}</span>}
                                {item.hsn_code && <span>HSN: {item.hsn_code}</span>}
                              </div>
                            </td>

                            <td style={{ padding: '8px 8px' }}>
                              <span style={{ 
                                display: 'inline-block',
                                padding: '2px 6px', 
                                background: '#f1f5f9', 
                                border: '1px solid #cbd5e1', 
                                borderRadius: '4px', 
                                fontSize: '10.5px', 
                                fontWeight: 700, 
                                color: '#334155' 
                              }}>
                                {item.dosage_form} {item.strength}
                              </span>
                            </td>

                            <td style={{ padding: '8px 8px', textAlign: 'center', background: '#f0f9ff' }}>
                              <span className="mono" style={{ fontWeight: 800, fontSize: '13px', color: '#0284c7' }}>
                                {item.total_qty_display}
                              </span>
                            </td>

                            <td style={{ padding: '8px 8px', textAlign: 'center' }}>
                              <span 
                                className="mono" 
                                style={{ 
                                  fontWeight: 800, 
                                  fontSize: '12.5px',
                                  color: isOutOfStock ? '#e11d48' : (isLowStock ? '#d97706' : '#059669') 
                                }}
                              >
                                {item.current_stock_packs} pk
                              </span>
                              {isOutOfStock && (
                                <div style={{ fontSize: '9.5px', fontWeight: 800, color: '#e11d48', marginTop: '1px' }}>
                                  OUT OF STOCK
                                </div>
                              )}
                              {isLowStock && (
                                <div style={{ fontSize: '9.5px', fontWeight: 700, color: '#d97706', marginTop: '1px' }}>
                                  LOW STOCK
                                </div>
                              )}
                            </td>

                            <td style={{ padding: '8px 8px', textAlign: 'center', background: '#fffbeb' }}>
                              <span 
                                className="mono" 
                                style={{ 
                                  display: 'inline-block',
                                  padding: '2px 8px', 
                                  background: isOutOfStock ? '#fee2e2' : (isLowStock ? '#fef3c7' : '#ffffff'),
                                  border: `1px solid ${isOutOfStock ? '#f87171' : (isLowStock ? '#fcd34d' : '#cbd5e1')}`,
                                  borderRadius: '6px',
                                  fontWeight: 900, 
                                  fontSize: '13px', 
                                  color: isOutOfStock ? '#b91c1c' : (isLowStock ? '#b45309' : '#0f172a') 
                                }}
                              >
                                {item.suggested_reorder_packs} pk
                              </span>
                            </td>

                            <td style={{ padding: '8px 10px' }}>
                              <div style={{ fontWeight: 600, color: '#0f172a' }}>{item.manufacturer || '-'}</div>
                              <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '1px' }}>
                                Vendor: {item.primary_supplier || 'Local Distributor'}
                              </div>
                            </td>

                            <td className="mono" style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                              Rs. {item.total_sales_amount.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#f8fafc', borderTop: '2px solid #0f172a', fontWeight: 800, fontSize: '13px' }}>
                        <td colSpan={3} style={{ padding: '10px 10px', textAlign: 'right' }}>
                          Total Summary ({items.length} Medicines):
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'center', color: '#0284c7' }} className="mono">
                          {reportData?.total_packs_sold || 0} pk
                        </td>
                        <td></td>
                        <td style={{ padding: '10px 8px', textAlign: 'center', color: '#b45309' }} className="mono">
                          {items.reduce((acc, item) => acc + (item.suggested_reorder_packs || 0), 0)} pk
                        </td>
                        <td></td>
                        <td style={{ padding: '10px 8px', textAlign: 'right', color: '#0f172a' }} className="mono">
                          Rs. {(reportData?.total_sales_value || 0).toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* Printable Verification & Purchase Order Authorization Sign-off */}
              <div style={{
                marginTop: '28px',
                paddingTop: '16px',
                borderTop: '1px solid #cbd5e1',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '20px',
                pageBreakInside: 'avoid'
              }}>
                <div style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.4 }}>
                  <strong>Pharmacy Reorder Notes:</strong>
                  <p style={{ margin: '4px 0 0 0' }}>
                    This report represents all prescription and OTC medicines dispensed during business hours. 
                    Suggested reorder quantities include buffer levels based on current shelf inventory.
                  </p>
                </div>

                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
                  <div style={{ width: '180px', borderBottom: '1px solid #0f172a', marginBottom: '4px' }}></div>
                  <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#0f172a' }}>
                    Authorized Pharmacist / Admin
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>
                    Top Medical Pharmacy • Deralakatte
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
