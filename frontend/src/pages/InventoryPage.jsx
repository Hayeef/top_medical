import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Pill, 
  Search, 
  Plus, 
  PackagePlus, 
  ChevronDown, 
  ChevronRight, 
  MapPin, 
  Sliders, 
  ShoppingCart, 
  FileSpreadsheet,
  Camera,
  ClipboardList,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  TrendingUp,
  Filter,
  DollarSign,
  Layers,
  ArrowUpDown,
  Building2,
  Hash,
  Calendar,
  Zap,
  RefreshCw,
  Edit3
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { inventoryAPI } from '../api';

export default function InventoryPage({ 
  medicines = [], 
  categories = [], 
  suppliers = [],
  profile, 
  user,
  onOpenAddMedicine, 
  onOpenAddBatch, 
  onOpenStockAdjust,
  onOpenScanBill,
  onOpenExcelUpload,
  onOpenDailyReport,
  onReloadInventory,
  setActiveTab 
}) {
  // View mode: 'table' (Live Inline Editable Stock Table) | 'catalog' (Grouped Medicines View)
  const [viewMode, setViewMode] = useState('table');
  
  // Search and Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'low_stock' | 'expiring_soon' | 'out_of_stock' | 'expired'
  const [filterRx, setFilterRx] = useState('');
  const [expandedMedId, setExpandedMedId] = useState(null);

  // Live Stock Table Data (Fetched or flattened from medicines/batches)
  const [batchesData, setBatchesData] = useState([]);
  const [tableSummary, setTableSummary] = useState(null);
  const [loadingBatches, setLoadingBatches] = useState(false);

  // Row Edit State Map: { [batchId]: { purchase_price, mrp, selling_price, pack_quantity, loose_quantity, expiry_date, rack_location, isDirty, isSaving, isSaved } }
  const [rowEdits, setRowEdits] = useState({});
  const [savingAll, setSavingAll] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const isAdmin = user?.is_superuser || user?.is_staff || user?.email?.includes('admin');
  const currency = profile?.currency_symbol || '₹';

  // Fetch batches for the Master Stock Table
  const fetchStockTable = async () => {
    setLoadingBatches(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedCategory) params.append('category', selectedCategory);
      if (selectedSupplier) params.append('supplier', selectedSupplier);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      params.append('limit', '1500');

      const res = await inventoryAPI.getStockTable(params.toString());
      if (res && res.results) {
        setBatchesData(res.results);
        setTableSummary(res.summary);
      } else {
        // Fallback: flatten from medicines
        flattenBatchesFromMedicines();
      }
    } catch (err) {
      console.warn('Could not fetch stock_table endpoint, flattening local medicines:', err);
      flattenBatchesFromMedicines();
    } finally {
      setLoadingBatches(false);
    }
  };

  const flattenBatchesFromMedicines = () => {
    const list = [];
    medicines.forEach(med => {
      (med.batches || []).forEach(b => {
        list.push({
          ...b,
          medicine_name: med.name,
          medicine_generic: med.generic_name,
          dosage_form: med.dosage_form,
          rack_location: med.rack_location,
          category_id: med.category,
          category_name: med.category_name,
          manufacturer: med.manufacturer,
          requires_prescription: med.requires_prescription,
          min_stock_alert: med.min_stock_alert || 10
        });
      });
    });
    setBatchesData(list);
  };

  useEffect(() => {
    fetchStockTable();
  }, [search, selectedCategory, selectedSupplier, statusFilter]);

  // When medicines prop updates, reload table if not actively editing
  useEffect(() => {
    if (Object.keys(rowEdits).length === 0) {
      fetchStockTable();
    }
  }, [medicines]);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Helper to get active editable value or fallback to original batch value
  const getRowValue = (batch, field) => {
    if (rowEdits[batch.id] && rowEdits[batch.id][field] !== undefined) {
      return rowEdits[batch.id][field];
    }
    return batch[field];
  };

  const isRowDirty = (batchId) => {
    return !!(rowEdits[batchId]?.isDirty);
  };

  const handleCellChange = (batch, field, val) => {
    setRowEdits(prev => {
      const current = prev[batch.id] || {
        purchase_price: batch.purchase_price,
        mrp: batch.mrp,
        selling_price: batch.selling_price,
        pack_quantity: batch.pack_quantity,
        loose_quantity: batch.loose_quantity || 0,
        expiry_date: batch.expiry_date,
        rack_location: batch.rack_location || '',
        batch_number: batch.batch_number,
      };

      const updated = {
        ...current,
        [field]: val,
        isDirty: true,
        isSaved: false
      };

      return {
        ...prev,
        [batch.id]: updated
      };
    });
  };

  // Quick Stock Increment / Decrement Stepper
  const handleStockDelta = (batch, delta) => {
    const currentQty = parseInt(getRowValue(batch, 'pack_quantity') ?? 0);
    const newQty = Math.max(0, currentQty + delta);
    handleCellChange(batch, 'pack_quantity', newQty);
  };

  // Save Single Row
  const handleSaveRow = async (batch) => {
    const edit = rowEdits[batch.id];
    if (!edit) return;

    setRowEdits(prev => ({
      ...prev,
      [batch.id]: { ...prev[batch.id], isSaving: true }
    }));

    try {
      const payload = {
        purchase_price: parseFloat(edit.purchase_price ?? batch.purchase_price),
        mrp: parseFloat(edit.mrp ?? batch.mrp),
        selling_price: parseFloat(edit.selling_price ?? batch.selling_price),
        pack_quantity: parseInt(edit.pack_quantity ?? batch.pack_quantity),
        loose_quantity: parseInt(edit.loose_quantity ?? batch.loose_quantity ?? 0),
        expiry_date: edit.expiry_date || batch.expiry_date,
        batch_number: edit.batch_number || batch.batch_number,
        rack_location: edit.rack_location !== undefined ? edit.rack_location : (batch.rack_location || '')
      };

      const res = await inventoryAPI.quickUpdateBatch(batch.id, payload);

      // Update local batchesData
      setBatchesData(prev => prev.map(b => b.id === batch.id ? { ...b, ...res.data, ...payload } : b));

      setRowEdits(prev => ({
        ...prev,
        [batch.id]: { ...prev[batch.id], isSaving: false, isDirty: false, isSaved: true }
      }));

      showToast(`Updated "${batch.medicine_name}" (Batch ${payload.batch_number})`);
      onReloadInventory?.();

      setTimeout(() => {
        setRowEdits(prev => {
          const next = { ...prev };
          delete next[batch.id];
          return next;
        });
      }, 2000);
    } catch (err) {
      console.error('Quick save error:', err);
      showToast(err.message || 'Failed to update batch.', 'error');
      setRowEdits(prev => ({
        ...prev,
        [batch.id]: { ...prev[batch.id], isSaving: false }
      }));
    }
  };

  // Revert Single Row
  const handleRevertRow = (batchId) => {
    setRowEdits(prev => {
      const next = { ...prev };
      delete next[batchId];
      return next;
    });
  };

  // Save All Modified Rows (Bulk Save)
  const dirtyCount = Object.keys(rowEdits).filter(k => rowEdits[k]?.isDirty).length;

  const handleSaveAll = async () => {
    const dirtyIds = Object.keys(rowEdits).filter(k => rowEdits[k]?.isDirty);
    if (dirtyIds.length === 0) return;

    setSavingAll(true);
    const updates = dirtyIds.map(id => {
      const edit = rowEdits[id];
      const orig = batchesData.find(b => b.id === parseInt(id)) || {};
      return {
        id: parseInt(id),
        purchase_price: parseFloat(edit.purchase_price ?? orig.purchase_price),
        mrp: parseFloat(edit.mrp ?? orig.mrp),
        selling_price: parseFloat(edit.selling_price ?? orig.selling_price),
        pack_quantity: parseInt(edit.pack_quantity ?? orig.pack_quantity),
        loose_quantity: parseInt(edit.loose_quantity ?? orig.loose_quantity ?? 0),
        expiry_date: edit.expiry_date || orig.expiry_date,
        batch_number: edit.batch_number || orig.batch_number,
        rack_location: edit.rack_location !== undefined ? edit.rack_location : (orig.rack_location || '')
      };
    });

    try {
      await inventoryAPI.bulkQuickUpdateBatches(updates);

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#0284c7', '#10b981', '#f59e0b']
      });

      showToast(`Successfully saved all ${updates.length} modified batches!`);
      setRowEdits({});
      fetchStockTable();
      onReloadInventory?.();
    } catch (err) {
      console.error('Bulk save error:', err);
      showToast(err.message || 'Failed to save batch updates.', 'error');
    } finally {
      setSavingAll(false);
    }
  };

  const handleDiscardAll = () => {
    setRowEdits({});
    showToast('Discarded all unsaved changes.', 'info');
  };

  // Financial summary metrics
  const displaySummary = useMemo(() => {
    if (tableSummary) return tableSummary;

    let totalCost = 0;
    let totalMRP = 0;
    let totalSelling = 0;
    let totalPacks = 0;

    batchesData.forEach(b => {
      const qty = parseInt(getRowValue(b, 'pack_quantity') || 0);
      const rate = parseFloat(getRowValue(b, 'purchase_price') || 0);
      const mrp = parseFloat(getRowValue(b, 'mrp') || 0);
      const sell = parseFloat(getRowValue(b, 'selling_price') || 0);

      totalCost += rate * qty;
      totalMRP += mrp * qty;
      totalSelling += sell * qty;
      totalPacks += qty;
    });

    const grossProfit = totalSelling - totalCost;
    const marginPct = totalSelling > 0 ? ((grossProfit / totalSelling) * 100).toFixed(1) : 0;

    return {
      total_batches: batchesData.length,
      total_packs: totalPacks,
      total_cost: totalCost,
      total_mrp: totalMRP,
      total_selling: totalSelling,
      gross_profit: grossProfit,
      margin_pct: marginPct
    };
  }, [batchesData, rowEdits, tableSummary]);

  // Grouped Catalog Filtered list
  const filteredCatalogMedicines = medicines.filter(med => {
    const matchesSearch = !search || 
      med.name.toLowerCase().includes(search.toLowerCase()) ||
      med.generic_name?.toLowerCase().includes(search.toLowerCase()) ||
      med.manufacturer?.toLowerCase().includes(search.toLowerCase()) ||
      med.rack_location?.toLowerCase().includes(search.toLowerCase()) ||
      med.barcode?.includes(search);

    const matchesCategory = !selectedCategory || med.category === parseInt(selectedCategory);
    const matchesRx = !filterRx || (filterRx === 'true' ? med.requires_prescription : !med.requires_prescription);

    return matchesSearch && matchesCategory && matchesRx;
  });

  const toggleExpand = (id) => {
    setExpandedMedId(expandedMedId === id ? null : id);
  };

  return (
    <div className="main-page-wrapper">
      
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '24px',
          zIndex: 9999,
          padding: '12px 20px',
          borderRadius: '10px',
          background: toastMessage.type === 'error' ? '#ef4444' : (toastMessage.type === 'info' ? '#0284c7' : '#10b981'),
          color: '#ffffff',
          fontWeight: 700,
          fontSize: '13.5px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          animation: 'fadeInDown 0.25s ease'
        }}>
          {toastMessage.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Action & Filter Bar */}
      <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        
        {/* Row 1: Search, Filter Selectors & View Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 520px', flexWrap: 'wrap' }}>
            {/* Search Box */}
            <div style={{ position: 'relative', flex: '2 1 240px' }}>
              <Search size={16} color="#0284c7" style={{ position: 'absolute', left: '12px', top: '11px' }} />
              <input
                type="text"
                className="input-field"
                style={{ paddingLeft: '36px', height: '38px', fontSize: '13px', background: '#f8fafc', borderColor: '#cbd5e1' }}
                placeholder="Search tablet, brand, composition, batch, rack..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Category Dropdown */}
            <select
              className="input-field"
              style={{ flex: '1 1 140px', height: '38px', fontSize: '12px' }}
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            {/* Supplier Dropdown */}
            {suppliers && suppliers.length > 0 && (
              <select
                className="input-field"
                style={{ flex: '1 1 140px', height: '38px', fontSize: '12px' }}
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
              >
                <option value="">All Distributors</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}

            {/* Rx Filter */}
            <select
              className="input-field"
              style={{ flex: '1 1 120px', height: '38px', fontSize: '12px' }}
              value={filterRx}
              onChange={(e) => setFilterRx(e.target.value)}
            >
              <option value="">All Drugs</option>
              <option value="true">Rx Only</option>
              <option value="false">OTC Non-Rx</option>
            </select>
          </div>

          {/* View Mode Toggle: Inline Table vs Grouped Catalog */}
          <div style={{
            display: 'flex',
            background: '#e2e8f0',
            padding: '3px',
            borderRadius: '10px',
            gap: '2px'
          }}>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: viewMode === 'table' ? '#ffffff' : 'transparent',
                color: viewMode === 'table' ? '#0284c7' : '#475569',
                boxShadow: viewMode === 'table' ? '0 2px 6px rgba(0,0,0,0.1)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Edit3 size={14} />
              <span>Editable Stock Table</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('catalog')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: viewMode === 'catalog' ? '#ffffff' : 'transparent',
                color: viewMode === 'catalog' ? '#0284c7' : '#475569',
                boxShadow: viewMode === 'catalog' ? '0 2px 6px rgba(0,0,0,0.1)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Layers size={14} />
              <span>Drug Catalog View</span>
            </button>
          </div>

        </div>

        {/* Row 2: Status Quick Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748b' }}>Filter by Status:</span>
          
          <button
            onClick={() => setStatusFilter('all')}
            className={`badge ${statusFilter === 'all' ? 'badge-cyan' : 'badge-secondary'}`}
            style={{ cursor: 'pointer', padding: '5px 12px', fontSize: '11.5px', border: 'none' }}
          >
            All Stock Items
          </button>

          <button
            onClick={() => setStatusFilter('low_stock')}
            className={`badge ${statusFilter === 'low_stock' ? 'badge-amber' : 'badge-secondary'}`}
            style={{ cursor: 'pointer', padding: '5px 12px', fontSize: '11.5px', border: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <AlertTriangle size={12} /> Low Stock (&le; 10 pk)
          </button>

          <button
            onClick={() => setStatusFilter('expiring_soon')}
            className={`badge ${statusFilter === 'expiring_soon' ? 'badge-amber' : 'badge-secondary'}`}
            style={{ cursor: 'pointer', padding: '5px 12px', fontSize: '11.5px', border: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <Clock size={12} /> Expiring &lt; 90 Days
          </button>

          <button
            onClick={() => setStatusFilter('out_of_stock')}
            className={`badge ${statusFilter === 'out_of_stock' ? 'badge-rose' : 'badge-secondary'}`}
            style={{ cursor: 'pointer', padding: '5px 12px', fontSize: '11.5px', border: 'none' }}
          >
            0 Stock (Out)
          </button>

          <button
            onClick={() => setStatusFilter('expired')}
            className={`badge ${statusFilter === 'expired' ? 'badge-rose' : 'badge-secondary'}`}
            style={{ cursor: 'pointer', padding: '5px 12px', fontSize: '11.5px', border: 'none' }}
          >
            Expired
          </button>

          {(search || selectedCategory || selectedSupplier || statusFilter !== 'all' || filterRx) && (
            <button
              onClick={() => {
                setSearch('');
                setSelectedCategory('');
                setSelectedSupplier('');
                setStatusFilter('all');
                setFilterRx('');
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#e11d48',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
                marginLeft: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <RotateCcw size={12} /> Reset Filters
            </button>
          )}
        </div>

        {/* Row 3: Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
          {isAdmin && (
            <button onClick={onOpenScanBill} className="btn btn-emerald btn-sm">
              <Camera size={14} />
              <span>Scan Bill</span>
            </button>
          )}
          {isAdmin && (
            <button onClick={onOpenExcelUpload} className="btn btn-secondary btn-sm">
              <FileSpreadsheet size={14} color="#059669" />
              <span>Excel Import</span>
            </button>
          )}
          {isAdmin && (
            <button onClick={() => onOpenAddBatch(null)} className="btn btn-secondary btn-sm">
              <PackagePlus size={14} color="#0284c7" />
              <span>+ Batch (F4)</span>
            </button>
          )}
          {isAdmin && (
            <button onClick={onOpenAddMedicine} className="btn btn-primary btn-sm">
              <Plus size={14} />
              <span>+ Medicine (F3)</span>
            </button>
          )}
          {onOpenDailyReport && (
            <button 
              onClick={onOpenDailyReport} 
              className="btn btn-secondary btn-sm"
              style={{ borderColor: '#0284c7', color: '#0284c7', background: '#f0f9ff' }}
            >
              <ClipboardList size={14} />
              <span>Daily Sold Sheet (PDF)</span>
            </button>
          )}
          <button
            onClick={fetchStockTable}
            className="btn btn-secondary btn-sm"
            title="Refresh database records"
          >
            <RefreshCw size={13} className={loadingBatches ? 'spin-animation' : ''} />
            <span>Refresh</span>
          </button>
          {!isAdmin && setActiveTab && (
            <button onClick={() => setActiveTab('pos')} className="btn btn-primary btn-sm">
              <ShoppingCart size={14} />
              <span>Open POS (F2)</span>
            </button>
          )}
        </div>
      </div>

      {/* Financial Metrics Summary Banner (for Stock Table) */}
      {viewMode === 'table' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          background: 'linear-gradient(135deg, #f0fdf4 0%, #f0f9ff 100%)',
          border: '1px solid #bbf7d0',
          padding: '14px 18px',
          borderRadius: '14px',
          boxShadow: '0 2px 8px rgba(16, 185, 129, 0.05)'
        }}>
          <div>
            <div style={{ fontSize: '11px', color: '#166534', fontWeight: 700, textTransform: 'uppercase' }}>
              Batches in View
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
              {displaySummary.displayed_batches ?? batchesData.length} Batches
            </div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              Total {displaySummary.total_packs ?? 0} Packs In Stock
            </div>
          </div>

          {isAdmin && (
            <div>
              <div style={{ fontSize: '11px', color: '#166534', fontWeight: 700, textTransform: 'uppercase' }}>
                Total Inward Cost
              </div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#047857', marginTop: '2px' }}>
                {currency}{parseFloat(displaySummary.total_cost || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>
                Purchase value
              </div>
            </div>
          )}

          <div>
            <div style={{ fontSize: '11px', color: '#166534', fontWeight: 700, textTransform: 'uppercase' }}>
              Total Retail Value (MRP)
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
              {currency}{parseFloat(displaySummary.total_mrp || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              Maximum retail price
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: '#166534', fontWeight: 700, textTransform: 'uppercase' }}>
              Gross Profit Margin
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#0284c7', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
              <TrendingUp size={16} /> {displaySummary.margin_pct}%
            </div>
            <div style={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>
              + {currency}{parseFloat(displaySummary.gross_profit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} potential profit
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 1: LIVE INLINE EDITABLE BATCH STOCK & PRICE TABLE
          ========================================================================= */}
      {viewMode === 'table' && (
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          
          <div style={{
            padding: '12px 18px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#f8fafc',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Edit3 size={16} color="#0284c7" />
              <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>
                Interactive Batch Stock & Price Master Table ({batchesData.length} Batches)
              </div>
              <span className="badge badge-cyan" style={{ fontSize: '10.5px' }}>
                <Zap size={10} /> Live Inline Editing
              </span>
            </div>

            <div style={{ fontSize: '11.5px', color: '#64748b' }}>
              💡 Tip: Click any Price or Stock field to edit directly. Hit <kbd style={{ padding: '1px 5px', background: '#e2e8f0', borderRadius: '4px' }}>Enter</kbd> to save.
            </div>
          </div>

          <div className="data-table-container desktop-only" style={{ border: 'none', borderRadius: 0, maxHeight: '68vh', overflowY: 'auto' }}>
            <table className="data-table">
              <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f8fafc' }}>
                <tr>
                  <th style={{ width: '22%' }}>Medicine & Formulation</th>
                  <th style={{ width: '10%' }}>Batch #</th>
                  <th style={{ width: '10%' }}>Expiry Date</th>
                  <th style={{ width: '12%' }}>Supplier / Distributor</th>
                  <th style={{ width: '9%' }}>Rack Location</th>
                  {isAdmin && <th style={{ width: '8%', textAlign: 'right' }}>Cost Price (₹)</th>}
                  <th style={{ width: '8%', textAlign: 'right' }}>MRP (₹)</th>
                  <th style={{ width: '9%', textAlign: 'right' }}>Selling Price (₹)</th>
                  <th style={{ width: '12%', textAlign: 'center' }}>Stock (Packs)</th>
                  <th style={{ width: '7%', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loadingBatches ? (
                  <tr>
                    <td colSpan={isAdmin ? 10 : 9} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                      <RefreshCw size={24} className="spin-animation" style={{ margin: '0 auto 8px' }} />
                      <div>Loading inventory stock batches...</div>
                    </td>
                  </tr>
                ) : batchesData.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 10 : 9} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                      No stock batches found matching current filters.
                    </td>
                  </tr>
                ) : (
                  batchesData.map((batch) => {
                    const dirty = isRowDirty(batch.id);
                    const rowEdit = rowEdits[batch.id] || {};
                    const isSaving = rowEdit.isSaving;
                    const isSaved = rowEdit.isSaved;

                    const costVal = getRowValue(batch, 'purchase_price');
                    const mrpVal = getRowValue(batch, 'mrp');
                    const sellVal = getRowValue(batch, 'selling_price');
                    const packQtyVal = getRowValue(batch, 'pack_quantity');
                    const expVal = getRowValue(batch, 'expiry_date');
                    const rackVal = getRowValue(batch, 'rack_location');
                    const batchNumVal = getRowValue(batch, 'batch_number');

                    const origPackQty = batch.pack_quantity;
                    const packDelta = parseInt(packQtyVal || 0) - origPackQty;

                    // Margin calculation for row
                    const rowProfit = parseFloat(sellVal || 0) - parseFloat(costVal || 0);
                    const rowMarginPct = parseFloat(sellVal || 0) > 0 ? ((rowProfit / parseFloat(sellVal)) * 100).toFixed(0) : 0;

                    return (
                      <tr 
                        key={batch.id}
                        style={{
                          background: dirty ? '#fffbeb' : (isSaved ? '#ecfdf5' : undefined),
                          transition: 'background 0.2s ease'
                        }}
                      >
                        {/* Medicine Name & Salt */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '13px' }}>
                              {batch.medicine_name}
                            </span>
                            {batch.requires_prescription && <span className="badge badge-rose" style={{ fontSize: '9px', padding: '1px 4px' }}>Rx</span>}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span className="badge badge-cyan" style={{ fontSize: '9.5px', padding: '1px 5px' }}>{batch.dosage_form}</span>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>
                              {batch.medicine_generic || batch.manufacturer || 'General'}
                            </span>
                          </div>
                        </td>

                        {/* Batch # */}
                        <td>
                          <input
                            type="text"
                            className="input-field mono"
                            style={{
                              height: '28px',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              color: '#0369a1',
                              padding: '2px 6px',
                              borderColor: dirty ? '#f59e0b' : '#e2e8f0',
                              background: dirty ? '#ffffff' : 'transparent'
                            }}
                            value={batchNumVal}
                            onChange={(e) => handleCellChange(batch, 'batch_number', e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveRow(batch)}
                          />
                        </td>

                        {/* Expiry Date */}
                        <td>
                          <input
                            type="date"
                            className="input-field mono"
                            style={{
                              height: '28px',
                              fontSize: '11px',
                              padding: '2px 4px',
                              borderColor: dirty ? '#f59e0b' : '#e2e8f0',
                              color: batch.is_expired ? '#e11d48' : (batch.is_near_expiry ? '#d97706' : '#059669'),
                              fontWeight: 700,
                              background: dirty ? '#ffffff' : 'transparent'
                            }}
                            value={expVal}
                            onChange={(e) => handleCellChange(batch, 'expiry_date', e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveRow(batch)}
                          />
                        </td>

                        {/* Supplier */}
                        <td>
                          <span style={{ fontSize: '11.5px', color: '#475569', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }} title={batch.supplier_name || 'Direct Wholesale'}>
                            {batch.supplier_name || 'Direct Wholesale'}
                          </span>
                        </td>

                        {/* Rack Location */}
                        <td>
                          <input
                            type="text"
                            className="input-field"
                            style={{
                              height: '28px',
                              fontSize: '11px',
                              padding: '2px 6px',
                              fontWeight: 600,
                              color: '#0284c7',
                              borderColor: dirty ? '#f59e0b' : '#e2e8f0',
                              background: dirty ? '#ffffff' : 'transparent'
                            }}
                            placeholder="Rack A-1"
                            value={rackVal || ''}
                            onChange={(e) => handleCellChange(batch, 'rack_location', e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveRow(batch)}
                          />
                        </td>

                        {/* Cost Price */}
                        {isAdmin && (
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ position: 'relative', display: 'inline-block', width: '70px' }}>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                className="input-field mono"
                                style={{
                                  height: '28px',
                                  fontSize: '12px',
                                  textAlign: 'right',
                                  padding: '2px 4px',
                                  borderColor: dirty ? '#f59e0b' : '#e2e8f0',
                                  background: dirty ? '#ffffff' : 'transparent'
                                }}
                                value={costVal}
                                onChange={(e) => handleCellChange(batch, 'purchase_price', e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSaveRow(batch)}
                              />
                            </div>
                          </td>
                        )}

                        {/* MRP */}
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ position: 'relative', display: 'inline-block', width: '70px' }}>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              className="input-field mono"
                              style={{
                                height: '28px',
                                fontSize: '12px',
                                textAlign: 'right',
                                padding: '2px 4px',
                                borderColor: dirty ? '#f59e0b' : '#e2e8f0',
                                background: dirty ? '#ffffff' : 'transparent'
                              }}
                              value={mrpVal}
                              onChange={(e) => handleCellChange(batch, 'mrp', e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleSaveRow(batch)}
                            />
                          </div>
                        </td>

                        {/* Selling Price & Margin % */}
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              className="input-field mono"
                              style={{
                                height: '28px',
                                fontSize: '12.5px',
                                width: '74px',
                                textAlign: 'right',
                                fontWeight: 800,
                                color: '#059669',
                                padding: '2px 4px',
                                borderColor: dirty ? '#f59e0b' : '#e2e8f0',
                                background: dirty ? '#ffffff' : 'transparent'
                              }}
                              value={sellVal}
                              onChange={(e) => handleCellChange(batch, 'selling_price', e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleSaveRow(batch)}
                            />
                            <span style={{ fontSize: '9.5px', color: '#0284c7', fontWeight: 700, marginTop: '1px' }}>
                              {rowMarginPct > 0 ? `+${rowMarginPct}% margin` : ''}
                            </span>
                          </div>
                        </td>

                        {/* Stock Packs (Interactive Stepper & Booster Chips) */}
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                            
                            {/* Decrement Button */}
                            <button
                              type="button"
                              onClick={() => handleStockDelta(batch, -1)}
                              style={{
                                width: '24px',
                                height: '26px',
                                borderRadius: '4px',
                                border: '1px solid #cbd5e1',
                                background: '#f8fafc',
                                color: '#475569',
                                fontWeight: 900,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              title="Decrease 1 pack"
                            >
                              -
                            </button>

                            {/* Direct Qty Input */}
                            <input
                              type="number"
                              min="0"
                              className="input-field mono"
                              style={{
                                height: '28px',
                                width: '54px',
                                textAlign: 'center',
                                fontWeight: 800,
                                fontSize: '12.5px',
                                padding: '2px',
                                color: parseInt(packQtyVal) === 0 ? '#e11d48' : '#0f172a',
                                borderColor: dirty ? '#f59e0b' : '#e2e8f0',
                                background: dirty ? '#ffffff' : 'transparent'
                              }}
                              value={packQtyVal}
                              onChange={(e) => handleCellChange(batch, 'pack_quantity', e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleSaveRow(batch)}
                            />

                            {/* Increment Button */}
                            <button
                              type="button"
                              onClick={() => handleStockDelta(batch, 1)}
                              style={{
                                width: '24px',
                                height: '26px',
                                borderRadius: '4px',
                                border: '1px solid #0284c7',
                                background: '#e0f2fe',
                                color: '#0284c7',
                                fontWeight: 900,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              title="Increase 1 pack"
                            >
                              +
                            </button>

                            {/* Quick +5 Booster */}
                            <button
                              type="button"
                              onClick={() => handleStockDelta(batch, 5)}
                              style={{
                                height: '26px',
                                padding: '0 5px',
                                borderRadius: '4px',
                                border: '1px solid #10b981',
                                background: '#ecfdf5',
                                color: '#059669',
                                fontSize: '10px',
                                fontWeight: 800,
                                cursor: 'pointer'
                              }}
                              title="Quick +5 Packs"
                            >
                              +5
                            </button>

                          </div>

                          {/* Delta indicator if modified */}
                          {packDelta !== 0 && (
                            <div style={{ fontSize: '9.5px', color: packDelta > 0 ? '#059669' : '#e11d48', fontWeight: 800, marginTop: '2px' }}>
                              {packDelta > 0 ? `+${packDelta} packs` : `${packDelta} packs`}
                            </div>
                          )}
                        </td>

                        {/* Action Buttons */}
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                            {dirty ? (
                              <>
                                <button
                                  type="button"
                                  disabled={isSaving}
                                  onClick={() => handleSaveRow(batch)}
                                  className="btn btn-primary btn-sm"
                                  style={{ padding: '3px 8px', fontSize: '11px', height: '26px' }}
                                  title="Save this row"
                                >
                                  <Save size={12} />
                                  <span>{isSaving ? '...' : 'Save'}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRevertRow(batch.id)}
                                  style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '2px' }}
                                  title="Revert edits"
                                >
                                  <RotateCcw size={13} />
                                </button>
                              </>
                            ) : isSaved ? (
                              <span style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: '2px', fontSize: '11px', fontWeight: 700 }}>
                                <CheckCircle2 size={14} /> Saved
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onOpenStockAdjust(batch)}
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '2px 6px', fontSize: '10.5px', height: '24px' }}
                                title="Audit / Stock Adjust Modal"
                              >
                                <Sliders size={11} />
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

          {/* Mobile Stock Cards */}
          <div className="mobile-only" style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px' }}>
            {batchesData.map((batch) => {
              const dirty = isRowDirty(batch.id);
              const isSaving = rowEdits[batch.id]?.isSaving;

              const costVal = getRowValue(batch, 'purchase_price');
              const mrpVal = getRowValue(batch, 'mrp');
              const sellVal = getRowValue(batch, 'selling_price');
              const packQtyVal = getRowValue(batch, 'pack_quantity');

              return (
                <div
                  key={batch.id}
                  style={{
                    background: dirty ? '#fffbeb' : '#ffffff',
                    border: dirty ? '1.5px solid #f59e0b' : '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>
                        {batch.medicine_name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        Batch #{batch.batch_number} • Exp: {batch.expiry_date}
                      </div>
                    </div>
                    <span className={`badge ${parseInt(packQtyVal) === 0 ? 'badge-rose' : 'badge-emerald'}`} style={{ fontWeight: 800 }}>
                      {packQtyVal} pk
                    </span>
                  </div>

                  {/* Mobile Price Inputs */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                    {isAdmin && (
                      <div>
                        <label style={{ fontSize: '10px', color: '#64748b', fontWeight: 700 }}>Cost (₹)</label>
                        <input
                          type="number"
                          step="0.01"
                          className="input-field mono"
                          style={{ height: '30px', fontSize: '12px' }}
                          value={costVal}
                          onChange={(e) => handleCellChange(batch, 'purchase_price', e.target.value)}
                        />
                      </div>
                    )}
                    <div>
                      <label style={{ fontSize: '10px', color: '#64748b', fontWeight: 700 }}>MRP (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="input-field mono"
                        style={{ height: '30px', fontSize: '12px' }}
                        value={mrpVal}
                        onChange={(e) => handleCellChange(batch, 'mrp', e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '10px', color: '#059669', fontWeight: 700 }}>Sell (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="input-field mono"
                        style={{ height: '30px', fontSize: '12px', fontWeight: 800, color: '#059669' }}
                        value={sellVal}
                        onChange={(e) => handleCellChange(batch, 'selling_price', e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Mobile Stock Stepper */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => handleStockDelta(batch, -1)}
                        className="btn btn-secondary btn-sm"
                        style={{ width: '32px', height: '32px', padding: 0 }}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        className="input-field mono"
                        style={{ width: '56px', height: '32px', textAlign: 'center', fontWeight: 800 }}
                        value={packQtyVal}
                        onChange={(e) => handleCellChange(batch, 'pack_quantity', e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => handleStockDelta(batch, 1)}
                        className="btn btn-primary btn-sm"
                        style={{ width: '32px', height: '32px', padding: 0 }}
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStockDelta(batch, 5)}
                        className="btn btn-secondary btn-sm"
                        style={{ height: '32px', fontSize: '11px', fontWeight: 700 }}
                      >
                        +5
                      </button>
                    </div>

                    {dirty && (
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => handleSaveRow(batch)}
                        className="btn btn-primary btn-sm"
                        style={{ height: '32px', padding: '0 14px' }}
                      >
                        <Save size={13} />
                        <span>{isSaving ? '...' : 'Save'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* Floating Multi-Row Bulk Action Bar */}
      {dirtyCount > 0 && viewMode === 'table' && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#ffffff',
          padding: '12px 24px',
          borderRadius: '30px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          animation: 'fadeInUp 0.25s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              background: '#f59e0b',
              color: '#0f172a',
              fontWeight: 900,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '13px'
            }}>
              {dirtyCount}
            </span>
            <span style={{ fontSize: '13.5px', fontWeight: 700 }}>
              Unsaved batch price / stock changes
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              disabled={savingAll}
              onClick={handleSaveAll}
              className="btn btn-emerald"
              style={{
                borderRadius: '20px',
                padding: '8px 20px',
                fontSize: '13px',
                fontWeight: 800,
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)'
              }}
            >
              <Save size={14} />
              <span>{savingAll ? 'Saving Batches...' : `Save All (${dirtyCount})`}</span>
            </button>

            <button
              type="button"
              onClick={handleDiscardAll}
              className="btn btn-secondary"
              style={{
                borderRadius: '20px',
                padding: '8px 14px',
                fontSize: '12.5px',
                background: 'rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                border: 'none'
              }}
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 2: GROUPED MEDICINE CATALOG VIEW
          ========================================================================= */}
      {viewMode === 'catalog' && (
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#f8fafc',
            flexWrap: 'wrap',
            gap: '6px'
          }}>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
              {isAdmin ? `Drug Master Catalog (${filteredCatalogMedicines.length} SKUs)` : `Stock Availability (${filteredCatalogMedicines.length} items)`}
            </div>
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              Tap row to expand batch history & audit
            </span>
          </div>

          {/* Desktop Catalog Table */}
          <div className="data-table-container desktop-only" style={{ border: 'none', borderRadius: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '3%' }}></th>
                  <th style={{ width: '28%' }}>Brand & Generic Name</th>
                  <th style={{ width: '14%' }}>Category & Form</th>
                  <th style={{ width: '14%' }}>Manufacturer</th>
                  <th style={{ width: '14%' }}>Rack / Location</th>
                  <th style={{ width: '15%', textAlign: 'center' }}>Total Stock</th>
                  <th style={{ width: '12%', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCatalogMedicines.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                      No medicines match your search query.
                    </td>
                  </tr>
                ) : (
                  filteredCatalogMedicines.map((med) => {
                    const isExpanded = expandedMedId === med.id;
                    const totalPacks = med.total_stock_packs ?? (med.batches?.reduce((acc, b) => acc + (b.is_expired ? 0 : b.pack_quantity), 0) || 0);
                    const isLow = totalPacks <= (med.min_stock_alert || 10);

                    return (
                      <React.Fragment key={med.id}>
                        <tr
                          onClick={() => toggleExpand(med.id)}
                          style={{ cursor: 'pointer', background: isExpanded ? '#f0f9ff' : undefined }}
                        >
                          <td style={{ color: '#64748b', textAlign: 'center' }}>
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '13.5px' }}>{med.name}</span>
                              {med.requires_prescription && <span className="badge badge-rose">Rx</span>}
                            </div>
                            <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                              {med.generic_name || 'Standard Formulation'}
                            </div>
                          </td>
                          <td>
                            <div><span className="badge badge-cyan">{med.dosage_form}</span></div>
                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
                              {med.category_name || 'General'}
                            </div>
                          </td>
                          <td style={{ fontSize: '12.5px', color: '#475569' }}>
                            {med.manufacturer || 'Direct'}
                          </td>
                          <td>
                            {med.rack_location ? (
                              <span style={{ fontSize: '12.5px', color: '#0284c7', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <MapPin size={13} /> {med.rack_location}
                              </span>
                            ) : (
                              <span style={{ fontSize: '11px', color: '#94a3b8' }}>Unassigned</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`badge ${totalPacks === 0 ? 'badge-rose' : (isLow ? 'badge-amber' : 'badge-emerald')}`} style={{ fontSize: '12px', padding: '3px 10px', fontWeight: 800 }}>
                              {totalPacks} packs {totalPacks <= (med.min_stock_alert || 10) && '⚠️ Low'}
                            </span>
                            <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '2px' }}>
                              Min: {med.min_stock_alert || 10}p
                            </div>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {isAdmin ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenAddBatch(med.id);
                                }}
                                className="btn btn-secondary btn-sm"
                                title="Add stock batch for this drug"
                              >
                                <PackagePlus size={13} color="#0284c7" />
                                <span>+ Stock</span>
                              </button>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (setActiveTab) setActiveTab('pos');
                                }}
                                className="btn btn-primary btn-sm"
                                title="Bill this tablet"
                              >
                                <ShoppingCart size={13} />
                                <span>Bill</span>
                              </button>
                            )}
                          </td>
                        </tr>

                        {/* Expandable Batch Details Drawer */}
                        {isExpanded && (
                          <tr>
                            <td colSpan="7" style={{ padding: '0', background: '#f8fafc' }}>
                              <div style={{ padding: '16px 24px', borderLeft: '4px solid #0284c7' }}>
                                <div style={{ fontSize: '12px', fontWeight: 800, color: '#0369a1', marginBottom: '8px', textTransform: 'uppercase' }}>
                                  Active Batches for {med.name}
                                </div>

                                {(!med.batches || med.batches.length === 0) ? (
                                  <div style={{ fontSize: '12px', color: '#64748b', padding: '8px 0' }}>
                                    No batches recorded yet.
                                  </div>
                                ) : (
                                  <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                                    <thead>
                                      <tr style={{ color: '#64748b', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: '11px' }}>
                                        <th style={{ padding: '6px' }}>Batch No</th>
                                        <th style={{ padding: '6px' }}>Expiry Date</th>
                                        <th style={{ padding: '6px' }}>Supplier</th>
                                        {isAdmin && <th style={{ padding: '6px', textAlign: 'right' }}>Cost Price</th>}
                                        <th style={{ padding: '6px', textAlign: 'right' }}>MRP</th>
                                        <th style={{ padding: '6px', textAlign: 'right' }}>Selling Price</th>
                                        <th style={{ padding: '6px', textAlign: 'center' }}>In Stock</th>
                                        {isAdmin && <th style={{ padding: '6px', textAlign: 'right' }}>Audit</th>}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {med.batches.map((batch) => (
                                        <tr key={batch.id} style={{ borderBottom: '1px dotted #e2e8f0' }}>
                                          <td style={{ padding: '8px 6px', fontWeight: 700 }} className="mono">
                                            {batch.batch_number}
                                          </td>
                                          <td style={{ padding: '8px 6px' }}>
                                            <span style={{
                                              color: batch.is_expired ? '#e11d48' : (batch.is_near_expiry ? '#d97706' : '#059669'),
                                              fontWeight: 700
                                            }}>
                                              {batch.expiry_date} {batch.is_expired && '(Expired)'}
                                            </span>
                                          </td>
                                          <td style={{ padding: '8px 6px', color: '#475569' }}>
                                            {batch.supplier_name || 'Direct Wholesale'}
                                          </td>
                                          {isAdmin && (
                                            <td style={{ padding: '8px 6px', textAlign: 'right' }} className="mono">
                                              {currency}{parseFloat(batch.purchase_price).toFixed(2)}
                                            </td>
                                          )}
                                          <td style={{ padding: '8px 6px', textAlign: 'right' }} className="mono">
                                            {currency}{parseFloat(batch.mrp).toFixed(2)}
                                          </td>
                                          <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 800, color: '#059669' }} className="mono">
                                            {currency}{parseFloat(batch.selling_price).toFixed(2)}
                                          </td>
                                          <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                                            <span className="mono" style={{ fontWeight: 800, color: batch.pack_quantity === 0 ? '#e11d48' : '#0f172a' }}>
                                              {batch.pack_quantity}p ({batch.loose_quantity}u)
                                            </span>
                                          </td>
                                          {isAdmin && (
                                            <td style={{ padding: '8px 6px', textAlign: 'right' }}>
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  onOpenStockAdjust(batch);
                                                }}
                                                className="btn btn-secondary btn-sm"
                                                style={{ fontSize: '11px', padding: '2px 8px' }}
                                                title="Adjust stock quantity"
                                              >
                                                <Sliders size={12} /> Adjust
                                              </button>
                                            </td>
                                          )}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}
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
      )}

    </div>
  );
}
