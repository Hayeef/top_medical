import React, { useState } from 'react';
import { X, Stethoscope, Save, AlertCircle } from 'lucide-react';
import { billingAPI } from '../api';

export default function DoctorModal({ onClose, onCreated }) {
  const [formData, setFormData] = useState({
    name: '',
    specialization: 'General Physician',
    registration_number: '',
    hospital_name: '',
    phone: '',
    email: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Doctor name is required');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const docName = formData.name.startsWith('Dr.') ? formData.name : `Dr. ${formData.name}`;
      const created = await billingAPI.createDoctor({ ...formData, name: docName });
      onCreated(created);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save doctor profile');
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
            <Stethoscope size={20} color="var(--primary)" />
            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Register Prescribing Doctor</h3>
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
              Doctor's Full Name *
            </label>
            <input
              type="text"
              required
              className="input-field"
              placeholder="e.g. Dr. Rajesh Sharma"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              autoFocus
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                Specialization
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Cardiologist"
                value={formData.specialization}
                onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                Reg Number (MCI / State)
              </label>
              <input
                type="text"
                className="input-field mono"
                placeholder="e.g. KMC-12345"
                value={formData.registration_number}
                onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
              Clinic / Hospital Name
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Apollo Health City"
              value={formData.hospital_name}
              onChange={(e) => setFormData({ ...formData, hospital_name: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                Phone (Optional)
              </label>
              <input
                type="tel"
                className="input-field"
                placeholder="Doctor contact"
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
                placeholder="doctor@hospital.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              <Save size={16} />
              <span>{loading ? 'Saving...' : 'Register Doctor'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
