import React, { useState } from 'react';
import { X, UserPlus, Save, AlertCircle } from 'lucide-react';
import { billingAPI } from '../api';

export default function CustomerModal({ doctors, onClose, onCreated }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    preferred_doctor: '',
    credit_balance: '0.00',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      setError('Customer name and phone number are required');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const payload = {
        ...formData,
        preferred_doctor: formData.preferred_doctor ? parseInt(formData.preferred_doctor) : null,
        credit_balance: parseFloat(formData.credit_balance) || 0.0,
      };
      const created = await billingAPI.createCustomer(payload);
      onCreated(created);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save customer');
    } finally {
      setLoading(false);
    }
  };

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
            <UserPlus size={20} color="var(--primary)" />
            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Add New Customer</h3>
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

        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
              Full Name *
            </label>
            <input
              type="text"
              required
              className="input-field"
              placeholder="e.g. Rahul Sharma"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              autoFocus
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                Mobile Number *
              </label>
              <input
                type="tel"
                required
                className="input-field mono"
                placeholder="10-digit mobile"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                Email (Optional)
              </label>
              <input
                type="email"
                className="input-field"
                placeholder="patient@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
              Address / Area
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="House #, Street, Area"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
              Preferred Doctor (Optional)
            </label>
            <select
              className="input-field"
              value={formData.preferred_doctor}
              onChange={(e) => setFormData({ ...formData, preferred_doctor: e.target.value })}
            >
              <option value="">-- None / Walk-in --</option>
              {doctors?.map((d) => (
                <option key={d.id} value={d.id}>{d.name} ({d.specialization})</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              <Save size={16} />
              <span>{loading ? 'Saving...' : 'Save Customer'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
