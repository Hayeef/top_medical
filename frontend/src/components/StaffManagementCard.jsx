import React, { useState, useEffect } from 'react';
import { 
  BadgeCheck, 
  Plus, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  RefreshCw, 
  UserCheck, 
  Shield, 
  Phone, 
  Briefcase,
  AlertCircle
} from 'lucide-react';
import { billingAPI } from '../api';

export default function StaffManagementCard({ onStaffUpdated }) {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', charge_code: '', role: '', phone: '', is_active: true });
  
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newForm, setNewForm] = useState({ name: '', charge_code: '', role: 'Pharmacist / Cashier', phone: '', is_active: true });
  
  const [savingId, setSavingId] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const fetchStaff = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await billingAPI.getStaff();
      const list = Array.isArray(data) ? data : (data?.results || []);
      setStaffList(list);
      if (onStaffUpdated) onStaffUpdated(list);
    } catch (err) {
      console.error('Failed to load staff:', err);
      setErrorMsg('Failed to load staff list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleStartEdit = (staff) => {
    setEditingId(staff.id);
    setEditForm({
      name: staff.name,
      charge_code: staff.charge_code,
      role: staff.role || 'Pharmacist / Cashier',
      phone: staff.phone || '',
      is_active: staff.is_active !== false,
    });
    setErrorMsg(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setErrorMsg(null);
  };

  const handleSaveEdit = async (staffId) => {
    if (!editForm.name.trim() || !editForm.charge_code.trim()) {
      setErrorMsg('Staff Name and Custom Charge Code are required.');
      return;
    }

    setSavingId(staffId);
    setErrorMsg(null);
    try {
      const updated = await billingAPI.updateStaff(staffId, {
        name: editForm.name.trim(),
        charge_code: editForm.charge_code.trim().toUpperCase(),
        role: editForm.role.trim(),
        phone: editForm.phone.trim(),
        is_active: editForm.is_active,
      });

      setStaffList(prev => prev.map(s => s.id === staffId ? updated : s));
      setEditingId(null);
      setSuccessMsg(`Updated charge code [${updated.charge_code}] for ${updated.name}!`);
      setTimeout(() => setSuccessMsg(null), 3500);

      if (onStaffUpdated) {
        const fresh = await billingAPI.getStaff();
        onStaffUpdated(Array.isArray(fresh) ? fresh : (fresh?.results || []));
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update staff member.');
    } finally {
      setSavingId(null);
    }
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    if (!newForm.name.trim() || !newForm.charge_code.trim()) {
      setErrorMsg('Please enter both staff name and unique charge code.');
      return;
    }

    setSavingId('new');
    setErrorMsg(null);
    try {
      const created = await billingAPI.createStaff({
        name: newForm.name.trim(),
        charge_code: newForm.charge_code.trim().toUpperCase(),
        role: newForm.role.trim() || 'Pharmacist / Cashier',
        phone: newForm.phone.trim(),
        is_active: newForm.is_active,
      });

      setStaffList(prev => [...prev, created]);
      setIsAddingNew(false);
      setNewForm({ name: '', charge_code: '', role: 'Pharmacist / Cashier', phone: '', is_active: true });
      setSuccessMsg(`Added new staff member [${created.charge_code}] ${created.name}!`);
      setTimeout(() => setSuccessMsg(null), 3500);

      if (onStaffUpdated) {
        const fresh = await billingAPI.getStaff();
        onStaffUpdated(Array.isArray(fresh) ? fresh : (fresh?.results || []));
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create staff member.');
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteStaff = async (staff) => {
    if (!window.confirm(`Are you sure you want to remove staff member [${staff.charge_code}] ${staff.name}?`)) {
      return;
    }

    try {
      await billingAPI.deleteStaff(staff.id);
      setStaffList(prev => prev.filter(s => s.id !== staff.id));
      setSuccessMsg(`Removed staff [${staff.charge_code}]`);
      setTimeout(() => setSuccessMsg(null), 3000);

      if (onStaffUpdated) {
        const fresh = await billingAPI.getStaff();
        onStaffUpdated(Array.isArray(fresh) ? fresh : (fresh?.results || []));
      }
    } catch (err) {
      alert(`Failed to delete staff: ${err.message}`);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: '#e0f2fe',
            color: '#0284c7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <BadgeCheck size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Billing Staff & Custom Charge Codes
            </h3>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
              Assign and modify custom short codes (e.g. SC-101, PH-01) used to track sales and cash reconciliation.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setIsAddingNew(true)}
            className="btn btn-primary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
          >
            <Plus size={14} /> Add Staff Member
          </button>
          <button
            type="button"
            onClick={fetchStaff}
            className="btn btn-secondary btn-sm"
            style={{ padding: '6px' }}
            title="Refresh Staff List"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Status Messages */}
      {successMsg && (
        <div style={{ padding: '10px 14px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', color: '#047857', fontSize: '12.5px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Check size={16} /> {successMsg}
        </div>
      )}

      {errorMsg && (
        <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecdd3', borderRadius: '8px', color: '#b91c1c', fontSize: '12.5px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={16} /> {errorMsg}
        </div>
      )}

      {/* Add New Staff Form Drawer / Box */}
      {isAddingNew && (
        <form onSubmit={handleCreateStaff} style={{ padding: '16px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#0284c7' }}>
              Create New Staff Member
            </span>
            <button type="button" onClick={() => setIsAddingNew(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
              <X size={16} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '3px' }}>
                Staff Full Name *
              </label>
              <input
                type="text"
                required
                className="input-field"
                style={{ height: '34px', fontSize: '12.5px' }}
                placeholder="e.g. Zaid Khan"
                value={newForm.name}
                onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '3px' }}>
                Custom Charge Code *
              </label>
              <input
                type="text"
                required
                className="input-field mono"
                style={{ height: '34px', fontSize: '12.5px', textTransform: 'uppercase', fontWeight: 800, color: '#0284c7' }}
                placeholder="e.g. SC-104 or PH-02"
                value={newForm.charge_code}
                onChange={(e) => setNewForm({ ...newForm, charge_code: e.target.value.toUpperCase() })}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '3px' }}>
                Role / Designation
              </label>
              <input
                type="text"
                className="input-field"
                style={{ height: '34px', fontSize: '12.5px' }}
                placeholder="e.g. Pharmacist / Cashier"
                value={newForm.role}
                onChange={(e) => setNewForm({ ...newForm, role: e.target.value })}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '3px' }}>
                Phone Number (Optional)
              </label>
              <input
                type="text"
                className="input-field mono"
                style={{ height: '34px', fontSize: '12.5px' }}
                placeholder="e.g. 9876543210"
                value={newForm.phone}
                onChange={(e) => setNewForm({ ...newForm, phone: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
            <button type="button" onClick={() => setIsAddingNew(false)} className="btn btn-secondary btn-sm">
              Cancel
            </button>
            <button type="submit" disabled={savingId === 'new'} className="btn btn-primary btn-sm">
              {savingId === 'new' ? 'Adding...' : 'Save Staff Member'}
            </button>
          </div>
        </form>
      )}

      {/* Staff Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
              <th style={{ padding: '10px 12px', width: '18%' }}>Custom Charge Code</th>
              <th style={{ padding: '10px 12px', width: '26%' }}>Staff Member Name</th>
              <th style={{ padding: '10px 12px', width: '20%' }}>Designation / Role</th>
              <th style={{ padding: '10px 12px', width: '16%' }}>Contact Phone</th>
              <th style={{ padding: '10px 12px', width: '10%', textAlign: 'center' }}>Status</th>
              <th style={{ padding: '10px 12px', width: '10%', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {staffList.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                  No staff members registered. Click "+ Add Staff Member" to add one.
                </td>
              </tr>
            ) : (
              staffList.map((staff) => {
                const isEditing = editingId === staff.id;
                const isSaving = savingId === staff.id;

                if (isEditing) {
                  return (
                    <tr key={staff.id} style={{ background: '#f0f9ff', borderBottom: '1px solid #bae6fd' }}>
                      <td style={{ padding: '8px 10px' }}>
                        <input
                          type="text"
                          required
                          className="input-field mono"
                          style={{ height: '32px', fontSize: '12.5px', fontWeight: 800, textTransform: 'uppercase', color: '#0284c7' }}
                          value={editForm.charge_code}
                          onChange={(e) => setEditForm({ ...editForm, charge_code: e.target.value.toUpperCase() })}
                          placeholder="e.g. SC-101"
                        />
                      </td>

                      <td style={{ padding: '8px 10px' }}>
                        <input
                          type="text"
                          required
                          className="input-field"
                          style={{ height: '32px', fontSize: '12.5px', fontWeight: 700 }}
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          placeholder="Staff Name"
                        />
                      </td>

                      <td style={{ padding: '8px 10px' }}>
                        <input
                          type="text"
                          className="input-field"
                          style={{ height: '32px', fontSize: '12px' }}
                          value={editForm.role}
                          onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                          placeholder="Role / Title"
                        />
                      </td>

                      <td style={{ padding: '8px 10px' }}>
                        <input
                          type="text"
                          className="input-field mono"
                          style={{ height: '32px', fontSize: '12px' }}
                          value={editForm.phone}
                          onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                          placeholder="Phone Number"
                        />
                      </td>

                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', gap: '4px', fontSize: '11px' }}>
                          <input
                            type="checkbox"
                            checked={editForm.is_active}
                            onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                          />
                          <span>Active</span>
                        </label>
                      </td>

                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(staff.id)}
                            disabled={isSaving}
                            className="btn btn-primary btn-sm"
                            style={{ padding: '4px 8px', fontSize: '11px' }}
                            title="Save changes"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '4px 8px', fontSize: '11px' }}
                            title="Cancel editing"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={staff.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <span className="mono" style={{
                        background: '#0284c7',
                        color: '#ffffff',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 800,
                        letterSpacing: '0.5px'
                      }}>
                        {staff.charge_code}
                      </span>
                    </td>

                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: 800, color: '#0f172a' }}>
                        {staff.name}
                      </div>
                    </td>

                    <td style={{ padding: '10px 12px', color: '#475569' }}>
                      {staff.role || 'Pharmacist'}
                    </td>

                    <td style={{ padding: '10px 12px' }} className="mono">
                      {staff.phone || '-'}
                    </td>

                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <span className={`badge ${staff.is_active !== false ? 'badge-emerald' : 'badge-rose'}`} style={{ fontSize: '10.5px' }}>
                        {staff.is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(staff)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 8px', fontSize: '11px', color: '#0284c7', borderColor: '#bae6fd' }}
                          title="Edit Custom Charge Code and details"
                        >
                          <Edit3 size={13} /> Edit Code
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteStaff(staff)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 6px', color: '#e11d48', borderColor: '#fecdd3' }}
                          title="Delete staff member"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
