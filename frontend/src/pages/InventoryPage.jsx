import React, { useState } from 'react';
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
  Camera
} from 'lucide-react';

export default function InventoryPage({ 
  medicines, 
  categories, 
  profile, 
  user,
  onOpenAddMedicine, 
  onOpenAddBatch, 
  onOpenStockAdjust,
  onOpenScanBill,
  onOpenExcelUpload,
  setActiveTab 
}) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [filterRx, setFilterRx] = useState('');
  const [expandedMedId, setExpandedMedId] = useState(null);

  const isAdmin = user?.is_superuser || user?.is_staff || user?.email?.includes('admin');
  const currency = profile?.currency_symbol || '₹';

  const filteredMedicines = medicines.filter(med => {
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
      
      {/* Top Action & Filter Bar */}
      <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        
        {/* Search & Category Dropdowns */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '2 1 220px' }}>
            <Search size={16} color="#0284c7" style={{ position: 'absolute', left: '12px', top: '11px' }} />
            <input
              type="text"
              className="input-field"
              style={{ paddingLeft: '36px', height: '38px', fontSize: '13px', background: '#f8fafc', borderColor: '#cbd5e1' }}
              placeholder="Search tablet, composition, rack location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="input-field"
            style={{ flex: '1 1 140px', height: '38px', fontSize: '12.5px' }}
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
            style={{ flex: '1 1 130px', height: '38px', fontSize: '12.5px' }}
            value={filterRx}
            onChange={(e) => setFilterRx(e.target.value)}
          >
            <option value="">All Drugs (Rx & OTC)</option>
            <option value="true">Rx Prescription Only</option>
            <option value="false">OTC / Non-Rx</option>
          </select>
        </div>

        {/* Action Buttons */}
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
          {!isAdmin && setActiveTab && (
            <button onClick={() => setActiveTab('pos')} className="btn btn-primary btn-sm">
              <ShoppingCart size={14} />
              <span>Open POS (F2)</span>
            </button>
          )}
        </div>
      </div>

      {/* Catalog Container */}
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
            {isAdmin ? `Drug Master Catalog (${filteredMedicines.length} items)` : `Stock Availability (${filteredMedicines.length} items)`}
          </div>
          <span style={{ fontSize: '11px', color: '#64748b' }}>
            Tap row to view batch expiry & stock
          </span>
        </div>

        {/* 1. DESKTOP DATA TABLE */}
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
              {filteredMedicines.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    No medicines match your search query.
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
                            {totalPacks} packs {totalPacks <= med.min_stock_alert && '⚠️ Low'}
                          </span>
                          <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '2px' }}>
                            Min: {med.min_stock_alert}p
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

        {/* 2. MOBILE MEDICINE CARDS VIEW */}
        <div className="mobile-only" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px' }}>
          {filteredMedicines.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
              No medicines found matching filters.
            </div>
          ) : (
            filteredMedicines.map((med) => {
              const isExpanded = expandedMedId === med.id;
              const totalPacks = med.total_stock_packs ?? (med.batches?.reduce((acc, b) => acc + (b.is_expired ? 0 : b.pack_quantity), 0) || 0);
              const isLow = totalPacks <= med.min_stock_alert;

              return (
                <div
                  key={med.id}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)'
                  }}
                >
                  {/* Top Bar: Name & Badges */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>{med.name}</span>
                        <span className="badge badge-cyan">{med.dosage_form}</span>
                        {med.requires_prescription && <span className="badge badge-rose">Rx</span>}
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#475569', marginTop: '2px' }}>
                        {med.generic_name || 'Standard Formulation'}
                      </div>
                    </div>

                    <span className={`badge ${totalPacks === 0 ? 'badge-rose' : (isLow ? 'badge-amber' : 'badge-emerald')}`} style={{ fontSize: '11.5px', fontWeight: 800 }}>
                      {totalPacks} pk
                    </span>
                  </div>

                  {/* Details Row: Rack & Manufacturer */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#64748b', borderTop: '1px solid #f8fafc', paddingTop: '6px' }}>
                    <div>
                      {med.rack_location ? (
                        <span style={{ color: '#0284c7', fontWeight: 700 }}>📍 {med.rack_location}</span>
                      ) : (
                        <span>Rack: -</span>
                      )}
                      <span> • {med.manufacturer || 'Direct'}</span>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      {isAdmin && (
                        <button
                          onClick={() => onOpenAddBatch(med.id)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '3px 8px', fontSize: '11px' }}
                        >
                          <PackagePlus size={12} color="#0284c7" />
                          <span>+ Stock</span>
                        </button>
                      )}
                      <button
                        onClick={() => toggleExpand(med.id)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '3px 8px', fontSize: '11px' }}
                      >
                        {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        <span>Batches ({med.batches?.length || 0})</span>
                      </button>
                    </div>
                  </div>

                  {/* Expanded Batches on Mobile */}
                  {isExpanded && (
                    <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '10px', marginTop: '4px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#0284c7', marginBottom: '6px' }}>
                        BATCH DETAILS & EXPIRY:
                      </div>

                      {(!med.batches || med.batches.length === 0) ? (
                        <div style={{ fontSize: '11px', color: '#64748b' }}>No active batches found.</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {med.batches.map(b => (
                            <div
                              key={b.id}
                              style={{
                                background: '#ffffff',
                                border: '1px solid #e2e8f0',
                                borderRadius: '6px',
                                padding: '8px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                              }}
                            >
                              <div>
                                <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>
                                  Batch #{b.batch_number}
                                </div>
                                <div style={{ fontSize: '10.5px', color: b.is_near_expiry ? '#d97706' : '#059669', fontWeight: 600 }}>
                                  Exp: {b.expiry_date}
                                </div>
                              </div>

                              <div style={{ textAlign: 'right' }}>
                                <div className="mono" style={{ fontSize: '12.5px', fontWeight: 800, color: '#059669' }}>
                                  {currency}{parseFloat(b.selling_price).toFixed(2)}
                                </div>
                                <div style={{ fontSize: '10.5px', color: '#475569' }}>
                                  Stock: <strong>{b.pack_quantity}p</strong>
                                </div>
                              </div>

                              {isAdmin && (
                                <button
                                  onClick={() => onOpenStockAdjust(b)}
                                  className="btn btn-secondary btn-sm"
                                  style={{ padding: '3px 6px', fontSize: '10px', marginLeft: '6px' }}
                                >
                                  <Sliders size={11} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
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
