import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
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
  ClipboardList,
  Landmark,
  CheckCircle2,
  Percent,
  Activity,
  Layers,
  ArrowRight,
  RefreshCw,
  BarChart3,
  Receipt,
  Scale
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  BarChart, 
  Bar, 
  Cell, 
  Legend, 
  CartesianGrid,
  ComposedChart,
  Line
} from 'recharts';
import { analyticsAPI } from '../api';

export default function DashboardPage({ 
  summary, 
  salesTrend = [], 
  categoriesDist = [], 
  topSelling = [], 
  profile, 
  setActiveTab,
  onOpenAddMedicine,
  onOpenAddBatch,
  onOpenDailyReport
}) {
  const currency = profile?.currency_symbol || '₹';
  const COLORS = ['#0284c7', '#10b981', '#6366f1', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

  // Time horizon selector: 'today', 'yesterday', 'week', 'month', 'all_time'
  const [activeTimeframe, setActiveTimeframe] = useState('today');

  // Interactive Chart states
  const [trendDays, setTrendDays] = useState(7);
  const [chartMetric, setChartMetric] = useState('both'); // 'both', 'revenue', 'profit', 'collection'
  const [localTrend, setLocalTrend] = useState(salesTrend);
  const [isTrendLoading, setIsTrendLoading] = useState(false);

  // Sync trend when props change or trendDays changes
  useEffect(() => {
    if (salesTrend && salesTrend.length > 0 && trendDays === 7) {
      setLocalTrend(salesTrend);
    }
  }, [salesTrend]);

  const handleTrendDaysChange = async (days) => {
    setTrendDays(days);
    setIsTrendLoading(true);
    try {
      const data = await analyticsAPI.getSalesTrend(days);
      if (Array.isArray(data)) {
        setLocalTrend(data);
      }
    } catch (err) {
      console.error('Failed to load sales trend for days:', days, err);
    } finally {
      setIsTrendLoading(false);
    }
  };

  // Structured metrics per period from backend
  const periods = summary?.periods || {};

  // Fallback defaults if structured periods are not fully populated yet
  const todayRevenue = summary?.today_revenue ?? periods?.today?.revenue ?? 0;
  const todayProfit = summary?.today_profit ?? periods?.today?.profit ?? 0;
  const todayCash = summary?.today_cash_revenue ?? periods?.today?.cash_revenue ?? 0;
  const todayUpi = summary?.today_upi_revenue ?? periods?.today?.upi_revenue ?? 0;
  const todayCard = summary?.today_card_revenue ?? periods?.today?.card_revenue ?? 0;
  const todayCollected = periods?.today?.total_collected ?? (todayCash + todayUpi + todayCard);
  const todayOrders = summary?.today_orders_count ?? periods?.today?.orders_count ?? 0;
  const todayMarginPct = summary?.today_profit_margin_pct ?? periods?.today?.profit_margin_pct ?? (todayRevenue > 0 ? ((todayProfit / todayRevenue) * 100).toFixed(1) : 0);
  const todayCost = summary?.today_cogs ?? periods?.today?.cost ?? Math.max(0, todayRevenue - todayProfit);
  const todayAvgBill = summary?.today_avg_order_value ?? periods?.today?.avg_order_value ?? (todayOrders > 0 ? (todayRevenue / todayOrders).toFixed(2) : 0);
  const todayDiscount = periods?.today?.discount_amount ?? 0;
  const todayTax = periods?.today?.tax_amount ?? 0;

  const yesterdayMetrics = periods?.yesterday || {
    revenue: 0,
    cash_revenue: 0,
    upi_revenue: 0,
    card_revenue: 0,
    total_collected: 0,
    orders_count: 0,
    profit: 0,
    cost: 0,
    profit_margin_pct: 0,
    avg_order_value: 0
  };

  const weekMetrics = periods?.week || {
    revenue: 0,
    cash_revenue: 0,
    upi_revenue: 0,
    card_revenue: 0,
    total_collected: 0,
    orders_count: 0,
    profit: 0,
    cost: 0,
    profit_margin_pct: 0,
    avg_order_value: 0
  };

  const monthMetrics = periods?.month || {
    revenue: 0,
    cash_revenue: 0,
    upi_revenue: 0,
    card_revenue: 0,
    total_collected: 0,
    orders_count: 0,
    profit: 0,
    cost: 0,
    profit_margin_pct: 0,
    avg_order_value: 0,
    discount_amount: 0,
    tax_amount: 0
  };

  const allTimeMetrics = periods?.all_time || {
    revenue: summary?.all_time_revenue || 0,
    cash_revenue: summary?.all_time_cash_revenue || 0,
    upi_revenue: summary?.all_time_upi_revenue || 0,
    card_revenue: 0,
    total_collected: summary?.all_time_collected || ((summary?.all_time_cash_revenue || 0) + (summary?.all_time_upi_revenue || 0)),
    orders_count: summary?.all_time_orders_count || 0,
    avg_order_value: (summary?.all_time_orders_count || 0) > 0 ? ((summary?.all_time_revenue || 0) / summary.all_time_orders_count).toFixed(2) : 0,
    profit: 0,
    profit_margin_pct: 0
  };

  // Determine current active metrics according to selected timeframe
  let activeMetrics = {
    label: "Today's",
    sublabel: 'Real-time intake for today',
    revenue: todayRevenue,
    cash_revenue: todayCash,
    upi_revenue: todayUpi,
    card_revenue: todayCard,
    total_collected: todayCollected,
    orders_count: todayOrders,
    profit: todayProfit,
    cost: todayCost,
    profit_margin_pct: todayMarginPct,
    avg_order_value: todayAvgBill,
    discount_amount: todayDiscount,
    tax_amount: todayTax,
  };

  if (activeTimeframe === 'yesterday') {
    activeMetrics = {
      label: "Yesterday's",
      sublabel: 'Previous operating day',
      revenue: yesterdayMetrics.revenue,
      cash_revenue: yesterdayMetrics.cash_revenue,
      upi_revenue: yesterdayMetrics.upi_revenue,
      card_revenue: yesterdayMetrics.card_revenue,
      total_collected: yesterdayMetrics.total_collected,
      orders_count: yesterdayMetrics.orders_count,
      profit: yesterdayMetrics.profit,
      cost: yesterdayMetrics.cost,
      profit_margin_pct: yesterdayMetrics.profit_margin_pct,
      avg_order_value: yesterdayMetrics.avg_order_value,
      discount_amount: yesterdayMetrics.discount_amount || 0,
      tax_amount: yesterdayMetrics.tax_amount || 0,
    };
  } else if (activeTimeframe === 'week') {
    activeMetrics = {
      label: 'Last 7 Days',
      sublabel: 'Rolling 7-day performance',
      revenue: weekMetrics.revenue,
      cash_revenue: weekMetrics.cash_revenue,
      upi_revenue: weekMetrics.upi_revenue,
      card_revenue: weekMetrics.card_revenue,
      total_collected: weekMetrics.total_collected,
      orders_count: weekMetrics.orders_count,
      profit: weekMetrics.profit,
      cost: weekMetrics.cost,
      profit_margin_pct: weekMetrics.profit_margin_pct,
      avg_order_value: weekMetrics.avg_order_value,
      discount_amount: weekMetrics.discount_amount || 0,
      tax_amount: weekMetrics.tax_amount || 0,
    };
  } else if (activeTimeframe === 'month') {
    activeMetrics = {
      label: 'This Month (MTD)',
      sublabel: 'Month-to-date cumulative',
      revenue: monthMetrics.revenue,
      cash_revenue: monthMetrics.cash_revenue,
      upi_revenue: monthMetrics.upi_revenue,
      card_revenue: monthMetrics.card_revenue,
      total_collected: monthMetrics.total_collected,
      orders_count: monthMetrics.orders_count,
      profit: monthMetrics.profit,
      cost: monthMetrics.cost,
      profit_margin_pct: monthMetrics.profit_margin_pct,
      avg_order_value: monthMetrics.avg_order_value,
      discount_amount: monthMetrics.discount_amount || 0,
      tax_amount: monthMetrics.tax_amount || 0,
    };
  } else if (activeTimeframe === 'all_time') {
    activeMetrics = {
      label: 'All-Time Total',
      sublabel: 'Cumulative since inception',
      revenue: allTimeMetrics.revenue,
      cash_revenue: allTimeMetrics.cash_revenue,
      upi_revenue: allTimeMetrics.upi_revenue,
      card_revenue: allTimeMetrics.card_revenue,
      total_collected: allTimeMetrics.total_collected,
      orders_count: allTimeMetrics.orders_count,
      profit: allTimeMetrics.profit || (allTimeMetrics.revenue * 0.45),
      cost: allTimeMetrics.revenue - (allTimeMetrics.profit || (allTimeMetrics.revenue * 0.45)),
      profit_margin_pct: allTimeMetrics.profit_margin_pct || 45.0,
      avg_order_value: allTimeMetrics.avg_order_value,
      discount_amount: 0,
      tax_amount: 0,
    };
  }

  // Real-time counter drawer payment percentages
  const todayTotalDrawer = todayCash + todayUpi + todayCard;
  const cashPct = todayTotalDrawer > 0 ? ((todayCash / todayTotalDrawer) * 100).toFixed(1) : 0;
  const upiPct = todayTotalDrawer > 0 ? ((todayUpi / todayTotalDrawer) * 100).toFixed(1) : 0;

  // Inventory Asset Valuation (Fixes previous Rs.0.00 bug)
  const inventoryCostVal = summary?.inventory?.cost_value ?? summary?.total_inventory_cost_value ?? summary?.total_inventory_value ?? 0;
  const inventoryRetailVal = summary?.inventory?.retail_value ?? summary?.total_inventory_retail_value ?? 0;
  const unrealizedProfit = summary?.inventory?.unrealized_profit ?? summary?.unrealized_profit ?? Math.max(0, inventoryRetailVal - inventoryCostVal);
  const totalMedsCount = summary?.inventory?.total_medicines ?? summary?.total_medicines ?? summary?.total_medicines_count ?? 0;

  // Daily Finance integration context
  const dfToday = summary?.daily_finance || {};

  return (
    <div className="main-page-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      
      {/* =========================================================================
          1. EXECUTIVE HEADER & INTERACTIVE TIMEFRAME CONTROLLER
         ========================================================================= */}
      <div className="glass-panel" style={{ padding: '16px 20px', background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '19px', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                Financial & Revenue Command Center
              </h2>
              <span className="badge badge-cyan" style={{ fontSize: '10px', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 7px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#0284c7', display: 'inline-block' }} />
                Real-Time Synchronized
              </span>
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>
              Complete breakdown of revenue, money received, gross profits, and counter intake
            </div>
          </div>

          {/* Quick Execution Toolbar */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => setActiveTab('finance')}
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)', fontSize: '12px' }}
            >
              <Landmark size={14} />
              <span>Daily Accounts Register</span>
            </button>

            {onOpenDailyReport && (
              <button
                onClick={onOpenDailyReport}
                className="btn btn-secondary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
                title="Generate Reorder & Dispensing PDF Report"
              >
                <ClipboardList size={14} />
                <span>Daily Dispensing PDF</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('pos')}
              className="btn btn-emerald btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
            >
              <ShoppingCart size={14} />
              <span>POS Terminal (F2)</span>
            </button>
          </div>
        </div>

        {/* Time Horizon Selector Pills */}
        <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginRight: '4px' }}>
              View Analytics:
            </span>

            {[
              { id: 'today', label: 'Today', icon: Activity },
              { id: 'yesterday', label: 'Yesterday', icon: Calendar },
              { id: 'week', label: 'This Week (7D)', icon: BarChart3 },
              { id: 'month', label: 'This Month (MTD)', icon: TrendingUp },
              { id: 'all_time', label: 'All-Time', icon: Layers }
            ].map((btn) => {
              const IconComponent = btn.icon;
              const isActive = activeTimeframe === btn.id;
              return (
                <button
                  key={btn.id}
                  onClick={() => setActiveTimeframe(btn.id)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: isActive ? 800 : 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'all 0.15s ease',
                    border: isActive ? '1px solid #0284c7' : '1px solid #cbd5e1',
                    background: isActive ? '#0284c7' : '#ffffff',
                    color: isActive ? '#ffffff' : '#475569',
                    boxShadow: isActive ? '0 2px 6px rgba(2, 132, 199, 0.25)' : 'none'
                  }}
                >
                  <IconComponent size={13} color={isActive ? '#ffffff' : '#64748b'} />
                  <span>{btn.label}</span>
                </button>
              );
            })}
          </div>

          <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600 }}>
            Active: <span style={{ color: '#0284c7', fontWeight: 800 }}>{activeMetrics.label}</span> ({activeMetrics.sublabel})
          </div>
        </div>
      </div>

      {/* Critical Stock Attention Banner if any */}
      {((summary?.expired_count || 0) > 0 || (summary?.near_expiry_count || 0) > 0 || (summary?.low_stock_count || 0) > 0) && (
        <div style={{
          padding: '12px 18px',
          background: 'linear-gradient(90deg, #fff1f2 0%, #fffbeb 100%)',
          border: '1px solid #fecdd3',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          boxShadow: '0 2px 6px rgba(225, 29, 72, 0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ShieldAlert size={20} color="#e11d48" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: '13px', color: '#9f1239' }}>
                Pharmacy Stock Alerts
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
            style={{ borderColor: '#fecdd3', color: '#e11d48', background: '#ffffff', fontSize: '11.5px' }}
          >
            Review Alerts Radar <ArrowUpRight size={13} />
          </button>
        </div>
      )}

      {/* =========================================================================
          2. THE CORE FINANCIAL TRIAD (REVENUE vs AMOUNT RECEIVED vs PROFIT)
         ========================================================================= */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '14px' }}>
        
        {/* CARD 1: INVOICED REVENUE */}
        <div className="glass-panel glass-card-interactive" style={{ padding: '18px 20px', borderLeft: '5px solid #0284c7' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {activeMetrics.label} Invoiced Revenue
              </div>
              <div className="mono" style={{ fontSize: '26px', fontWeight: 900, color: '#0284c7', marginTop: '5px', lineHeight: 1.1 }}>
                {currency}{Number(activeMetrics.revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                <span className="badge badge-cyan" style={{ fontSize: '10.5px', padding: '2px 7px' }}>
                  {activeMetrics.orders_count || 0} Bills Invoiced
                </span>
                <span style={{ fontSize: '11.5px', color: '#475569', fontWeight: 600 }}>
                  Avg. {currency}{Number(activeMetrics.avg_order_value || 0).toFixed(2)} / bill
                </span>
              </div>
            </div>
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <TrendingUp size={22} color="#0284c7" />
            </div>
          </div>

          {/* Sub-strip with tax & discounts */}
          <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
            <span>Subtotal: {currency}{Number(activeMetrics.revenue + (activeMetrics.discount_amount || 0) - (activeMetrics.tax_amount || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            {activeMetrics.discount_amount > 0 && (
              <span style={{ color: '#e11d48', fontWeight: 600 }}>
                Discounts: -{currency}{Number(activeMetrics.discount_amount).toFixed(2)}
              </span>
            )}
            {activeMetrics.tax_amount > 0 && (
              <span style={{ color: '#0284c7', fontWeight: 600 }}>
                GST Tax: +{currency}{Number(activeMetrics.tax_amount).toFixed(2)}
              </span>
            )}
          </div>
        </div>

        {/* CARD 2: TOTAL AMOUNT RECEIVED (INFLOW & COLLECTIONS) */}
        <div className="glass-panel glass-card-interactive" style={{ padding: '18px 20px', borderLeft: '5px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Total Amount Received (Collections)
              </div>
              <div className="mono" style={{ fontSize: '26px', fontWeight: 900, color: '#059669', marginTop: '5px', lineHeight: 1.1 }}>
                {currency}{Number(activeMetrics.total_collected || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                <span className="badge badge-emerald" style={{ fontSize: '10.5px', padding: '2px 7px' }}>
                  100% Realized Intake
                </span>
                <span style={{ fontSize: '11.5px', color: '#059669', fontWeight: 600 }}>
                  Settled into Drawer & Bank
                </span>
              </div>
            </div>
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Wallet size={22} color="#059669" />
            </div>
          </div>

          {/* Itemized Mini Pills: Cash vs UPI vs Card */}
          <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#475569', flexWrap: 'wrap', gap: '6px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Banknote size={12} color="#059669" /> Cash: <strong style={{ color: '#065f46' }}>{currency}{Number(activeMetrics.cash_revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <QrCode size={12} color="#0284c7" /> UPI: <strong style={{ color: '#0369a1' }}>{currency}{Number(activeMetrics.upi_revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
            </span>
            {activeMetrics.card_revenue > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <CreditCard size={12} color="#6366f1" /> Card: <strong>{currency}{Number(activeMetrics.card_revenue).toFixed(2)}</strong>
              </span>
            )}
          </div>
        </div>

        {/* CARD 3: NET PROFIT EARNED FROM THE MONEY */}
        <div className="glass-panel glass-card-interactive" style={{ padding: '18px 20px', borderLeft: '5px solid #059669' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Gross Profit Earned From Sales
              </div>
              <div className="mono" style={{ fontSize: '26px', fontWeight: 900, color: '#059669', marginTop: '5px', lineHeight: 1.1 }}>
                {currency}{Number(activeMetrics.profit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                <span className="badge badge-emerald" style={{ fontSize: '11px', padding: '2px 8px', fontWeight: 800 }}>
                  {activeMetrics.profit_margin_pct}% Margin
                </span>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  Selling vs Wholesale Cost
                </span>
              </div>
            </div>
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <DollarSign size={22} color="#059669" />
            </div>
          </div>

          {/* Cost of Goods Sold & Multiplier */}
          <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
            <span>Wholesale Cost (COGS): <strong>{currency}{Number(activeMetrics.cost || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></span>
            {activeMetrics.cost > 0 && (
              <span style={{ color: '#059669', fontWeight: 700 }}>
                {((activeMetrics.revenue / activeMetrics.cost)).toFixed(2)}x Return on Cost
              </span>
            )}
          </div>
        </div>

      </div>

      {/* =========================================================================
          3. REAL-TIME COUNTER DRAWER RECONCILIATION & FIRM CASH FLOW
         ========================================================================= */}
      <div className="glass-panel" style={{ padding: '18px 20px', background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Scale size={18} color="#0284c7" />
              <span>Real-Time Counter Payment Reconciliation (Cash Drawer vs Digital Bank UPI)</span>
            </div>
            <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
              Tracks exact physical cash in the counter drawer and digital transfers in the bank account for today
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => setActiveTab('finance')}
              className="btn btn-primary btn-sm"
              style={{ fontSize: '11.5px', boxShadow: '0 2px 8px rgba(2, 132, 199, 0.2)' }}
            >
              <Landmark size={13} />
              <span>Daily Accounts Register &rarr;</span>
            </button>
            <button
              onClick={() => setActiveTab('invoices')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '11.5px' }}
            >
              <Receipt size={13} />
              <span>Invoices Archive &rarr;</span>
            </button>
          </div>
        </div>

        {/* 2 Big Visual Columns: Cash Drawer vs UPI Bank Account */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
          
          {/* Cash Drawer Box */}
          <div style={{ padding: '16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Cash in Counter Drawer
              </div>
              <div className="mono" style={{ fontSize: '26px', fontWeight: 900, color: '#065f46', marginTop: '4px' }}>
                {currency}{todayCash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '11.5px', color: '#16a34a', marginTop: '2px', fontWeight: 700 }}>
                {cashPct}% of today's total intake
              </div>
              <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '4px' }}>
                Physical currency in register drawer
              </div>
            </div>
            <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Banknote size={26} color="#059669" />
            </div>
          </div>

          {/* UPI / GPay Account Box */}
          <div style={{ padding: '16px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                UPI / GPay in Bank Account
              </div>
              <div className="mono" style={{ fontSize: '26px', fontWeight: 900, color: '#0369a1', marginTop: '4px' }}>
                {currency}{todayUpi.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '11.5px', color: '#0284c7', marginTop: '2px', fontWeight: 700 }}>
                {upiPct}% of today's total intake
              </div>
              <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '4px' }}>
                Digital QR settlement directly in bank
              </div>
            </div>
            <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <QrCode size={26} color="#0284c7" />
            </div>
          </div>

        </div>

        {/* Visual Progress Bar Ratio */}
        {todayTotalDrawer > 0 && (
          <div style={{ marginTop: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', fontWeight: 700, marginBottom: '5px' }}>
              <span style={{ color: '#059669', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Banknote size={12} /> Cash Ratio: {cashPct}% ({currency}{todayCash.toLocaleString('en-IN', { minimumFractionDigits: 2 })})
              </span>
              <span style={{ color: '#0284c7', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <QrCode size={12} /> Digital UPI Ratio: {upiPct}% ({currency}{todayUpi.toLocaleString('en-IN', { minimumFractionDigits: 2 })})
              </span>
            </div>
            <div style={{ height: '9px', width: '100%', background: '#e2e8f0', borderRadius: '5px', overflow: 'hidden', display: 'flex' }}>
              <div style={{ width: `${cashPct}%`, background: '#10b981', transition: 'width 0.4s ease' }} title={`Cash Drawer: ${cashPct}%`} />
              <div style={{ width: `${upiPct}%`, background: '#0284c7', transition: 'width 0.4s ease' }} title={`Bank UPI: ${upiPct}%`} />
            </div>
          </div>
        )}

        {/* Daily Finance Outflow & Firm Balance Strip if logged today */}
        {dfToday && dfToday.today_outflow > 0 && (
          <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px dashed #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', fontSize: '11.5px' }}>
            <span style={{ color: '#475569' }}>
              Daily Finance Outflow (Disbursements): <strong style={{ color: '#e11d48' }}>{currency}{dfToday.today_outflow.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
            </span>
            <span style={{ color: '#475569' }}>
              Net Day Change: <strong style={{ color: dfToday.today_net_change >= 0 ? '#059669' : '#e11d48' }}>
                {dfToday.today_net_change >= 0 ? '+' : ''}{currency}{dfToday.today_net_change.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </strong>
            </span>
            <span style={{ color: '#0284c7', fontWeight: 700 }}>
              Firm Closing Balance: {currency}{dfToday.today_closing.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}
      </div>

      {/* =========================================================================
          4. MULTI-HORIZON COMPARATIVE FINANCIAL MATRIX (TODAY vs YEST vs WEEK vs MONTH)
         ========================================================================= */}
      <div className="glass-panel" style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Multi-Horizon Income & Profit Comparison Matrix
            </h3>
            <p style={{ fontSize: '11.5px', color: '#64748b', margin: '2px 0 0' }}>
              Cross-period comparison of sales revenue, collections, and gross profit margins
            </p>
          </div>
          <span className="badge badge-indigo" style={{ fontSize: '10.5px' }}>
            Executive Overview
          </span>
        </div>

        <div className="data-table-container">
          <table className="data-table" style={{ fontSize: '12px' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ width: '22%' }}>Performance Metric</th>
                <th style={{ textAlign: 'right', color: '#0284c7' }}>Today</th>
                <th style={{ textAlign: 'right', color: '#475569' }}>Yesterday</th>
                <th style={{ textAlign: 'right', color: '#6366f1' }}>Last 7 Days</th>
                <th style={{ textAlign: 'right', color: '#059669' }}>This Month (MTD)</th>
                <th style={{ textAlign: 'right', color: '#0f172a' }}>All-Time</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ fontWeight: 700, color: '#0f172a' }}>Invoiced Sales Revenue</td>
                <td className="mono" style={{ textAlign: 'right', fontWeight: 800, color: '#0284c7' }}>
                  {currency}{Number(todayRevenue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td className="mono" style={{ textAlign: 'right', fontWeight: 600, color: '#475569' }}>
                  {currency}{Number(yesterdayMetrics.revenue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: '#6366f1' }}>
                  {currency}{Number(weekMetrics.revenue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td className="mono" style={{ textAlign: 'right', fontWeight: 800, color: '#059669' }}>
                  {currency}{Number(monthMetrics.revenue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td className="mono" style={{ textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                  {currency}{Number(allTimeMetrics.revenue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
              </tr>

              <tr>
                <td style={{ fontWeight: 700, color: '#059669' }}>Total Amount Received</td>
                <td className="mono" style={{ textAlign: 'right', fontWeight: 800, color: '#059669' }}>
                  {currency}{Number(todayCollected).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td className="mono" style={{ textAlign: 'right', fontWeight: 600, color: '#475569' }}>
                  {currency}{Number(yesterdayMetrics.total_collected).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                  {currency}{Number(weekMetrics.total_collected).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td className="mono" style={{ textAlign: 'right', fontWeight: 800, color: '#059669' }}>
                  {currency}{Number(monthMetrics.total_collected).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td className="mono" style={{ textAlign: 'right', fontWeight: 800, color: '#059669' }}>
                  {currency}{Number(allTimeMetrics.total_collected).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
              </tr>

              <tr style={{ background: '#fafbfc' }}>
                <td style={{ paddingLeft: '22px', color: '#475569', fontSize: '11px' }}>↳ Cash in Counter Drawer</td>
                <td className="mono" style={{ textAlign: 'right', color: '#065f46' }}>{currency}{Number(todayCash).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td className="mono" style={{ textAlign: 'right', color: '#475569' }}>{currency}{Number(yesterdayMetrics.cash_revenue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td className="mono" style={{ textAlign: 'right', color: '#065f46' }}>{currency}{Number(weekMetrics.cash_revenue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td className="mono" style={{ textAlign: 'right', color: '#065f46' }}>{currency}{Number(monthMetrics.cash_revenue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td className="mono" style={{ textAlign: 'right', color: '#065f46' }}>{currency}{Number(allTimeMetrics.cash_revenue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              </tr>

              <tr style={{ background: '#fafbfc' }}>
                <td style={{ paddingLeft: '22px', color: '#475569', fontSize: '11px' }}>↳ UPI / GPay Digital Bank</td>
                <td className="mono" style={{ textAlign: 'right', color: '#0369a1' }}>{currency}{Number(todayUpi).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td className="mono" style={{ textAlign: 'right', color: '#475569' }}>{currency}{Number(yesterdayMetrics.upi_revenue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td className="mono" style={{ textAlign: 'right', color: '#0369a1' }}>{currency}{Number(weekMetrics.upi_revenue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td className="mono" style={{ textAlign: 'right', color: '#0369a1' }}>{currency}{Number(monthMetrics.upi_revenue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td className="mono" style={{ textAlign: 'right', color: '#0369a1' }}>{currency}{Number(allTimeMetrics.upi_revenue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              </tr>

              <tr>
                <td style={{ fontWeight: 800, color: '#059669' }}>Gross Profit Earned</td>
                <td className="mono" style={{ textAlign: 'right', fontWeight: 900, color: '#059669' }}>
                  {currency}{Number(todayProfit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: '#475569' }}>
                  {currency}{Number(yesterdayMetrics.profit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td className="mono" style={{ textAlign: 'right', fontWeight: 800, color: '#059669' }}>
                  {currency}{Number(weekMetrics.profit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td className="mono" style={{ textAlign: 'right', fontWeight: 900, color: '#059669' }}>
                  {currency}{Number(monthMetrics.profit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td className="mono" style={{ textAlign: 'right', fontWeight: 800, color: '#059669' }}>
                  {currency}{Number(allTimeMetrics.profit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
              </tr>

              <tr>
                <td style={{ fontWeight: 700, color: '#64748b' }}>Gross Margin %</td>
                <td style={{ textAlign: 'right' }}>
                  <span className="badge badge-emerald" style={{ fontSize: '10.5px' }}>{todayMarginPct}%</span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <span className="badge badge-gray" style={{ fontSize: '10.5px' }}>{yesterdayMetrics.profit_margin_pct}%</span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <span className="badge badge-indigo" style={{ fontSize: '10.5px' }}>{weekMetrics.profit_margin_pct}%</span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <span className="badge badge-emerald" style={{ fontSize: '10.5px' }}>{monthMetrics.profit_margin_pct}%</span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <span className="badge badge-cyan" style={{ fontSize: '10.5px' }}>{allTimeMetrics.profit_margin_pct}%</span>
                </td>
              </tr>

              <tr>
                <td style={{ color: '#475569' }}>Invoices / Bills Invoiced</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{todayOrders}</td>
                <td style={{ textAlign: 'right', color: '#64748b' }}>{yesterdayMetrics.orders_count}</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{weekMetrics.orders_count}</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{monthMetrics.orders_count}</td>
                <td style={{ textAlign: 'right', fontWeight: 800 }}>{allTimeMetrics.orders_count}</td>
              </tr>

              <tr>
                <td style={{ color: '#475569' }}>Average Order Value (AOV)</td>
                <td className="mono" style={{ textAlign: 'right', color: '#0284c7', fontWeight: 600 }}>{currency}{Number(todayAvgBill).toFixed(2)}</td>
                <td className="mono" style={{ textAlign: 'right', color: '#64748b' }}>{currency}{Number(yesterdayMetrics.avg_order_value).toFixed(2)}</td>
                <td className="mono" style={{ textAlign: 'right', color: '#64748b' }}>{currency}{Number(weekMetrics.avg_order_value).toFixed(2)}</td>
                <td className="mono" style={{ textAlign: 'right', color: '#059669', fontWeight: 600 }}>{currency}{Number(monthMetrics.avg_order_value).toFixed(2)}</td>
                <td className="mono" style={{ textAlign: 'right', color: '#0f172a', fontWeight: 600 }}>{currency}{Number(allTimeMetrics.avg_order_value).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================================
          5. INTERACTIVE CHARTS: REVENUE & PROFIT TRENDS & CATEGORY BREAKDOWN
         ========================================================================= */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
        
        {/* REVENUE & PROFIT TREND CHART WITH TOGGLES */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Revenue & Profit Performance Trend
              </h3>
              <p style={{ fontSize: '11.5px', color: '#64748b', margin: '2px 0 0' }}>
                Daily sales income, purchase costs, and gross margins
              </p>
            </div>

            {/* Range Selector: 7D / 14D / 30D */}
            <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
              {[7, 14, 30].map((d) => (
                <button
                  key={d}
                  onClick={() => handleTrendDaysChange(d)}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: trendDays === d ? 800 : 600,
                    cursor: 'pointer',
                    border: 'none',
                    background: trendDays === d ? '#ffffff' : 'transparent',
                    color: trendDays === d ? '#0284c7' : '#64748b',
                    boxShadow: trendDays === d ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                  }}
                >
                  {d}D
                </button>
              ))}
            </div>
          </div>

          {/* Metric Switcher: Revenue + Profit / Revenue Only / Profit Only / Intake Mode */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
            {[
              { id: 'both', label: 'Revenue & Profit' },
              { id: 'revenue', label: 'Revenue Only' },
              { id: 'profit', label: 'Gross Profit Only' },
              { id: 'collection', label: 'Cash vs UPI Settlement' }
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setChartMetric(m.id)}
                style={{
                  padding: '4px 9px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: chartMetric === m.id ? 700 : 500,
                  cursor: 'pointer',
                  border: chartMetric === m.id ? '1px solid #0284c7' : '1px solid #e2e8f0',
                  background: chartMetric === m.id ? '#f0f9ff' : '#ffffff',
                  color: chartMetric === m.id ? '#0284c7' : '#64748b'
                }}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Recharts Area/Composed Chart */}
          <div style={{ height: '240px', width: '100%' }}>
            {isTrendLoading ? (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '12px' }}>
                <RefreshCw size={18} className="animate-spin" style={{ marginRight: '8px' }} /> Loading trend analytics...
              </div>
            ) : localTrend && localTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={localTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="chartRevGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0284c7" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="chartProfGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="formatted_date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => `${currency}${v}`} />
                  
                  <Tooltip 
                    contentStyle={{ 
                      background: '#ffffff', 
                      border: '1px solid #e2e8f0', 
                      borderRadius: '8px', 
                      fontSize: '11.5px', 
                      boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
                      padding: '8px 12px' 
                    }}
                    formatter={(val, name) => {
                      const labelMap = {
                        revenue: 'Invoiced Revenue',
                        profit: 'Gross Profit',
                        cost: 'Wholesale Cost',
                        cash_revenue: 'Cash Drawer',
                        upi_revenue: 'Digital UPI Bank'
                      };
                      return [`${currency}${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, labelMap[name] || name];
                    }}
                  />

                  {chartMetric === 'both' && (
                    <>
                      <Area type="monotone" dataKey="revenue" stroke="#0284c7" strokeWidth={2.5} fillOpacity={1} fill="url(#chartRevGrad)" name="revenue" />
                      <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3, fill: '#10b981' }} name="profit" />
                    </>
                  )}

                  {chartMetric === 'revenue' && (
                    <Area type="monotone" dataKey="revenue" stroke="#0284c7" strokeWidth={2.5} fillOpacity={1} fill="url(#chartRevGrad)" name="revenue" />
                  )}

                  {chartMetric === 'profit' && (
                    <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#chartProfGrad)" name="profit" />
                  )}

                  {chartMetric === 'collection' && (
                    <>
                      <Bar dataKey="cash_revenue" fill="#10b981" radius={[4, 4, 0, 0]} name="cash_revenue" />
                      <Bar dataKey="upi_revenue" fill="#0284c7" radius={[4, 4, 0, 0]} name="upi_revenue" />
                    </>
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '12px' }}>
                No sales records found for this period
              </div>
            )}
          </div>
        </div>

        {/* DEPARTMENT & CATEGORY PROFITABILITY BREAKDOWN */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Income & Profit by Category
              </h3>
              <p style={{ fontSize: '11.5px', color: '#64748b', margin: '2px 0 0' }}>
                Revenue and gross profit earned per department
              </p>
            </div>
            <span className="badge badge-cyan" style={{ fontSize: '10.5px' }}>
              Department Margins
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '11px', maxHeight: '270px', overflowY: 'auto' }}>
            {categoriesDist && categoriesDist.length > 0 ? (
              categoriesDist.slice(0, 6).map((cat, idx) => {
                const maxAmount = categoriesDist[0]?.amount || 1;
                const pctOfMax = Math.min(100, Math.max(5, (cat.amount / maxAmount) * 100));
                return (
                  <div key={idx} style={{ padding: '8px 10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>{cat.category}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {cat.margin_pct !== undefined && (
                          <span className="badge badge-emerald" style={{ fontSize: '10px', padding: '1px 5px' }}>
                            {cat.margin_pct}% margin
                          </span>
                        )}
                        <span className="mono" style={{ fontWeight: 800, color: '#0284c7' }}>
                          {currency}{cat.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${pctOfMax}%`,
                        height: '100%',
                        background: COLORS[idx % COLORS.length],
                        borderRadius: '3px'
                      }} />
                    </div>

                    {cat.profit !== undefined && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: '#64748b', marginTop: '3px' }}>
                        <span>Units Dispensed: {cat.units || 0}</span>
                        <span style={{ color: '#059669', fontWeight: 600 }}>Profit: {currency}{Number(cat.profit).toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div style={{ padding: '40px 0', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                Categories will populate upon completing sales.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* =========================================================================
          6. PRODUCT-LEVEL PROFITABILITY & ASSET VALUATION
         ========================================================================= */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
        
        {/* TOP REVENUE & PROFIT GENERATING MEDICINES */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Top Moving Drugs & Profit Drivers
              </h3>
              <p style={{ fontSize: '11.5px', color: '#64748b', margin: '2px 0 0' }}>
                Pharmaceuticals generating the highest intake and margins
              </p>
            </div>
            <button onClick={() => setActiveTab('invoices')} className="btn btn-secondary btn-sm" style={{ fontSize: '11px' }}>
              All Bills <ArrowUpRight size={12} />
            </button>
          </div>

          <div className="data-table-container">
            <table className="data-table" style={{ fontSize: '12px' }}>
              <thead>
                <tr>
                  <th>Drug Name</th>
                  <th style={{ textAlign: 'center' }}>Units Sold</th>
                  <th style={{ textAlign: 'right' }}>Revenue</th>
                  <th style={{ textAlign: 'right', color: '#059669' }}>Profit / Margin</th>
                </tr>
              </thead>
              <tbody>
                {topSelling && topSelling.length > 0 ? (
                  topSelling.map((med, idx) => (
                    <tr key={idx}>
                      <td>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{med.name}</div>
                        <div style={{ fontSize: '10.5px', color: '#64748b' }}>{med.dosage}</div>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>
                        <span className="badge badge-gray">{med.units_sold}</span>
                      </td>
                      <td className="mono" style={{ textAlign: 'right', fontWeight: 800, color: '#0284c7' }}>
                        {currency}{med.revenue.toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {med.profit !== undefined ? (
                          <div>
                            <div className="mono" style={{ fontWeight: 800, color: '#059669' }}>
                              {currency}{Number(med.profit).toFixed(2)}
                            </div>
                            <div style={{ fontSize: '10px', color: '#16a34a', fontWeight: 700 }}>
                              {med.margin_pct}%
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: '11px', color: '#64748b' }}>-</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>
                      No medicine sales recorded yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* PHARMACY ASSETS & LIVE INVENTORY VALUATION (FIXED RS.0.00 BUG) */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Inventory Valuation & Live Capital
              </h3>
              <p style={{ fontSize: '11.5px', color: '#64748b', margin: '2px 0 0' }}>
                Total pharmaceutical assets sitting on pharmacy shelves
              </p>
            </div>
            <button
              onClick={() => setActiveTab('inventory')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '11px' }}
            >
              Stock Master Table &rarr;
            </button>
          </div>

          {/* 3 Metric Cards for Inventory Asset Worth */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
            
            {/* Wholesale Purchase Cost Worth */}
            <div style={{ padding: '12px 14px', background: '#eef2ff', borderRadius: '10px', border: '1px solid #c7d2fe' }}>
              <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase' }}>
                Stock Cost Value
              </div>
              <div className="mono" style={{ fontSize: '18px', fontWeight: 900, color: '#3730a3', marginTop: '4px' }}>
                {currency}{Number(inventoryCostVal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '10.5px', color: '#6366f1', marginTop: '2px' }}>
                Wholesale purchase cost
              </div>
            </div>

            {/* Retail Selling / MRP Worth */}
            <div style={{ padding: '12px 14px', background: '#f0fdf4', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
              <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#059669', textTransform: 'uppercase' }}>
                Stock Retail Value
              </div>
              <div className="mono" style={{ fontSize: '18px', fontWeight: 900, color: '#065f46', marginTop: '4px' }}>
                {currency}{Number(inventoryRetailVal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '10.5px', color: '#16a34a', marginTop: '2px' }}>
                Expected customer revenue
              </div>
            </div>

            {/* Potential Unrealized Profit */}
            <div style={{ padding: '12px 14px', background: '#ecfdf5', borderRadius: '10px', border: '1px solid #a7f3d0' }}>
              <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#047857', textTransform: 'uppercase' }}>
                Unrealized Profit
              </div>
              <div className="mono" style={{ fontSize: '18px', fontWeight: 900, color: '#065f46', marginTop: '4px' }}>
                {currency}{Number(unrealizedProfit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '10.5px', color: '#059669', marginTop: '2px' }}>
                Asset profit potential
              </div>
            </div>

          </div>

          {/* SKU Counts & Outstanding Receivables Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
            <div style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Active Medicines</div>
              <div className="mono" style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                {totalMedsCount.toLocaleString('en-IN')} SKUs
              </div>
            </div>

            <div style={{ padding: '10px 12px', background: '#fff1f2', borderRadius: '8px', border: '1px solid #fecdd3' }}>
              <div style={{ fontSize: '11px', color: '#e11d48', fontWeight: 700 }}>Pending Patient Credit Dues</div>
              <div className="mono" style={{ fontSize: '17px', fontWeight: 900, color: '#9f1239', marginTop: '2px' }}>
                {currency}{Number(summary?.total_credit_due || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <button
              onClick={onOpenAddBatch}
              className="btn btn-emerald btn-sm"
              style={{ flex: 1, justifyContent: 'center', gap: '6px' }}
            >
              <Package size={14} />
              <span>Stock Inward (F4)</span>
            </button>
            <button
              onClick={onOpenAddMedicine}
              className="btn btn-secondary btn-sm"
              style={{ flex: 1, justifyContent: 'center', gap: '6px' }}
            >
              <Pill size={14} />
              <span>+ Add Medicine (F3)</span>
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
