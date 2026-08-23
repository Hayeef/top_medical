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
  UserCheck
} from 'lucide-react';

export default function Header({ 
  activeTab, 
  setActiveTab, 
  summary, 
  profile, 
  user,
  onLogout,
  onOpenAddMedicine, 
  onOpenAddBatch,
  onOpenScanBill 
}) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [theme, setTheme] = useState(localStorage.getItem('tm_theme') || 'light');

  const isAdmin = user?.is_superuser || user?.is_staff || user?.email?.includes('admin');

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
      case 'pos': return 'Point of Sale (POS) Billing Terminal';
      case 'dashboard': return 'Pharmacy Operations & Financial Dashboard';
      case 'inventory': return 'Medicines & Batch Stock Master';
      case 'alerts': return 'Expiry Radar & Stock Alerts Center';
      case 'invoices': return 'Sales Ledger & Invoice Archive';
      case 'contacts': return 'Customers & Wholesale Suppliers';
      case 'settings': return 'Pharmacy Settings & Tax Configuration';
      default: return 'Top Medical Pharmacy Management';
    }
  };

  return (
    <header className="no-print" style={{
      height: '68px',
      padding: '0 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: '1px solid #e2e8f0',
      background: '#ffffff',
      position: 'sticky',
      top: 0,
      zIndex: 40,
      boxShadow: '0 1px 4px rgba(0, 0, 0, 0.02)'
    }}>
      {/* Page Title & Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div>
          <h2 style={{ fontSize: '16.5px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em', margin: 0 }}>
            {getPageTitle()}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#059669', fontWeight: 600 }}>
              <ShieldCheck size={13} /> DL 20B: {profile?.dl_number_20b || 'KA-B1-20B-12345'}
            </span>
            <span>•</span>
            <span className="mono" style={{ color: '#94a3b8' }}>
              Role: <strong style={{ color: isAdmin ? '#0284c7' : '#059669' }}>{isAdmin ? 'Admin' : 'Cashier'}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        
        {/* Live Date / Time */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 10px',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          fontSize: '11.5px',
          color: '#475569'
        }}>
          <Clock size={13} color="#0284c7" />
          <span className="mono">
            {currentTime.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} | {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>

        {/* Quick Today Revenue Widget (Admin Only) */}
        {isAdmin && summary && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)',
            border: '1px solid #a7f3d0',
            borderRadius: '8px',
          }}>
            <span style={{ fontSize: '11px', color: '#047857', fontWeight: 600 }}>Today:</span>
            <span className="mono" style={{ fontSize: '13px', fontWeight: 800, color: '#059669' }}>
              {profile?.currency_symbol || '₹'}{summary.today_revenue?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}

        {/* Admin Quick Bill Scanner */}
        {isAdmin && (
          <button
            onClick={onOpenScanBill}
            className="btn btn-emerald btn-sm"
            title="Scan Wholesale Supplier Invoice with Camera or Upload"
          >
            <Camera size={14} />
            <span>Scan Bill (AI Inward)</span>
          </button>
        )}

        {/* Admin Manual Stock Inward */}
        {isAdmin && (
          <button
            onClick={onOpenAddBatch}
            className="btn btn-secondary btn-sm"
            title="Manual Purchase Stock Batch Entry (F4)"
          >
            <PackagePlus size={14} color="#0284c7" />
            <span>+ Batch</span>
          </button>
        )}

        {/* POS New Bill Button */}
        {activeTab !== 'pos' && (
          <button
            onClick={() => setActiveTab('pos')}
            className="btn btn-primary btn-sm"
          >
            <ShoppingCart size={14} />
            <span>New Bill (F2)</span>
          </button>
        )}

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="btn btn-secondary btn-sm"
          style={{ width: '32px', height: '32px', padding: 0 }}
          title="Toggle Light / Dark Mode"
        >
          {theme === 'light' ? <Moon size={15} color="#475569" /> : <Sun size={15} color="#d97706" />}
        </button>

        {/* Prominent Header Sign Out Button */}
        <button
          onClick={onLogout}
          className="btn btn-secondary btn-sm"
          style={{
            borderColor: '#fecdd3',
            color: '#e11d48',
            background: '#fff1f2',
            fontWeight: 700
          }}
          title="Sign Out of Session"
        >
          <LogOut size={14} />
          <span>Sign Out</span>
        </button>
      </div>
    </header>
  );
}
