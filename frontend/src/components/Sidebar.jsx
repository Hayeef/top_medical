import React from 'react';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Pill, 
  AlertTriangle, 
  FileText, 
  Users, 
  Settings, 
  Activity,
  HeartPulse,
  PackagePlus,
  Zap,
  PhoneCall,
  LogOut,
  UserCheck
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, alertCounts, profile, user, onLogout }) {
  const navItems = [
    { id: 'pos', label: 'POS Billing', icon: ShoppingCart, badge: 'F2', highlight: true },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'inventory', label: 'Medicine Stock', icon: Pill, badge: 'F3' },
    { 
      id: 'alerts', 
      label: 'Alerts & Expiry', 
      icon: AlertTriangle, 
      count: (alertCounts?.expired_count || 0) + (alertCounts?.near_expiry_count || 0) + (alertCounts?.low_stock_count || 0),
      alertColor: (alertCounts?.expired_count > 0) ? 'badge-rose' : 'badge-amber'
    },
    { id: 'invoices', label: 'Bills & Sales', icon: FileText },
    { id: 'contacts', label: 'Customers & Vendors', icon: Users },
    { id: 'settings', label: 'Pharmacy Settings', icon: Settings },
  ];

  return (
    <aside style={{
      width: '260px',
      minWidth: '260px',
      height: '100vh',
      backgroundColor: '#ffffff',
      borderRight: '1px solid #e2e8f0',
      display: 'flex',
      flexDirection: 'column',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      userSelect: 'none',
      boxShadow: '2px 0 10px rgba(0, 0, 0, 0.02)'
    }}>
      {/* Brand Header */}
      <div style={{
        padding: '22px 20px',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #0284c7 0%, #10b981 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)'
        }}>
          <HeartPulse size={24} color="#ffffff" strokeWidth={2.5} />
        </div>
        <div>
          <h1 style={{ fontSize: '15.5px', fontWeight: 800, letterSpacing: '-0.02em', color: '#0f172a', lineHeight: 1.2 }}>
            {profile?.name || 'TOP MEDICAL'}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
            <span className="pulse-dot"></span>
            <span style={{ fontSize: '11px', color: '#059669', fontWeight: 700 }}>POS Portal v2.0</span>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <div style={{ padding: '16px 12px', flex: 1, overflowY: 'auto' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.08em', padding: '0 8px 8px' }}>
          Main Menu
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: isActive ? '1px solid #bae6fd' : '1px solid transparent',
                  background: isActive 
                    ? '#f0f9ff' 
                    : 'transparent',
                  color: isActive ? '#0284c7' : '#475569',
                  cursor: 'pointer',
                  fontSize: '13.5px',
                  fontWeight: isActive ? 700 : 500,
                  transition: 'all 0.15s ease',
                  textAlign: 'left',
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = '#f8fafc';
                    e.currentTarget.style.color = '#0f172a';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#475569';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Icon size={18} color={isActive ? '#0284c7' : '#64748b'} strokeWidth={isActive ? 2.5 : 2} />
                  <span>{item.label}</span>
                </div>
                {item.count > 0 && (
                  <span className={`badge ${item.alertColor || 'badge-rose'}`} style={{ padding: '2px 7px' }}>
                    {item.count}
                  </span>
                )}
                {item.badge && !item.count && (
                  <span style={{ 
                    fontSize: '10px', 
                    background: item.highlight ? '#e0f2fe' : '#f1f5f9', 
                    color: item.highlight ? '#0369a1' : '#64748b', 
                    padding: '2px 6px', 
                    borderRadius: '4px',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 600
                  }}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Logged in User & Logout Card */}
      {user && (
        <div style={{
          padding: '12px 14px',
          margin: '0 12px 8px',
          borderRadius: '10px',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <UserCheck size={16} color="#0284c7" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.name || 'Pharmacist'}
              </div>
              <div style={{ fontSize: '10.5px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.email}
              </div>
            </div>
          </div>
          <button
            onClick={onLogout}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#e11d48',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              transition: 'background 0.15s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#fee2e2'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            title="Sign Out of Pharmacy"
          >
            <LogOut size={16} />
          </button>
        </div>
      )}

      {/* Quick Shortcuts Footer */}
      <div style={{
        padding: '12px 14px',
        margin: '0 12px 12px',
        borderRadius: '10px',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
          <Zap size={13} color="#d97706" />
          <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#334155', textTransform: 'uppercase' }}>Shortcuts</span>
        </div>
        <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>POS Bill: <kbd style={{ background: '#e2e8f0', padding: '1px 5px', borderRadius: '3px', color: '#0284c7', fontWeight: 700 }}>F2</kbd></span>
            <span>Drug Search: <kbd style={{ background: '#e2e8f0', padding: '1px 5px', borderRadius: '3px', color: '#0284c7', fontWeight: 700 }}>F4</kbd></span>
          </div>
        </div>
      </div>
    </aside>
  );
}
