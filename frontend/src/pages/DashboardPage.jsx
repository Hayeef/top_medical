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
  Calendar
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
  onOpenAddBatch 
}) {
  const currency = profile?.currency_symbol || '₹';
  const COLORS = ['#0284c7', '#10b981', '#6366f1', '#f59e0b', '#8b5cf6', '#ec4899'];

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Critical Alert Banner if expired or near expiry items exist */}
      {((summary?.expired_count || 0) > 0 || (summary?.near_expiry_count || 0) > 0 || (summary?.low_stock_count || 0) > 0) && (
        <div style={{
          padding: '14px 20px',
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
            <ShieldAlert size={22} color="#e11d48" />
            <div>
              <div style={{ fontWeight: 800, fontSize: '13.5px', color: '#9f1239' }}>
                Pharmacy Attention Required
              </div>
              <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>
                {summary?.expired_count > 0 && <span style={{ color: '#e11d48', fontWeight: 700 }}>{summary.expired_count} Expired batches to quarantine • </span>}
                {summary?.near_expiry_count > 0 && <span style={{ color: '#d97706', fontWeight: 700 }}>{summary.near_expiry_count} Batches expiring in &lt;90 days • </span>}
                {summary?.low_stock_count > 0 && <span style={{ color: '#0284c7', fontWeight: 700 }}>{summary.low_stock_count} Medicines below reorder level</span>}
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
        
        {/* Today's Sales */}
        <div className="glass-panel glass-card-interactive" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Today's Revenue</div>
              <div className="mono" style={{ fontSize: '24px', fontWeight: 900, color: '#0284c7', marginTop: '6px' }}>
                {currency}{summary?.today_revenue?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
              </div>
              <div style={{ fontSize: '11.5px', color: '#059669', fontWeight: 600, marginTop: '4px' }}>
                {summary?.today_orders_count || 0} Bills Invoiced Today
              </div>
            </div>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={22} color="#0284c7" />
            </div>
          </div>
        </div>

        {/* Estimated Gross Profit */}
        <div className="glass-panel glass-card-interactive" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Est. Gross Margin</div>
              <div className="mono" style={{ fontSize: '24px', fontWeight: 900, color: '#059669', marginTop: '6px' }}>
                {currency}{summary?.today_profit?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
              </div>
              <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>
                Based on purchase vs selling price
              </div>
            </div>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={22} color="#059669" />
            </div>
          </div>
        </div>

        {/* Medicines in Catalog */}
        <div className="glass-panel glass-card-interactive" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Active Catalog</div>
              <div className="mono" style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', marginTop: '6px' }}>
                {summary?.total_medicines || 0} Drugs
              </div>
              <div style={{ fontSize: '11.5px', color: summary?.low_stock_count > 0 ? '#d97706' : '#059669', fontWeight: 600, marginTop: '4px' }}>
                {summary?.low_stock_count || 0} Low Stock Alerts
              </div>
            </div>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Pill size={22} color="#6366f1" />
            </div>
          </div>
        </div>

        {/* Customer Credit / Outstanding */}
        <div className="glass-panel glass-card-interactive" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Unpaid Credit Dues</div>
              <div className="mono" style={{ fontSize: '24px', fontWeight: 900, color: '#e11d48', marginTop: '6px' }}>
                {currency}{summary?.total_credit_due?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
              </div>
              <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>
                Pending from account patients
              </div>
            </div>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={22} color="#e11d48" />
            </div>
          </div>
        </div>
      </div>

      {/* Visual Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '20px' }}>
        
        {/* Sales Trend Chart */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>Sales Revenue Trend (7 Days)</h3>
              <p style={{ fontSize: '12px', color: '#64748b' }}>Daily invoiced total in {currency}</p>
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
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '20px' }}>
        
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
