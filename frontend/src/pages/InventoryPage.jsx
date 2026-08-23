import React, { useState } from 'react';
import { 
  Pill, 
  Search, 
  Plus, 
  PackagePlus, 
  Filter, 
  Sliders, 
  MapPin, 
  AlertCircle, 
  ChevronDown, 
  ChevronRight,
  ShieldCheck,
  Building
} from 'lucide-react';

export default function InventoryPage({ 
  medicines, 
  categories, 
  profile, 
  onOpenAddMedicine, 
  onOpenAddBatch, 
  onOpenStockAdjust 
}) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [filterRx, setFilterRx] = useState('');
  const [expandedMedId, setExpandedMedId] = useState(null);

  const currency = profile?.currency_symbol || '₹';

  // Filter medicines
  const filteredMedicines = medicines.filter((med) => {
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
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Top Action & Filter Bar */}
      <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
        
        {/* Search & Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '300px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} color="var(--primary)" style={{ position: 'absolute', left: '12px', top: '11px' }} />
            <input
              type="text"
              className="input-field"
              style={{ paddingLeft: '36px', height: '38px', fontSize: '13px' }}
              placeholder="Search by Drug Name, Salt, Manufacturer, Rack Location, Barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="input-field"
            style={{ width: '180px', height: '38px', fontSize: '12.5px' }}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            className="input-field"
            style={{ width: '150px', height: '38px', fontSize: '12.5px' }}
            value={filterRx}
            onChange={(e) => setFilterRx(e.target.value)}
          >
            <option value="">All Drugs (Rx & OTC)</option>
            <option value="true">Rx Prescription Only</option>
            <option value="false">OTC / Non-Rx</option>
          </select>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={onOpenAddBatch} className="btn btn-secondary">
            <PackagePlus size={16} color="#06b6d4" />
            <span>Stock Inward (F4)</span>
          </button>
          <button onClick={onOpenAddMedicine} className="btn btn-primary">
            <Plus size={16} />
            <span>+ Add Medicine (F3)</span>
          </button>
        </div>
      </div>

      {/* Catalog Table */}
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
            Medicine Inventory Catalog ({filteredMedicines.length} items)
          </div>
          <span style={{ fontSize: '11.5px', color: 'var(--text-dim)' }}>
            Click medicine row to inspect batch details & stock expiry
          </span>
        </div>

        <div className="data-table-container" style={{ border: 'none', borderRadius: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '3%' }}></th>
                <th style={{ width: '28%' }}>Brand & Generic Name</th>
                <th style={{ width: '14%' }}>Category & Form</th>
                <th style={{ width: '14%' }}>Manufacturer</th>
                <th style={{ width: '12%' }}>Rack / Location</th>
                <th style={{ width: '15%', textAlign: 'center' }}>Total Stock</th>
                <th style={{ width: '14%', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMedicines.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>
                    No medicines match your search criteria.
                  </td>
                </tr>
              ) : (
                filteredMedicines.map((med) => {
                  const isExpanded = expandedMedId === med.id;
                  const totalPacks = med.total_stock_packs ?? (med.batches?.reduce((acc, b) => acc + (b.is_expired ? 0 : b.pack_quantity), 0) || 0);
                  const isLow = totalPacks <= med.min_stock_alert;

                  return (
                    <React.Fragment key={med.id}>
                      <tr
                        onClick={() => toggleExpand(med.id)}
                        style={{ cursor: 'pointer', background: isExpanded ? 'rgba(6, 182, 212, 0.05)' : undefined }}
                      >
                        <td style={{ color: 'var(--text-dim)', textAlign: 'center' }}>
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: 700, color: '#ffffff', fontSize: '13.5px' }}>{med.name}</span>
                            {med.requires_prescription && <span className="badge badge-rose">Rx</span>}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {med.generic_name || 'Standard Composition'}
                          </div>
                        </td>
                        <td>
                          <div><span className="badge badge-cyan">{med.dosage_form}</span></div>
                          <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '3px' }}>
                            {med.category_name || 'General'}
                          </div>
                        </td>
                        <td style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                          {med.manufacturer || 'Direct'}
                        </td>
                        <td>
                          {med.rack_location ? (
                            <span style={{ fontSize: '12px', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <MapPin size={12} /> {med.rack_location}
                            </span>
                          ) : (
                            <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Unassigned</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`badge ${totalPacks === 0 ? 'badge-rose' : (isLow ? 'badge-amber' : 'badge-emerald')}`} style={{ fontSize: '12px', padding: '3px 10px' }}>
                            {totalPacks} packs {totalPacks <= med.min_stock_alert && '⚠️ Low'}
                          </span>
                          <div style={{ fontSize: '10.5px', color: 'var(--text-dim)', marginTop: '2px' }}>
                            Min: {med.min_stock_alert}p
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenAddBatch(med.id);
                            }}
                            className="btn btn-secondary btn-sm"
                            title="Add stock batch for this drug"
                          >
                            <PackagePlus size={13} color="#06b6d4" />
                            <span>+ Stock</span>
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Batch Details Drawer */}
                      {isExpanded && (
                        <tr>
                          <td colSpan="7" style={{ padding: '0', background: 'rgba(15, 23, 42, 0.9)' }}>
                            <div style={{ padding: '16px 24px', borderLeft: '3px solid #06b6d4' }}>
                              <div style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8', marginBottom: '8px', textTransform: 'uppercase' }}>
                                Active Batches for {med.name}
                              </div>

                              {(!med.batches || med.batches.length === 0) ? (
                                <div style={{ fontSize: '12px', color: 'var(--text-dim)', padding: '8px 0' }}>
                                  No batches recorded yet. Click <strong>+ Stock</strong> to inward inventory.
                                </div>
                              ) : (
                                <table style={{ width: '100%', fontSize: '11.5px', borderCollapse: 'collapse' }}>
                                  <thead>
                                    <tr style={{ color: 'var(--text-dim)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                                      <th style={{ padding: '6px' }}>Batch No</th>
                                      <th style={{ padding: '6px' }}>Expiry Date</th>
                                      <th style={{ padding: '6px' }}>Supplier</th>
                                      <th style={{ padding: '6px', textAlign: 'right' }}>Cost Price</th>
                                      <th style={{ padding: '6px', textAlign: 'right' }}>MRP</th>
                                      <th style={{ padding: '6px', textAlign: 'right' }}>Selling Price</th>
                                      <th style={{ padding: '6px', textAlign: 'center' }}>In Stock</th>
                                      <th style={{ padding: '6px', textAlign: 'right' }}>Audit</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {med.batches.map((batch) => (
                                      <tr key={batch.id} style={{ borderBottom: '1px dotted var(--border-subtle)' }}>
                                        <td style={{ padding: '6px', fontWeight: 700 }} className="mono">
                                          {batch.batch_number}
                                        </td>
                                        <td style={{ padding: '6px' }}>
                                          <span style={{
                                            color: batch.is_expired ? '#fb7185' : (batch.is_near_expiry ? '#fbbf24' : '#34d399'),
                                            fontWeight: 600
                                          }}>
                                            {batch.expiry_date}
                                            {batch.is_expired && ' (EXPIRED)'}
                                            {batch.is_near_expiry && ` (${batch.days_to_expiry}d left)`}
                                          </span>
                                        </td>
                                        <td style={{ padding: '6px', color: 'var(--text-muted)' }}>
                                          {batch.supplier_name || 'Direct'}
                                        </td>
                                        <td style={{ padding: '6px', textAlign: 'right' }} className="mono">
                                          {currency}{parseFloat(batch.purchase_price).toFixed(2)}
                                        </td>
                                        <td style={{ padding: '6px', textAlign: 'right' }} className="mono">
                                          {currency}{parseFloat(batch.mrp).toFixed(2)}
                                        </td>
                                        <td style={{ padding: '6px', textAlign: 'right', fontWeight: 700, color: '#34d399' }} className="mono">
                                          {currency}{parseFloat(batch.selling_price).toFixed(2)}
                                        </td>
                                        <td style={{ padding: '6px', textAlign: 'center', fontWeight: 700 }}>
                                          {batch.pack_quantity} packs ({batch.pack_size}s) {batch.loose_quantity > 0 ? `+ ${batch.loose_quantity}u` : ''}
                                        </td>
                                        <td style={{ padding: '6px', textAlign: 'right' }}>
                                          <button
                                            onClick={() => onOpenStockAdjust(batch)}
                                            className="btn btn-secondary btn-sm"
                                            style={{ padding: '2px 6px', fontSize: '10.5px' }}
                                          >
                                            <Sliders size={11} /> Adjust
                                          </button>
                                        </td>
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
    </div>
  );
}
