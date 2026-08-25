import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Building2, 
  ShieldCheck, 
  FileText, 
  Save, 
  QrCode, 
  CheckCircle,
  BadgeCheck
} from 'lucide-react';
import { billingAPI } from '../api';
import StaffManagementCard from '../components/StaffManagementCard';

export default function SettingsPage({ profile, onProfileUpdated, onStaffUpdated }) {
  const [formData, setFormData] = useState({
    name: '',
    tagline: '',
    address: '',
    phone: '',
    email: '',
    gstin: '',
    dl_number_20b: '',
    dl_number_21b: '',
    fssai_number: '',
    currency_symbol: '₹',
    invoice_footer_note: '',
    upi_id: '',
  });

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || 'Top Medical Pharmacy',
        tagline: profile.tagline || '',
        address: profile.address || '',
        phone: profile.phone || '',
        email: profile.email || '',
        gstin: profile.gstin || '',
        dl_number_20b: profile.dl_number_20b || '',
        dl_number_21b: profile.dl_number_21b || '',
        fssai_number: profile.fssai_number || '',
        currency_symbol: profile.currency_symbol || '₹',
        invoice_footer_note: profile.invoice_footer_note || '',
        upi_id: profile.upi_id || '',
      });
    }
  }, [profile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    try {
      const updated = await billingAPI.updateProfile(formData);
      onProfileUpdated(updated);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      alert(`Failed to save settings: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="main-page-wrapper" style={{ maxWidth: '900px', margin: '0 auto' }}>
      
      {/* Header */}
      <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>Pharmacy Settings & Compliance</h2>
          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
            Store details, Drug License (DL-20B/21B), GSTIN, and POS receipt config.
          </p>
        </div>
        {success && (
          <span className="badge badge-emerald" style={{ padding: '6px 12px', fontSize: '12px' }}>
            <CheckCircle size={14} /> Settings Saved!
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Basic Business Details */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
            <Building2 size={18} color="#0284c7" />
            <h3 style={{ fontSize: '14.5px', fontWeight: 800 }}>Business & Contact Profile</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px', display: 'block' }}>
                Pharmacy Name *
              </label>
              <input
                type="text"
                required
                className="input-field"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px', display: 'block' }}>
                Tagline / Slogan
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. 24/7 Trusted Healthcare"
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px', display: 'block' }}>
              Full Store Address (Printed on Receipts)
            </label>
            <textarea
              className="input-field"
              rows="2"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px', display: 'block' }}>
                Phone Number(s)
              </label>
              <input
                type="text"
                className="input-field"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px', display: 'block' }}>
                Contact Email
              </label>
              <input
                type="email"
                className="input-field"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px', display: 'block' }}>
                Currency Symbol
              </label>
              <input
                type="text"
                className="input-field"
                value={formData.currency_symbol}
                onChange={(e) => setFormData({ ...formData, currency_symbol: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Legal & Drug Compliance */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
            <ShieldCheck size={18} color="#10b981" />
            <h3 style={{ fontSize: '14.5px', fontWeight: 800 }}>Drug Licensing & GST Compliance</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px', display: 'block' }}>
                Drug License No. (DL 20B) *
              </label>
              <input
                type="text"
                required
                className="input-field mono"
                placeholder="e.g. KA-B1-20B-12345"
                value={formData.dl_number_20b}
                onChange={(e) => setFormData({ ...formData, dl_number_20b: e.target.value })}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px', display: 'block' }}>
                Drug License No. (DL 21B)
              </label>
              <input
                type="text"
                className="input-field mono"
                placeholder="e.g. KA-B1-21B-12345"
                value={formData.dl_number_21b}
                onChange={(e) => setFormData({ ...formData, dl_number_21b: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px', display: 'block' }}>
                GSTIN / Tax ID
              </label>
              <input
                type="text"
                className="input-field mono"
                placeholder="29AAAAA0000A1Z5"
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px', display: 'block' }}>
                FSSAI License (Optional)
              </label>
              <input
                type="text"
                className="input-field mono"
                placeholder="10012345678901"
                value={formData.fssai_number}
                onChange={(e) => setFormData({ ...formData, fssai_number: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* UPI & POS Receipt Settings */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
            <QrCode size={18} color="#8b5cf6" />
            <h3 style={{ fontSize: '14.5px', fontWeight: 800 }}>UPI Payments & Receipt Customization</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px', display: 'block' }}>
                Pharmacy UPI ID (VPA) for Counter Dynamic QR
              </label>
              <input
                type="text"
                className="input-field mono"
                placeholder="topmedical@okhdfcbank"
                value={formData.upi_id}
                onChange={(e) => setFormData({ ...formData, upi_id: e.target.value })}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px', display: 'block' }}>
                Thermal Receipt Footer Note
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="Thank you! Wish you a speedy recovery!"
                value={formData.invoice_footer_note}
                onChange={(e) => setFormData({ ...formData, invoice_footer_note: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
          <button
            type="submit"
            disabled={saving}
            className="btn btn-primary btn-lg"
            style={{ minWidth: '180px', width: '100%', maxWidth: '280px' }}
          >
            <Save size={16} />
            <span>{saving ? 'Saving Changes...' : 'Save Configuration'}</span>
          </button>
        </div>
      </form>

      {/* Staff & Custom Charge Codes Management Section */}
      <StaffManagementCard onStaffUpdated={onStaffUpdated} />
    </div>
  );
}
