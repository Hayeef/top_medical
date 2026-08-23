import React, { useState } from 'react';
import { X, Sliders, AlertCircle, Save } from 'lucide-react';
import { inventoryAPI } from '../api';

export default function StockAdjustModal({ batch, onClose, onAdjusted }) {
  const [packDelta, setPackDelta] = useState(0);
  const [looseDelta, setLooseDelta] = useState(0);
  const [reason, setReason] = useState('Stock verification audit');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!batch) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (packDelta === 0 && looseDelta === 0) {
      setError('Please specify an adjustment quantity');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const updated = await inventoryAPI.adjustStock(
        batch.id, 
        parseInt(packDelta) || 0, 
        parseInt(looseDelta) || 0, 
        reason
      );
      onAdjusted(updated);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to adjust stock');
    } finally {
      setLoading(false);
    }
  };

  const newPacks = Math.max(0, batch.pack_quantity + (parseInt(packDelta) || 0));
  const newLoose = Math.max(0, batch.loose_quantity + (parseInt(looseDelta) || 0));

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: '480px' }}>
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sliders size={20} color="var(--primary)" />
            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Adjust Batch Stock</h3>
          </div>
          <button onClick={onClose} className="btn btn-secondary btn-sm" style={{ width: '32px', height: '32px', padding: 0 }}>
            <X size={16} />
          </button>
        </div>

        {error && (
          <div style={{ margin: '16px 24px 0', padding: '10px 14px', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: '8px', color: '#fb7185', fontSize: '13px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ padding: '12px', background: 'rgba(30, 41, 59, 0.5)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontWeight: 700, fontSize: '14px' }}>{batch.medicine_name}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Batch: <strong className="mono">{batch.batch_number}</strong> | Exp: {batch.expiry_date}
            </div>
            <div style={{ fontSize: '12px', color: '#38bdf8', marginTop: '4px' }}>
              Current: <strong>{batch.pack_quantity} packs</strong> + {batch.loose_quantity} loose
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                Pack Adjustment (+ / -)
              </label>
              <input
                type="number"
                className="input-field mono"
                placeholder="+5 or -2"
                value={packDelta}
                onChange={(e) => setPackDelta(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                Loose Adjustment (+ / -)
              </label>
              <input
                type="number"
                className="input-field mono"
                placeholder="+3 or -1"
                value={looseDelta}
                onChange={(e) => setLooseDelta(e.target.value)}
              />
            </div>
          </div>

          <div style={{ fontSize: '12px', color: '#34d399', background: 'rgba(16, 185, 129, 0.1)', padding: '8px 12px', borderRadius: '6px' }}>
            New Estimated Stock: <strong>{newPacks} packs</strong> + {newLoose} loose units
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
              Audit Reason / Notes
            </label>
            <input
              type="text"
              className="input-field"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Physical inventory count correction, damaged strip"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              <Save size={16} />
              <span>{loading ? 'Saving...' : 'Apply Adjustment'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
