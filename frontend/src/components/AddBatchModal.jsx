import React, { useState } from 'react';
import { X, PackagePlus, AlertCircle, Save, Calendar, DollarSign } from 'lucide-react';
import { inventoryAPI } from '../api';

export default function AddBatchModal({ medicines, suppliers, defaultMedicineId, onClose, onCreated }) {
  const [formData, setFormData] = useState({
    medicine: defaultMedicineId || (medicines[0]?.id || ''),
    supplier: suppliers[0]?.id || '',
    batch_number: '',
    expiry_date: '',
    mfg_date: '',
    purchase_price: '',
    mrp: '',
    selling_price: '',
    pack_size: 10,
    pack_quantity: 10,
    loose_quantity: 0,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Auto calculate profit margin preview
  const cp = parseFloat(formData.purchase_price) || 0;
  const sp = parseFloat(formData.selling_price) || 0;
  const marginPct = cp > 0 ? (((sp - cp) / cp) * 100).toFixed(1) : '0';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.medicine) {
      setError('Please select a medicine');
      return;
    }
    if (!formData.batch_number.trim()) {
      setError('Batch number is required');
      return;
    }
    if (!formData.expiry_date) {
      setError('Expiry date is required');
      return;
    }
    if (!formData.selling_price || parseFloat(formData.selling_price) <= 0) {
      setError('Valid selling price is required');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const payload = {
        medicine: parseInt(formData.medicine),
        supplier: formData.supplier ? parseInt(formData.supplier) : null,
        batch_number: formData.batch_number.trim().toUpperCase(),
        expiry_date: formData.expiry_date,
        mfg_date: formData.mfg_date || null,
        purchase_price: parseFloat(formData.purchase_price) || 0,
        mrp: parseFloat(formData.mrp) || parseFloat(formData.selling_price),
        selling_price: parseFloat(formData.selling_price),
        pack_size: parseInt(formData.pack_size) || 10,
        pack_quantity: parseInt(formData.pack_quantity) || 0,
        loose_quantity: parseInt(formData.loose_quantity) || 0,
      };

      const newBatch = await inventoryAPI.createBatch(payload);
      onCreated(newBatch);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to add batch stock');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: '620px' }}>
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <PackagePlus size={20} color="var(--primary)" />
            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Inward Stock / New Batch Entry</h3>
          </div>
          <button onClick={onClose} className="btn btn-secondary btn-sm" style={{ width: '32px', height: '32px', padding: 0 }}>
            <X size={16} />
          </button>
        </div>

        {error && (
          <div style={{ margin: '16px 24px 0', padding: '10px 14px', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: '8px', color: '#fb7185', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
              Select Medicine *
            </label>
            <select
              className="input-field"
              required
              value={formData.medicine}
              onChange={(e) => setFormData({ ...formData, medicine: e.target.value })}
            >
              <option value="">-- Choose Medicine --</option>
              {medicines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.dosage_form} - {m.strength || 'Standard'}) {m.rack_location ? `[${m.rack_location}]` : ''}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                Supplier / Distributor
              </label>
              <select
                className="input-field"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
              >
                <option value="">-- Direct Purchase / No Supplier --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                Batch Number * (e.g. BT-99214)
              </label>
              <input
                type="text"
                className="input-field mono"
                required
                placeholder="Batch #"
                value={formData.batch_number}
                onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                Expiry Date *
              </label>
              <input
                type="date"
                className="input-field"
                required
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                Mfg Date (Optional)
              </label>
              <input
                type="date"
                className="input-field"
                value={formData.mfg_date}
                onChange={(e) => setFormData({ ...formData, mfg_date: e.target.value })}
              />
            </div>
          </div>

          {/* Pricing Row */}
          <div style={{
            background: '#f8fafc',
            padding: '14px',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase' }}>
              Pricing & Margin
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                  Purchase Price (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="input-field mono"
                  placeholder="Cost Price"
                  value={formData.purchase_price}
                  onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                  MRP (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="input-field mono"
                  placeholder="MRP"
                  value={formData.mrp}
                  onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#059669', marginBottom: '4px', display: 'block' }}>
                  Selling Price (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="input-field mono"
                  required
                  placeholder="Sale Price"
                  value={formData.selling_price}
                  onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#64748b', borderTop: '1px solid #e2e8f0', paddingTop: '8px', flexWrap: 'wrap', gap: '4px' }}>
              <span>Margin: <strong style={{ color: marginPct >= 0 ? '#059669' : '#e11d48' }}>{marginPct}%</strong></span>
              <span>Per Unit (loose): <strong>₹{formData.pack_size > 0 ? (sp / formData.pack_size).toFixed(2) : sp}</strong></span>
            </div>
          </div>

          {/* Stock Quantity Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                Units Per Pack (e.g. 10s)
              </label>
              <input
                type="number"
                min="1"
                className="input-field"
                value={formData.pack_size}
                onChange={(e) => setFormData({ ...formData, pack_size: e.target.value })}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#38bdf8', marginBottom: '4px', display: 'block' }}>
                Full Packs Received *
              </label>
              <input
                type="number"
                min="0"
                className="input-field mono"
                required
                value={formData.pack_quantity}
                onChange={(e) => setFormData({ ...formData, pack_quantity: e.target.value })}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                Loose Units (if any)
              </label>
              <input
                type="number"
                min="0"
                className="input-field mono"
                value={formData.loose_quantity}
                onChange={(e) => setFormData({ ...formData, loose_quantity: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              <Save size={16} />
              <span>{loading ? 'Adding...' : 'Add Inward Batch'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
