import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  ShieldAlert, 
  PackageX, 
  Clock, 
  ArrowRight, 
  RefreshCw, 
  PackagePlus, 
  Sliders,
  CheckCircle2,
  Trash2
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

  // Calculate value locked in near-expiry stock
  const nearExpiryValue = expiringBatches.reduce((acc, b) => acc + (parseFloat(b.selling_price) * b.pack_quantity), 0);
  const expiredValue = expiredBatches.reduce((acc, b) => acc + (parseFloat(b.purchase_price) * b.pack_quantity), 0);

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        
        <div
          onClick={() => setActiveTab('expiring')}
          className="glass-panel glass-card-interactive"
          style={{
            padding: '18px',
            cursor: 'pointer',
            borderLeft: activeTab === 'expiring' ? '3px solid #f59e0b' : undefined,
            background: activeTab === 'expiring' ? 'rgba(245, 158, 11, 0.08)' : undefined
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '11.5px', fontWeight: 600, color: '#fbbf24', textTransform: 'uppercase' }}>Near Expiry Radar</div>
              <div className="mono" style={{ fontSize: '26px', fontWeight: 800, color: '#fbbf24', marginTop: '4px' }}>
                {expiringBatches.length} Batches
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Value: <strong>{currency}{nearExpiryValue.toFixed(2)}</strong>
              </div>
            </div>
            <Clock size={28} color="#f59e0b" opacity={0.8} />
          </div>
        </div>

        <div
          onClick={() => setActiveTab('expired')}
          className="glass-panel glass-card-interactive"
          style={{
            padding: '18px',
            cursor: 'pointer',
            borderLeft: activeTab === 'expired' ? '3px solid #f43f5e' : undefined,
            background: activeTab === 'expired' ? 'rgba(244, 63, 94, 0.08)' : undefined
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '11.5px', fontWeight: 600, color: '#fb7185', textTransform: 'uppercase' }}>Expired (Quarantine)</div>
              <div className="mono" style={{ fontSize: '26px', fontWeight: 800, color: '#fb7185', marginTop: '4px' }}>
                {expiredBatches.length} Batches
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Cost Loss: <strong>{currency}{expiredValue.toFixed(2)}</strong>
              </div>
            </div>
            <PackageX size={28} color="#f43f5e" opacity={0.8} />
          </div>
        </div>

        <div
          onClick={() => setActiveTab('low_stock')}
          className="glass-panel glass-card-interactive"
          style={{
            padding: '18px',
            cursor: 'pointer',
            borderLeft: activeTab === 'low_stock' ? '3px solid #06b6d4' : undefined,
            background: activeTab === 'low_stock' ? 'rgba(6, 182, 212, 0.08)' : undefined
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '11.5px', fontWeight: 600, color: '#38bdf8', textTransform: 'uppercase' }}>Low Stock / Reorder</div>
              <div className="mono" style={{ fontSize: '26px', fontWeight: 800, color: '#38bdf8', marginTop: '4px' }}>
                {lowStockMeds.length} Drugs
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Threshold reached
              </div>
            </div>
            <AlertTriangle size={28} color="#06b6d4" opacity={0.8} />
          </div>
        </div>
      </div>

      {/* Main Alert Content Panel */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        
        {/* Header & Filter Controls */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          background: 'rgba(15, 23, 42, 0.6)'
        }}>
          <div style={{ display: 'flex', gap: '8px' }}>
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
              Expired Stock ({expiredBatches.length})
            </button>
            <button
              onClick={() => setActiveTab('low_stock')}
              className={`btn btn-sm ${activeTab === 'low_stock' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Low Stock ({lowStockMeds.length})
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {activeTab === 'expiring' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                <span>Threshold:</span>
                <select
                  className="input-field"
                  style={{ width: '130px', height: '32px', fontSize: '11.5px', padding: '2px 8px' }}
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(parseInt(e.target.value))}
                >
                  <option value="30">Next 30 Days</option>
                  <option value="60">Next 60 Days</option>
                  <option value="90">Next 90 Days</option>
                  <option value="180">Next 180 Days</option>
                </select>
              </div>
            )}

            <button onClick={loadAlerts} className="btn btn-secondary btn-sm" title="Refresh alerts">
              <RefreshCw size={13} />
            </button>
          </div>
        </div>

        {/* Tab 1: Near Expiry Batches */}
        {activeTab === 'expiring' && (
          <div className="data-table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Drug Name</th>
                  <th>Batch No</th>
                  <th>Expiry Date</th>
                  <th style={{ textAlign: 'center' }}>Days Remaining</th>
                  <th>Rack Location</th>
                  <th style={{ textAlign: 'center' }}>Stock In Hand</th>
                  <th style={{ textAlign: 'right' }}>Retail Value</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {expiringBatches.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>
                      🎉 Excellent! No medicine batches expiring within the next {expiryDays} days.
                    </td>
                  </tr>
                ) : (
                  expiringBatches.map((batch) => (
                    <tr key={batch.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: '#f8fafc' }}>{batch.medicine_name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{batch.medicine_generic}</div>
                      </td>
                      <td className="mono" style={{ fontWeight: 600 }}>{batch.batch_number}</td>
                      <td>
                        <span style={{ color: '#fbbf24', fontWeight: 700 }}>{batch.expiry_date}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge badge-amber">
                          {batch.days_to_expiry} days left
                        </span>
                      </td>
                      <td style={{ fontSize: '12px', color: '#38bdf8' }}>{batch.rack_location || 'Main Shelf'}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{batch.pack_quantity} packs</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#34d399' }} className="mono">
                        {currency}{(parseFloat(batch.selling_price) * batch.pack_quantity).toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => onOpenStockAdjust(batch)}
                          className="btn btn-secondary btn-sm"
                        >
                          <Sliders size={12} /> Audit Stock
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Expired Batches (Quarantine) */}
        {activeTab === 'expired' && (
          <div className="data-table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Drug Name</th>
                  <th>Batch No</th>
                  <th>Expiry Date</th>
                  <th>Supplier / Distributor</th>
                  <th style={{ textAlign: 'center' }}>Packs to Discard</th>
                  <th style={{ textAlign: 'right' }}>Purchase Cost Loss</th>
                  <th style={{ textAlign: 'right' }}>Quarantine Action</th>
                </tr>
              </thead>
              <tbody>
                {expiredBatches.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#34d399' }}>
                      <CheckCircle2 size={32} style={{ margin: '0 auto 8px', display: 'block' }} />
                      No expired stock found in inventory.
                    </td>
                  </tr>
                ) : (
                  expiredBatches.map((batch) => (
                    <tr key={batch.id} style={{ background: 'rgba(244, 63, 94, 0.05)' }}>
                      <td>
                        <div style={{ fontWeight: 700, color: '#fb7185' }}>{batch.medicine_name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{batch.medicine_generic}</div>
                      </td>
                      <td className="mono" style={{ fontWeight: 700 }}>{batch.batch_number}</td>
                      <td style={{ color: '#fb7185', fontWeight: 700 }}>{batch.expiry_date} (EXPIRED)</td>
                      <td style={{ color: 'var(--text-muted)' }}>{batch.supplier_name || 'Direct Vendor'}</td>
                      <td style={{ textAlign: 'center', fontWeight: 800, color: '#fb7185' }}>
                        {batch.pack_quantity} packs
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#fb7185' }} className="mono">
                        {currency}{(parseFloat(batch.purchase_price) * batch.pack_quantity).toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => onOpenStockAdjust(batch)}
                          className="btn btn-danger btn-sm"
                        >
                          <Trash2 size={12} /> Mark Quarantined / Return
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Low Stock Reorder List */}
        {activeTab === 'low_stock' && (
          <div className="data-table-container" style={{ border: 'none', borderRadius: 0 }}>
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
                    <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#34d399' }}>
                      All medicines are well above reorder threshold.
                    </td>
                  </tr>
                ) : (
                  lowStockMeds.map((med) => (
                    <tr key={med.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: '#f8fafc' }}>{med.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{med.generic_name}</div>
                      </td>
                      <td><span className="badge badge-cyan">{med.category_name || med.dosage_form}</span></td>
                      <td style={{ color: 'var(--text-muted)' }}>{med.manufacturer || 'General'}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge badge-rose" style={{ fontSize: '12px', padding: '3px 10px' }}>
                          {med.current_stock} packs left
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', color: 'var(--text-dim)' }}>{med.min_stock_alert} packs</td>
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
        )}
      </div>
    </div>
  );
}
