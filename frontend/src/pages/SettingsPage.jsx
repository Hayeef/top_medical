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
import '../utils/styles/SettingsPage.css';

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
    <div className="main-page-wrapper settings-page-wrapper">
      
      {/* Header */}
      <div className="glass-panel settings-header">
        <div>
          <h2 className="settings-title">Pharmacy Settings & Compliance</h2>
          <p className="settings-subtitle">
            Store details, Drug License (DL-20B/21B), GSTIN, and POS receipt config.
          </p>
        </div>
        {success && (
          <span className="badge badge-emerald settings-saved-badge">
            <CheckCircle size={14} /> Settings Saved!
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="settings-form">
        
        {/* Basic Business Details */}
        <div className="glass-panel settings-card">
          <div className="settings-card-header">
            <Building2 size={18} color="#0284c7" />
            <h3 className="settings-card-title">Business & Contact Profile</h3>
          </div>

          <div className="settings-grid-2">
            <div>
              <label className="settings-label">
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
              <label className="settings-label">
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
            <label className="settings-label">
              Full Store Address (Printed on Receipts)
            </label>
            <textarea
              className="input-field"
              rows="2"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div className="settings-grid-3">
            <div>
              <label className="settings-label">
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
              <label className="settings-label">
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
              <label className="settings-label">
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
        <div className="glass-panel settings-card">
          <div className="settings-card-header">
            <ShieldCheck size={18} color="#10b981" />
            <h3 className="settings-card-title">Drug Licensing & GST Compliance</h3>
          </div>

          <div className="settings-grid-compliance">
            <div>
              <label className="settings-label">
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
              <label className="settings-label">
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

          <div className="settings-grid-compliance">
            <div>
              <label className="settings-label">
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
              <label className="settings-label">
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
        <div className="glass-panel settings-card">
          <div className="settings-card-header">
            <QrCode size={18} color="#8b5cf6" />
            <h3 className="settings-card-title">UPI Payments & Receipt Customization</h3>
          </div>

          <div className="settings-grid-2">
            <div>
              <label className="settings-label">
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
              <label className="settings-label">
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
        <div className="settings-submit-wrap">
          <button
            type="submit"
            disabled={saving}
            className="btn btn-primary btn-lg settings-submit-btn"
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
