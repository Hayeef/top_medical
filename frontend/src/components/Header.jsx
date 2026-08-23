import React, { useState, useEffect } from 'react';
import { 
  PlusCircle, 
  ShoppingCart, 
  PackagePlus, 
  Sun, 
  Moon, 
  Clock, 
  ShieldCheck, 
  HelpCircle,
  Sparkles
} from 'lucide-react';

export default function Header({ 
  activeTab, 
  setActiveTab, 
  summary, 
  profile, 
  onOpenAddMedicine, 
  onOpenAddBatch 
}) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [theme, setTheme] = useState(localStorage.getItem('tm_theme') || 'light');

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
      padding: '0 28px',
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em' }}>
            {getPageTitle()}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px', color: '#64748b' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#059669', fontWeight: 600 }}>
              <ShieldCheck size={13} /> GST & Drug License Compliant
            </span>
            <span>•</span>
            <span className="mono" style={{ color: '#94a3b8' }}>
              DL: {profile?.dl_number_20b || 'KA-B1-20B-12345'}
            </span>
          </div>
        </div>
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Live Date / Time */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          fontSize: '12px',
          color: '#475569'
        }}>
          <Clock size={14} color="#0284c7" />
          <span className="mono">
            {currentTime.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} | {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>

        {/* Quick Today Revenue Widget */}
        {summary && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)',
            border: '1px solid #a7f3d0',
            borderRadius: '8px',
          }}>
            <span style={{ fontSize: '11.5px', color: '#047857', fontWeight: 600 }}>Today Sales:</span>
            <span className="mono" style={{ fontSize: '13.5px', fontWeight: 800, color: '#059669' }}>
              {profile?.currency_symbol || '₹'}{summary.today_revenue?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <button
          onClick={onOpenAddBatch}
          className="btn btn-secondary btn-sm"
          title="Add New Purchase Stock Batch (F4)"
        >
          <PackagePlus size={15} color="#0284c7" />
          <span>Stock Inward</span>
        </button>

        <button
          onClick={onOpenAddMedicine}
          className="btn btn-secondary btn-sm"
          title="Create New Medicine (F3)"
        >
          <PlusCircle size={15} color="#059669" />
          <span>+ Medicine</span>
        </button>

        {activeTab !== 'pos' && (
          <button
            onClick={() => setActiveTab('pos')}
            className="btn btn-primary btn-sm"
          >
            <ShoppingCart size={15} />
            <span>New Bill (F2)</span>
          </button>
        )}

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="btn btn-secondary btn-sm"
          style={{ width: '34px', height: '34px', padding: 0 }}
          title="Toggle Light / Dark Mode"
        >
          {theme === 'light' ? <Moon size={16} color="#475569" /> : <Sun size={16} color="#d97706" />}
        </button>
      </div>
    </header>
  );
}
