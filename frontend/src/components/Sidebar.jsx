import React from 'react';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Pill, 
  AlertTriangle, 
  FileText, 
  Users, 
  Settings, 
  LogOut, 
  UserCheck,
  Shield,
  Camera,
  X,
  FileSpreadsheet,
  ClipboardList
} from 'lucide-react';
import PharmacyLogo from './PharmacyLogo';

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  alertCounts, 
  profile, 
  user, 
  onLogout,
  onOpenScanBill,
  onOpenExcelUpload,
  onOpenDailyReport,
  isMobileOpen = false,
  onCloseMobile
}) {
  const isAdmin = Boolean(
    user?.is_superuser || 
    user?.role === 'admin' || 
    user?.role === 'Owner' || 
    (user?.email && (user.email.toLowerCase().includes('admin') || user.email.toLowerCase().includes('owner'))) || 
    (user?.username && (user.username.toLowerCase().includes('admin') || user.username.toLowerCase().includes('owner')))
  );

  // Menu items based on role
  const navItems = isAdmin ? [
    { id: 'pos', label: 'POS Billing', icon: ShoppingCart, badge: 'F2', highlight: true },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'inventory', label: 'Medicine Stock', icon: Pill, badge: 'F3' },
    { id: 'daily_report', label: 'Daily Reorder (PDF)', icon: ClipboardList, badge: 'PDF', isAction: true },
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
  ] : [
    // Staff & Pharmacist Menu: Full Medicine Stock & Inventory Management Enabled
    { id: 'pos', label: 'POS Billing Terminal', icon: ShoppingCart, badge: 'F2', highlight: true },
    { id: 'inventory', label: 'Medicine Stock & Inventory', icon: Pill, badge: 'F3', highlight: true },
    { id: 'invoices', label: 'Bills & Past Sales', icon: FileText },
    { 
      id: 'alerts', 
      label: 'Alerts & Expiry', 
      icon: AlertTriangle, 
      count: (alertCounts?.expired_count || 0) + (alertCounts?.near_expiry_count || 0) + (alertCounts?.low_stock_count || 0),
      alertColor: (alertCounts?.expired_count > 0) ? 'badge-rose' : 'badge-amber'
    },
    { id: 'daily_report', label: 'Daily Sold Sheet', icon: ClipboardList, badge: 'PDF', isAction: true },
    { id: 'contacts', label: 'Customers & Vendors', icon: Users },
  ];

  const handleSelectNav = (item) => {
    if (item.isAction && onOpenDailyReport) {
      onOpenDailyReport();
    } else {
      setActiveTab(item.id);
    }
    if (onCloseMobile) onCloseMobile();
  };

  const content = (
    <>
      {/* Brand Header */}
      <div style={{
        padding: '18px 20px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--bg-card)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(2, 132, 199, 0.15)'
          }}>
            <PharmacyLogo size={32} />
          </div>
          <div>
            <h1 style={{ fontSize: '15px', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-main)', lineHeight: 1.2 }}>
              {profile?.name || 'TOP MEDICAL'}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
              <span className="pulse-dot"></span>
              <span style={{ fontSize: '11px', color: isAdmin ? '#0284c7' : '#059669', fontWeight: 700 }}>
                {isAdmin ? 'Admin Portal' : 'Staff / Pharmacist'}
              </span>
            </div>
          </div>
        </div>

        {/* Mobile Close Button */}
        {isMobileOpen && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="btn btn-secondary btn-sm"
            style={{ width: '32px', height: '32px', padding: 0 }}
            aria-label="Close Menu"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Fast Supplier Inward Shortcut (Available to All Staff) */}
      <div style={{ padding: '12px 12px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button
          type="button"
          onClick={() => {
            if (onCloseMobile) onCloseMobile();
            onOpenScanBill();
          }}
          className="btn btn-emerald"
          style={{ width: '100%', padding: '9px 12px', fontSize: '12.5px', justifyContent: 'center' }}
        >
          <Camera size={16} />
          <span>📸 Scan Supplier Bill</span>
        </button>
      </div>

      {/* Navigation Menu */}
      <div style={{ padding: '14px 10px', flex: 1, overflowY: 'auto' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)', letterSpacing: '0.08em', padding: '0 8px 8px' }}>
          {isAdmin ? 'Main Navigation' : 'Pharmacy Operations'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectNav(item)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: isActive ? '1px solid #bae6fd' : '1px solid transparent',
                  background: isActive ? '#f0f9ff' : 'transparent',
                  color: isActive ? '#0284c7' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '13.5px',
                  fontWeight: isActive ? 700 : 500,
                  transition: 'all 0.15s ease',
                  textAlign: 'left',
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Icon size={18} color={isActive ? '#0284c7' : 'var(--text-dim)'} strokeWidth={isActive ? 2.5 : 2} />
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

      {/* Prominent User Profile & Sign Out Card */}
      {user && (
        <div style={{
          padding: '12px 14px',
          margin: '0 12px 8px',
          borderRadius: '12px',
          background: isAdmin ? '#f0f9ff' : '#ecfdf5',
          border: `1px solid ${isAdmin ? '#bae6fd' : '#a7f3d0'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: isAdmin ? '#0284c7' : '#059669',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              {isAdmin ? <Shield size={16} /> : <UserCheck size={16} />}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {isAdmin ? 'Administrator' : 'Billing Staff'}
              </div>
              <div style={{ fontSize: '10.5px', color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.email}
              </div>
            </div>
          </div>
          
          <button
            onClick={() => {
              if (onCloseMobile) onCloseMobile();
              onLogout();
            }}
            style={{
              background: '#fef2f2',
              border: '1px solid #fca5a5',
              color: '#dc2626',
              cursor: 'pointer',
              padding: '6px 10px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '11.5px',
              fontWeight: 800,
              boxShadow: '0 1px 3px rgba(220, 38, 38, 0.08)'
            }}
            title="Log out and return to login page"
          >
            <LogOut size={14} color="#dc2626" />
            <span>Logout</span>
          </button>
        </div>
      )}

      {/* Quick Shortcuts Footer (Desktop only) */}
      <div className="desktop-only" style={{
        padding: '10px 14px',
        margin: '0 12px 12px',
        borderRadius: '10px',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        flexShrink: 0
      }}>
        <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <span>POS: <kbd style={{ background: '#e2e8f0', padding: '1px 4px', borderRadius: '3px', color: '#0284c7', fontWeight: 700 }}>F2</kbd></span>
          <span>Search: <kbd style={{ background: '#e2e8f0', padding: '1px 4px', borderRadius: '3px', color: '#0284c7', fontWeight: 700 }}>F4</kbd></span>
          <span>Print: <kbd style={{ background: '#e2e8f0', padding: '1px 4px', borderRadius: '3px', color: '#0284c7', fontWeight: 700 }}>F8</kbd></span>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* 1. Desktop Fixed Sidebar */}
      <aside
        className="desktop-only"
        style={{
          width: '260px',
          minWidth: '260px',
          height: '100vh',
          backgroundColor: '#ffffff',
          borderRight: '1px solid #e2e8f0',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          userSelect: 'none',
          boxShadow: '2px 0 10px rgba(0, 0, 0, 0.02)'
        }}
      >
        {content}
      </aside>

      {/* 2. Mobile Slide-Over Drawer */}
      {isMobileOpen && (
        <>
          <div
            className="mobile-drawer-backdrop mobile-only"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="mobile-drawer-panel mobile-only" role="dialog" aria-modal="true">
            {content}
          </div>
        </>
      )}
    </>
  );
}
