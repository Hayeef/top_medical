import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Building2, 
  ShieldCheck, 
  FileText, 
  Save, 
  QrCode, 
  CreditCard,
  CheckCircle,
  Database,
  Printer
} from 'lucide-react';
import { billingAPI } from '../api';

export default function SettingsPage({ profile, onProfileUpdated }) {
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
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '900px' }}>
      
      {/* Header */}
      <div className="glass-panel" style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Pharmacy Configuration & Tax Compliance</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Set up pharmacy details, Drug License numbers (DL-20B/21B), GSTIN, and POS receipt headers.
          </p>
        </div>
        {success && (
          <span className="badge badge-emerald" style={{ padding: '6px 12px', fontSize: '12px' }}>
            <CheckCircle size={14} /> Settings Saved Successfully!
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Basic Business Details */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
            <Building2 size={20} color="var(--primary)" />
            <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Business & Contact Profile</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
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
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                Tagline / Slogan
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Healthcare & Trusted Medications"
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
              Full Store Address (Printed on Receipts)
            </label>
            <textarea
              className="input-field"
              rows="2"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
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
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
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
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
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
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
            <ShieldCheck size={20} color="#10b981" />
            <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Drug Licensing & GST Compliance</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                GSTIN (Tax Identification) *
              </label>
              <input
                type="text"
                className="input-field mono"
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                UPI VPA ID (For Dynamic QR Codes)
              </label>
              <input
                type="text"
                className="input-field mono"
                placeholder="e.g. topmedical@upi"
                value={formData.upi_id}
                onChange={(e) => setFormData({ ...formData, upi_id: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                Drug License 20B (Allopathic) *
              </label>
              <input
                type="text"
                className="input-field mono"
                value={formData.dl_number_20b}
                onChange={(e) => setFormData({ ...formData, dl_number_20b: e.target.value })}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                Drug License 21B (Schedule C/C1) *
              </label>
              <input
                type="text"
                className="input-field mono"
                value={formData.dl_number_21b}
                onChange={(e) => setFormData({ ...formData, dl_number_21b: e.target.value })}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                FSSAI License No (Optional)
              </label>
              <input
                type="text"
                className="input-field mono"
                value={formData.fssai_number}
                onChange={(e) => setFormData({ ...formData, fssai_number: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Invoice Footer / Policy Note */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
            <Printer size={20} color="#38bdf8" />
            <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Receipt & Invoice Terms</h3>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
              Terms & Return Policy (Printed at the bottom of bills)
            </label>
            <textarea
              className="input-field"
              rows="3"
              value={formData.invoice_footer_note}
              onChange={(e) => setFormData({ ...formData, invoice_footer_note: e.target.value })}
            />
          </div>
        </div>

        {/* Save Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button type="submit" disabled={saving} className="btn btn-primary btn-lg">
            <Save size={18} />
            <span>{saving ? 'Saving Settings...' : 'Save All Changes'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
