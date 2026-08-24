import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  PackageX, 
  Clock, 
  PackagePlus, 
  Sliders, 
  CheckCircle2, 
  Trash2,
  RefreshCw
} from 'lucide-react';
import { inventoryAPI } from '../api';

export default function AlertsPage({ profile, onOpenAddBatch, onOpenStockAdjust }) {
  const [activeTab, setActiveTab] = useState('expiring'); // 'expiring', 'expired', 'low_stock'
  const [expiringBatches, setExpiringBatches] = useState([]);
  const [expiredBatches, setExpiredBatches] = useState([]);
  const [lowStockMeds, setLowStockMeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expiryDays, setExpiryDays] = useState(90);

  const currency = profile?.currency_symbol || '₹';

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const [expiring, expired, low] = await Promise.all([
        inventoryAPI.getExpiringSoon(expiryDays),
        inventoryAPI.getExpired(),
        inventoryAPI.getLowStock(),
      ]);
      setExpiringBatches(expiring || []);
      setExpiredBatches(expired || []);
      setLowStockMeds(low || []);
    } catch (err) {
      console.error('Failed to load alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, [expiryDays]);

  const nearExpiryValue = expiringBatches.reduce((acc, b) => acc + (parseFloat(b.selling_price) * b.pack_quantity), 0);
  const expiredValue = expiredBatches.reduce((acc, b) => acc + (parseFloat(b.purchase_price) * b.pack_quantity), 0);

  return (
    <div className="main-page-wrapper">
      
      {/* Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        
        <div
          onClick={() => setActiveTab('expiring')}
          className="glass-panel glass-card-interactive"
          style={{
            padding: '16px',
            cursor: 'pointer',
            borderLeft: activeTab === 'expiring' ? '4px solid #f59e0b' : undefined,
            background: activeTab === 'expiring' ? '#fffbeb' : '#ffffff'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#d97706', textTransform: 'uppercase' }}>Near Expiry Radar</div>
              <div className="mono" style={{ fontSize: '24px', fontWeight: 900, color: '#d97706', marginTop: '4px' }}>
                {expiringBatches.length} Batches
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                Value: <strong>{currency}{nearExpiryValue.toFixed(2)}</strong>
              </div>
            </div>
            <Clock size={26} color="#f59e0b" />
          </div>
        </div>

        <div
          onClick={() => setActiveTab('expired')}
          className="glass-panel glass-card-interactive"
          style={{
            padding: '16px',
            cursor: 'pointer',
            borderLeft: activeTab === 'expired' ? '4px solid #ef4444' : undefined,
            background: activeTab === 'expired' ? '#fef2f2' : '#ffffff'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#e11d48', textTransform: 'uppercase' }}>Expired (Quarantine)</div>
              <div className="mono" style={{ fontSize: '24px', fontWeight: 900, color: '#e11d48', marginTop: '4px' }}>
                {expiredBatches.length} Batches
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                Cost Loss: <strong>{currency}{expiredValue.toFixed(2)}</strong>
              </div>
            </div>
            <PackageX size={26} color="#ef4444" />
          </div>
        </div>

        <div
          onClick={() => setActiveTab('low_stock')}
          className="glass-panel glass-card-interactive"
          style={{
            padding: '16px',
            cursor: 'pointer',
            borderLeft: activeTab === 'low_stock' ? '4px solid #0284c7' : undefined,
            background: activeTab === 'low_stock' ? '#f0f9ff' : '#ffffff'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase' }}>Low Stock / Reorder</div>
              <div className="mono" style={{ fontSize: '24px', fontWeight: 900, color: '#0284c7', marginTop: '4px' }}>
                {lowStockMeds.length} Drugs
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                Below min reorder limit
              </div>
            </div>
            <AlertTriangle size={26} color="#0284c7" />
          </div>
        </div>
      </div>

      {/* Main Alert Content Panel */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        
        {/* Header & Filter Controls */}
        <div style={{
          padding: '14px 16px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          background: '#f8fafc'
        }}>
          <div className="mobile-scroll-pills" style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => setActiveTab('expiring')}
              className={`btn btn-sm ${activeTab === 'expiring' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Expiring Soon ({expiringBatches.length})
            </button>
            <button
              onClick={() => setActiveTab('expired')}
              className={`btn btn-sm ${activeTab === 'expired' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Expired ({expiredBatches.length})
            </button>
            <button
              onClick={() => setActiveTab('low_stock')}
              className={`btn btn-sm ${activeTab === 'low_stock' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Low Stock ({lowStockMeds.length})
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {activeTab === 'expiring' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#475569' }}>
                <span>Days:</span>
                <select
                  className="input-field"
                  style={{ width: '120px', height: '32px', fontSize: '11.5px', padding: '2px 6px' }}
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(parseInt(e.target.value))}
                >
                  <option value="30">&lt;30 Days</option>
                  <option value="60">&lt;60 Days</option>
                  <option value="90">&lt;90 Days</option>
                  <option value="180">&lt;180 Days</option>
                </select>
              </div>
            )}
            <button onClick={loadAlerts} className="btn btn-secondary btn-sm" title="Refresh">
              <RefreshCw size={13} className={loading ? 'spin' : ''} />
            </button>
          </div>
        </div>

        {/* TAB 1: EXPIRING SOON */}
        {activeTab === 'expiring' && (
          <>
            <div className="data-table-container desktop-only" style={{ border: 'none', borderRadius: 0 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Drug Name</th>
                    <th>Batch</th>
                    <th>Expiry Date</th>
                    <th style={{ textAlign: 'center' }}>Urgency</th>
                    <th>Rack</th>
                    <th style={{ textAlign: 'center' }}>Stock</th>
                    <th style={{ textAlign: 'right' }}>Retail Value</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {expiringBatches.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: '#059669' }}>
                        🎉 Excellent! No medicine batches expiring within the next {expiryDays} days.
                      </td>
                    </tr>
                  ) : (
                    expiringBatches.map((batch) => (
                      <tr key={batch.id}>
                        <td>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{batch.medicine_name}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{batch.medicine_generic}</div>
                        </td>
                        <td className="mono" style={{ fontWeight: 600 }}>{batch.batch_number}</td>
                        <td>
                          <span style={{ color: '#d97706', fontWeight: 700 }}>{batch.expiry_date}</span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="badge badge-amber">
                            {batch.days_to_expiry}d left
                          </span>
                        </td>
                        <td style={{ fontSize: '12px', color: '#0284c7' }}>{batch.rack_location || 'Main'}</td>
                        <td style={{ textAlign: 'center', fontWeight: 700 }}>{batch.pack_quantity}p</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#059669' }} className="mono">
                          {currency}{(parseFloat(batch.selling_price) * batch.pack_quantity).toFixed(2)}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => onOpenStockAdjust(batch)}
                            className="btn btn-secondary btn-sm"
                          >
                            <Sliders size={12} /> Adjust
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="mobile-only" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px' }}>
              {expiringBatches.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#059669' }}>
                  No batches expiring within {expiryDays} days.
                </div>
              ) : (
                expiringBatches.map((batch) => (
                  <div
                    key={batch.id}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #fed7aa',
                      borderRadius: '12px',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>{batch.medicine_name}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>Batch: {batch.batch_number}</div>
                      </div>
                      <span className="badge badge-amber" style={{ fontWeight: 800 }}>
                        {batch.days_to_expiry}d left
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px', color: '#475569' }}>
                      <div>Expiry: <strong style={{ color: '#d97706' }}>{batch.expiry_date}</strong></div>
                      <div>Stock: <strong>{batch.pack_quantity} packs</strong></div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f8fafc', paddingTop: '6px' }}>
                      <div className="mono" style={{ fontWeight: 800, color: '#059669', fontSize: '13px' }}>
                        Value: {currency}{(parseFloat(batch.selling_price) * batch.pack_quantity).toFixed(2)}
                      </div>
                      <button
                        onClick={() => onOpenStockAdjust(batch)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 10px', fontSize: '11px' }}
                      >
                        <Sliders size={12} /> Adjust Stock
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* TAB 2: EXPIRED (QUARANTINE) */}
        {activeTab === 'expired' && (
          <>
            <div className="data-table-container desktop-only" style={{ border: 'none', borderRadius: 0 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Drug Name</th>
                    <th>Batch No</th>
                    <th>Expiry Date</th>
                    <th>Supplier</th>
                    <th style={{ textAlign: 'center' }}>Packs to Discard</th>
                    <th style={{ textAlign: 'right' }}>Cost Loss</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {expiredBatches.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: '#059669' }}>
                        <CheckCircle2 size={28} style={{ margin: '0 auto 6px', display: 'block' }} />
                        No expired stock found in inventory.
                      </td>
                    </tr>
                  ) : (
                    expiredBatches.map((batch) => (
                      <tr key={batch.id} style={{ background: '#fff1f2' }}>
                        <td>
                          <div style={{ fontWeight: 700, color: '#e11d48' }}>{batch.medicine_name}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{batch.medicine_generic}</div>
                        </td>
                        <td className="mono" style={{ fontWeight: 700 }}>{batch.batch_number}</td>
                        <td style={{ color: '#e11d48', fontWeight: 700 }}>{batch.expiry_date} (EXPIRED)</td>
                        <td style={{ color: '#475569' }}>{batch.supplier_name || 'Direct'}</td>
                        <td style={{ textAlign: 'center', fontWeight: 800, color: '#e11d48' }}>
                          {batch.pack_quantity}p
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#e11d48' }} className="mono">
                          {currency}{(parseFloat(batch.purchase_price) * batch.pack_quantity).toFixed(2)}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => onOpenStockAdjust(batch)}
                            className="btn btn-danger btn-sm"
                          >
                            <Trash2 size={12} /> Quarantine
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards for Expired */}
            <div className="mobile-only" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px' }}>
              {expiredBatches.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#059669' }}>
                  No expired stock found in inventory.
                </div>
              ) : (
                expiredBatches.map((batch) => (
                  <div
                    key={batch.id}
                    style={{
                      background: '#fff1f2',
                      border: '1px solid #fecdd3',
                      borderRadius: '12px',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '14px', color: '#e11d48' }}>{batch.medicine_name}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>Batch: {batch.batch_number}</div>
                      </div>
                      <span className="badge badge-rose" style={{ fontWeight: 800 }}>EXPIRED</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px' }}>
                      <div style={{ color: '#e11d48', fontWeight: 700 }}>Expired: {batch.expiry_date}</div>
                      <div>Quantity: <strong>{batch.pack_quantity} packs</strong></div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #fecdd3', paddingTop: '6px' }}>
                      <div className="mono" style={{ fontWeight: 800, color: '#e11d48', fontSize: '13px' }}>
                        Loss: {currency}{(parseFloat(batch.purchase_price) * batch.pack_quantity).toFixed(2)}
                      </div>
                      <button
                        onClick={() => onOpenStockAdjust(batch)}
                        className="btn btn-danger btn-sm"
                        style={{ padding: '4px 10px', fontSize: '11px' }}
                      >
                        <Trash2 size={12} /> Quarantine
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* TAB 3: LOW STOCK REORDER */}
        {activeTab === 'low_stock' && (
          <>
            <div className="data-table-container desktop-only" style={{ border: 'none', borderRadius: 0 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Drug Name & Generic</th>
                    <th>Category</th>
                    <th>Manufacturer</th>
                    <th style={{ textAlign: 'center' }}>Current Stock</th>
                    <th style={{ textAlign: 'center' }}>Alert Threshold</th>
                    <th style={{ textAlign: 'right' }}>Purchase Order</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockMeds.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '36px', color: '#059669' }}>
                        All medicines are well above reorder threshold.
                      </td>
                    </tr>
                  ) : (
                    lowStockMeds.map((med) => (
                      <tr key={med.id}>
                        <td>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{med.name}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{med.generic_name}</div>
                        </td>
                        <td><span className="badge badge-cyan">{med.category_name || med.dosage_form}</span></td>
                        <td style={{ color: '#475569' }}>{med.manufacturer || 'General'}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="badge badge-rose" style={{ fontSize: '12px', padding: '3px 10px' }}>
                            {med.current_stock} packs left
                          </span>
                        </td>
                        <td style={{ textAlign: 'center', color: '#64748b' }}>{med.min_stock_alert} packs</td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => onOpenAddBatch(med.id)}
                            className="btn btn-emerald btn-sm"
                          >
                            <PackagePlus size={13} /> + Inward Stock
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards for Low Stock */}
            <div className="mobile-only" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px' }}>
              {lowStockMeds.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#059669' }}>
                  All medicines are well above reorder threshold.
                </div>
              ) : (
                lowStockMeds.map((med) => (
                  <div
                    key={med.id}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #bae6fd',
                      borderRadius: '12px',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>{med.name}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{med.generic_name}</div>
                      </div>
                      <span className="badge badge-rose" style={{ fontWeight: 800 }}>
                        {med.current_stock} pk left
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px', color: '#475569' }}>
                      <div>Reorder Level: <strong>{med.min_stock_alert} pk</strong></div>
                      <div>{med.manufacturer || 'Direct'}</div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #f8fafc', paddingTop: '6px' }}>
                      <button
                        onClick={() => onOpenAddBatch(med.id)}
                        className="btn btn-emerald btn-sm"
                        style={{ padding: '4px 12px', fontSize: '11.5px' }}
                      >
                        <PackagePlus size={13} /> + Inward Stock
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
