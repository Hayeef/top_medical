import React, { useState } from 'react';
import { X, Plus, Pill, AlertCircle, Save } from 'lucide-react';
import { inventoryAPI } from '../api';

export default function AddMedicineModal({ categories, onClose, onCreated }) {
  const [formData, setFormData] = useState({
    name: '',
    generic_name: '',
    category: categories[0]?.id || '',
    dosage_form: 'Tablet',
    strength: '',
    manufacturer: '',
    hsn_code: '3004',
    barcode: '',
    rack_location: '',
    min_stock_alert: 10,
    requires_prescription: false,
    gst_rate: '12.00',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Medicine name is required');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload = {
        ...formData,
        category: formData.category ? parseInt(formData.category) : null,
        min_stock_alert: parseInt(formData.min_stock_alert) || 10,
        gst_rate: parseFloat(formData.gst_rate) || 12.0,
      };
      const newMed = await inventoryAPI.createMedicine(payload);
      onCreated(newMed);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create medicine');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Pill size={20} color="var(--primary)" />
            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Add New Medicine to Catalog</h3>
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
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                Brand Name * (e.g. Augmentin 625 Duo)
              </label>
              <input
                type="text"
                className="input-field"
                required
                placeholder="Medicine Brand Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                autoFocus
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                Dosage Form
              </label>
              <select
                className="input-field"
                value={formData.dosage_form}
                onChange={(e) => setFormData({ ...formData, dosage_form: e.target.value })}
              >
                <option value="Tablet">Tablet</option>
                <option value="Capsule">Capsule</option>
                <option value="Syrup">Syrup / Liquid</option>
                <option value="Injection">Injection / Infusion</option>
                <option value="Ointment">Ointment / Gel / Cream</option>
                <option value="Drops">Eye / Ear Drops</option>
                <option value="Inhaler">Inhaler / Respules</option>
                <option value="Powder">Powder / Sachet</option>
                <option value="Device">Medical Device</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
              Generic Composition / Salt Name
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Amoxicillin (500mg) + Clavulanic Acid (125mg)"
              value={formData.generic_name}
              onChange={(e) => setFormData({ ...formData, generic_name: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                Category
              </label>
              <select
                className="input-field"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="">-- Select Category --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                Strength / Unit
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. 625mg / 100ml"
                value={formData.strength}
                onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                Manufacturer / Brand
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Sun Pharma / Cipla"
                value={formData.manufacturer}
                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                Rack / Shelf Location
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Rack A-3, Fridge 1"
                value={formData.rack_location}
                onChange={(e) => setFormData({ ...formData, rack_location: e.target.value })}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                Barcode / SKU
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="EAN / SKU Barcode"
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                HSN Code
              </label>
              <input
                type="text"
                className="input-field"
                value={formData.hsn_code}
                onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                GST Tax Rate (%)
              </label>
              <select
                className="input-field"
                value={formData.gst_rate}
                onChange={(e) => setFormData({ ...formData, gst_rate: e.target.value })}
              >
                <option value="0.00">0% (Nil / Exempt)</option>
                <option value="5.00">5% GST</option>
                <option value="12.00">12% GST (Standard Medicine)</option>
                <option value="18.00">18% GST</option>
                <option value="28.00">28% GST</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                Low Stock Alert Threshold (Packs)
              </label>
              <input
                type="number"
                min="1"
                className="input-field"
                value={formData.min_stock_alert}
                onChange={(e) => setFormData({ ...formData, min_stock_alert: e.target.value })}
              />
            </div>
          </div>

          {/* Prescription checkbox */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 14px',
            background: 'rgba(30, 41, 59, 0.4)',
            borderRadius: '8px',
            border: '1px solid var(--border-subtle)'
          }}>
            <input
              type="checkbox"
              id="rx_check"
              checked={formData.requires_prescription}
              onChange={(e) => setFormData({ ...formData, requires_prescription: e.target.checked })}
              style={{ width: '16px', height: '16px', accentColor: '#06b6d4', cursor: 'pointer' }}
            />
            <label htmlFor="rx_check" style={{ fontSize: '13px', cursor: 'pointer', color: 'var(--text-main)' }}>
              <strong>Requires Doctor Prescription (Schedule H / H1 / Rx)</strong>
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              <Save size={16} />
              <span>{loading ? 'Saving...' : 'Save Medicine'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
