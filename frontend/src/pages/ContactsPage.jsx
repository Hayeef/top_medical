import React, { useState } from 'react';
import { 
  Users, 
  Building2, 
  Stethoscope, 
  Plus, 
  Search, 
  Phone, 
  Mail, 
  MapPin, 
  DollarSign, 
  CreditCard,
  UserPlus
} from 'lucide-react';
import { inventoryAPI, billingAPI } from '../api';

export default function ContactsPage({ 
  customers, 
  suppliers, 
  doctors, 
  profile, 
  onOpenAddCustomer, 
  onOpenAddDoctor,
  onRefresh 
}) {
  const [tab, setTab] = useState('customers'); // 'customers', 'suppliers', 'doctors'
  const [search, setSearch] = useState('');
  
  // New Supplier state modal
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    gstin: '',
    address: '',
    balance: '0.00',
  });

  const currency = profile?.currency_symbol || '₹';

  const handleCreateSupplier = async (e) => {
    e.preventDefault();
    if (!supplierForm.name.trim()) return;
    try {
      await inventoryAPI.createSupplier({
        ...supplierForm,
        balance: parseFloat(supplierForm.balance) || 0,
      });
      setIsAddSupplierOpen(false);
      setSupplierForm({ name: '', contact_person: '', phone: '', email: '', gstin: '', address: '', balance: '0.00' });
      onRefresh();
    } catch (err) {
      alert(`Failed to add supplier: ${err.message}`);
    }
  };

  const filteredCustomers = customers.filter(c => 
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
  );

  const filteredSuppliers = suppliers.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.contact_person?.toLowerCase().includes(search.toLowerCase()) || s.phone?.includes(search)
  );

  const filteredDoctors = doctors.filter(d =>
    !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.specialization?.toLowerCase().includes(search.toLowerCase()) || d.registration_number?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Top Header & Tab Controls */}
      <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setTab('customers')}
            className={`btn btn-sm ${tab === 'customers' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Users size={14} /> Patients / Customers ({customers.length})
          </button>
          <button
            onClick={() => setTab('suppliers')}
            className={`btn btn-sm ${tab === 'suppliers' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Building2 size={14} /> Distributors / Suppliers ({suppliers.length})
          </button>
          <button
            onClick={() => setTab('doctors')}
            className={`btn btn-sm ${tab === 'doctors' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Stethoscope size={14} /> Prescribing Doctors ({doctors.length})
          </button>
        </div>

        {/* Search & Add Action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={15} color="var(--primary)" style={{ position: 'absolute', left: '10px', top: '9px' }} />
            <input
              type="text"
              className="input-field"
              style={{ paddingLeft: '32px', height: '34px', fontSize: '12px', width: '220px' }}
              placeholder={`Search ${tab}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {tab === 'customers' && (
            <button onClick={onOpenAddCustomer} className="btn btn-primary btn-sm">
              <UserPlus size={14} /> + New Patient
            </button>
          )}

          {tab === 'suppliers' && (
            <button onClick={() => setIsAddSupplierOpen(true)} className="btn btn-primary btn-sm">
              <Building2 size={14} /> + New Supplier
            </button>
          )}

          {tab === 'doctors' && (
            <button onClick={onOpenAddDoctor} className="btn btn-primary btn-sm">
              <Stethoscope size={14} /> + Register Doctor
            </button>
          )}
        </div>
      </div>

      {/* Tab Content: Customers */}
      {tab === 'customers' && (
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          <div className="data-table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Patient Name</th>
                  <th>Phone</th>
                  <th>Address</th>
                  <th>Preferred Doctor</th>
                  <th style={{ textAlign: 'center' }}>Total Bills</th>
                  <th style={{ textAlign: 'right' }}>Credit / Due Balance</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-dim)' }}>No customer records found.</td></tr>
                ) : (
                  filteredCustomers.map(c => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 700, color: '#ffffff' }}>{c.name}</td>
                      <td className="mono" style={{ color: '#38bdf8' }}>{c.phone}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{c.address || '-'}</td>
                      <td style={{ color: 'var(--text-dim)', fontSize: '12px' }}>{c.preferred_doctor_name || 'Walk-in'}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{c.invoices_count || 0}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }} className="mono">
                        <span style={{ color: parseFloat(c.credit_balance) > 0 ? '#fb7185' : '#34d399' }}>
                          {currency}{parseFloat(c.credit_balance).toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content: Suppliers */}
      {tab === 'suppliers' && (
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          <div className="data-table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Distributor / Company Name</th>
                  <th>Contact Person</th>
                  <th>Phone & Email</th>
                  <th>GSTIN</th>
                  <th style={{ textAlign: 'center' }}>Batches Supplied</th>
                  <th style={{ textAlign: 'right' }}>Outstanding Payable</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-dim)' }}>No supplier records found.</td></tr>
                ) : (
                  filteredSuppliers.map(s => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 700, color: '#ffffff' }}>{s.name}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{s.contact_person || '-'}</td>
                      <td>
                        <div style={{ fontSize: '12px', color: '#38bdf8' }}>{s.phone}</div>
                        {s.email && <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{s.email}</div>}
                      </td>
                      <td className="mono" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{s.gstin || '-'}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{s.batches_count || 0}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: parseFloat(s.balance) > 0 ? '#fbbf24' : '#34d399' }} className="mono">
                        {currency}{parseFloat(s.balance).toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content: Doctors */}
      {tab === 'doctors' && (
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          <div className="data-table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Doctor Name</th>
                  <th>Specialization</th>
                  <th>Registration No</th>
                  <th>Hospital / Clinic</th>
                  <th>Phone</th>
                  <th style={{ textAlign: 'center' }}>Prescriptions Filled</th>
                </tr>
              </thead>
              <tbody>
                {filteredDoctors.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-dim)' }}>No doctor records found.</td></tr>
                ) : (
                  filteredDoctors.map(d => (
                    <tr key={d.id}>
                      <td style={{ fontWeight: 700, color: '#ffffff' }}>{d.name}</td>
                      <td><span className="badge badge-cyan">{d.specialization}</span></td>
                      <td className="mono" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{d.registration_number || '-'}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{d.hospital_name || '-'}</td>
                      <td className="mono" style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{d.phone || '-'}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{d.invoices_count || 0}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick Add Supplier Modal */}
      {isAddSupplierOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={18} color="var(--primary)" />
                <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Add Distributor / Supplier</h3>
              </div>
              <button onClick={() => setIsAddSupplierOpen(false)} className="btn btn-secondary btn-sm" style={{ width: '32px', height: '32px', padding: 0 }}>✕</button>
            </div>

            <form onSubmit={handleCreateSupplier} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Supplier Name *</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  placeholder="e.g. Cipla Healthcare Supply"
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Contact Person</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Rep / Manager Name"
                    value={supplierForm.contact_person}
                    onChange={(e) => setSupplierForm({ ...supplierForm, contact_person: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Phone</label>
                  <input
                    type="tel"
                    className="input-field mono"
                    placeholder="Contact Number"
                    value={supplierForm.phone}
                    onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>GSTIN</label>
                  <input
                    type="text"
                    className="input-field mono"
                    placeholder="GST Number"
                    value={supplierForm.gstin}
                    onChange={(e) => setSupplierForm({ ...supplierForm, gstin: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Opening Balance (₹)</label>
                  <input
                    type="number"
                    className="input-field mono"
                    value={supplierForm.balance}
                    onChange={(e) => setSupplierForm({ ...supplierForm, balance: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button type="button" onClick={() => setIsAddSupplierOpen(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Save Supplier</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
