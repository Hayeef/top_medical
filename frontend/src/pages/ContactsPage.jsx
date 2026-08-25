import React, { useState } from 'react';
import { 
  Users, 
  Building2, 
  Stethoscope, 
  Search, 
  Phone, 
  MapPin, 
  UserPlus,
  Plus,
  BadgeCheck
} from 'lucide-react';
import { inventoryAPI } from '../api';
import StaffManagementCard from '../components/StaffManagementCard';

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
    <div className="main-page-wrapper">
      
      {/* Top Header & Tab Controls */}
      <div className="glass-panel" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        
        {/* Scrollable Tabs */}
        <div className="mobile-scroll-pills" style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => setTab('customers')}
            className={`btn btn-sm ${tab === 'customers' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Users size={14} /> Patients ({customers.length})
          </button>
          <button
            onClick={() => setTab('suppliers')}
            className={`btn btn-sm ${tab === 'suppliers' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Building2 size={14} /> Suppliers ({suppliers.length})
          </button>
          <button
            onClick={() => setTab('doctors')}
            className={`btn btn-sm ${tab === 'doctors' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Stethoscope size={14} /> Doctors ({doctors.length})
          </button>
          <button
            onClick={() => setTab('staff')}
            className={`btn btn-sm ${tab === 'staff' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <BadgeCheck size={14} /> Staff & Charge Codes
          </button>
        </div>

        {/* Search & Add Action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 200px' }}>
            <Search size={15} color="#0284c7" style={{ position: 'absolute', left: '10px', top: '10px' }} />
            <input
              type="text"
              className="input-field"
              style={{ paddingLeft: '32px', height: '36px', fontSize: '13px' }}
              placeholder={`Search ${tab}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {tab === 'customers' && (
            <button onClick={onOpenAddCustomer} className="btn btn-primary btn-sm" style={{ height: '36px' }}>
              <UserPlus size={14} /> <span>+ Add Patient</span>
            </button>
          )}

          {tab === 'suppliers' && (
            <button onClick={() => setIsAddSupplierOpen(true)} className="btn btn-primary btn-sm" style={{ height: '36px' }}>
              <Building2 size={14} /> <span>+ Add Supplier</span>
            </button>
          )}

          {tab === 'doctors' && (
            <button onClick={onOpenAddDoctor} className="btn btn-primary btn-sm" style={{ height: '36px' }}>
              <Stethoscope size={14} /> <span>+ Add Doctor</span>
            </button>
          )}
        </div>
      </div>

      {/* Tab Content: Customers */}
      {tab === 'customers' && (
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          {/* Desktop Table */}
          <div className="data-table-container desktop-only" style={{ border: 'none', borderRadius: 0 }}>
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
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>No customer records found.</td></tr>
                ) : (
                  filteredCustomers.map(c => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 700, color: '#0f172a' }}>{c.name}</td>
                      <td className="mono" style={{ color: '#0284c7' }}>
                        <a href={`tel:${c.phone}`} style={{ color: 'inherit', textDecoration: 'none' }}>{c.phone}</a>
                      </td>
                      <td style={{ color: '#64748b', fontSize: '12px' }}>{c.address || '-'}</td>
                      <td style={{ color: '#64748b', fontSize: '12px' }}>{c.preferred_doctor_name || 'Walk-in'}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{c.invoices_count || 0}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }} className="mono">
                        <span style={{ color: parseFloat(c.credit_balance) > 0 ? '#e11d48' : '#059669' }}>
                          {currency}{parseFloat(c.credit_balance || 0).toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards for Customers */}
          <div className="mobile-only" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px' }}>
            {filteredCustomers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>No customers found.</div>
            ) : (
              filteredCustomers.map(c => (
                <div key={c.id} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>{c.name}</div>
                      {c.address && <div style={{ fontSize: '11px', color: '#64748b' }}>📍 {c.address}</div>}
                    </div>
                    <span className="mono" style={{ fontWeight: 800, fontSize: '13px', color: parseFloat(c.credit_balance) > 0 ? '#e11d48' : '#059669' }}>
                      {parseFloat(c.credit_balance) > 0 ? `Due: ${currency}${parseFloat(c.credit_balance).toFixed(2)}` : 'No Due'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f8fafc', paddingTop: '6px' }}>
                    <a href={`tel:${c.phone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#0284c7', fontSize: '12.5px', fontWeight: 700, textDecoration: 'none' }}>
                      <Phone size={13} /> {c.phone}
                    </a>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>{c.invoices_count || 0} Bills</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab Content: Suppliers */}
      {tab === 'suppliers' && (
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          {/* Desktop Table */}
          <div className="data-table-container desktop-only" style={{ border: 'none', borderRadius: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Agency / Supplier Name</th>
                  <th>Contact Person</th>
                  <th>Phone</th>
                  <th>GSTIN</th>
                  <th>City / Address</th>
                  <th style={{ textAlign: 'right' }}>Wholesale Balance</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>No suppliers recorded.</td></tr>
                ) : (
                  filteredSuppliers.map(s => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 700, color: '#0f172a' }}>{s.name}</td>
                      <td>{s.contact_person || '-'}</td>
                      <td className="mono" style={{ color: '#0284c7' }}>
                        <a href={`tel:${s.phone}`} style={{ color: 'inherit', textDecoration: 'none' }}>{s.phone || '-'}</a>
                      </td>
                      <td className="mono" style={{ fontSize: '11.5px', color: '#64748b' }}>{s.gstin || '-'}</td>
                      <td style={{ color: '#64748b', fontSize: '12px' }}>{s.address || '-'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }} className="mono">
                        {currency}{parseFloat(s.balance || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards for Suppliers */}
          <div className="mobile-only" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px' }}>
            {filteredSuppliers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>No suppliers recorded.</div>
            ) : (
              filteredSuppliers.map(s => (
                <div key={s.id} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>{s.name}</div>
                      {s.contact_person && <div style={{ fontSize: '11.5px', color: '#64748b' }}>Contact: {s.contact_person}</div>}
                    </div>
                    <span className="mono" style={{ fontWeight: 700, fontSize: '12.5px', color: '#0f172a' }}>
                      Bal: {currency}{parseFloat(s.balance || 0).toFixed(2)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f8fafc', paddingTop: '6px' }}>
                    {s.phone ? (
                      <a href={`tel:${s.phone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#0284c7', fontSize: '12.5px', fontWeight: 700, textDecoration: 'none' }}>
                        <Phone size={13} /> {s.phone}
                      </a>
                    ) : <span style={{ fontSize: '11px', color: '#94a3b8' }}>No Phone</span>}
                    {s.gstin && <span className="mono" style={{ fontSize: '10.5px', color: '#64748b' }}>GST: {s.gstin}</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab Content: Doctors */}
      {tab === 'doctors' && (
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          {/* Desktop Table */}
          <div className="data-table-container desktop-only" style={{ border: 'none', borderRadius: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Doctor Name</th>
                  <th>Specialization</th>
                  <th>Registration #</th>
                  <th>Phone</th>
                  <th>Hospital / Clinic</th>
                </tr>
              </thead>
              <tbody>
                {filteredDoctors.length === 0 ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>No doctor records found.</td></tr>
                ) : (
                  filteredDoctors.map(d => (
                    <tr key={d.id}>
                      <td style={{ fontWeight: 700, color: '#0f172a' }}>{d.name}</td>
                      <td><span className="badge badge-cyan">{d.specialization || 'General Physician'}</span></td>
                      <td className="mono" style={{ fontSize: '11.5px', color: '#64748b' }}>{d.registration_number || '-'}</td>
                      <td className="mono" style={{ color: '#0284c7' }}>
                        <a href={`tel:${d.phone}`} style={{ color: 'inherit', textDecoration: 'none' }}>{d.phone || '-'}</a>
                      </td>
                      <td style={{ color: '#64748b', fontSize: '12px' }}>{d.hospital_clinic_name || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards for Doctors */}
          <div className="mobile-only" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px' }}>
            {filteredDoctors.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>No doctors found.</div>
            ) : (
              filteredDoctors.map(d => (
                <div key={d.id} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>{d.name}</div>
                      <div style={{ fontSize: '11.5px', color: '#64748b' }}>{d.hospital_clinic_name || 'Clinic'}</div>
                    </div>
                    <span className="badge badge-cyan">{d.specialization || 'General'}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f8fafc', paddingTop: '6px' }}>
                    {d.phone ? (
                      <a href={`tel:${d.phone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#0284c7', fontSize: '12.5px', fontWeight: 700, textDecoration: 'none' }}>
                        <Phone size={13} /> {d.phone}
                      </a>
                    ) : <span style={{ fontSize: '11px', color: '#94a3b8' }}>No Phone</span>}
                    {d.registration_number && <span className="mono" style={{ fontSize: '10.5px', color: '#64748b' }}>Reg: {d.registration_number}</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 4. STAFF & CHARGE CODES TAB */}
      {tab === 'staff' && (
        <StaffManagementCard onStaffUpdated={onRefresh} />
      )}

      {/* MODAL: ADD SUPPLIER */}
      {isAddSupplierOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800 }}>Register Wholesale Supplier</h3>
              <button onClick={() => setIsAddSupplierOpen(false)} className="btn btn-secondary btn-sm" style={{ width: '32px', height: '32px', padding: 0 }}>✕</button>
            </div>

            <form onSubmit={handleCreateSupplier} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Supplier / Agency Name *</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  placeholder="e.g. MedPlus Pharma Distributors"
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Contact Person</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. Rajesh Kumar"
                    value={supplierForm.contact_person}
                    onChange={(e) => setSupplierForm({ ...supplierForm, contact_person: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Phone Number</label>
                  <input
                    type="tel"
                    className="input-field"
                    placeholder="Mobile / Office"
                    value={supplierForm.phone}
                    onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>GSTIN</label>
                  <input
                    type="text"
                    className="input-field mono"
                    placeholder="29AAAAA0000A1Z5"
                    value={supplierForm.gstin}
                    onChange={(e) => setSupplierForm({ ...supplierForm, gstin: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Email</label>
                  <input
                    type="email"
                    className="input-field"
                    placeholder="orders@supplier.com"
                    value={supplierForm.email}
                    onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Address / City</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Street, City, Pincode"
                  value={supplierForm.address}
                  onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
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
