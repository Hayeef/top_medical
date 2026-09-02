import React, { useState, useEffect } from 'react';
import { 
  PlusCircle, 
  ShoppingCart, 
  PackagePlus, 
  Sun, 
  Moon, 
  Clock, 
  ShieldCheck, 
  Camera,
  LogOut,
  Shield,
  UserCheck,
  FileSpreadsheet,
  Menu
} from 'lucide-react';
import PharmacyLogo from './PharmacyLogo';

export default function Header({ 
  activeTab, 
  setActiveTab, 
  summary, 
  profile, 
  user,
  onLogout,
  onOpenAddMedicine, 
  onOpenAddBatch,
  onOpenScanBill,
  onOpenExcelUpload,
  onOpenMobileMenu
}) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [theme, setTheme] = useState(localStorage.getItem('tm_theme') || 'light');

  const isAdmin = Boolean(
    user?.is_superuser || 
    user?.role === 'admin' || 
    user?.role === 'Owner' || 
    (user?.email && (user.email.toLowerCase().includes('admin') || user.email.toLowerCase().includes('owner'))) || 
    (user?.username && (user.username.toLowerCase().includes('admin') || user.username.toLowerCase().includes('owner')))
  );

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('tm_theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  const getPageTitle = () => {
    switch (activeTab) {
      case 'pos': return 'POS Billing Terminal';
      case 'dashboard': return 'Dashboard & Sales';
      case 'inventory': return 'Medicines & Batch Stock';
      case 'alerts': return 'Expiry Radar & Alerts';
      case 'invoices': return 'Sales Ledger & Archive';
      case 'contacts': return 'Customers & Vendors';
      case 'settings': return 'Pharmacy Configuration';
      default: return 'Top Medical Pharmacy';
    }
  };

  return (
    <header className="no-print" style={{
      minHeight: '62px',
      padding: '0 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: '1px solid var(--border-subtle)',
      background: 'var(--bg-card)',
      position: 'sticky',
      top: 0,
      zIndex: 40,
      boxShadow: '0 1px 4px rgba(0, 0, 0, 0.02)',
      gap: '10px'
    }}>
      {/* Left: Mobile Hamburger & Page Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
        {/* Mobile Hamburger Menu Button */}
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="btn btn-secondary btn-sm mobile-only"
          style={{ width: '38px', height: '38px', padding: 0, flexShrink: 0 }}
          aria-label="Open Navigation Drawer"
        >
          <Menu size={19} color="#0284c7" />
        </button>

        {/* Mobile Brand Logo */}
        <div className="mobile-only" style={{ flexShrink: 0 }}>
          <PharmacyLogo size={28} />
        </div>

        <div style={{ minWidth: 0 }}>
          <h2 style={{
            fontSize: '15.5px',
            fontWeight: 800,
            color: 'var(--text-main)',
            letterSpacing: '-0.01em',
            margin: 0,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {getPageTitle()}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#059669', fontWeight: 600, whiteSpace: 'nowrap' }}>
              <ShieldCheck size={12} /> {profile?.dl_number_20b || 'DL 20B'}
            </span>
            <span className="desktop-only">•</span>
            <span className="mono desktop-only" style={{ color: 'var(--text-dim)' }}>
              Role: <strong style={{ color: isAdmin ? '#0284c7' : '#059669' }}>{isAdmin ? 'Admin' : 'Cashier'}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        
        {/* Live Date / Time (Desktop Only) */}
        <div className="desktop-only" style={{
          alignItems: 'center',
          gap: '6px',
          padding: '6px 10px',
          background: 'var(--bg-main)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '8px',
          fontSize: '11.5px',
          color: 'var(--text-muted)'
        }}>
          <Clock size={13} color="#0284c7" />
          <span className="mono">
            {currentTime.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} | {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>

        {/* Quick Today Revenue Widget (Admin Only Desktop) */}
        {isAdmin && summary && (
          <div className="desktop-only" style={{
            alignItems: 'center',
            gap: '6px',
            padding: '5px 10px',
            background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)',
            border: '1px solid #a7f3d0',
            borderRadius: '8px',
          }}>
            <span style={{ fontSize: '11px', color: '#047857', fontWeight: 600 }}>Today:</span>
            <span className="mono" style={{ fontSize: '12.5px', fontWeight: 800, color: '#059669' }}>
              {profile?.currency_symbol || '₹'}{summary.today_revenue?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}

        {/* Excel Bulk Upload (Desktop Only) */}
        <button
          onClick={onOpenExcelUpload}
          className="btn btn-secondary btn-sm desktop-only"
          title="Bulk Import Inventory from Excel (.xlsx, .xls, .csv)"
        >
          <FileSpreadsheet size={14} color="#059669" />
          <span>Excel</span>
        </button>

        {/* Quick Bill Scanner */}
        <button
          onClick={onOpenScanBill}
          className="btn btn-emerald btn-sm"
          style={{ padding: '6px 10px' }}
          title="Scan Wholesale Supplier Invoice with Camera or Upload"
        >
          <Camera size={14} />
          <span className="desktop-only">Scan Bill</span>
        </button>

        {/* Manual Stock Inward (Desktop Only) */}
        <button
          onClick={onOpenAddBatch}
          className="btn btn-secondary btn-sm desktop-only"
          title="Manual Purchase Stock Batch Entry (F4)"
        >
          <PackagePlus size={14} color="#0284c7" />
          <span>+ Batch</span>
        </button>

        {/* POS New Bill Button */}
        {activeTab !== 'pos' && (
          <button
            onClick={() => setActiveTab('pos')}
            className="btn btn-primary btn-sm"
            style={{ padding: '6px 10px' }}
          >
            <ShoppingCart size={14} />
            <span className="desktop-only">New Bill (F2)</span>
          </button>
        )}

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="btn btn-secondary btn-sm"
          style={{ width: '34px', height: '34px', padding: 0, flexShrink: 0 }}
          title="Toggle Light / Dark Mode"
          aria-label="Toggle Theme"
        >
          {theme === 'light' ? <Moon size={15} color="#475569" /> : <Sun size={15} color="#d97706" />}
        </button>

        {/* Header Logout Button (Desktop only) */}
        <button
          onClick={onLogout}
          className="btn btn-sm desktop-only"
          style={{
            borderColor: '#fca5a5',
            color: '#dc2626',
            background: '#fef2f2',
            fontWeight: 800,
            fontSize: '11.5px',
            padding: '6px 10px',
            boxShadow: '0 1px 3px rgba(220, 38, 38, 0.1)',
            cursor: 'pointer'
          }}
          title="Log out"
        >
          <LogOut size={14} color="#dc2626" />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
}
