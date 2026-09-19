import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  Search, 
  Printer, 
  RefreshCw, 
  X, 
  Building2, 
  Package, 
  TrendingUp, 
  DollarSign, 
  FileSpreadsheet,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Pill,
  Maximize2,
  Minimize2,
  Copy,
  Check
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { inventoryAPI } from '../api';

export default function DailyUpdatedInventoryModal({ 
  isOpen, 
  onClose, 
  suppliers = [],
  profile, 
  user 
}) {
  const getTodayStr = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const [selectedDate, setSelectedDate] = useState(() => getTodayStr());
  const [datePreset, setDatePreset] = useState('today'); // 'today', 'yesterday', '2days', 'custom'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDistributor, setSelectedDistributor] = useState('ALL');
  const [selectedMovementType, setSelectedMovementType] = useState('');
  const [subTab, setSubTab] = useState('all'); // 'all', 'inward_only', 'adjustments_only'
  
  // Fullscreen toggle
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Pagination - default to 50 for expansive smooth scrolling
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Copy feedback state
  const [copiedBatch, setCopiedBatch] = useState(null);

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const fetchDailyUpdated = async () => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedDate) params.append('date', selectedDate);
      if (selectedMovementType) params.append('movement_type', selectedMovementType);
      if (searchTerm) params.append('search', searchTerm);

      const res = await inventoryAPI.getDailyUpdated(params.toString());
      setData(res);
      setCurrentPage(1);
    } catch (err) {
      console.error('Failed to fetch daily updated inventory:', err);
      setError(err.message || 'Failed to load daily updated inventory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDailyUpdated();
    }
  }, [isOpen, selectedDate, selectedMovementType]);

  const handlePresetChange = (preset) => {
    setDatePreset(preset);
    const now = new Date();
    if (preset === 'today') {
      setSelectedDate(getTodayStr());
    } else if (preset === 'yesterday') {
      now.setDate(now.getDate() - 1);
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      setSelectedDate(`${y}-${m}-${d}`);
    } else if (preset === '2days') {
      now.setDate(now.getDate() - 2);
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      setSelectedDate(`${y}-${m}-${d}`);
    }
  };

  const rawResults = data?.results || [];
  const summary = data?.summary || {
    total_batches_updated: 0,
    total_inward_packs: 0,
    total_adjusted_packs: 0,
    total_sold_packs: 0,
    total_inward_cost: 0,
    total_inward_mrp: 0,
    distributors_count: 0,
    distributors_list: []
  };

  // Formatted date string for header
  const formattedDateTitle = useMemo(() => {
    if (!selectedDate) return '';
    try {
      const parts = selectedDate.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
      }
    } catch (e) {}
    return selectedDate;
  }, [selectedDate]);

  // Aggregate distributor list with counts from active results
  const distributorOptions = useMemo(() => {
    const counts = {};
    rawResults.forEach(it => {
      const name = it.supplier_name || 'Direct / Unassigned';
      counts[name] = (counts[name] || 0) + 1;
    });

    const list = Object.keys(counts).map(name => ({
      name,
      count: counts[name]
    })).sort((a, b) => b.count - a.count);

    return list;
  }, [rawResults]);

  // Client-side filtering (Distributor, Search, Sub-tab)
  const filteredItems = useMemo(() => {
    let list = rawResults;

    // Sub-tab filter
    if (subTab === 'inward_only') {
      list = list.filter(it => (it.day_inward_packs || 0) > 0);
    } else if (subTab === 'adjustments_only') {
      list = list.filter(it => (it.day_adj_packs || 0) !== 0);
    }

    // Distributor filter
    if (selectedDistributor && selectedDistributor !== 'ALL') {
      list = list.filter(it => {
        const supName = it.supplier_name || 'Direct / Unassigned';
        return supName.toLowerCase() === selectedDistributor.toLowerCase();
      });
    }

    // Search query filter
    const q = searchTerm.toLowerCase().trim();
    if (q) {
      list = list.filter(it => 
        (it.medicine_name || '').toLowerCase().includes(q) ||
        (it.medicine_generic || '').toLowerCase().includes(q) ||
        (it.batch_number || '').toLowerCase().includes(q) ||
        (it.supplier_name || '').toLowerCase().includes(q) ||
        (it.manufacturer || '').toLowerCase().includes(q) ||
        (it.rack_location || '').toLowerCase().includes(q) ||
        (it.category_name || '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [rawResults, searchTerm, subTab, selectedDistributor]);

  // Pagination calculations
  const effectivePageSize = pageSize === 'all' ? filteredItems.length : parseInt(pageSize, 10);
  const totalItems = filteredItems.length;
  const totalPages = effectivePageSize > 0 ? Math.max(1, Math.ceil(totalItems / effectivePageSize)) : 1;
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedItems = useMemo(() => {
    if (pageSize === 'all') return filteredItems;
    const start = (validCurrentPage - 1) * effectivePageSize;
    return filteredItems.slice(start, start + effectivePageSize);
  }, [filteredItems, validCurrentPage, effectivePageSize, pageSize]);

  // Gross markup %
  const grossMarkupPct = useMemo(() => {
    if (summary.total_inward_cost > 0 && summary.total_inward_mrp > summary.total_inward_cost) {
      const diff = summary.total_inward_mrp - summary.total_inward_cost;
      return ((diff / summary.total_inward_cost) * 100).toFixed(1);
    }
    return 0;
  }, [summary.total_inward_cost, summary.total_inward_mrp]);

  // Copy batch number handler
  const handleCopyBatch = (batchNo) => {
    if (!batchNo) return;
    navigator.clipboard.writeText(batchNo);
    setCopiedBatch(batchNo);
    setTimeout(() => setCopiedBatch(null), 2000);
  };

  // Export Daily Updated Inventory to Excel (.xlsx)
  const handleExportExcel = () => {
    if (filteredItems.length === 0) return;

    const headers = [
      '#',
      'Medicine / Product Name',
      'Generic Salt Composition',
      'Form',
      'Category',
      'Manufacturer',
      'Distributor / Supplier',
      'Batch Number',
      'Expiry Date',
      'Pack Size',
      'Today Inward Packs',
      'Today Adjusted Packs',
      'Today Sold Packs',
      'Current Stock in Hand',
      'Cost Price (₹)',
      'MRP (₹)',
      'Selling Price (₹)',
      'Total Inward Cost (₹)',
      'Update Action / Notes'
    ];

    const rows = filteredItems.map((it, idx) => {
      const cost = parseFloat(it.purchase_price || 0);
      const inwardPks = parseInt(it.day_inward_packs || 0, 10);
      const inwardCost = (cost * inwardPks).toFixed(2);

      return [
        idx + 1,
        it.medicine_name || '',
        it.medicine_generic || '',
        it.dosage_form || 'Tablet',
        it.category_name || '',
        it.manufacturer || '',
        it.supplier_name || 'Direct Wholesale',
        it.batch_number || '',
        it.expiry_date || '',
        it.pack_size || 10,
        inwardPks,
        it.day_adj_packs || 0,
        it.day_sold_packs || 0,
        it.pack_quantity || 0,
        cost,
        parseFloat(it.mrp || 0),
        parseFloat(it.selling_price || 0),
        inwardCost,
        it.primary_reason || 'Stock Update'
      ];
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Updated_${selectedDate}`);
    XLSX.writeFile(wb, `TopMedical_Daily_Stock_Update_${selectedDate}.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="modal-backdrop" 
      style={{ 
        zIndex: 9999, 
        background: 'rgba(15, 23, 42, 0.65)', 
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isFullscreen ? '0' : '16px'
      }}
    >
      <div 
        className="modal-content" 
        style={{ 
          maxWidth: isFullscreen ? '100vw' : '1440px', 
          width: isFullscreen ? '100vw' : '98vw', 
          height: isFullscreen ? '100vh' : '94vh', 
          display: 'flex', 
          flexDirection: 'column',
          borderRadius: isFullscreen ? '0px' : '14px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          background: '#ffffff',
          overflow: 'hidden'
        }}
      >
        {/* ========================================================================= */}
        {/* 1. TOP HEADER - Matches Top Medical Clean System Theme (#ffffff with light accents) */}
        {/* ========================================================================= */}
        <div style={{
          padding: '14px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          background: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 3px rgba(16, 185, 129, 0.12)'
            }}>
              <Calendar size={20} color="#059669" />
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
                {profile?.name || 'TOP MEDICAL PHARMACY'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                <span>Daily Updated Stock & Inward Audit Ledger</span>
                <span style={{ color: '#cbd5e1' }}>•</span>
                <span style={{ color: 'var(--primary)', fontWeight: 700 }}>
                  {formattedDateTitle || selectedDate}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={fetchDailyUpdated}
              className="btn btn-secondary btn-sm"
              style={{
                fontSize: '12px',
                padding: '6px 12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
              title="Refresh live daily inventory data"
            >
              <RefreshCw size={13} color="var(--primary)" className={loading ? 'spin-animation' : ''} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="btn btn-secondary btn-sm"
              style={{ padding: '6px 9px', width: '32px', height: '32px', color: 'var(--text-muted)' }}
              title={isFullscreen ? "Restore normal size" : "Expand to fullscreen"}
            >
              {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>

            <button 
              onClick={onClose} 
              className="btn btn-secondary btn-sm"
              style={{ padding: '6px 9px', width: '32px', height: '32px', color: 'var(--text-muted)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#e11d48'; e.currentTarget.style.borderColor = '#fecdd3'; e.currentTarget.style.background = '#fef2f2'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.background = '#ffffff'; }}
              title="Close audit view"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. COMPACT SUMMARY STRIP (Clean pill badges matching system tone) */}
        {/* ========================================================================= */}
        <div style={{
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          padding: '8px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          flexShrink: 0
        }}>
          {/* Quick Metrics Badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '12px' }}>
            <span className="badge badge-cyan" style={{ fontSize: '11.5px', padding: '4px 10px' }}>
              <Pill size={12} />
              <span>Batches Updated: <strong style={{ fontFamily: 'var(--font-mono)' }}>{summary.total_batches_updated}</strong></span>
            </span>

            <span className="badge badge-emerald" style={{ fontSize: '11.5px', padding: '4px 10px' }}>
              <TrendingUp size={12} />
              <span>Stock Inwarded: <strong style={{ fontFamily: 'var(--font-mono)' }}>+{summary.total_inward_packs} pk</strong></span>
            </span>

            <span className="badge badge-purple" style={{ fontSize: '11.5px', padding: '4px 10px' }}>
              <DollarSign size={12} />
              <span>Inward Cost: <strong style={{ fontFamily: 'var(--font-mono)' }}>₹{summary.total_inward_cost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></span>
              <span style={{ opacity: 0.8, fontSize: '11px', marginLeft: '4px' }}>(MRP: ₹{summary.total_inward_mrp.toLocaleString('en-IN', { minimumFractionDigits: 2 })})</span>
              {grossMarkupPct > 0 && (
                <span style={{ background: '#ede9fe', color: '#6d28d9', padding: '1px 5px', borderRadius: '4px', fontSize: '10px', fontWeight: 800, marginLeft: '4px' }}>
                  +{grossMarkupPct}%
                </span>
              )}
            </span>

            <span className="badge badge-amber" style={{ fontSize: '11.5px', padding: '4px 10px' }}>
              <Building2 size={12} />
              <span>Active Distributors: <strong style={{ fontFamily: 'var(--font-mono)' }}>{summary.distributors_count}</strong></span>
            </span>
          </div>

          {/* Sub-tab view switchers */}
          <div style={{
            display: 'inline-flex',
            background: '#ffffff',
            padding: '2px',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
          }}>
            <button
              type="button"
              onClick={() => setSubTab('all')}
              style={{
                padding: '4px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: subTab === 'all' ? 800 : 600,
                border: 'none',
                cursor: 'pointer',
                background: subTab === 'all' ? '#0284c7' : 'transparent',
                color: subTab === 'all' ? '#ffffff' : '#475569',
                transition: 'all 0.12s ease'
              }}
            >
              All Items ({rawResults.length})
            </button>
            <button
              type="button"
              onClick={() => setSubTab('inward_only')}
              style={{
                padding: '4px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: subTab === 'inward_only' ? 800 : 600,
                border: 'none',
                cursor: 'pointer',
                background: subTab === 'inward_only' ? '#059669' : 'transparent',
                color: subTab === 'inward_only' ? '#ffffff' : '#475569',
                transition: 'all 0.12s ease'
              }}
            >
              📥 Inward Inflows (+{summary.total_inward_packs})
            </button>
            <button
              type="button"
              onClick={() => setSubTab('adjustments_only')}
              style={{
                padding: '4px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: subTab === 'adjustments_only' ? 800 : 600,
                border: 'none',
                cursor: 'pointer',
                background: subTab === 'adjustments_only' ? '#d97706' : 'transparent',
                color: subTab === 'adjustments_only' ? '#ffffff' : '#475569',
                transition: 'all 0.12s ease'
              }}
            >
              ⚙️ Adjustments
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. MAIN CONTROLS BAR: DATE + DISTRIBUTOR DROPDOWN + SEARCH + EXPORT */}
        {/* ========================================================================= */}
        <div style={{
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '10px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
          flexShrink: 0
        }}>
          {/* Left Controls: Date Switcher + Date Picker + Distributor Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Target Date:
            </span>

            {/* Date Preset Segmented Controller */}
            <div style={{
              display: 'inline-flex',
              background: '#f1f5f9',
              padding: '3px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              height: '38px',
              alignItems: 'center'
            }}>
              {[
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: '2days', label: '2 Days Ago' }
              ].map(tab => {
                const isActive = datePreset === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handlePresetChange(tab.id)}
                    style={{
                      height: '30px',
                      padding: '0 12px',
                      borderRadius: '6px',
                      fontSize: '12.5px',
                      fontWeight: isActive ? 800 : 600,
                      border: 'none',
                      cursor: 'pointer',
                      background: isActive ? '#0284c7' : 'transparent',
                      color: isActive ? '#ffffff' : '#475569',
                      display: 'inline-flex',
                      alignItems: 'center',
                      transition: 'all 0.12s ease'
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Custom Date Input */}
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setDatePreset('custom');
              }}
              style={{
                height: '38px',
                fontSize: '13px',
                fontWeight: 600,
                padding: '0 10px',
                width: '145px',
                background: '#ffffff',
                border: '1px solid',
                borderColor: datePreset === 'custom' ? '#0284c7' : '#cbd5e1',
                borderRadius: '8px',
                color: '#0f172a',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              title="Pick custom date"
            />

            {/* Distributor Dropdown */}
            <select
              value={selectedDistributor}
              onChange={(e) => setSelectedDistributor(e.target.value)}
              style={{
                height: '38px',
                fontSize: '13px',
                fontWeight: 600,
                padding: '0 32px 0 12px',
                minWidth: '220px',
                maxWidth: '300px',
                background: selectedDistributor !== 'ALL' ? '#f0f9ff' : '#ffffff',
                border: '1px solid',
                borderColor: selectedDistributor !== 'ALL' ? '#0284c7' : '#cbd5e1',
                borderRadius: '8px',
                color: selectedDistributor !== 'ALL' ? '#0369a1' : '#0f172a',
                cursor: 'pointer',
                outline: 'none',
                boxSizing: 'border-box',
                appearance: 'none',
                backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")",
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 10px center'
              }}
              title="Filter records by distributor"
            >
              <option value="ALL">🏢 All Distributors ({rawResults.length} Batches)</option>
              {distributorOptions.map(d => (
                <option key={d.name} value={d.name}>
                  {d.name} ({d.count} items)
                </option>
              ))}
            </select>
          </div>

          {/* Right Controls: Search Bar + Excel Export + Print */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, justifyContent: 'flex-end', minWidth: '320px' }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: '380px', display: 'flex', alignItems: 'center' }}>
              <Search size={15} color="#0284c7" style={{ position: 'absolute', left: '12px', pointerEvents: 'none' }} />
              <input
                type="text"
                placeholder="Search tablet, salt, batch, distributor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  height: '38px',
                  padding: '0 32px 0 36px',
                  fontSize: '13px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  color: '#0f172a',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  <X size={15} />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleExportExcel}
              disabled={filteredItems.length === 0}
              className="btn btn-emerald"
              style={{
                fontSize: '12.5px',
                fontWeight: 700,
                padding: '0 14px',
                height: '38px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap'
              }}
              title="Export complete daily audit ledger to Microsoft Excel"
            >
              <FileSpreadsheet size={15} />
              <span>Export Excel</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={filteredItems.length === 0}
              className="btn btn-primary"
              style={{ fontSize: '12.5px', padding: '0 14px', height: '38px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              title="Print daily audit sheet"
            >
              <Printer size={15} />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. HORIZONTAL DISTRIBUTOR FILTER PILLS */}
        {/* ========================================================================= */}
        {distributorOptions.length > 0 && (
          <div style={{
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            padding: '7px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            overflowX: 'auto',
            whiteSpace: 'nowrap',
            flexShrink: 0
          }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginRight: '4px' }}>
              Quick Filters:
            </span>

            {/* All chip */}
            <button
              type="button"
              onClick={() => setSelectedDistributor('ALL')}
              className={`badge ${selectedDistributor === 'ALL' ? 'badge-cyan' : 'badge-gray'}`}
              style={{
                cursor: 'pointer',
                padding: '4px 10px',
                fontSize: '11.5px',
                fontWeight: selectedDistributor === 'ALL' ? 800 : 600,
                border: selectedDistributor === 'ALL' ? '1px solid #bae6fd' : '1px solid #e2e8f0',
                flexShrink: 0
              }}
            >
              All Items ({rawResults.length})
            </button>

            {distributorOptions.map(d => {
              const isSelected = selectedDistributor.toLowerCase() === d.name.toLowerCase();
              return (
                <button
                  key={d.name}
                  type="button"
                  onClick={() => setSelectedDistributor(isSelected ? 'ALL' : d.name)}
                  className={`badge ${isSelected ? 'badge-cyan' : 'badge-gray'}`}
                  style={{
                    cursor: 'pointer',
                    padding: '4px 10px',
                    fontSize: '11.5px',
                    fontWeight: isSelected ? 800 : 600,
                    border: isSelected ? '1px solid #0284c7' : '1px solid #e2e8f0',
                    background: isSelected ? '#0284c7' : '#f1f5f9',
                    color: isSelected ? '#ffffff' : '#334155',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    flexShrink: 0
                  }}
                  title={`Click to filter by ${d.name}`}
                >
                  <Building2 size={11} />
                  <span>{d.name}</span>
                  <span style={{
                    background: isSelected ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                    color: isSelected ? '#ffffff' : '#475569',
                    padding: '0 5px',
                    borderRadius: '4px',
                    fontSize: '10.5px',
                    fontWeight: 700
                  }}>
                    {d.count}
                  </span>
                  {isSelected && <X size={11} style={{ marginLeft: '2px' }} />}
                </button>
              );
            })}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 5. EXPANSIVE SCROLLABLE MEDICINE TABLE */}
        {/* ========================================================================= */}
        <div 
          style={{ 
            flex: 1, 
            minHeight: 0, 
            overflowY: 'auto', 
            background: '#ffffff',
            position: 'relative'
          }}
        >
          {loading ? (
            <div style={{ padding: '80px 20px', textAlign: 'center' }}>
              <RefreshCw size={32} color="#0284c7" className="spin-animation" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>Loading Updated Stock Ledger...</div>
              <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '3px' }}>Aggregating distributor batches and movements</div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center' }}>
              <Package size={38} color="#cbd5e1" style={{ margin: '0 auto 10px' }} />
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#1e293b' }}>No Inventory Records Found</div>
              <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '3px' }}>
                {selectedDistributor !== 'ALL' 
                  ? `No updated items found for distributor "${selectedDistributor}".`
                  : searchTerm 
                  ? 'No items matched your search query.'
                  : `No stock inflows or adjustments were logged on ${selectedDate}.`}
              </div>
              {(selectedDistributor !== 'ALL' || searchTerm) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDistributor('ALL');
                    setSearchTerm('');
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{ marginTop: '12px', fontSize: '12px' }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f8fafc', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ width: '3%', textAlign: 'center', padding: '10px 6px', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>#</th>
                  <th style={{ width: '25%', padding: '10px 14px', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Medicine & Formulation</th>
                  <th style={{ width: '18%', padding: '10px 12px', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Supplier / Distributor</th>
                  <th style={{ width: '11%', padding: '10px 10px', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Form & Cat</th>
                  <th style={{ width: '10%', padding: '10px 10px', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Batch #</th>
                  <th style={{ width: '9%', padding: '10px 10px', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Expiry Date</th>
                  <th style={{ width: '8%', textAlign: 'center', padding: '10px 8px', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Today Inward</th>
                  <th style={{ width: '8%', textAlign: 'center', padding: '10px 8px', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Stock in Hand</th>
                  <th style={{ width: '8%', textAlign: 'right', padding: '10px 12px', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Cost (₹)</th>
                  <th style={{ width: '8%', textAlign: 'right', padding: '10px 14px', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>MRP (₹)</th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((it, idx) => {
                  const rowNumber = (validCurrentPage - 1) * effectivePageSize + idx + 1;
                  const hasInward = (it.day_inward_packs || 0) > 0;
                  const hasAdj = (it.day_adj_packs || 0) !== 0;

                  const todayStr = getTodayStr();
                  const isExpired = it.expiry_date && it.expiry_date <= todayStr;
                  const isExpiringSoon = it.expiry_date && !isExpired && (new Date(it.expiry_date) - new Date(todayStr)) < (90 * 86400000);

                  const suppName = it.supplier_name || 'Direct / Unassigned';
                  const isDistSelected = selectedDistributor.toLowerCase() === suppName.toLowerCase();

                  return (
                    <tr 
                      key={it.id || idx}
                      style={{ 
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background 0.1s ease',
                        background: isDistSelected ? '#f0fdf4' : '#ffffff'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={(e) => e.currentTarget.style.background = isDistSelected ? '#f0fdf4' : '#ffffff'}
                    >
                      <td style={{ textAlign: 'center', color: '#94a3b8', fontSize: '11.5px', fontWeight: 600 }}>
                        {rowNumber}
                      </td>
                      
                      {/* Medicine Name & Formulation */}
                      <td style={{ padding: '8px 14px' }}>
                        <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '13px' }}>
                          {it.medicine_name}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ fontStyle: 'italic' }}>{it.medicine_generic || 'Composition Not Specified'}</span>
                          {it.manufacturer && (
                            <span style={{ background: '#f1f5f9', padding: '1px 5px', borderRadius: '4px', fontSize: '10px', color: '#475569', fontWeight: 600 }}>
                              {it.manufacturer}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Distributor / Supplier */}
                      <td style={{ padding: '8px 12px' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedDistributor(isDistSelected ? 'ALL' : suppName)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            background: isDistSelected ? '#0284c7' : '#f0f9ff',
                            border: '1px solid',
                            borderColor: isDistSelected ? '#0284c7' : '#bae6fd',
                            color: isDistSelected ? '#ffffff' : '#0369a1',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            maxWidth: '220px',
                            cursor: 'pointer',
                            textAlign: 'left'
                          }}
                          title={`Click to filter only ${suppName}`}
                        >
                          <Building2 size={12} style={{ flexShrink: 0 }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {suppName}
                          </span>
                        </button>
                      </td>

                      {/* Form & Category */}
                      <td style={{ padding: '8px 10px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span className="badge badge-cyan" style={{ fontSize: '10px', fontWeight: 700, width: 'fit-content', padding: '1px 6px' }}>
                            {it.dosage_form || 'Tablet'}
                          </span>
                          <span style={{ fontSize: '10px', color: '#64748b', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={it.category_name}>
                            {it.category_name || 'General'}
                          </span>
                        </div>
                      </td>

                      {/* Batch Number */}
                      <td style={{ padding: '8px 10px' }} className="mono">
                        <button
                          type="button"
                          onClick={() => handleCopyBatch(it.batch_number)}
                          style={{
                            background: copiedBatch === it.batch_number ? '#ecfdf5' : '#f8fafc',
                            border: '1px solid',
                            borderColor: copiedBatch === it.batch_number ? '#10b981' : '#e2e8f0',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontWeight: 700,
                            fontSize: '11px',
                            color: copiedBatch === it.batch_number ? '#059669' : '#1e293b',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          title="Click to copy batch number"
                        >
                          <span>{it.batch_number}</span>
                          {copiedBatch === it.batch_number ? <Check size={10} color="#059669" /> : <Copy size={9} color="#94a3b8" />}
                        </button>
                      </td>

                      {/* Expiry Date */}
                      <td style={{ padding: '8px 10px', fontSize: '11.5px' }}>
                        <span style={{
                          color: isExpired ? '#e11d48' : isExpiringSoon ? '#d97706' : '#334155',
                          fontWeight: (isExpired || isExpiringSoon) ? 700 : 500
                        }}>
                          {it.expiry_date}
                        </span>
                      </td>

                      {/* Today Inward */}
                      <td style={{ textAlign: 'center', padding: '8px 8px' }}>
                        {hasInward ? (
                          <span className="badge badge-emerald" style={{ fontSize: '11px', fontWeight: 800, padding: '2px 8px' }}>
                            +{it.day_inward_packs} pk
                          </span>
                        ) : hasAdj ? (
                          <span className="badge badge-amber" style={{ fontSize: '11px', fontWeight: 800, padding: '2px 8px' }}>
                            {it.day_adj_packs > 0 ? `+${it.day_adj_packs}` : it.day_adj_packs} pk
                          </span>
                        ) : (
                          <span style={{ fontSize: '11.5px', color: '#cbd5e1' }}>—</span>
                        )}
                      </td>

                      {/* Stock in Hand */}
                      <td style={{ textAlign: 'center', padding: '8px 8px' }}>
                        <strong style={{ color: '#0f172a', fontSize: '12.5px', fontFamily: 'var(--font-mono)' }}>
                          {it.pack_quantity}
                        </strong>
                        <span style={{ fontSize: '11px', color: '#64748b' }}> pk</span>
                      </td>

                      {/* Cost */}
                      <td style={{ textAlign: 'right', padding: '8px 12px' }} className="mono">
                        <span style={{ fontSize: '12.5px', color: '#475569' }}>
                          ₹{parseFloat(it.purchase_price || 0).toFixed(2)}
                        </span>
                      </td>

                      {/* MRP */}
                      <td style={{ textAlign: 'right', padding: '8px 14px' }} className="mono">
                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#059669' }}>
                          ₹{parseFloat(it.mrp || 0).toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ========================================================================= */}
        {/* 6. CLEAN FOOTER */}
        {/* ========================================================================= */}
        <div style={{
          padding: '10px 20px',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#ffffff',
          flexShrink: 0,
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          {/* Record info & Row size selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: '#64748b' }}>
            <span>
              Showing <strong>{(validCurrentPage - 1) * effectivePageSize + (totalItems > 0 ? 1 : 0)}</strong>–<strong>{Math.min(validCurrentPage * effectivePageSize, totalItems)}</strong> of <strong>{totalItems}</strong> medicines
            </span>

            {selectedDistributor !== 'ALL' && (
              <span className="badge badge-cyan" style={{ fontSize: '11px', fontWeight: 700 }}>
                Filtered: {selectedDistributor}
              </span>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginLeft: '8px' }}>
              <span>Show:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(e.target.value);
                  setCurrentPage(1);
                }}
                className="input-field"
                style={{ height: '28px', fontSize: '11.5px', padding: '2px 8px', width: '68px', background: '#ffffff' }}
              >
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="all">All</option>
              </select>
            </div>
          </div>

          {/* Pagination buttons + Close */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {totalPages > 1 && pageSize !== 'all' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  type="button"
                  disabled={validCurrentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '4px 8px', fontSize: '11.5px', opacity: validCurrentPage === 1 ? 0.5 : 1 }}
                >
                  <ChevronLeft size={13} /> Prev
                </button>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum = i + 1;
                  if (totalPages > 5 && validCurrentPage > 3) {
                    pageNum = validCurrentPage - 3 + i;
                    if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                  }
                  const isActive = pageNum === validCurrentPage;
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '5px',
                        border: '1px solid',
                        borderColor: isActive ? '#0284c7' : '#e2e8f0',
                        background: isActive ? '#0284c7' : '#ffffff',
                        color: isActive ? '#ffffff' : '#334155',
                        fontWeight: isActive ? 800 : 600,
                        fontSize: '11.5px',
                        cursor: 'pointer'
                      }}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  type="button"
                  disabled={validCurrentPage === totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '4px 8px', fontSize: '11.5px', opacity: validCurrentPage === totalPages ? 0.5 : 1 }}
                >
                  Next <ChevronRight size={13} />
                </button>
              </div>
            )}

            <button 
              type="button" 
              onClick={onClose} 
              className="btn btn-secondary btn-sm" 
              style={{ padding: '6px 16px', fontSize: '12px', marginLeft: '6px' }}
            >
              Close Audit View
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
