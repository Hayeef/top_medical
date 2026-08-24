import React from 'react';
import { 
  ShoppingCart, 
  LayoutDashboard, 
  Pill, 
  AlertTriangle, 
  FileText, 
  Menu
} from 'lucide-react';

export default function MobileNav({ 
  activeTab, 
  setActiveTab, 
  alertCounts, 
  cartCount = 0,
  onOpenMobileMenu 
}) {
  const totalAlerts = (alertCounts?.expired_count || 0) + (alertCounts?.near_expiry_count || 0) + (alertCounts?.low_stock_count || 0);

  return (
    <nav className="mobile-bottom-nav no-print mobile-only" aria-label="Mobile Navigation">
      {/* 1. POS Fast Counter */}
      <button
        type="button"
        className={`mobile-nav-item ${activeTab === 'pos' ? 'active' : ''}`}
        onClick={() => setActiveTab('pos')}
      >
        <div style={{ position: 'relative', display: 'inline-flex' }}>
          <ShoppingCart size={20} strokeWidth={activeTab === 'pos' ? 2.5 : 2} />
          {cartCount > 0 && (
            <span style={{
              position: 'absolute',
              top: '-6px',
              right: '-8px',
              background: '#ef4444',
              color: '#ffffff',
              fontSize: '10px',
              fontWeight: 800,
              minWidth: '16px',
              height: '16px',
              borderRadius: '9999px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 3px',
              border: '2px solid #ffffff'
            }}>
              {cartCount}
            </span>
          )}
        </div>
        <span>POS</span>
      </button>

      {/* 2. Dashboard */}
      <button
        type="button"
        className={`mobile-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
        onClick={() => setActiveTab('dashboard')}
      >
        <LayoutDashboard size={20} strokeWidth={activeTab === 'dashboard' ? 2.5 : 2} />
        <span>Dashboard</span>
      </button>

      {/* 3. Drug Inventory Master */}
      <button
        type="button"
        className={`mobile-nav-item ${activeTab === 'inventory' ? 'active' : ''}`}
        onClick={() => setActiveTab('inventory')}
      >
        <Pill size={20} strokeWidth={activeTab === 'inventory' ? 2.5 : 2} />
        <span>Stock</span>
      </button>

      {/* 4. Expiry Radar & Alerts */}
      <button
        type="button"
        className={`mobile-nav-item ${activeTab === 'alerts' ? 'active' : ''}`}
        onClick={() => setActiveTab('alerts')}
      >
        <div style={{ position: 'relative', display: 'inline-flex' }}>
          <AlertTriangle size={20} strokeWidth={activeTab === 'alerts' ? 2.5 : 2} />
          {totalAlerts > 0 && (
            <span style={{
              position: 'absolute',
              top: '-5px',
              right: '-7px',
              background: (alertCounts?.expired_count > 0) ? '#ef4444' : '#f59e0b',
              color: '#ffffff',
              fontSize: '9.5px',
              fontWeight: 800,
              minWidth: '15px',
              height: '15px',
              borderRadius: '9999px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 2px',
              border: '2px solid #ffffff'
            }}>
              {totalAlerts}
            </span>
          )}
        </div>
        <span>Alerts</span>
      </button>

      {/* 5. Invoices & Sales Ledger */}
      <button
        type="button"
        className={`mobile-nav-item ${activeTab === 'invoices' ? 'active' : ''}`}
        onClick={() => setActiveTab('invoices')}
      >
        <FileText size={20} strokeWidth={activeTab === 'invoices' ? 2.5 : 2} />
        <span>Ledger</span>
      </button>

      {/* 6. More Drawer Menu */}
      <button
        type="button"
        className="mobile-nav-item"
        onClick={onOpenMobileMenu}
        style={{ color: '#0284c7' }}
      >
        <Menu size={20} strokeWidth={2.2} />
        <span>Menu</span>
      </button>
    </nav>
  );
}
