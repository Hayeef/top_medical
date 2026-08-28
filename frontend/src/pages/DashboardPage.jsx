import React from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  ShoppingCart, 
  AlertTriangle, 
  Pill, 
  Users, 
  AlertCircle, 
  Package, 
  ArrowUpRight,
  ShieldAlert,
  Calendar,
  Banknote,
  QrCode,
  CreditCard,
  Sparkles,
  Wallet,
  ClipboardList
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, Cell } from 'recharts';

export default function DashboardPage({ 
  summary, 
  salesTrend, 
  categoriesDist, 
  topSelling, 
  profile, 
  setActiveTab,
  onOpenAddMedicine,
  onOpenAddBatch,
  onOpenDailyReport
}) {
  const currency = profile?.currency_symbol || '₹';
  const COLORS = ['#0284c7', '#10b981', '#6366f1', '#f59e0b', '#8b5cf6', '#ec4899'];

  const todayCash = parseFloat(summary?.today_cash_revenue) || 0;
  const todayUpi = parseFloat(summary?.today_upi_revenue) || 0;
  const todayCard = parseFloat(summary?.today_card_revenue) || 0;
  const totalCollectedToday = todayCash + todayUpi + todayCard;

  const cashPct = totalCollectedToday > 0 ? ((todayCash / totalCollectedToday) * 100).toFixed(1) : 0;
  const upiPct = totalCollectedToday > 0 ? ((todayUpi / totalCollectedToday) * 100).toFixed(1) : 0;

  return (
    <div className="main-page-wrapper">
      
      {/* Dashboard Top Header Bar with Daily Reorder Report Action */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
            Pharmacy Overview & Analytics
          </h2>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Real-time sales & inventory metrics
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {onOpenDailyReport && (
            <button
              onClick={onOpenDailyReport}
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 8px rgba(2, 132, 199, 0.2)' }}
            >
              <ClipboardList size={15} />
              <span>Daily Sold Medicines (PDF Reorder)</span>
            </button>
          )}
        </div>
      </div>
      
      {/* Critical Alert Banner if expired or near expiry items exist */}
      {((summary?.expired_count || 0) > 0 || (summary?.near_expiry_count || 0) > 0 || (summary?.low_stock_count || 0) > 0) && (
        <div style={{
          padding: '14px 18px',
          background: 'linear-gradient(90deg, #fff1f2 0%, #fffbeb 100%)',
          border: '1px solid #fecdd3',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          boxShadow: '0 2px 8px rgba(225, 29, 72, 0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ShieldAlert size={22} color="#e11d48" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: '13.5px', color: '#9f1239' }}>
                Pharmacy Attention Required
              </div>
              <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>
                {summary?.expired_count > 0 && <span style={{ color: '#e11d48', fontWeight: 700 }}>{summary.expired_count} Expired batches • </span>}
                {summary?.near_expiry_count > 0 && <span style={{ color: '#d97706', fontWeight: 700 }}>{summary.near_expiry_count} Expiring &lt;90d • </span>}
                {summary?.low_stock_count > 0 && <span style={{ color: '#0284c7', fontWeight: 700 }}>{summary.low_stock_count} Low stock items</span>}
              </div>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('alerts')}
            className="btn btn-secondary btn-sm"
            style={{ borderColor: '#fecdd3', color: '#e11d48', background: '#ffffff' }}
          >
            Review Alerts Center <ArrowUpRight size={14} />
          </button>
        </div>
      )}

      {/* Top 4 KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        
        {/* Today's Sales */}
        <div className="glass-panel glass-card-interactive" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Today's Revenue</div>
              <div className="mono" style={{ fontSize: '22px', fontWeight: 900, color: '#0284c7', marginTop: '4px' }}>
                {currency}{summary?.today_revenue?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
              </div>
              <div style={{ fontSize: '11px', color: '#059669', fontWeight: 600, marginTop: '2px' }}>
                {summary?.today_orders_count || 0} Bills Invoiced Today
              </div>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <TrendingUp size={20} color="#0284c7" />
            </div>
          </div>
        </div>

        {/* Estimated Gross Profit */}
        <div className="glass-panel glass-card-interactive" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Est. Gross Margin</div>
              <div className="mono" style={{ fontSize: '22px', fontWeight: 900, color: '#059669', marginTop: '4px' }}>
                {currency}{summary?.today_profit?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                Selling vs Purchase Price
              </div>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <DollarSign size={20} color="#059669" />
            </div>
          </div>
        </div>

        {/* Total Active Inventory Value */}
        <div 
          onClick={() => setActiveTab && setActiveTab('inventory')}
          className="glass-panel glass-card-interactive" 
          style={{ padding: '16px', cursor: 'pointer' }}
          title="Click to open Live Stock & Price Master Table"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>Inventory Value</span>
                <span className="badge badge-cyan" style={{ fontSize: '9px', padding: '0 4px' }}>Edit</span>
              </div>
              <div className="mono" style={{ fontSize: '22px', fontWeight: 900, color: '#6366f1', marginTop: '4px' }}>
                {currency}{summary?.total_inventory_value?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                {summary?.total_medicines_count || 0} Registered SKUs • Quick Stock Table &rarr;
              </div>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Pill size={20} color="#6366f1" />
            </div>
          </div>
        </div>

        {/* Customer Credit / Outstanding */}
        <div className="glass-panel glass-card-interactive" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Credit Dues</div>
              <div className="mono" style={{ fontSize: '22px', fontWeight: 900, color: '#e11d48', marginTop: '4px' }}>
                {currency}{summary?.total_credit_due?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                Pending from account patients
              </div>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Users size={20} color="#e11d48" />
            </div>
          </div>
        </div>
      </div>

      {/* Cash & UPI / GPay Collections & Drawer Settlement Box */}
      <div className="glass-panel" style={{ padding: '18px 20px', background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Wallet size={18} color="#0284c7" />
              <span>Today's Counter Payment Reconciliation (Cash vs UPI / GPay)</span>
            </div>
            <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
              Real-time cash drawer tracking and digital UPI settlement
            </div>
          </div>
          <button
            onClick={() => setActiveTab('invoices')}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '11.5px' }}
          >
            View Invoices Archive →
          </button>
        </div>

        {/* 2 Big Visual Columns */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
          
          {/* Cash Drawer Box */}
          <div style={{ padding: '14px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Cash in Counter Drawer
              </div>
              <div className="mono" style={{ fontSize: '24px', fontWeight: 900, color: '#065f46', marginTop: '4px' }}>
                {currency}{todayCash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '11px', color: '#16a34a', marginTop: '2px', fontWeight: 600 }}>
                {cashPct}% of today's intake
              </div>
            </div>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Banknote size={24} color="#059669" />
            </div>
          </div>

          {/* UPI / GPay Account Box */}
          <div style={{ padding: '14px 16px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                UPI / GPay in Bank Account
              </div>
              <div className="mono" style={{ fontSize: '24px', fontWeight: 900, color: '#0369a1', marginTop: '4px' }}>
                {currency}{todayUpi.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '11px', color: '#0284c7', marginTop: '2px', fontWeight: 600 }}>
                {upiPct}% of today's intake
              </div>
            </div>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <QrCode size={24} color="#0284c7" />
            </div>
          </div>

        </div>

        {/* Visual Progress Bar Ratio */}
        {totalCollectedToday > 0 && (
          <div style={{ marginTop: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>
              <span style={{ color: '#059669' }}>Cash: {cashPct}%</span>
              <span style={{ color: '#0284c7' }}>UPI / GPay: {upiPct}%</span>
            </div>
            <div style={{ height: '8px', width: '100%', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
              <div style={{ width: `${cashPct}%`, background: '#10b981', transition: 'width 0.4s ease' }} title={`Cash: ${cashPct}%`} />
              <div style={{ width: `${upiPct}%`, background: '#0284c7', transition: 'width 0.4s ease' }} title={`UPI: ${upiPct}%`} />
            </div>
          </div>
        )}
      </div>

      {/* Visual Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        
        {/* Sales Trend Chart */}
        <div className="glass-panel" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <h3 style={{ fontSize: '14.5px', fontWeight: 800, color: '#0f172a' }}>Sales Revenue Trend (7 Days)</h3>
              <p style={{ fontSize: '11.5px', color: '#64748b' }}>Daily invoiced total in {currency}</p>
            </div>
            <span className="badge badge-cyan">Real-time</span>
          </div>

          <div style={{ height: '220px', width: '100%' }}>
            {salesTrend && salesTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesTrend}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0284c7" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="formatted_date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => `${currency}${v}`} />
                  <Tooltip 
                    contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} 
                    formatter={(value) => [`${currency}${value}`, 'Revenue']}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#0284c7" strokeWidth={2.5} fillOpacity={1} fill="url(#salesGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '12px' }}>
                No sales data yet for the selected period
              </div>
            )}
          </div>
        </div>

        {/* Category Distribution */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>Sales by Category</h3>
            <p style={{ fontSize: '12px', color: '#64748b' }}>Revenue contribution per department</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {categoriesDist && categoriesDist.length > 0 ? (
              categoriesDist.slice(0, 5).map((cat, idx) => (
                <div key={idx}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{cat.category}</span>
                    <span className="mono" style={{ fontWeight: 800, color: '#0284c7' }}>{currency}{cat.amount.toFixed(2)}</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.min(100, (cat.amount / (categoriesDist[0]?.amount || 1)) * 100)}%`,
                      height: '100%',
                      background: COLORS[idx % COLORS.length],
                      borderRadius: '3px'
                    }}></div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: '40px 0', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                Categories will populate upon completing sales.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Grid: Top Selling Drugs & Quick POS Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        
        {/* Top Selling Medicines */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>Top Moving Pharmaceuticals</h3>
            <button onClick={() => setActiveTab('invoices')} className="btn btn-secondary btn-sm">
              All Sales <ArrowUpRight size={13} />
            </button>
          </div>

          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Drug Name</th>
                  <th>Form</th>
                  <th style={{ textAlign: 'center' }}>Units Sold</th>
                  <th style={{ textAlign: 'right' }}>Revenue ({currency})</th>
                </tr>
              </thead>
              <tbody>
                {topSelling && topSelling.length > 0 ? (
                  topSelling.map((med, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 700, color: '#0f172a' }}>{med.name}</td>
                      <td><span className="badge badge-gray">{med.dosage}</span></td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{med.units_sold}</td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: '#059669' }}>
                        {currency}{med.revenue.toFixed(2)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>
                      No bestselling data recorded yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Launch & Shortcuts Card */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>Quick Operations</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              onClick={() => setActiveTab('pos')}
              className="btn btn-primary"
              style={{ justifyContent: 'space-between', padding: '12px 16px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShoppingCart size={18} />
                <span style={{ fontSize: '14px' }}>Open POS Terminal</span>
              </div>
              <kbd style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>F2</kbd>
            </button>

            <button
              onClick={onOpenAddBatch}
              className="btn btn-emerald"
              style={{ justifyContent: 'space-between', padding: '12px 16px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Package size={18} />
                <span style={{ fontSize: '14px' }}>Stock Inward / Batch Entry</span>
              </div>
              <kbd style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>F4</kbd>
            </button>

            <button
              onClick={onOpenAddMedicine}
              className="btn btn-secondary"
              style={{ justifyContent: 'space-between', padding: '12px 16px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Pill size={18} color="#059669" />
                <span style={{ fontSize: '14px' }}>+ Add New Medicine</span>
              </div>
              <kbd style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', color: '#0284c7' }}>F3</kbd>
            </button>

            <button
              onClick={() => setActiveTab('alerts')}
              className="btn btn-secondary"
              style={{ justifyContent: 'space-between', padding: '12px 16px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertTriangle size={18} color="#d97706" />
                <span style={{ fontSize: '14px' }}>Expiry Radar & Low Stock</span>
              </div>
              <ArrowUpRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
