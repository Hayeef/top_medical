import React, { useState, useEffect, useMemo } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  PlusCircle, 
  Banknote, 
  QrCode, 
  Landmark, 
  Calendar, 
  FileSpreadsheet, 
  Printer, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Sparkles, 
  Layers, 
  Receipt, 
  X, 
  Save, 
  Plus, 
  Trash, 
  Eye,
  RefreshCw,
  Wallet,
  Building2,
  UserCheck,
  Truck,
  Coffee,
  Zap,
  Tag,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  ArrowDown,
  Calculator,
  ClipboardList,
  Check,
  Clock,
  AlertTriangle,
  FileText,
  Filter,
  CheckCircle,
  ArrowUpRight
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';
import { dailyFinanceAPI, vendorBillsAPI } from '../api';

export default function DailyFinancePage({ profile, user, suppliers = [], staffList = [] }) {
  const currency = profile?.currency_symbol || '₹';

  // Page View Modes: 'register' (Daily Register Entry), 'vendor_bills' (Wholesale Bills & Credit Tracker), or 'ledger' (Full History)
  const [activeViewMode, setActiveViewMode] = useState('register');

  // Data states
  const [records, setRecords] = useState([]);
  const [summaryStats, setSummaryStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [registerSearchQuery, setRegisterSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modal / Detail states
  const [editingRecord, setEditingRecord] = useState(null);
  const [viewingRecord, setViewingRecord] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoFetching, setIsAutoFetching] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [notification, setNotification] = useState(null);

  // =========================================================================
  // VENDOR BILLS & CREDIT TRACKER STATES
  // =========================================================================
  const [vendorBills, setVendorBills] = useState([]);
  const [vendorBillsSummary, setVendorBillsSummary] = useState(null);
  const [vendorBillsLoading, setVendorBillsLoading] = useState(false);
  const [vendorBillsFilter, setVendorBillsFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'OVERDUE' | 'PAID'
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState('');
  const [vendorBillSearch, setVendorBillSearch] = useState('');

  // Modals for Vendor Bills
  const [isAddBillModalOpen, setIsAddBillModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [isPayBillModalOpen, setIsPayBillModalOpen] = useState(false);
  const [activeBillForPayment, setActiveBillForPayment] = useState(null);
  const [isBillHistoryModalOpen, setIsBillHistoryModalOpen] = useState(false);
  const [activeBillForHistory, setActiveBillForHistory] = useState(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isSavingBill, setIsSavingBill] = useState(false);

  const initialBillFormState = {
    supplier: '',
    supplier_name: '',
    supplier_phone: '',
    supplier_gstin: '',
    bill_number: '',
    bill_date: new Date().toISOString().slice(0, 10),
    credit_days: 21,
    due_date: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 21);
      return d.toISOString().slice(0, 10);
    })(),
    total_amount: '',
    notes: ''
  };
  const [billFormData, setBillFormData] = useState(initialBillFormState);

  const initialPaymentFormState = {
    amount: '',
    payment_mode: 'CASH',
    payment_date: new Date().toISOString().slice(0, 10),
    reference_number: '',
    notes: '',
    sync_to_daily_accounts: true
  };
  const [paymentFormData, setPaymentFormData] = useState(initialPaymentFormState);

  // Helper to calculate due date given base date and days
  const computeDueDate = (baseDateStr, days = 21) => {
    const numDays = parseInt(days) || 0;
    const base = new Date(baseDateStr || new Date().toISOString().slice(0, 10));
    base.setDate(base.getDate() + numDays);
    return base.toISOString().slice(0, 10);
  };

  // Helper to calculate days left given a due date
  const computeDaysLeft = (dueDateStr) => {
    if (!dueDateStr) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDateStr);
    due.setHours(0, 0, 0, 0);
    const diffTime = due - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Form State for Table Entry Register
  const initialFormState = {
    date: new Date().toISOString().slice(0, 10),
    daily_sales: '',
    cash_earned: '',
    upi_earned: '',
    supplier_payments: '',
    staff_expenses: '',
    vehicle_expenses: '',
    expenses: '',
    other_outflow: '',
    total_paid: '',
    opening_balance: '',
    notes: '',
    // Spreadsheet-like itemized expenses
    payment_details: [
      {
        id: 1,
        type: 'VENDOR',
        recipient: '',
        staff_id: '',
        staff_name: '',
        charge_code: '',
        purpose: '',
        vehicle_info: '',
        category: '',
        amount: '',
        payment_mode: 'CASH', // 'CASH' | 'UPI' | 'CREDIT'
        credit_days: 21,
        due_date: (() => {
          const d = new Date();
          d.setDate(d.getDate() + 21);
          return d.toISOString().slice(0, 10);
        })(),
        note: ''
      }
    ]
  };
  const [formData, setFormData] = useState(initialFormState);

  // Auto-dismiss notification toast
  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Load Data from Backend (Daily Accounts)
  const loadFinanceData = async () => {
    try {
      setRefreshing(true);
      let queryParams = [];
      if (selectedMonth) {
        queryParams.push(`month=${selectedMonth}`);
        if (selectedYear) queryParams.push(`year=${selectedYear}`);
      } else if (startDate || endDate) {
        if (startDate) queryParams.push(`start_date=${startDate}`);
        if (endDate) queryParams.push(`end_date=${endDate}`);
      }
      if (searchQuery.trim()) {
        queryParams.push(`search=${encodeURIComponent(searchQuery.trim())}`);
      }

      const queryString = queryParams.join('&');

      const [recordsRes, statsRes] = await Promise.allSettled([
        dailyFinanceAPI.getRecords(queryString),
        dailyFinanceAPI.getSummaryStats()
      ]);

      if (recordsRes.status === 'fulfilled') {
        const data = recordsRes.value?.results || recordsRes.value || [];
        setRecords(Array.isArray(data) ? data : []);
      }
      if (statsRes.status === 'fulfilled') {
        setSummaryStats(statsRes.value);
      }
    } catch (err) {
      console.error('Failed to load daily finance data:', err);
      showToast(`Error loading data: ${err.message}`, 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load Vendor Bills & Summary
  const loadVendorBills = async () => {
    try {
      setVendorBillsLoading(true);
      let queryParams = [];
      if (vendorBillsFilter === 'PENDING') queryParams.push('status=PENDING');
      if (vendorBillsFilter === 'PAID') queryParams.push('status=PAID');
      if (vendorBillsFilter === 'OVERDUE') queryParams.push('due_filter=overdue');
      if (selectedSupplierFilter) queryParams.push(`supplier_name=${encodeURIComponent(selectedSupplierFilter)}`);
      if (vendorBillSearch.trim()) queryParams.push(`search=${encodeURIComponent(vendorBillSearch.trim())}`);

      const queryString = queryParams.join('&');
      const [billsRes, summaryRes] = await Promise.allSettled([
        vendorBillsAPI.getBills(queryString),
        vendorBillsAPI.getSummary()
      ]);

      if (billsRes.status === 'fulfilled') {
        const data = billsRes.value?.results || billsRes.value || [];
        setVendorBills(Array.isArray(data) ? data : []);
      }
      if (summaryRes.status === 'fulfilled') {
        setVendorBillsSummary(summaryRes.value);
      }
    } catch (err) {
      console.error('Failed to load vendor bills:', err);
      showToast(`Error loading vendor bills: ${err.message}`, 'error');
    } finally {
      setVendorBillsLoading(false);
    }
  };

  useEffect(() => {
    loadFinanceData();
  }, [selectedMonth, selectedYear, startDate, endDate]);

  useEffect(() => {
    loadVendorBills();
  }, [vendorBillsFilter, selectedSupplierFilter]);

  // Initial auto-fetch for today when entering
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    triggerAutoFetch(today, false);
    loadVendorBills();
  }, []);

  // Vendor Bill Credit Days & Due Date Calculation Helper
  const handleUpdateBillCreditDays = (days, baseDate = billFormData.bill_date) => {
    const numDays = parseInt(days) || 0;
    const base = new Date(baseDate || new Date().toISOString().slice(0, 10));
    base.setDate(base.getDate() + numDays);
    const dueDateStr = base.toISOString().slice(0, 10);
    setBillFormData(prev => ({
      ...prev,
      credit_days: days,
      due_date: dueDateStr
    }));
  };

  const handleUpdateBillDate = (newDate) => {
    const numDays = parseInt(billFormData.credit_days) || 0;
    const base = new Date(newDate || new Date().toISOString().slice(0, 10));
    base.setDate(base.getDate() + numDays);
    const dueDateStr = base.toISOString().slice(0, 10);
    setBillFormData(prev => ({
      ...prev,
      bill_date: newDate,
      due_date: dueDateStr
    }));
  };

  // Handle Open Add Bill Modal
  const handleOpenAddBill = () => {
    setEditingBill(null);
    const todayStr = new Date().toISOString().slice(0, 10);
    const due = new Date();
    due.setDate(due.getDate() + 21);
    setBillFormData({
      ...initialBillFormState,
      bill_date: todayStr,
      credit_days: 21,
      due_date: due.toISOString().slice(0, 10),
      supplier: suppliers.length > 0 ? suppliers[0].id : '',
      supplier_name: suppliers.length > 0 ? suppliers[0].name : '',
      supplier_phone: suppliers.length > 0 ? (suppliers[0].phone || '') : '',
      supplier_gstin: suppliers.length > 0 ? (suppliers[0].gstin || '') : ''
    });
    setIsAddBillModalOpen(true);
  };

  // Handle Open Edit Bill Modal
  const handleOpenEditBill = (bill) => {
    setEditingBill(bill);
    setBillFormData({
      supplier: bill.supplier || '',
      supplier_name: bill.supplier_name || '',
      supplier_phone: bill.supplier_phone || '',
      supplier_gstin: bill.supplier_gstin || '',
      bill_number: bill.bill_number || '',
      bill_date: bill.bill_date || new Date().toISOString().slice(0, 10),
      credit_days: bill.credit_days || 0,
      due_date: bill.due_date || '',
      total_amount: bill.total_amount?.toString() || '',
      notes: bill.notes || ''
    });
    setIsAddBillModalOpen(true);
  };

  // Handle Save Vendor Bill (Create or Update)
  const handleSaveBill = async (e) => {
    if (e) e.preventDefault();
    if (!billFormData.supplier_name.trim()) {
      alert('Please select or enter a supplier name.');
      return;
    }
    if (!billFormData.bill_number.trim()) {
      alert('Please enter a bill / invoice number.');
      return;
    }
    if (!billFormData.total_amount || parseFloat(billFormData.total_amount) <= 0) {
      alert('Please enter a valid total amount.');
      return;
    }

    setIsSavingBill(true);
    try {
      const payload = {
        supplier: billFormData.supplier || null,
        supplier_name: billFormData.supplier_name.trim(),
        supplier_phone: billFormData.supplier_phone.trim(),
        supplier_gstin: billFormData.supplier_gstin.trim(),
        bill_number: billFormData.bill_number.trim(),
        bill_date: billFormData.bill_date,
        credit_days: parseInt(billFormData.credit_days) || 0,
        due_date: billFormData.due_date || billFormData.bill_date,
        total_amount: parseFloat(billFormData.total_amount),
        notes: billFormData.notes
      };

      if (editingBill) {
        await vendorBillsAPI.updateBill(editingBill.id, payload);
        showToast(`✅ Updated wholesale bill #${payload.bill_number}`);
      } else {
        await vendorBillsAPI.createBill(payload);
        showToast(`✅ Added wholesale bill #${payload.bill_number} for ${payload.supplier_name}`);
      }

      setIsAddBillModalOpen(false);
      await loadVendorBills();
    } catch (err) {
      console.error('Failed to save vendor bill:', err);
      alert(`Could not save vendor bill: ${err.message}`);
    } finally {
      setIsSavingBill(false);
    }
  };

  // Handle Delete Vendor Bill
  const handleDeleteBill = async (bill) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete bill #${bill.bill_number} from ${bill.supplier_name}?`);
    if (!confirmDelete) return;

    try {
      await vendorBillsAPI.deleteBill(bill.id);
      showToast(`Bill #${bill.bill_number} deleted.`);
      loadVendorBills();
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  // Handle Open Record Payment Modal
  const handleOpenRecordPayment = (bill) => {
    setActiveBillForPayment(bill);
    setPaymentFormData({
      amount: (parseFloat(bill.balance_due) || 0).toString(),
      payment_mode: 'CASH',
      payment_date: new Date().toISOString().slice(0, 10),
      reference_number: '',
      notes: `Payment for Wholesale Invoice #${bill.bill_number}`,
      sync_to_daily_accounts: true
    });
    setIsPayBillModalOpen(true);
  };

  // Handle Record Payment Submit
  const handleRecordPaymentSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!activeBillForPayment) return;
    const amt = parseFloat(paymentFormData.amount);
    if (!amt || amt <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }
    if (amt > parseFloat(activeBillForPayment.balance_due)) {
      const proceed = window.confirm(`Entered payment (${currency}${amt}) is greater than outstanding balance (${currency}${activeBillForPayment.balance_due}). Do you want to proceed?`);
      if (!proceed) return;
    }

    setIsProcessingPayment(true);
    try {
      await vendorBillsAPI.recordPayment(activeBillForPayment.id, {
        amount: amt,
        payment_mode: paymentFormData.payment_mode,
        payment_date: paymentFormData.payment_date,
        reference_number: paymentFormData.reference_number,
        notes: paymentFormData.notes,
        sync_to_daily_accounts: paymentFormData.sync_to_daily_accounts
      });

      showToast(`✅ Payment of ${currency}${amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })} recorded for ${activeBillForPayment.supplier_name}!`);
      setIsPayBillModalOpen(false);
      await loadVendorBills();

      // If synced to daily register, also reload daily finance data
      if (paymentFormData.sync_to_daily_accounts) {
        await loadFinanceData();
      }
    } catch (err) {
      console.error('Failed to record payment:', err);
      alert(`Payment recording failed: ${err.message}`);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Handle Open Bill History
  const handleOpenBillHistory = (bill) => {
    setActiveBillForHistory(bill);
    setIsBillHistoryModalOpen(true);
  };

  // Quick Date Navigation
  const handleShiftDate = (days) => {
    const curr = new Date(formData.date || new Date().toISOString().slice(0, 10));
    curr.setDate(curr.getDate() + days);
    const newDateStr = curr.toISOString().slice(0, 10);
    handleChangeDate(newDateStr);
  };

  const handleChangeDate = async (newDate) => {
    setFormData(prev => ({ ...prev, date: newDate }));
    
    // 1. Check if a record already exists in local records state
    const existing = records.find(r => r.date === newDate);
    if (existing) {
      handleOpenEdit(existing, false);
      showToast(`📂 Loaded existing accounts for ${newDate} (${existing.payment_details?.length || 0} vouchers)`);
      return;
    }
    
    // 2. Fetch from backend auto_fetch_pos_day (which returns has_existing_record and existing_record if already made)
    await triggerAutoFetch(newDate, true);
  };

  // Open Edit Mode (Loads all incomes, firm balances, and all expense vouchers into the form)
  const handleOpenEdit = (record, switchView = true) => {
    setEditingRecord(record);
    const defaultDue = computeDueDate(record.date, 21);
    const details = Array.isArray(record.payment_details) && record.payment_details.length > 0 
      ? record.payment_details.map((p, idx) => ({
          id: p.id || (Date.now() + idx),
          type: (p.type || 'VENDOR').toUpperCase(),
          recipient: p.recipient || '',
          staff_id: p.staff_id || '',
          staff_name: p.staff_name || '',
          charge_code: p.charge_code || '',
          purpose: p.purpose || '',
          vehicle_info: p.vehicle_info || '',
          category: p.category || '',
          amount: (p.amount !== undefined && p.amount !== null && p.amount !== '') ? p.amount.toString() : '',
          payment_mode: (p.payment_mode || 'CASH').toUpperCase(),
          credit_days: p.credit_days !== undefined ? p.credit_days : 21,
          due_date: p.due_date || computeDueDate(record.date, p.credit_days || 21),
          note: p.note || ''
        }))
      : [{
          id: Date.now(),
          type: 'VENDOR',
          recipient: suppliers.length > 0 ? suppliers[0].name : '',
          staff_id: '',
          staff_name: '',
          charge_code: '',
          purpose: '',
          vehicle_info: '',
          category: '',
          amount: '',
          payment_mode: 'CASH',
          credit_days: 21,
          due_date: defaultDue,
          note: ''
        }];

    setFormData({
      date: record.date,
      daily_sales: (record.daily_sales !== undefined && record.daily_sales !== null) ? record.daily_sales.toString() : '',
      cash_earned: (record.cash_earned !== undefined && record.cash_earned !== null) ? record.cash_earned.toString() : '',
      upi_earned: (record.upi_earned !== undefined && record.upi_earned !== null) ? record.upi_earned.toString() : '',
      supplier_payments: (record.supplier_payments !== undefined && record.supplier_payments !== null) ? record.supplier_payments.toString() : '',
      staff_expenses: (record.staff_expenses !== undefined && record.staff_expenses !== null) ? record.staff_expenses.toString() : '',
      vehicle_expenses: (record.vehicle_expenses !== undefined && record.vehicle_expenses !== null) ? record.vehicle_expenses.toString() : '',
      expenses: (record.expenses !== undefined && record.expenses !== null) ? record.expenses.toString() : '',
      other_outflow: (record.other_outflow !== undefined && record.other_outflow !== null) ? record.other_outflow.toString() : '',
      total_paid: (record.total_paid !== undefined && record.total_paid !== null) ? record.total_paid.toString() : '',
      opening_balance: (record.opening_balance !== undefined && record.opening_balance !== null) ? record.opening_balance.toString() : '',
      notes: record.notes || '',
      payment_details: details
    });

    if (switchView) {
      setActiveViewMode('register');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Open Clean New Entry
  const handleOpenNewEntry = async (targetDate = null) => {
    const target = targetDate || new Date().toISOString().slice(0, 10);
    setEditingRecord(null);
    const defaultDue = computeDueDate(target, 21);
    setFormData({
      ...initialFormState,
      date: target,
      payment_details: [{
        id: Date.now(),
        type: 'VENDOR',
        recipient: suppliers.length > 0 ? suppliers[0].name : '',
        staff_id: '',
        staff_name: '',
        charge_code: '',
        purpose: '',
        vehicle_info: '',
        category: '',
        amount: '',
        payment_mode: 'CASH',
        credit_days: 21,
        due_date: defaultDue,
        note: ''
      }]
    });
    setActiveViewMode('register');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    await triggerAutoFetch(target, true);
  };

  // Trigger POS Auto-Fetch
  const triggerAutoFetch = async (targetDate, showNotification = true) => {
    setIsAutoFetching(true);
    try {
      const data = await dailyFinanceAPI.autoFetchDay(targetDate);
      if (data) {
        if (data.has_existing_record && data.existing_record) {
          handleOpenEdit(data.existing_record, false);
          if (showNotification) {
            showToast(`📂 Loaded existing accounts for ${targetDate} (${data.existing_record.payment_details?.length || 0} vouchers)`);
          }
        } else {
          setEditingRecord(null);
          const defaultDue = computeDueDate(targetDate, 21);
          setFormData(prev => ({
            ...prev,
            date: targetDate,
            daily_sales: (data.pos_daily_sales || 0).toString(),
            cash_earned: (data.pos_cash_earned || 0).toString(),
            upi_earned: (data.pos_upi_earned || 0).toString(),
            supplier_payments: '',
            staff_expenses: '',
            vehicle_expenses: '',
            expenses: '',
            other_outflow: '',
            total_paid: '',
            opening_balance: (data.suggested_opening_balance || 0).toString(),
            notes: '',
            payment_details: [{
              id: Date.now(),
              type: 'VENDOR',
              recipient: suppliers.length > 0 ? suppliers[0].name : '',
              staff_id: '',
              staff_name: '',
              charge_code: '',
              purpose: '',
              vehicle_info: '',
              category: '',
              amount: '',
              payment_mode: 'CASH',
              credit_days: 21,
              due_date: defaultDue,
              note: ''
            }]
          }));
          if (showNotification && data.invoices_count > 0) {
            showToast(`⚡ Filled ${data.invoices_count} POS bills: Cash ₹${data.pos_cash_earned} | UPI ₹${data.pos_upi_earned}`, 'info');
          }
        }
      }
    } catch (err) {
      console.error('Auto-fetch failed:', err);
    } finally {
      setIsAutoFetching(false);
    }
  };

  // Spreadsheet Itemized Calculations by Type & Payment Mode
  const itemizedSums = useMemo(() => {
    let vendorCashSum = 0;
    let vendorUpiSum = 0;
    let vendorCreditSum = 0;
    let staffSum = 0;
    let vehicleSum = 0;
    let shopSum = 0;
    let otherSum = 0;
    let totalCashPaidOut = 0;
    let totalUpiPaidOut = 0;
    let totalCreditPending = 0;

    (formData.payment_details || []).forEach(item => {
      const amt = parseFloat(item.amount) || 0;
      const mode = (item.payment_mode || 'CASH').toUpperCase();
      const isCredit = mode === 'CREDIT';

      if (isCredit) {
        totalCreditPending += amt;
      } else if (mode === 'UPI') {
        totalUpiPaidOut += amt;
      } else {
        totalCashPaidOut += amt;
      }

      if (item.type === 'VENDOR' || item.type === 'Supplier') {
        if (isCredit) {
          vendorCreditSum += amt;
        } else if (mode === 'UPI') {
          vendorUpiSum += amt;
        } else {
          vendorCashSum += amt;
        }
      } else if (item.type === 'STAFF') {
        staffSum += amt;
      } else if (item.type === 'VEHICLE') {
        vehicleSum += amt;
      } else if (item.type === 'SHOP' || item.type === 'Expense') {
        shopSum += amt;
      } else {
        otherSum += amt;
      }
    });

    const vendorActualPaid = vendorCashSum + vendorUpiSum;
    const totalActualPaidSum = totalCashPaidOut + totalUpiPaidOut;
    const totalGrossSum = totalActualPaidSum + totalCreditPending;

    return {
      vendorCashSum,
      vendorUpiSum,
      vendorCreditSum,
      vendorActualPaid,
      vendorTotal: vendorActualPaid + vendorCreditSum,
      staffSum,
      vehicleSum,
      shopSum,
      otherSum,
      totalCashPaidOut,
      totalUpiPaidOut,
      totalCreditPending,
      totalActualPaidSum,
      totalGrossSum
    };
  }, [formData.payment_details]);

  // Live Math Calculations
  const formCashEarned = parseFloat(formData.cash_earned) || 0;
  const formUpiEarned = parseFloat(formData.upi_earned) || 0;
  const formTotalEarned = formCashEarned + formUpiEarned;

  const formSupplierPaid = itemizedSums.vendorActualPaid;
  const formSupplierCredit = itemizedSums.vendorCreditSum;
  const formStaffPaid = itemizedSums.staffSum;
  const formVehiclePaid = itemizedSums.vehicleSum;
  const formShopExpenses = itemizedSums.shopSum;
  const formOtherOutflow = itemizedSums.otherSum;
  
  // Total Money Paid Out from Drawer / Bank (Cash + UPI)
  const formTotalPaid = itemizedSums.totalActualPaidSum;
  const formTotalCredit = itemizedSums.totalCreditPending;
  const formGrossExpense = itemizedSums.totalGrossSum;

  const formOpeningBalance = parseFloat(formData.opening_balance) || 0;
  const formNetChange = formTotalEarned - formTotalPaid;
  const formClosingBalance = formOpeningBalance + formNetChange;

  // Add Row to Expense Table
  const handleAddExpenseRow = (type = 'VENDOR') => {
    const defaultDue = computeDueDate(formData.date, 21);
    let newRow = {
      id: Date.now() + Math.random(),
      type: type,
      recipient: '',
      staff_id: '',
      staff_name: '',
      charge_code: '',
      purpose: type === 'STAFF' ? 'Daily Wage' : (type === 'VEHICLE' ? 'Fuel / Petrol' : (type === 'SHOP' ? 'Tea / Snacks' : '')),
      vehicle_info: '',
      category: type === 'SHOP' ? 'Tea / Snacks' : '',
      amount: '',
      payment_mode: 'CASH', // 'CASH' | 'UPI' | 'CREDIT'
      credit_days: 21,
      due_date: defaultDue,
      note: ''
    };

    if (type === 'STAFF' && staffList.length > 0) {
      const firstStaff = staffList[0];
      newRow.staff_id = firstStaff.id;
      newRow.staff_name = firstStaff.name;
      newRow.charge_code = firstStaff.charge_code;
    }

    if (type === 'VENDOR' && suppliers.length > 0) {
      newRow.recipient = suppliers[0].name;
    }

    setFormData(prev => ({
      ...prev,
      payment_details: [...(prev.payment_details || []), newRow]
    }));
  };

  // Remove Row from Expense Table
  const handleRemoveExpenseRow = (id) => {
    setFormData(prev => {
      const filtered = (prev.payment_details || []).filter(item => item.id !== id);
      const defaultDue = computeDueDate(prev.date, 21);
      return {
        ...prev,
        payment_details: filtered.length > 0 ? filtered : [{
          id: Date.now(),
          type: 'VENDOR',
          recipient: '',
          staff_id: '',
          staff_name: '',
          charge_code: '',
          purpose: '',
          vehicle_info: '',
          category: '',
          amount: '',
          payment_mode: 'CASH',
          credit_days: 21,
          due_date: defaultDue,
          note: ''
        }]
      };
    });
  };

  // Update Specific Field in Row
  const handleUpdateExpenseRow = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      payment_details: (prev.payment_details || []).map(item => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          
          // Auto-sync staff details & mapped charge code
          if (field === 'staff_id') {
            const foundStaff = staffList.find(s => s.id.toString() === value.toString());
            if (foundStaff) {
              updated.staff_name = foundStaff.name;
              updated.charge_code = foundStaff.charge_code;
            }
          }

          // If mode changes to CREDIT, ensure due_date & credit_days are set
          if (field === 'payment_mode') {
            if (value === 'CREDIT') {
              updated.credit_days = updated.credit_days || 21;
              updated.due_date = updated.due_date || computeDueDate(prev.date, updated.credit_days);
            }
          }

          // If credit_days is updated, sync due_date
          if (field === 'credit_days') {
            updated.due_date = computeDueDate(prev.date, value);
          }

          // If due_date is updated, sync credit_days
          if (field === 'due_date') {
            updated.credit_days = computeDaysLeft(value);
          }

          // If type changes, apply smart defaults
          if (field === 'type') {
            if (value === 'STAFF') {
              if (staffList.length > 0 && !updated.staff_id) {
                updated.staff_id = staffList[0].id;
                updated.staff_name = staffList[0].name;
                updated.charge_code = staffList[0].charge_code;
              }
              updated.purpose = updated.purpose || 'Daily Wage';
            } else if (value === 'VENDOR') {
              if (suppliers.length > 0 && !updated.recipient) {
                updated.recipient = suppliers[0].name;
              }
              updated.staff_id = '';
              updated.staff_name = '';
              updated.charge_code = '';
              updated.credit_days = updated.credit_days || 21;
              updated.due_date = updated.due_date || computeDueDate(prev.date, updated.credit_days);
            } else if (value === 'VEHICLE') {
              updated.purpose = 'Fuel / Petrol';
              updated.staff_id = '';
              updated.staff_name = '';
              updated.charge_code = '';
            } else if (value === 'SHOP') {
              updated.category = 'Tea / Snacks';
              updated.staff_id = '';
              updated.staff_name = '';
              updated.charge_code = '';
            } else if (value === 'OTHER') {
              updated.staff_id = '';
              updated.staff_name = '';
              updated.charge_code = '';
            }
          }

          return updated;
        }
        return item;
      })
    }));
  };

  // Save Record
  const handleSaveRecord = async (e) => {
    if (e) e.preventDefault();
    if (!formData.date) {
      alert('Please choose an accounting date.');
      return;
    }

    setIsSaving(true);
    try {
      // Filter out blank empty rows before submitting
      const validDetails = (formData.payment_details || []).filter(item => {
        const hasAmount = parseFloat(item.amount) > 0;
        const hasName = Boolean(item.recipient || item.staff_name || item.vehicle_info || item.note || item.category);
        return hasAmount || hasName;
      });

      const payload = {
        date: formData.date,
        daily_sales: parseFloat(formData.daily_sales) || formTotalEarned,
        cash_earned: formCashEarned,
        upi_earned: formUpiEarned,
        supplier_payments: formSupplierPaid,
        staff_expenses: formStaffPaid,
        vehicle_expenses: formVehiclePaid,
        expenses: formShopExpenses,
        other_outflow: formOtherOutflow,
        total_paid: formTotalPaid,
        opening_balance: formOpeningBalance,
        notes: formData.notes,
        payment_details: validDetails
      };

      const existing = editingRecord || records.find(r => r.date === formData.date);

      if (existing && existing.id) {
        await dailyFinanceAPI.updateRecord(existing.id, payload);
        showToast(`✅ Saved & Updated Accounts for ${formData.date}`);
      } else {
        await dailyFinanceAPI.createRecord(payload);
        showToast(`✅ Successfully Saved Daily Accounts for ${formData.date}`);
      }

      await Promise.allSettled([
        loadFinanceData(),
        loadVendorBills()
      ]);
    } catch (err) {
      console.error('Save failed:', err);
      alert(`Could not save record: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Record
  const handleDeleteRecord = async (record) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete the daily accounts record for ${record.date}?`);
    if (!confirmDelete) return;

    try {
      await dailyFinanceAPI.deleteRecord(record.id);
      showToast(`Record for ${record.date} deleted.`);
      if (formData.date === record.date) {
        handleOpenNewEntry(record.date);
      }
      loadFinanceData();
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  // Excel Export
  const handleExportExcel = async () => {
    setExportingExcel(true);
    try {
      let queryParams = [];
      if (selectedMonth) {
        queryParams.push(`month=${selectedMonth}`);
        if (selectedYear) queryParams.push(`year=${selectedYear}`);
      } else if (startDate || endDate) {
        if (startDate) queryParams.push(`start_date=${startDate}`);
        if (endDate) queryParams.push(`end_date=${endDate}`);
      }
      const queryString = queryParams.join('&');
      const res = await dailyFinanceAPI.exportExcel(queryString);
      showToast(`Excel file downloaded: ${res.filename}`);
    } catch (err) {
      alert(`Excel export failed: ${err.message}`);
    } finally {
      setExportingExcel(false);
    }
  };

  // Chart Data Preparation
  const chartData = useMemo(() => {
    return [...records]
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(r => ({
        date: r.date.slice(5),
        fullDate: r.date,
        sales: parseFloat(r.daily_sales) || 0,
        cash: parseFloat(r.cash_earned) || 0,
        upi: parseFloat(r.upi_earned) || 0,
        earned: parseFloat(r.total_earned) || ((parseFloat(r.cash_earned) || 0) + (parseFloat(r.upi_earned) || 0)),
        paid: parseFloat(r.total_paid) || 0,
        balance: parseFloat(r.closing_balance) || 0,
      }));
  }, [records]);

  // Filtered Records for Register Table (sorted newest first)
  const filteredRegisterRecords = useMemo(() => {
    let list = [...records].sort((a, b) => new Date(b.date) - new Date(a.date));
    if (registerSearchQuery.trim()) {
      const q = registerSearchQuery.toLowerCase();
      list = list.filter(r => {
        const matchDate = r.date?.toLowerCase().includes(q);
        const matchNotes = r.notes?.toLowerCase().includes(q);
        const matchDetails = Array.isArray(r.payment_details) && r.payment_details.some(d => 
          d.recipient?.toLowerCase().includes(q) ||
          d.staff_name?.toLowerCase().includes(q) ||
          d.charge_code?.toLowerCase().includes(q) ||
          d.vehicle_info?.toLowerCase().includes(q) ||
          d.category?.toLowerCase().includes(q) ||
          d.note?.toLowerCase().includes(q)
        );
        return matchDate || matchNotes || matchDetails;
      });
    }
    return list;
  }, [records, registerSearchQuery]);

  // Dynamic Metric stats derived live from active selected date / current form / records / summaryStats
  const activeRecordForDate = records.find(r => r.date === formData.date);
  const latestRecordedDay = records.length > 0 ? [...records].sort((a, b) => new Date(b.date) - new Date(a.date))[0] : null;

  const dynamicSales = (formData.daily_sales !== '' && formData.daily_sales !== undefined && formData.daily_sales !== null) 
    ? (parseFloat(formData.daily_sales) || 0)
    : (formTotalEarned > 0 ? formTotalEarned : (activeRecordForDate ? parseFloat(activeRecordForDate.daily_sales) : (summaryStats?.today?.daily_sales || (latestRecordedDay ? parseFloat(latestRecordedDay.daily_sales) : 0))));

  const dynamicCash = (formData.cash_earned !== '' && formData.cash_earned !== undefined && formData.cash_earned !== null) 
    ? formCashEarned 
    : (activeRecordForDate ? parseFloat(activeRecordForDate.cash_earned) : (summaryStats?.today?.cash_earned || (latestRecordedDay ? parseFloat(latestRecordedDay.cash_earned) : 0)));

  const dynamicUpi = (formData.upi_earned !== '' && formData.upi_earned !== undefined && formData.upi_earned !== null) 
    ? formUpiEarned 
    : (activeRecordForDate ? parseFloat(activeRecordForDate.upi_earned) : (summaryStats?.today?.upi_earned || (latestRecordedDay ? parseFloat(latestRecordedDay.upi_earned) : 0)));

  const dynamicPaid = (formData.payment_details && formData.payment_details.length > 0 && formTotalPaid > 0) 
    ? formTotalPaid 
    : (activeRecordForDate ? parseFloat(activeRecordForDate.total_paid) : (summaryStats?.today?.total_paid || (latestRecordedDay ? parseFloat(latestRecordedDay.total_paid) : 0)));

  const dynamicClosingBalance = (formData.opening_balance !== '' || formNetChange !== 0) 
    ? formClosingBalance 
    : (activeRecordForDate ? parseFloat(activeRecordForDate.closing_balance) : (summaryStats?.current_firm_balance || (latestRecordedDay ? parseFloat(latestRecordedDay.closing_balance) : 0)));

  return (
    <div className="main-page-wrapper df-page-wrapper" style={{ maxWidth: '1280px', margin: '0 auto', paddingBottom: '60px' }}>
      
      {/* Scoped Responsive & Professional Styles */}
      <style>{`
        .df-page-wrapper {
          padding: 16px 20px 60px 20px;
          max-width: 1320px;
          margin: 0 auto;
        }

        /* Glass Cards & Modern Elevation */
        .df-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.05), 0 2px 6px -1px rgba(15, 23, 42, 0.03);
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .df-card:hover {
          box-shadow: 0 8px 24px -4px rgba(15, 23, 42, 0.08);
        }

        /* Header & Tabs */
        .df-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
          padding-bottom: 16px;
          border-bottom: 1.5px solid #e2e8f0;
        }

        .df-tabs {
          display: flex;
          background: #f1f5f9;
          padding: 4px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          gap: 4px;
        }

        .df-tab-btn {
          padding: 9px 16px;
          border-radius: 9px;
          border: none;
          font-weight: 800;
          font-size: 13px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.18s ease;
          background: transparent;
          color: #64748b;
        }

        .df-tab-btn:hover:not(.active) {
          color: #1e293b;
          background: rgba(255, 255, 255, 0.6);
        }

        .df-tab-btn.active {
          background: #0284c7;
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(2, 132, 199, 0.25);
        }

        .df-tab-btn.active-purple {
          background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
        }

        /* KPI Cards Grid */
        .df-status-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 12px;
          margin-top: 16px;
        }

        .df-kpi-card {
          padding: 14px 16px;
          border-radius: 14px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          border: 1.5px solid #e2e8f0;
          background: #ffffff;
          box-shadow: 0 2px 8px rgba(0,0,0,0.03);
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }

        .df-kpi-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0,0,0,0.06);
        }

        /* Mobile Expense Card Voucher */
        .df-mobile-voucher {
          background: #ffffff;
          border-radius: 14px;
          border: 1.5px solid #e2e8f0;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          box-shadow: 0 3px 12px rgba(15, 23, 42, 0.04);
          position: relative;
          transition: all 0.2s ease;
        }

        .df-mobile-voucher.vendor-theme {
          border-left: 4.5px solid #9333ea;
        }
        .df-mobile-voucher.staff-theme {
          border-left: 4.5px solid #0284c7;
        }
        .df-mobile-voucher.vehicle-theme {
          border-left: 4.5px solid #d97706;
        }
        .df-mobile-voucher.shop-theme {
          border-left: 4.5px solid #e11d48;
        }
        .df-mobile-voucher.other-theme {
          border-left: 4.5px solid #64748b;
        }
        .df-mobile-voucher.credit-active {
          border-color: #f59e0b;
          border-left: 4.5px solid #d97706;
          background: linear-gradient(180deg, #fffdfa 0%, #ffffff 100%);
          box-shadow: 0 4px 14px rgba(217, 119, 6, 0.08);
        }

        /* Mode Selector Chips */
        .df-mode-pill-group {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 4px;
          background: #f1f5f9;
          padding: 3px;
          border-radius: 9px;
          border: 1px solid #e2e8f0;
        }

        .df-mode-pill {
          padding: 6px 4px;
          border-radius: 7px;
          border: none;
          font-size: 11.5px;
          font-weight: 800;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 3px;
          transition: all 0.15s ease;
          background: transparent;
          color: #64748b;
        }

        .df-mode-pill.selected-cash {
          background: #059669;
          color: #ffffff;
          box-shadow: 0 2px 6px rgba(5, 150, 105, 0.3);
        }

        .df-mode-pill.selected-upi {
          background: #0284c7;
          color: #ffffff;
          box-shadow: 0 2px 6px rgba(2, 132, 199, 0.3);
        }

        .df-mode-pill.selected-credit {
          background: #d97706;
          color: #ffffff;
          box-shadow: 0 2px 6px rgba(217, 119, 6, 0.35);
        }

        /* Embedded Golden Credit Terms Drawer */
        .df-credit-drawer {
          background: #fffbeb;
          border: 1.5px solid #fde68a;
          border-radius: 10px;
          padding: 10px 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          animation: dfFadeIn 0.2s ease-in-out;
        }

        @keyframes dfFadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .df-active-row {
          background: #f0f9ff !important;
          border-left: 4px solid #0284c7 !important;
        }

        /* =========================================================================
           RESPONSIVE BREAKPOINTS (Mobile < 768px & Tablet < 1024px)
           ========================================================================= */
        @media (max-width: 768px) {
          .df-page-wrapper {
            padding: 10px 10px 90px 10px !important;
          }
          .df-header {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 12px !important;
          }
          .df-tabs {
            width: 100% !important;
            display: flex !important;
          }
          .df-tab-btn {
            flex: 1 !important;
            justify-content: center !important;
            padding: 9px 4px !important;
            font-size: 12px !important;
            gap: 4px !important;
          }
          .df-status-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 8px !important;
          }
          .df-status-closing {
            grid-column: span 2 !important;
          }
          .df-top-bar {
            padding: 12px !important;
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 12px !important;
          }
          .df-date-group {
            flex-direction: column !important;
            align-items: stretch !important;
            width: 100% !important;
            gap: 8px !important;
          }
          .df-date-nav {
            width: 100% !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 8px !important;
          }
          .df-date-input-wrap {
            width: 100% !important;
          }
          .df-date-input-wrap input {
            width: 100% !important;
            font-size: 15px !important;
            padding: 10px 12px !important;
            text-align: center !important;
            border-radius: 10px !important;
            box-sizing: border-box !important;
          }
          .df-date-buttons-row {
            display: flex !important;
            gap: 6px !important;
            width: 100% !important;
          }
          .df-date-buttons-row button {
            flex: 1 !important;
            padding: 9px 4px !important;
            font-size: 11.5px !important;
            justify-content: center !important;
            border-radius: 8px !important;
          }
          .df-autofetch-wrap {
            width: 100% !important;
            align-items: stretch !important;
          }
          .df-autofetch-btn {
            width: 100% !important;
            justify-content: center !important;
            padding: 12px !important;
            font-size: 14px !important;
          }
          .df-inflows-grid {
            grid-template-columns: 1fr !important;
            gap: 10px !important;
          }
          .df-section-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 8px !important;
          }
          .df-total-badge {
            width: 100% !important;
            justify-content: space-between !important;
          }
          .df-quick-chips {
            gap: 6px !important;
            padding: 10px !important;
          }
          .df-quick-btn {
            flex: 1 1 calc(50% - 6px) !important;
            padding: 8px 6px !important;
            font-size: 11px !important;
            justify-content: center !important;
          }
          .df-quick-btn-blank {
            flex: 1 1 100% !important;
            margin-left: 0 !important;
          }
          .df-table-desktop {
            display: none !important;
          }
          .df-cards-mobile {
            display: flex !important;
            flex-direction: column !important;
            gap: 12px !important;
          }
          .df-math-equalizer {
            grid-template-columns: 1fr !important;
            gap: 10px !important;
          }
          .df-save-bar {
            flex-direction: column !important;
            align-items: stretch !important;
            padding: 14px !important;
          }
          .df-save-btn-group {
            width: 100% !important;
            flex-direction: column !important;
          }
          .df-save-btn {
            width: 100% !important;
            justify-content: center !important;
            padding: 14px !important;
            font-size: 15px !important;
          }
          .df-saved-header {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 10px !important;
          }
          .df-saved-search {
            width: 100% !important;
            max-width: 100% !important;
          }
        }

        @media (min-width: 769px) {
          .df-cards-mobile {
            display: none !important;
          }
          .df-table-desktop {
            display: block !important;
          }
          .df-date-nav {
            display: flex !important;
            align-items: center !important;
            gap: 6px !important;
          }
          .df-date-buttons-row {
            display: flex !important;
            align-items: center !important;
            gap: 6px !important;
          }
        }
      `}</style>

      {/* Floating Notification Toast */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 9999,
          padding: '14px 22px',
          borderRadius: '12px',
          background: notification.type === 'error' ? '#ef4444' : (notification.type === 'info' ? '#0284c7' : '#10b981'),
          color: '#ffffff',
          fontWeight: 800,
          fontSize: '14px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.22)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          animation: 'slideInRight 0.3s ease'
        }}>
          {notification.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* TOP HEADER: Clean Title & Mode Switcher */}
      <div className="df-header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        paddingBottom: '16px',
        borderBottom: '2px solid var(--border-subtle)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 6px 16px rgba(2, 132, 199, 0.3)',
            flexShrink: 0
          }}>
            <Landmark size={26} />
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.01em' }}>
              Daily Cash, UPI & Expense Register
            </h1>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Professional accounts entry for daily counter money, staff charge codes, and vendor payments
            </p>
          </div>
        </div>

        {/* View Switcher Tabs (3 Modes) */}
        <div className="df-tabs" style={{
          display: 'flex',
          background: 'var(--bg-main)',
          padding: '4px',
          borderRadius: '12px',
          border: '1px solid var(--border-subtle)',
          gap: '4px'
        }}>
          {/* Tab 1: Daily Register */}
          <button
            type="button"
            onClick={() => setActiveViewMode('register')}
            className="df-tab-btn"
            style={{
              padding: '10px 16px',
              borderRadius: '9px',
              border: 'none',
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              background: activeViewMode === 'register' ? '#0284c7' : 'transparent',
              color: activeViewMode === 'register' ? '#ffffff' : 'var(--text-muted)',
              boxShadow: activeViewMode === 'register' ? '0 4px 12px rgba(2, 132, 199, 0.25)' : 'none'
            }}
          >
            <ClipboardList size={16} />
            <span>⚡ Daily Register</span>
          </button>

          {/* Tab 2: Vendor Bills & Credit Tracker */}
          <button
            type="button"
            onClick={() => {
              setActiveViewMode('vendor_bills');
              loadVendorBills();
            }}
            className="df-tab-btn"
            style={{
              padding: '10px 16px',
              borderRadius: '9px',
              border: 'none',
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              background: activeViewMode === 'vendor_bills' ? 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)' : 'transparent',
              color: activeViewMode === 'vendor_bills' ? '#ffffff' : 'var(--text-muted)',
              boxShadow: activeViewMode === 'vendor_bills' ? '0 4px 12px rgba(124, 58, 237, 0.3)' : 'none'
            }}
          >
            <Building2 size={16} />
            <span>🏢 Vendor Bills & Credit</span>
            {vendorBillsSummary && (
              <span style={{
                fontSize: '11px',
                fontWeight: 900,
                padding: '2px 7px',
                borderRadius: '10px',
                background: activeViewMode === 'vendor_bills' ? '#ffffff' : '#ede9fe',
                color: activeViewMode === 'vendor_bills' ? '#6d28d9' : (vendorBillsSummary.overdue_bills_count > 0 ? '#dc2626' : '#6d28d9'),
                marginLeft: '2px'
              }}>
                {vendorBillsSummary.overdue_bills_count > 0 ? `⚠️ ${vendorBillsSummary.overdue_bills_count}` : vendorBillsSummary.pending_bills_count}
              </span>
            )}
          </button>

          {/* Tab 3: History Ledger */}
          <button
            type="button"
            onClick={() => setActiveViewMode('ledger')}
            className="df-tab-btn"
            style={{
              padding: '10px 16px',
              borderRadius: '9px',
              border: 'none',
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              background: activeViewMode === 'ledger' ? '#0284c7' : 'transparent',
              color: activeViewMode === 'ledger' ? '#ffffff' : 'var(--text-muted)',
              boxShadow: activeViewMode === 'ledger' ? '0 4px 12px rgba(2, 132, 199, 0.25)' : 'none'
            }}
          >
            <Receipt size={16} />
            <span>📊 History Ledger ({records.length})</span>
          </button>
        </div>
      </div>

      {/* QUICK STATUS BAR: Live Daily Financial Summary (Dynamic for Active Day / Form) */}
      <div className="df-status-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px',
        marginTop: '16px'
      }}>
        {/* Daily Sales */}
        <div className="glass-panel" style={{ padding: '12px 14px', background: '#f0f9ff', border: '1px solid #bae6fd' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#0369a1', textTransform: 'uppercase' }}>
            {formData.date ? `${new Date(formData.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} Sales` : "Daily Total Sales"}
          </div>
          <div className="mono" style={{ fontSize: '18px', fontWeight: 900, color: '#0284c7', marginTop: '2px' }}>
            {currency}{dynamicSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>

        {/* Cash In Hand / Received */}
        <div className="glass-panel" style={{ padding: '12px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#059669', textTransform: 'uppercase' }}>
            💵 Cash Received
          </div>
          <div className="mono" style={{ fontSize: '18px', fontWeight: 900, color: '#059669', marginTop: '2px' }}>
            {currency}{dynamicCash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>

        {/* UPI Received */}
        <div className="glass-panel" style={{ padding: '12px 14px', background: '#f0f9ff', border: '1px solid #bae6fd' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase' }}>
            📱 UPI Received
          </div>
          <div className="mono" style={{ fontSize: '18px', fontWeight: 900, color: '#0369a1', marginTop: '2px' }}>
            {currency}{dynamicUpi.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>

        {/* Total Money Out */}
        <div className="glass-panel" style={{ padding: '12px 14px', background: '#fff1f2', border: '1px solid #fecdd3' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#e11d48', textTransform: 'uppercase' }}>
            🔴 Total Paid Out
          </div>
          <div className="mono" style={{ fontSize: '18px', fontWeight: 900, color: '#e11d48', marginTop: '2px' }}>
            {currency}{dynamicPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>

        {/* Closing Firm Balance */}
        <div className="glass-panel df-status-closing" style={{ padding: '12px 14px', background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', color: '#ffffff', border: 'none' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, opacity: 0.9, textTransform: 'uppercase' }}>
            💼 Closing Firm Balance
          </div>
          <div className="mono" style={{ fontSize: '20px', fontWeight: 900, marginTop: '2px' }}>
            {currency}{dynamicClosingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* =========================================================================
          VIEW 1: ULTRA-FRIENDLY TABLE ENTRY REGISTER (DESKTOP + MOBILE CARDS)
          ========================================================================= */}
      {activeViewMode === 'register' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
          
          <form onSubmit={handleSaveRecord} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* TOP BAR: DATE PICKER & 1-CLICK AUTO-FILL BUTTON */}
            <div className="glass-panel df-top-bar" style={{
              padding: '16px 20px',
              background: '#ffffff',
              border: '1.5px solid #bae6fd',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '14px',
              boxShadow: '0 4px 16px rgba(2, 132, 199, 0.06)'
            }}>
              
              {/* Date Selector with Quick Navigation */}
              <div className="df-date-group" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0284c7',
                  boxShadow: '0 4px 10px rgba(2, 132, 199, 0.12)',
                  flexShrink: 0
                }}>
                  <Calendar size={22} />
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    📅 Accounting Date:
                  </div>
                  <div className="df-date-nav" style={{ marginTop: '6px' }}>
                    <div className="df-date-input-wrap">
                      <input
                        type="date"
                        required
                        value={formData.date}
                        onChange={(e) => handleChangeDate(e.target.value)}
                        style={{
                          padding: '7px 12px',
                          fontSize: '14.5px',
                          fontWeight: 800,
                          borderRadius: '8px',
                          border: '1.5px solid #0284c7',
                          background: '#f0f9ff',
                          color: '#0369a1',
                          cursor: 'pointer',
                          outline: 'none'
                        }}
                      />
                    </div>

                    <div className="df-date-buttons-row">
                      <button
                        type="button"
                        onClick={() => handleShiftDate(-1)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '7px 12px', fontSize: '12.5px', fontWeight: 800, borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                        title="Previous Day"
                      >
                        <ChevronLeft size={15} /> Prev Day
                      </button>

                      <button
                        type="button"
                        onClick={() => handleChangeDate(new Date().toISOString().slice(0, 10))}
                        className="btn btn-secondary btn-sm"
                        style={{
                          padding: '7px 12px',
                          fontSize: '12.5px',
                          fontWeight: 800,
                          borderRadius: '8px',
                          background: formData.date === new Date().toISOString().slice(0, 10) ? '#e0f2fe' : '#ffffff',
                          border: '1.5px solid #0284c7',
                          color: '#0369a1'
                        }}
                        title="Jump to Today"
                      >
                        ⚡ Today
                      </button>

                      <button
                        type="button"
                        onClick={() => handleShiftDate(1)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '7px 12px', fontSize: '12.5px', fontWeight: 800, borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                        title="Next Day"
                      >
                        Next Day <ChevronRight size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* One-Click Auto-Fill Button */}
              <div className="df-autofetch-wrap" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => triggerAutoFetch(formData.date, true)}
                  disabled={isAutoFetching}
                  className="df-autofetch-btn"
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '11px 20px',
                    fontSize: '14px',
                    fontWeight: 900,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 6px 18px rgba(16, 185, 129, 0.3)',
                    transition: 'all 0.2s'
                  }}
                >
                  <Sparkles size={18} className={isAutoFetching ? 'animate-spin' : ''} />
                  <span>{isAutoFetching ? 'Reading POS Bills...' : '⚡ Auto-Fill Today’s Bills (POS)'}</span>
                </button>
                <span style={{ fontSize: '11px', color: '#059669', fontWeight: 700 }}>
                  Reads Cash & UPI directly from counter invoices
                </span>
              </div>

            </div>

            {/* EDITING RECORD ACTIVE BANNER */}
            {editingRecord && (
              <div style={{
                background: 'linear-gradient(135deg, #eff6ff 0%, #e0f2fe 100%)',
                border: '2px solid #0284c7',
                borderRadius: '14px',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                boxShadow: '0 4px 16px rgba(2, 132, 199, 0.12)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: '#0284c7',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '16px',
                    flexShrink: 0
                  }}>
                    ✏️
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 900, color: '#0369a1' }}>
                      Editing Accounts Record for {new Date(formData.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                    <div style={{ fontSize: '12px', color: '#0284c7', marginTop: '1px' }}>
                      All {formData.payment_details?.length || 0} expense vouchers & earnings loaded. You can add new expenses below or adjust existing numbers.
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => handleAddExpenseRow('VENDOR')}
                    className="btn btn-secondary btn-sm"
                    style={{ background: '#ffffff', border: '1.5px solid #0284c7', color: '#0284c7', fontWeight: 800, borderRadius: '8px', padding: '6px 12px' }}
                  >
                    + Add Vendor Payout
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenNewEntry()}
                    className="btn btn-secondary btn-sm"
                    style={{ background: '#ffffff', border: '1.5px solid #cbd5e1', color: '#475569', fontWeight: 700, borderRadius: '8px', padding: '6px 12px' }}
                  >
                    + New Blank Day Entry
                  </button>
                </div>
              </div>
            )}

            {/* =========================================================================
                SECTION 1: MONEY COMING IN (CASH & UPI INFLOWS)
                ========================================================================= */}
            <div className="glass-panel" style={{
              padding: '18px 20px',
              background: '#ffffff',
              borderRadius: '16px',
              border: '1.5px solid #86efac',
              boxShadow: '0 4px 16px rgba(16, 185, 129, 0.06)'
            }}>
              
              {/* Step 1 Title Banner */}
              <div className="df-section-header" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                borderBottom: '1.5px solid #f0fdf4',
                paddingBottom: '14px',
                marginBottom: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '10px',
                    background: '#10b981',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '15px',
                    boxShadow: '0 3px 10px rgba(16, 185, 129, 0.25)',
                    flexShrink: 0
                  }}>
                    1
                  </div>
                  <div>
                    <h2 style={{ fontSize: '16px', fontWeight: 900, color: '#065f46', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>🟢 Money Coming In (Cash & UPI Inflows)</span>
                    </h2>
                    <div style={{ fontSize: '12px', color: '#059669', marginTop: '1px' }}>
                      Counted cash in drawer and digital online receipts
                    </div>
                  </div>
                </div>

                {/* Total Inflow Live Badge */}
                <div className="df-total-badge" style={{
                  padding: '8px 16px',
                  background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                  borderRadius: '10px',
                  border: '1.5px solid #6ee7b7',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#065f46', textTransform: 'uppercase' }}>
                    Total Inflow:
                  </span>
                  <span className="mono" style={{ fontSize: '19px', fontWeight: 900, color: '#047857' }}>
                    {currency}{formTotalEarned.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* 3 Large Inflow Entry Cards */}
              <div className="df-inflows-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                
                {/* 1. Cash in Drawer */}
                <div style={{
                  padding: '16px',
                  background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)',
                  borderRadius: '14px',
                  border: '2px solid #059669'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 900, color: '#065f46', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Banknote size={18} color="#059669" />
                      <span>💵 CASH in Drawer ({currency}) *</span>
                    </label>
                    <span className="badge badge-emerald" style={{ fontSize: '10px', fontWeight: 800 }}>Hard Cash</span>
                  </div>
                  
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '18px', fontWeight: 900, color: '#059669' }}>
                      {currency}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="0.00"
                      value={formData.cash_earned}
                      onChange={(e) => setFormData({ ...formData, cash_earned: e.target.value })}
                      className="mono"
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 32px',
                        fontSize: '22px',
                        fontWeight: 900,
                        borderRadius: '10px',
                        border: '1.5px solid #059669',
                        background: '#ffffff',
                        color: '#065f46',
                        outline: 'none'
                      }}
                    />
                  </div>
                  <div style={{ fontSize: '11px', color: '#059669', marginTop: '6px', fontWeight: 700 }}>
                    Physical cash in your counter drawer
                  </div>
                </div>

                {/* 2. UPI / QR Received */}
                <div style={{
                  padding: '16px',
                  background: 'linear-gradient(135deg, #f0f9ff 0%, #ffffff 100%)',
                  borderRadius: '14px',
                  border: '2px solid #0284c7'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 900, color: '#0369a1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <QrCode size={18} color="#0284c7" />
                      <span>📱 UPI / QR Online ({currency}) *</span>
                    </label>
                    <span className="badge badge-cyan" style={{ fontSize: '10px', fontWeight: 800 }}>PhonePe / GPay</span>
                  </div>
                  
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '18px', fontWeight: 900, color: '#0284c7' }}>
                      {currency}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="0.00"
                      value={formData.upi_earned}
                      onChange={(e) => setFormData({ ...formData, upi_earned: e.target.value })}
                      className="mono"
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 32px',
                        fontSize: '22px',
                        fontWeight: 900,
                        borderRadius: '10px',
                        border: '1.5px solid #0284c7',
                        background: '#ffffff',
                        color: '#0369a1',
                        outline: 'none'
                      }}
                    />
                  </div>
                  <div style={{ fontSize: '11px', color: '#0284c7', marginTop: '6px', fontWeight: 700 }}>
                    Digital receipts received on shop QR / soundbox
                  </div>
                </div>

                {/* 3. Gross Daily Sales (POS Bills) */}
                <div style={{
                  padding: '16px',
                  background: '#f8fafc',
                  borderRadius: '14px',
                  border: '1.5px solid #cbd5e1'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <TrendingUp size={18} color="#64748b" />
                      <span>💻 Gross POS Sales ({currency})</span>
                    </label>
                    <span className="badge badge-gray" style={{ fontSize: '10px', fontWeight: 700 }}>Invoiced</span>
                  </div>
                  
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '18px', fontWeight: 800, color: '#475569' }}>
                      {currency}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={formData.daily_sales}
                      onChange={(e) => setFormData({ ...formData, daily_sales: e.target.value })}
                      className="mono"
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 32px',
                        fontSize: '22px',
                        fontWeight: 800,
                        borderRadius: '10px',
                        border: '1.5px solid #cbd5e1',
                        background: '#ffffff',
                        color: 'var(--text-main)',
                        outline: 'none'
                      }}
                    />
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                    Total billed medicines on computer software
                  </div>
                </div>

              </div>

            </div>

            {/* =========================================================================
                SECTION 2: MONEY GOING OUT (DAILY EXPENSES & PAYMENTS TABLE / MOBILE CARDS)
                ========================================================================= */}
            <div className="glass-panel" style={{
              padding: '18px 20px',
              background: '#ffffff',
              borderRadius: '16px',
              border: '1.5px solid #fda4af',
              boxShadow: '0 4px 16px rgba(225, 29, 72, 0.06)'
            }}>
              
              {/* Header & Quick Category Shortcuts */}
              <div className="df-section-header" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                borderBottom: '1.5px solid #fff1f2',
                paddingBottom: '14px',
                marginBottom: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '10px',
                    background: '#e11d48',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '15px',
                    boxShadow: '0 3px 10px rgba(225, 29, 72, 0.25)',
                    flexShrink: 0
                  }}>
                    2
                  </div>
                  <div>
                    <h2 style={{ fontSize: '16px', fontWeight: 900, color: '#be123c', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>🔴 Money Going Out (Daily Expenses & Payouts Table)</span>
                    </h2>
                    <div style={{ fontSize: '12px', color: '#e11d48', marginTop: '1px' }}>
                      Add line items for supplier payments, staff salaries, petrol, and shop expenses
                    </div>
                  </div>
                </div>

                {/* Live Expense Total Badge */}
                <div className="df-total-badge" style={{
                  padding: '8px 16px',
                  background: 'linear-gradient(135deg, #ffe4e6 0%, #fecdd3 100%)',
                  borderRadius: '10px',
                  border: '1.5px solid #f43f5e',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#9f1239', textTransform: 'uppercase' }}>
                    Total Expenses:
                  </span>
                  <span className="mono" style={{ fontSize: '19px', fontWeight: 900, color: '#be123c' }}>
                    {currency}{formTotalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* 5 Quick 1-Click Row Addition Buttons */}
              <div className="df-quick-chips" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flexWrap: 'wrap',
                marginBottom: '14px',
                padding: '10px 14px',
                background: '#fff1f2',
                borderRadius: '12px',
                border: '1.5px dashed #fca5a5'
              }}>
                <span style={{ fontSize: '12px', fontWeight: 900, color: '#9f1239', marginRight: '2px' }}>
                  ⚡ Quick Add:
                </span>
                
                {/* 1. Vendor Payout */}
                <button
                  type="button"
                  onClick={() => handleAddExpenseRow('VENDOR')}
                  className="df-quick-btn"
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid #d8b4fe',
                    background: '#faf5ff',
                    color: '#6b21a8',
                    fontWeight: 800,
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <Building2 size={14} color="#7e22ce" />
                  <span>+ Vendor Payout</span>
                </button>

                {/* 2. Staff Pay */}
                <button
                  type="button"
                  onClick={() => handleAddExpenseRow('STAFF')}
                  className="df-quick-btn"
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid #7dd3fc',
                    background: '#f0f9ff',
                    color: '#0369a1',
                    fontWeight: 800,
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <UserCheck size={14} color="#0284c7" />
                  <span>+ Staff Pay [Code]</span>
                </button>

                {/* 3. Petrol / Vehicle */}
                <button
                  type="button"
                  onClick={() => handleAddExpenseRow('VEHICLE')}
                  className="df-quick-btn"
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid #fde68a',
                    background: '#fffbeb',
                    color: '#92400e',
                    fontWeight: 800,
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <Truck size={14} color="#d97706" />
                  <span>+ Petrol / Vehicle</span>
                </button>

                {/* 4. Tea / Shop Expense */}
                <button
                  type="button"
                  onClick={() => handleAddExpenseRow('SHOP')}
                  className="df-quick-btn"
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid #fecdd3',
                    background: '#fff1f2',
                    color: '#be123c',
                    fontWeight: 800,
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <Coffee size={14} color="#e11d48" />
                  <span>+ Tea / Shop</span>
                </button>

                {/* 5. Add Blank */}
                <button
                  type="button"
                  onClick={() => handleAddExpenseRow('VENDOR')}
                  className="df-quick-btn df-quick-btn-blank"
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: 'var(--text-main)',
                    fontWeight: 800,
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    marginLeft: 'auto'
                  }}
                >
                  <Plus size={14} />
                  <span>+ Add Blank Row</span>
                </button>
              </div>

              {/* ----------------------------------------------------
                  DESKTOP VIEW: SPREADSHEET TABLE (>= 769px)
                  ---------------------------------------------------- */}
              <div className="df-table-desktop" style={{
                overflowX: 'auto',
                border: '1.5px solid #cbd5e1',
                borderRadius: '12px',
                background: '#ffffff'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                      <th style={{ padding: '12px 10px', width: '36px', textAlign: 'center', fontWeight: 800, color: '#334155' }}>#</th>
                      <th style={{ padding: '12px 10px', width: '150px', fontWeight: 800, color: '#334155' }}>Expense Category</th>
                      <th style={{ padding: '12px 10px', minWidth: '200px', fontWeight: 800, color: '#334155' }}>Paid To / Description</th>
                      <th style={{ padding: '12px 10px', width: '150px', fontWeight: 800, color: '#334155' }}>Charge Code / Purpose</th>
                      <th style={{ padding: '12px 10px', width: '140px', fontWeight: 800, color: '#be123c', textAlign: 'right' }}>Amount ({currency}) *</th>
                      <th style={{ padding: '12px 10px', minWidth: '240px', fontWeight: 800, color: '#334155' }}>Payment Mode & Due Date</th>
                      <th style={{ padding: '12px 10px', width: '40px', textAlign: 'center' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(formData.payment_details || []).map((row, index) => {
                      const isVendor = row.type === 'VENDOR' || row.type === 'Supplier';
                      const isStaff = row.type === 'STAFF';
                      const isVehicle = row.type === 'VEHICLE';
                      const isShop = row.type === 'SHOP' || row.type === 'Expense';
                      const isOther = row.type === 'OTHER';
                      const isCredit = row.payment_mode === 'CREDIT';

                      const rowBg = index % 2 === 0 ? '#ffffff' : '#fcfcfd';

                      return (
                        <tr key={row.id || index} style={{
                          background: isCredit ? '#fffdf7' : rowBg,
                          borderBottom: '1px solid #e2e8f0',
                          borderLeft: isCredit ? '3.5px solid #f59e0b' : 'none'
                        }}>
                          
                          {/* 1. Row Index */}
                          <td style={{ textAlign: 'center', fontWeight: 800, color: '#64748b', padding: '10px 4px' }}>
                            {index + 1}
                          </td>

                          {/* 2. Category Dropdown with Emoji */}
                          <td style={{ padding: '8px 10px' }}>
                            <select
                              value={row.type}
                              onChange={(e) => handleUpdateExpenseRow(row.id, 'type', e.target.value)}
                              style={{
                                width: '100%',
                                padding: '8px 10px',
                                borderRadius: '8px',
                                border: '1.5px solid ' + (isVendor ? '#d8b4fe' : (isStaff ? '#7dd3fc' : (isVehicle ? '#fde68a' : '#fecdd3'))),
                                background: isVendor ? '#faf5ff' : (isStaff ? '#f0f9ff' : (isVehicle ? '#fffbeb' : '#fff1f2')),
                                fontWeight: 800,
                                fontSize: '12px',
                                color: isVendor ? '#6b21a8' : (isStaff ? '#0369a1' : (isVehicle ? '#92400e' : '#be123c')),
                                cursor: 'pointer',
                                outline: 'none'
                              }}
                            >
                              <option value="VENDOR">🏢 Vendor Payout</option>
                              <option value="STAFF">👤 Staff Pay</option>
                              <option value="VEHICLE">🚗 Petrol / Vehicle</option>
                              <option value="SHOP">☕ Shop Expense</option>
                              <option value="OTHER">📦 Other Expense</option>
                            </select>
                          </td>

                          {/* 3. Name / Details (Context-Aware) */}
                          <td style={{ padding: '8px 10px' }}>
                            {isVendor && (
                              <div style={{ display: 'flex', gap: '6px' }}>
                                {suppliers.length > 0 ? (
                                  <select
                                    value={row.recipient || ''}
                                    onChange={(e) => handleUpdateExpenseRow(row.id, 'recipient', e.target.value)}
                                    style={{
                                      flex: 1,
                                      padding: '8px 10px',
                                      borderRadius: '8px',
                                      border: '1px solid #cbd5e1',
                                      fontSize: '13px',
                                      fontWeight: 700,
                                      background: '#ffffff',
                                      color: '#1e293b',
                                      outline: 'none'
                                    }}
                                  >
                                    <option value="">-- Select Supplier / Wholesaler --</option>
                                    {suppliers.map(s => (
                                      <option key={s.id} value={s.name}>{s.name}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    type="text"
                                    placeholder="Type Supplier Name"
                                    value={row.recipient || ''}
                                    onChange={(e) => handleUpdateExpenseRow(row.id, 'recipient', e.target.value)}
                                    style={{
                                      flex: 1,
                                      padding: '8px 10px',
                                      borderRadius: '8px',
                                      border: '1px solid #cbd5e1',
                                      fontSize: '13px',
                                      fontWeight: 700,
                                      outline: 'none'
                                    }}
                                  />
                                )}
                              </div>
                            )}

                            {isStaff && (
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                {staffList.length > 0 ? (
                                  <select
                                    value={row.staff_id || ''}
                                    onChange={(e) => handleUpdateExpenseRow(row.id, 'staff_id', e.target.value)}
                                    style={{
                                      flex: 1,
                                      padding: '8px 10px',
                                      borderRadius: '8px',
                                      border: '1.5px solid #7dd3fc',
                                      fontSize: '13px',
                                      fontWeight: 800,
                                      color: '#0369a1',
                                      background: '#ffffff',
                                      outline: 'none'
                                    }}
                                  >
                                    <option value="">-- Select Staff Member --</option>
                                    {staffList.map(st => (
                                      <option key={st.id} value={st.id}>
                                        [{st.charge_code}] {st.name} ({st.role})
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    type="text"
                                    placeholder="Staff Person Name"
                                    value={row.staff_name || ''}
                                    onChange={(e) => handleUpdateExpenseRow(row.id, 'staff_name', e.target.value)}
                                    style={{
                                      flex: 1,
                                      padding: '8px 10px',
                                      borderRadius: '8px',
                                      border: '1px solid #cbd5e1',
                                      fontSize: '13px',
                                      fontWeight: 700,
                                      outline: 'none'
                                    }}
                                  />
                                )}
                              </div>
                            )}

                            {isVehicle && (
                              <input
                                type="text"
                                placeholder="Delivery Bike / Driver / Vehicle details"
                                value={row.vehicle_info || ''}
                                onChange={(e) => handleUpdateExpenseRow(row.id, 'vehicle_info', e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '8px 10px',
                                  borderRadius: '8px',
                                  border: '1px solid #cbd5e1',
                                  fontSize: '13px',
                                  fontWeight: 700,
                                  outline: 'none'
                                }}
                              />
                            )}

                            {isShop && (
                              <input
                                type="text"
                                placeholder="Details (e.g. Tea & snacks for staff / Cleaning supplies)"
                                value={row.note || ''}
                                onChange={(e) => handleUpdateExpenseRow(row.id, 'note', e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '8px 10px',
                                  borderRadius: '8px',
                                  border: '1px solid #cbd5e1',
                                  fontSize: '13px',
                                  fontWeight: 700,
                                  outline: 'none'
                                }}
                              />
                            )}

                            {isOther && (
                              <input
                                type="text"
                                placeholder="Expense description / notes"
                                value={row.note || ''}
                                onChange={(e) => handleUpdateExpenseRow(row.id, 'note', e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '8px 10px',
                                  borderRadius: '8px',
                                  border: '1px solid #cbd5e1',
                                  fontSize: '13px',
                                  fontWeight: 700,
                                  outline: 'none'
                                }}
                              />
                            )}
                          </td>

                          {/* 4. Reason / Mapped Staff Charge Code */}
                          <td style={{ padding: '8px 10px' }}>
                            {isStaff ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {row.charge_code ? (
                                  <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '3px 8px',
                                    background: '#e0f2fe',
                                    color: '#0369a1',
                                    borderRadius: '6px',
                                    fontWeight: 900,
                                    fontSize: '11.5px',
                                    border: '1px solid #bae6fd'
                                  }}>
                                    <Tag size={11} /> Code: {row.charge_code}
                                  </span>
                                ) : (
                                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>No Code</span>
                                )}

                                <select
                                  value={row.purpose || 'Daily Wage'}
                                  onChange={(e) => handleUpdateExpenseRow(row.id, 'purpose', e.target.value)}
                                  style={{
                                    padding: '5px 8px',
                                    borderRadius: '6px',
                                    border: '1px solid #cbd5e1',
                                    fontSize: '11.5px',
                                    fontWeight: 700,
                                    color: '#0369a1',
                                    outline: 'none'
                                  }}
                                >
                                  <option value="Daily Wage">Daily Wage</option>
                                  <option value="Salary Advance">Salary Advance</option>
                                  <option value="Monthly Salary">Monthly Salary</option>
                                  <option value="Tea/Food">Tea / Food Allowance</option>
                                  <option value="Commission">Commission / Bonus</option>
                                  <option value="Other">Other</option>
                                </select>
                              </div>
                            ) : isVendor ? (
                              <input
                                type="text"
                                placeholder="Bill / Invoice # (Optional)"
                                value={row.note || ''}
                                onChange={(e) => handleUpdateExpenseRow(row.id, 'note', e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '7px 10px',
                                  borderRadius: '6px',
                                  border: '1px solid #cbd5e1',
                                  fontSize: '12px',
                                  outline: 'none'
                                }}
                              />
                            ) : isVehicle ? (
                              <select
                                value={row.purpose || 'Fuel / Petrol'}
                                onChange={(e) => handleUpdateExpenseRow(row.id, 'purpose', e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '7px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid #cbd5e1',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  outline: 'none'
                                }}
                              >
                                <option value="Fuel / Petrol">⛽ Petrol / Diesel</option>
                                <option value="Maintenance">🔧 Vehicle Repair</option>
                                <option value="Courier/Freight">📦 Courier / Freight</option>
                                <option value="Parking/Toll">🅿️ Parking / Toll</option>
                              </select>
                            ) : (
                              <select
                                value={row.category || 'Tea / Snacks'}
                                onChange={(e) => handleUpdateExpenseRow(row.id, 'category', e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '7px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid #cbd5e1',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  outline: 'none'
                                }}
                              >
                                <option value="Tea / Snacks">☕ Tea & Snacks</option>
                                <option value="Electricity">💡 Electricity Bill</option>
                                <option value="Shop Rent">🏢 Shop Rent</option>
                                <option value="Cleaning/Maint">🧹 Cleaning / Maintenance</option>
                                <option value="Stationery">📝 Printing / Stationery</option>
                                <option value="Other">📦 Other Miscellaneous</option>
                              </select>
                            )}
                          </td>

                          {/* 5. Amount (₹) */}
                          <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                            <div style={{ position: 'relative' }}>
                              <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', fontWeight: 900, color: isCredit ? '#b45309' : '#e11d48' }}>
                                {currency}
                              </span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                value={row.amount || ''}
                                onChange={(e) => handleUpdateExpenseRow(row.id, 'amount', e.target.value)}
                                className="mono"
                                style={{
                                  width: '100%',
                                  padding: '8px 10px 8px 24px',
                                  borderRadius: '8px',
                                  border: '1.5px solid ' + (isCredit ? '#f59e0b' : '#f87171'),
                                  fontSize: '16px',
                                  fontWeight: 900,
                                  color: isCredit ? '#b45309' : '#be123c',
                                  textAlign: 'right',
                                  background: isCredit ? '#fffbeb' : '#ffffff',
                                  outline: 'none'
                                }}
                              />
                            </div>
                            <div style={{ marginTop: '3px', fontSize: '10.5px', fontWeight: 800 }}>
                              {isCredit ? (
                                <span style={{ color: '#b45309', background: '#fef3c7', padding: '1px 5px', borderRadius: '4px', border: '1px solid #fde68a' }}>
                                  ⏳ Credit (Yet to Pay)
                                </span>
                              ) : (
                                <span style={{ color: '#059669' }}>
                                  💸 Paid Out Today
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 6. Payment Mode & Due Date (3 Modes: CASH, UPI, CREDIT) */}
                          <td style={{ padding: '8px 10px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <select
                                value={row.payment_mode || 'CASH'}
                                onChange={(e) => handleUpdateExpenseRow(row.id, 'payment_mode', e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '7px 8px',
                                  borderRadius: '8px',
                                  border: '1.5px solid ' + (row.payment_mode === 'CREDIT' ? '#f59e0b' : (row.payment_mode === 'UPI' ? '#93c5fd' : '#86efac')),
                                  fontSize: '12px',
                                  fontWeight: 800,
                                  color: row.payment_mode === 'CREDIT' ? '#b45309' : (row.payment_mode === 'UPI' ? '#0284c7' : '#059669'),
                                  background: row.payment_mode === 'CREDIT' ? '#fffbeb' : (row.payment_mode === 'UPI' ? '#f0f9ff' : '#f0fdf4'),
                                  cursor: 'pointer',
                                  outline: 'none'
                                }}
                              >
                                <option value="CASH">💵 CASH (Paid Today)</option>
                                <option value="UPI">📱 UPI (Paid Today)</option>
                                <option value="CREDIT">⏳ CREDIT (To Pay Later)</option>
                              </select>

                              {/* If CREDIT Mode: Show interactive Due Date picker, Quick Day Chips & Countdown */}
                              {isCredit && (
                                <div style={{
                                  background: '#fffbeb',
                                  border: '1.5px solid #fde68a',
                                  borderRadius: '8px',
                                  padding: '6px 8px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '5px'
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#92400e', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                      <Calendar size={12} /> Due Date:
                                    </span>
                                    <input
                                      type="date"
                                      value={row.due_date || computeDueDate(formData.date, row.credit_days || 21)}
                                      onChange={(e) => handleUpdateExpenseRow(row.id, 'due_date', e.target.value)}
                                      style={{
                                        padding: '3px 6px',
                                        fontSize: '11px',
                                        fontWeight: 800,
                                        borderRadius: '6px',
                                        border: '1px solid #f59e0b',
                                        color: '#92400e',
                                        background: '#ffffff',
                                        outline: 'none'
                                      }}
                                    />
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px', flexWrap: 'wrap' }}>
                                    <div style={{ display: 'flex', gap: '3px' }}>
                                      {[15, 21, 30, 45].map(days => (
                                        <button
                                          key={days}
                                          type="button"
                                          onClick={() => {
                                            const newDue = computeDueDate(formData.date, days);
                                            handleUpdateExpenseRow(row.id, 'credit_days', days);
                                            handleUpdateExpenseRow(row.id, 'due_date', newDue);
                                          }}
                                          style={{
                                            padding: '2px 5px',
                                            borderRadius: '4px',
                                            fontSize: '10px',
                                            fontWeight: 800,
                                            border: (parseInt(row.credit_days) === days) ? '1px solid #b45309' : '1px solid #fde68a',
                                            background: (parseInt(row.credit_days) === days) ? '#fef3c7' : '#ffffff',
                                            color: '#92400e',
                                            cursor: 'pointer'
                                          }}
                                        >
                                          +{days}d
                                        </button>
                                      ))}
                                    </div>

                                    {/* Days left badge */}
                                    {(() => {
                                      const daysLeft = computeDaysLeft(row.due_date);
                                      const isOverdue = daysLeft < 0;
                                      const isToday = daysLeft === 0;
                                      return (
                                        <span style={{
                                          fontSize: '10px',
                                          fontWeight: 900,
                                          padding: '2px 6px',
                                          borderRadius: '5px',
                                          background: isOverdue ? '#fee2e2' : (isToday ? '#fef3c7' : '#ecfdf5'),
                                          color: isOverdue ? '#b91c1c' : (isToday ? '#b45309' : '#047857'),
                                          border: '1px solid ' + (isOverdue ? '#fca5a5' : (isToday ? '#fde68a' : '#a7f3d0'))
                                        }}>
                                          {isOverdue ? `⚠️ Overdue ${Math.abs(daysLeft)}d` : (isToday ? '🟠 Due Today' : `⏳ ${daysLeft}d left`)}
                                        </span>
                                      );
                                    })()}
                                  </div>
                                </div>
                              )}

                              {row.payment_mode === 'CASH' && (
                                <div style={{ fontSize: '10.5px', color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  <CheckCircle2 size={11} color="#10b981" /> Paid today from drawer cash
                                </div>
                              )}

                              {row.payment_mode === 'UPI' && (
                                <div style={{ fontSize: '10.5px', color: '#0284c7', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  <CheckCircle2 size={11} color="#0284c7" /> Paid today via soundbox / UPI
                                </div>
                              )}

                            </div>
                          </td>

                          {/* 7. Remove Button */}
                          <td style={{ padding: '8px 4px', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleRemoveExpenseRow(row.id)}
                              style={{
                                background: '#fef2f2',
                                border: '1px solid #fecdd3',
                                color: '#ef4444',
                                cursor: 'pointer',
                                padding: '6px',
                                borderRadius: '6px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              title="Delete this row"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>

                  {/* Summary Footer of Table */}
                  <tfoot>
                    <tr style={{ background: '#fff1f2', borderTop: '2px solid #fecdd3', fontWeight: 800 }}>
                      <td colSpan="4" style={{ padding: '12px 14px', color: '#9f1239' }}>
                        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center', fontSize: '12.5px' }}>
                          <span>🏢 Vendors Paid: <strong style={{ color: '#047857' }}>{currency}{formSupplierPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></span>
                          {formSupplierCredit > 0 && (
                            <span style={{ background: '#fef3c7', padding: '2px 8px', borderRadius: '6px', border: '1px solid #fde68a', color: '#92400e' }}>
                              ⏳ Vendor Credit (Yet to Pay): <strong>{currency}{formSupplierCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                            </span>
                          )}
                          <span>👤 Staff: <strong>{currency}{formStaffPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></span>
                          <span>🚗 Vehicle: <strong>{currency}{formVehiclePaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></span>
                          <span>☕ Shop: <strong>{currency}{formShopExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 10px', textAlign: 'right' }} className="mono">
                        <div style={{ fontSize: '18px', fontWeight: 900, color: '#be123c' }}>
                          {currency}{formTotalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        {formTotalCredit > 0 && (
                          <div style={{ fontSize: '11px', color: '#92400e', fontWeight: 800, marginTop: '2px' }}>
                            + {currency}{formTotalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })} Credit
                          </div>
                        )}
                      </td>
                      <td colSpan="2" style={{ padding: '12px 10px', fontSize: '11px', color: '#be123c', fontWeight: 800, textTransform: 'uppercase' }}>
                        <div>Total Paid Out (Cash + UPI)</div>
                        {formTotalCredit > 0 && <div style={{ fontSize: '10px', color: '#92400e', textTransform: 'none', fontWeight: 700 }}>Credit tracked in Vendor Bills tab</div>}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* ----------------------------------------------------
                  MOBILE VIEW: RESPONSIVE CARDS (< 769px)
                  ---------------------------------------------------- */}
              <div className="df-cards-mobile">
                {(formData.payment_details || []).map((row, index) => {
                  const isVendor = row.type === 'VENDOR' || row.type === 'Supplier';
                  const isStaff = row.type === 'STAFF';
                  const isVehicle = row.type === 'VEHICLE';
                  const isShop = row.type === 'SHOP' || row.type === 'Expense';
                  const isOther = row.type === 'OTHER';
                  const isCredit = row.payment_mode === 'CREDIT';

                  const themeClass = isVendor ? 'vendor-theme' : (isStaff ? 'staff-theme' : (isVehicle ? 'vehicle-theme' : (isShop ? 'shop-theme' : 'other-theme')));

                  return (
                    <div
                      key={row.id || index}
                      className={`df-mobile-voucher ${themeClass} ${isCredit ? 'credit-active' : ''}`}
                    >
                      {/* Top Row: Index Badge, Category Dropdown, Delete Button */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        
                        {/* Index Pill */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '8px',
                            background: isCredit ? '#fef3c7' : (isVendor ? '#f3e8ff' : (isStaff ? '#e0f2fe' : (isVehicle ? '#fef3c7' : '#ffe4e6'))),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12.5px',
                            fontWeight: 900,
                            color: isCredit ? '#b45309' : (isVendor ? '#7e22ce' : (isStaff ? '#0369a1' : (isVehicle ? '#b45309' : '#be123c'))),
                            flexShrink: 0
                          }}>
                            #{index + 1}
                          </span>
                          <span style={{ fontSize: '12px', fontWeight: 800, color: '#475569' }}>
                            {isVendor ? '🏢 Vendor' : (isStaff ? '👤 Staff' : (isVehicle ? '🚗 Vehicle' : (isShop ? '☕ Shop' : '📦 Other')))}
                          </span>
                        </div>

                        {/* Category Selector */}
                        <select
                          value={row.type}
                          onChange={(e) => handleUpdateExpenseRow(row.id, 'type', e.target.value)}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '8px',
                            border: '1.5px solid ' + (isVendor ? '#d8b4fe' : (isStaff ? '#7dd3fc' : (isVehicle ? '#fde68a' : '#fecdd3'))),
                            background: isVendor ? '#faf5ff' : (isStaff ? '#f0f9ff' : (isVehicle ? '#fffbeb' : '#fff1f2')),
                            fontWeight: 800,
                            fontSize: '12px',
                            color: isVendor ? '#6b21a8' : (isStaff ? '#0369a1' : (isVehicle ? '#92400e' : '#be123c')),
                            outline: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="VENDOR">🏢 Vendor</option>
                          <option value="STAFF">👤 Staff Pay</option>
                          <option value="VEHICLE">🚗 Petrol / Vehicle</option>
                          <option value="SHOP">☕ Shop Expense</option>
                          <option value="OTHER">📦 Other</option>
                        </select>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveExpenseRow(row.id)}
                          style={{
                            background: '#fef2f2',
                            border: '1px solid #fecdd3',
                            color: '#ef4444',
                            padding: '7px 9px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                          title="Delete line"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      {/* Middle: Recipient / Details */}
                      <div>
                        {isVendor && (
                          suppliers.length > 0 ? (
                            <div>
                              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#7e22ce', marginBottom: '3px' }}>
                                🏢 Supplier / Wholesaler:
                              </label>
                              <select
                                value={row.recipient || ''}
                                onChange={(e) => handleUpdateExpenseRow(row.id, 'recipient', e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '9px 11px',
                                  borderRadius: '8px',
                                  border: '1.5px solid #d8b4fe',
                                  fontSize: '13.5px',
                                  fontWeight: 800,
                                  background: '#ffffff',
                                  color: '#1e293b',
                                  outline: 'none'
                                }}
                              >
                                <option value="">-- Select Supplier / Wholesaler --</option>
                                {suppliers.map(s => (
                                  <option key={s.id} value={s.name}>{s.name}</option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            <div>
                              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#7e22ce', marginBottom: '3px' }}>
                                🏢 Supplier Name:
                              </label>
                              <input
                                type="text"
                                placeholder="Type Supplier Name"
                                value={row.recipient || ''}
                                onChange={(e) => handleUpdateExpenseRow(row.id, 'recipient', e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '9px 11px',
                                  borderRadius: '8px',
                                  border: '1.5px solid #cbd5e1',
                                  fontSize: '13.5px',
                                  fontWeight: 700,
                                  outline: 'none'
                                }}
                              />
                            </div>
                          )
                        )}

                        {isStaff && (
                          staffList.length > 0 ? (
                            <div>
                              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#0369a1', marginBottom: '3px' }}>
                                👤 Staff Member & Charge Code:
                              </label>
                              <select
                                value={row.staff_id || ''}
                                onChange={(e) => handleUpdateExpenseRow(row.id, 'staff_id', e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '9px 11px',
                                  borderRadius: '8px',
                                  border: '1.5px solid #7dd3fc',
                                  fontSize: '13.5px',
                                  fontWeight: 800,
                                  color: '#0369a1',
                                  background: '#ffffff',
                                  outline: 'none'
                                }}
                              >
                                <option value="">-- Select Staff Member --</option>
                                {staffList.map(st => (
                                  <option key={st.id} value={st.id}>
                                    [{st.charge_code}] {st.name} ({st.role})
                                  </option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            <div>
                              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#0369a1', marginBottom: '3px' }}>
                                👤 Staff Person Name:
                              </label>
                              <input
                                type="text"
                                placeholder="Staff Person Name"
                                value={row.staff_name || ''}
                                onChange={(e) => handleUpdateExpenseRow(row.id, 'staff_name', e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '9px 11px',
                                  borderRadius: '8px',
                                  border: '1.5px solid #cbd5e1',
                                  fontSize: '13.5px',
                                  fontWeight: 700,
                                  outline: 'none'
                                }}
                              />
                            </div>
                          )
                        )}

                        {isVehicle && (
                          <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#b45309', marginBottom: '3px' }}>
                              🚗 Vehicle / Delivery Details:
                            </label>
                            <input
                              type="text"
                              placeholder="Delivery Bike / Driver / Vehicle details"
                              value={row.vehicle_info || ''}
                              onChange={(e) => handleUpdateExpenseRow(row.id, 'vehicle_info', e.target.value)}
                              style={{
                                width: '100%',
                                padding: '9px 11px',
                                borderRadius: '8px',
                                border: '1.5px solid #cbd5e1',
                                fontSize: '13.5px',
                                fontWeight: 700,
                                outline: 'none'
                              }}
                            />
                          </div>
                        )}

                        {isShop && (
                          <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#be123c', marginBottom: '3px' }}>
                              ☕ Expense Details & Description:
                            </label>
                            <input
                              type="text"
                              placeholder="Details (e.g. Tea & snacks / Cleaning supplies)"
                              value={row.note || ''}
                              onChange={(e) => handleUpdateExpenseRow(row.id, 'note', e.target.value)}
                              style={{
                                width: '100%',
                                padding: '9px 11px',
                                borderRadius: '8px',
                                border: '1.5px solid #cbd5e1',
                                fontSize: '13.5px',
                                fontWeight: 700,
                                outline: 'none'
                              }}
                            />
                          </div>
                        )}

                        {isOther && (
                          <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '3px' }}>
                              📦 Other Expense Description:
                            </label>
                            <input
                              type="text"
                              placeholder="Expense description"
                              value={row.note || ''}
                              onChange={(e) => handleUpdateExpenseRow(row.id, 'note', e.target.value)}
                              style={{
                                width: '100%',
                                padding: '9px 11px',
                                borderRadius: '8px',
                                border: '1.5px solid #cbd5e1',
                                fontSize: '13.5px',
                                fontWeight: 700,
                                outline: 'none'
                              }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Purpose & Charge Code Row */}
                      <div>
                        {isStaff && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {row.charge_code && (
                              <span style={{
                                padding: '5px 8px',
                                background: '#e0f2fe',
                                color: '#0369a1',
                                borderRadius: '6px',
                                fontWeight: 900,
                                fontSize: '11.5px',
                                border: '1px solid #bae6fd',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}>
                                <Tag size={12} /> {row.charge_code}
                              </span>
                            )}
                            <select
                              value={row.purpose || 'Daily Wage'}
                              onChange={(e) => handleUpdateExpenseRow(row.id, 'purpose', e.target.value)}
                              style={{
                                flex: 1,
                                padding: '7px 10px',
                                borderRadius: '8px',
                                border: '1.5px solid #cbd5e1',
                                fontSize: '12.5px',
                                fontWeight: 700,
                                color: '#0369a1',
                                background: '#ffffff',
                                outline: 'none'
                              }}
                            >
                              <option value="Daily Wage">Daily Wage</option>
                              <option value="Salary Advance">Salary Advance</option>
                              <option value="Monthly Salary">Monthly Salary</option>
                              <option value="Tea/Food">Tea / Food Allowance</option>
                              <option value="Commission">Commission</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                        )}

                        {isVendor && (
                          <input
                            type="text"
                            placeholder="Bill / Invoice # (Optional)"
                            value={row.note || ''}
                            onChange={(e) => handleUpdateExpenseRow(row.id, 'note', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '7px 10px',
                              borderRadius: '8px',
                              border: '1.5px solid #cbd5e1',
                              fontSize: '12.5px',
                              outline: 'none'
                            }}
                          />
                        )}

                        {isVehicle && (
                          <select
                            value={row.purpose || 'Fuel / Petrol'}
                            onChange={(e) => handleUpdateExpenseRow(row.id, 'purpose', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '7px 10px',
                              borderRadius: '8px',
                              border: '1.5px solid #cbd5e1',
                              fontSize: '12.5px',
                              fontWeight: 700,
                              outline: 'none'
                            }}
                          >
                            <option value="Fuel / Petrol">⛽ Petrol / Diesel</option>
                            <option value="Maintenance">🔧 Vehicle Repair</option>
                            <option value="Courier/Freight">📦 Courier</option>
                            <option value="Parking/Toll">🅿️ Parking / Toll</option>
                          </select>
                        )}

                        {isShop && (
                          <select
                            value={row.category || 'Tea / Snacks'}
                            onChange={(e) => handleUpdateExpenseRow(row.id, 'category', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '7px 10px',
                              borderRadius: '8px',
                              border: '1.5px solid #cbd5e1',
                              fontSize: '12.5px',
                              fontWeight: 700,
                              outline: 'none'
                            }}
                          >
                            <option value="Tea / Snacks">☕ Tea & Snacks</option>
                            <option value="Electricity">💡 Electricity</option>
                            <option value="Shop Rent">🏢 Rent</option>
                            <option value="Cleaning/Maint">🧹 Cleaning</option>
                            <option value="Stationery">📝 Stationery</option>
                            <option value="Other">📦 Other</option>
                          </select>
                        )}
                      </div>

                      {/* Payment Mode Segmented Selector (3 Buttons) */}
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '4px' }}>
                          💳 Payment Mode:
                        </label>
                        <div className="df-mode-pill-group">
                          <button
                            type="button"
                            onClick={() => handleUpdateExpenseRow(row.id, 'payment_mode', 'CASH')}
                            className={`df-mode-pill ${row.payment_mode === 'CASH' ? 'selected-cash' : ''}`}
                          >
                            <Banknote size={13} />
                            <span>CASH</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleUpdateExpenseRow(row.id, 'payment_mode', 'UPI')}
                            className={`df-mode-pill ${row.payment_mode === 'UPI' ? 'selected-upi' : ''}`}
                          >
                            <QrCode size={13} />
                            <span>UPI</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleUpdateExpenseRow(row.id, 'payment_mode', 'CREDIT')}
                            className={`df-mode-pill ${row.payment_mode === 'CREDIT' ? 'selected-credit' : ''}`}
                          >
                            <Clock size={13} />
                            <span>CREDIT</span>
                          </button>
                        </div>
                      </div>

                      {/* Amount Field */}
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: isCredit ? '#b45309' : '#be123c', marginBottom: '3px' }}>
                          💰 Amount ({currency}) *
                        </label>
                        <div style={{ position: 'relative' }}>
                          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px', fontWeight: 900, color: isCredit ? '#b45309' : '#e11d48' }}>
                            {currency}
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={row.amount || ''}
                            onChange={(e) => handleUpdateExpenseRow(row.id, 'amount', e.target.value)}
                            className="mono"
                            style={{
                              width: '100%',
                              padding: '9px 12px 9px 28px',
                              borderRadius: '9px',
                              border: '2px solid ' + (isCredit ? '#f59e0b' : '#f87171'),
                              fontSize: '18px',
                              fontWeight: 900,
                              color: isCredit ? '#b45309' : '#be123c',
                              textAlign: 'right',
                              background: isCredit ? '#fffbeb' : '#ffffff',
                              outline: 'none'
                            }}
                          />
                        </div>
                        <div style={{ fontSize: '11px', fontWeight: 800, marginTop: '4px', textAlign: 'right' }}>
                          {isCredit ? (
                            <span style={{ color: '#b45309', background: '#fef3c7', padding: '2px 6px', borderRadius: '4px' }}>
                              ⏳ Credit: Bill yet to be paid (Logged for tracking)
                            </span>
                          ) : (
                            <span style={{ color: '#059669' }}>
                              💸 Paid today ({row.payment_mode === 'UPI' ? 'via QR / soundbox' : 'from cash drawer'})
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Embedded Golden Credit Terms Drawer (when CREDIT selected) */}
                      {isCredit && (
                        <div className="df-credit-drawer">
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 900, color: '#92400e', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Calendar size={14} /> Due Date:
                            </span>
                            <input
                              type="date"
                              value={row.due_date || computeDueDate(formData.date, row.credit_days || 21)}
                              onChange={(e) => handleUpdateExpenseRow(row.id, 'due_date', e.target.value)}
                              style={{
                                padding: '5px 8px',
                                fontSize: '13px',
                                fontWeight: 800,
                                borderRadius: '6px',
                                border: '1.5px solid #f59e0b',
                                color: '#92400e',
                                background: '#ffffff',
                                outline: 'none'
                              }}
                            />
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              {[15, 21, 30, 45].map(days => (
                                <button
                                  key={days}
                                  type="button"
                                  onClick={() => {
                                    const newDue = computeDueDate(formData.date, days);
                                    handleUpdateExpenseRow(row.id, 'credit_days', days);
                                    handleUpdateExpenseRow(row.id, 'due_date', newDue);
                                  }}
                                  style={{
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    fontWeight: 900,
                                    border: (parseInt(row.credit_days) === days) ? '1.5px solid #b45309' : '1px solid #fde68a',
                                    background: (parseInt(row.credit_days) === days) ? '#fef3c7' : '#ffffff',
                                    color: '#92400e',
                                    cursor: 'pointer'
                                  }}
                                >
                                  +{days}d
                                </button>
                              ))}
                            </div>

                            {(() => {
                              const daysLeft = computeDaysLeft(row.due_date);
                              const isOverdue = daysLeft < 0;
                              const isToday = daysLeft === 0;
                              return (
                                <span style={{
                                  fontSize: '11.5px',
                                  fontWeight: 900,
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  background: isOverdue ? '#fee2e2' : (isToday ? '#fef3c7' : '#ecfdf5'),
                                  color: isOverdue ? '#b91c1c' : (isToday ? '#b45309' : '#047857'),
                                  border: '1px solid ' + (isOverdue ? '#fca5a5' : (isToday ? '#fde68a' : '#a7f3d0'))
                                }}>
                                  {isOverdue ? `⚠️ Overdue ${Math.abs(daysLeft)}d` : (isToday ? '🟠 Due Today' : `⏳ ${daysLeft}d left`)}
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                      )}

                    </div>
                  );
                })}

                {/* Mobile Bottom Expense Totals Summary */}
                <div style={{
                  padding: '12px 14px',
                  background: '#fff1f2',
                  borderRadius: '10px',
                  border: '1.5px solid #fecdd3',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#9f1239' }}>
                      Total Paid Out Today (Cash + UPI):
                    </span>
                    <span className="mono" style={{ fontSize: '18px', fontWeight: 900, color: '#be123c' }}>
                      {currency}{formTotalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  {formTotalCredit > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed #fecdd3', paddingTop: '4px' }}>
                      <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#92400e' }}>
                        ⏳ Vendor Credit (Yet to Pay):
                      </span>
                      <span className="mono" style={{ fontSize: '15px', fontWeight: 900, color: '#b45309' }}>
                        {currency}{formTotalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Add Row Button */}
              <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'flex-start' }}>
                <button
                  type="button"
                  onClick={() => handleAddExpenseRow('VENDOR')}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, padding: '8px 16px', borderRadius: '8px', border: '1.5px solid #fca5a5', background: '#fff1f2', color: '#be123c' }}
                >
                  <PlusCircle size={16} color="#e11d48" />
                  <span>+ Add Another Expense Line</span>
                </button>
              </div>

            </div>

            {/* =========================================================================
                SECTION 3: DAILY FIRM BALANCE CALCULATOR (CLOSING BALANCE)
                ========================================================================= */}
            <div className="glass-panel" style={{
              padding: '18px 20px',
              background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
              borderRadius: '16px',
              border: '2px solid #7dd3fc',
              boxShadow: '0 4px 16px rgba(2, 132, 199, 0.08)'
            }}>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <div style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  background: '#0284c7',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '15px',
                  boxShadow: '0 3px 10px rgba(2, 132, 199, 0.25)',
                  flexShrink: 0
                }}>
                  3
                </div>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 900, color: '#0369a1', margin: 0 }}>
                    🔵 Firm Balance Calculator (Starting + Inflow - Outflow = Closing)
                  </h2>
                  <div style={{ fontSize: '12px', color: '#0284c7', marginTop: '1px' }}>
                    Automatic live balance calculation for your firm's cash and bank holdings
                  </div>
                </div>
              </div>

              {/* 4 Equalizer Visual Cards */}
              <div className="df-math-equalizer" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', alignItems: 'center' }}>
                
                {/* 1. Morning Opening Balance */}
                <div style={{ padding: '14px', background: '#ffffff', borderRadius: '12px', border: '1.5px solid #bae6fd' }}>
                  <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#0369a1', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Wallet size={15} color="#0284c7" />
                    <span>1. Starting Morning ({currency})</span>
                  </div>
                  <div style={{ position: 'relative', marginTop: '6px' }}>
                    <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '15px', fontWeight: 900, color: '#0284c7' }}>
                      {currency}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.opening_balance}
                      onChange={(e) => setFormData({ ...formData, opening_balance: e.target.value })}
                      className="mono"
                      style={{
                        width: '100%',
                        padding: '8px 10px 8px 24px',
                        fontSize: '18px',
                        fontWeight: 900,
                        color: '#0369a1',
                        borderRadius: '8px',
                        border: '1.5px solid #7dd3fc',
                        outline: 'none'
                      }}
                    />
                  </div>
                  <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '4px' }}>
                    Previous night's closing cash
                  </div>
                </div>

                {/* 2. Today's Inflow (+) */}
                <div style={{ padding: '14px', background: '#ecfdf5', borderRadius: '12px', border: '1.5px solid #86efac' }}>
                  <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#065f46', textTransform: 'uppercase' }}>
                    ➕ 2. Today Received (Inflow)
                  </div>
                  <div className="mono" style={{ fontSize: '20px', fontWeight: 900, color: '#059669', marginTop: '6px' }}>
                    +{currency}{formTotalEarned.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: '10.5px', color: '#059669', marginTop: '4px', fontWeight: 700 }}>
                    Cash ({currency}{formCashEarned}) + UPI ({currency}{formUpiEarned})
                  </div>
                </div>

                {/* 3. Today's Outflow (-) */}
                <div style={{ padding: '14px', background: '#fff1f2', borderRadius: '12px', border: '1.5px solid #fecdd3' }}>
                  <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#be123c', textTransform: 'uppercase' }}>
                    ➖ 3. Today Paid Out (Outflow)
                  </div>
                  <div className="mono" style={{ fontSize: '20px', fontWeight: 900, color: '#e11d48', marginTop: '6px' }}>
                    -{currency}{formTotalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: '10.5px', color: '#be123c', marginTop: '4px', fontWeight: 700 }}>
                    Actual Cash & UPI out of drawer
                  </div>
                </div>

                {/* 4. Final Closing Balance (=) */}
                <div style={{
                  padding: '16px',
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  borderRadius: '14px',
                  color: '#ffffff',
                  boxShadow: '0 6px 20px rgba(2, 132, 199, 0.3)'
                }}>
                  <div style={{ fontSize: '11.5px', fontWeight: 900, opacity: 0.95, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    🟰 4. Closing Firm Balance
                  </div>
                  <div className="mono" style={{ fontSize: '24px', fontWeight: 900, marginTop: '2px' }}>
                    {currency}{formClosingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: '11px', opacity: 0.9, marginTop: '2px', fontWeight: 700 }}>
                    Net Day Change: {formNetChange >= 0 ? '+' : ''}{currency}{formNetChange.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>

              </div>

              {/* Wholesale Credit Note Callout */}
              {formTotalCredit > 0 && (
                <div style={{
                  marginTop: '14px',
                  padding: '10px 14px',
                  background: '#fffbeb',
                  borderRadius: '10px',
                  border: '1.5px solid #fde68a',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '12px',
                  color: '#92400e',
                  fontWeight: 700
                }}>
                  <Clock size={18} color="#d97706" style={{ flexShrink: 0 }} />
                  <div>
                    <strong>Supplier Credit Note:</strong> {currency}{formTotalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })} in wholesale bills are on credit (yet to pay). These do not reduce today's physical counter cash drawer balance and are automatically scheduled in the <strong>🏢 Vendor Bills & Credit Tracker</strong> tab.
                  </div>
                </div>
              )}

            </div>

            {/* =========================================================================
                SECTION 4: NOTES & REMARKS (OPTIONAL)
                ========================================================================= */}
            <div className="glass-panel" style={{ padding: '16px 20px', background: '#ffffff', borderRadius: '14px', border: '1px solid #cbd5e1' }}>
              <label style={{ fontSize: '12.5px', fontWeight: 800, color: 'var(--text-main)', display: 'block', marginBottom: '6px' }}>
                📝 Daily Notes & Remarks (Optional)
              </label>
              <textarea
                rows="2"
                placeholder="Type any daily remarks here (e.g. Staff advance paid, supplier invoice cleared, delivery charges)..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  outline: 'none'
                }}
              />
            </div>

            {/* =========================================================================
                SECTION 5: BIG SAVE & SUBMIT ACTION BAR
                ========================================================================= */}
            <div className="df-save-bar" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '14px',
              padding: '16px 20px',
              background: '#ffffff',
              borderRadius: '16px',
              border: '2px solid #bae6fd',
              boxShadow: '0 8px 24px rgba(0,0,0,0.05)'
            }}>
              <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#475569' }}>
                {editingRecord ? `✏️ Updating accounts for ${formData.date}` : `Ready to save accounts for ${formData.date}`}
              </div>

              <div className="df-save-btn-group" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => handleOpenNewEntry()}
                  className="btn btn-secondary"
                  style={{ padding: '12px 18px', fontWeight: 800, borderRadius: '10px', fontSize: '13.5px' }}
                  disabled={isSaving}
                >
                  🔄 Reset Form
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="df-save-btn"
                  style={{
                    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '14px 30px',
                    fontSize: '16px',
                    fontWeight: 900,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    boxShadow: '0 6px 22px rgba(5, 150, 105, 0.35)',
                    transition: 'all 0.2s',
                    letterSpacing: '0.01em'
                  }}
                >
                  <Save size={20} />
                  <span>{isSaving ? 'Saving Accounts...' : (editingRecord ? '💾 UPDATE TODAY’S ACCOUNTS' : '💾 SAVE TODAY’S ACCOUNTS')}</span>
                </button>
              </div>
            </div>

          </form>

            {/* =========================================================================
                SECTION 6: RECORDED DAILY ACCOUNTS REGISTER (ENTRY DISPLAY AFTER SUBMISSION)
                ========================================================================= */}
            <div className="glass-panel" style={{
              padding: '18px 20px',
              background: '#ffffff',
              borderRadius: '16px',
              border: '1.5px solid #bae6fd',
              boxShadow: '0 4px 18px rgba(2, 132, 199, 0.06)'
            }}>
              {/* Header */}
              <div className="df-saved-header" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                borderBottom: '1.5px solid #e0f2fe',
                paddingBottom: '14px',
                marginBottom: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '10px',
                    background: '#0284c7',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 3px 10px rgba(2, 132, 199, 0.25)',
                    flexShrink: 0
                  }}>
                    <FileSpreadsheet size={18} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 900, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>Daily Accounts Register & Recorded Entries</span>
                      <span className="badge badge-cyan" style={{ fontSize: '11px', fontWeight: 800 }}>
                        {filteredRegisterRecords.length} Days Recorded
                      </span>
                    </h3>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Complete register of saved daily accounts, inflows, vouchers, and firm balance
                    </div>
                  </div>
                </div>

                {/* Quick Search & Filter */}
                <div className="df-saved-search" style={{ position: 'relative', width: '280px' }}>
                  <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    placeholder="Search date, vendor, staff..."
                    value={registerSearchQuery}
                    onChange={(e) => setRegisterSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '7px 10px 7px 32px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12.5px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  {registerSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setRegisterSearchQuery('')}
                      style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* DESKTOP REGISTER SPREADSHEET TABLE */}
              <div className="df-table-desktop" style={{
                overflowX: 'auto',
                border: '1.5px solid #cbd5e1',
                borderRadius: '12px',
                background: '#ffffff'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                      <th style={{ padding: '12px 10px', width: '120px', fontWeight: 800, color: '#334155' }}>Date</th>
                      <th style={{ padding: '12px 10px', width: '120px', fontWeight: 800, color: '#059669', textAlign: 'right' }}>Cash In ({currency})</th>
                      <th style={{ padding: '12px 10px', width: '120px', fontWeight: 800, color: '#0284c7', textAlign: 'right' }}>UPI In ({currency})</th>
                      <th style={{ padding: '12px 10px', width: '130px', fontWeight: 800, color: '#047857', textAlign: 'right' }}>Total Inflow ({currency})</th>
                      <th style={{ padding: '12px 10px', width: '130px', fontWeight: 800, color: '#be123c', textAlign: 'right' }}>Paid Out ({currency})</th>
                      <th style={{ padding: '12px 10px', minWidth: '220px', fontWeight: 800, color: '#334155' }}>Vouchers & Breakdown</th>
                      <th style={{ padding: '12px 10px', width: '120px', fontWeight: 800, color: '#334155', textAlign: 'right' }}>Net Day (+/-)</th>
                      <th style={{ padding: '12px 10px', width: '140px', fontWeight: 800, color: '#0369a1', textAlign: 'right' }}>Firm Balance ({currency})</th>
                      <th style={{ padding: '12px 10px', width: '110px', textAlign: 'center', fontWeight: 800, color: '#334155' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRegisterRecords.length === 0 ? (
                      <tr>
                        <td colSpan="9" style={{ textAlign: 'center', padding: '36px 16px', color: '#94a3b8' }}>
                          <FileSpreadsheet size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                          <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-main)' }}>No saved records found</div>
                          <div style={{ fontSize: '12px', marginTop: '2px' }}>Fill in the entries above and click "Save Today’s Accounts"</div>
                        </td>
                      </tr>
                    ) : (
                      filteredRegisterRecords.map((r, idx) => {
                        const isSelectedDate = r.date === formData.date;
                        const netVal = parseFloat(r.net_day_change) || 0;
                        const isPositive = netVal >= 0;
                        const dateFormatted = new Date(r.date).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        });

                        const details = Array.isArray(r.payment_details) ? r.payment_details : [];
                        const vendorCount = details.filter(d => d.type === 'VENDOR' || d.type === 'Supplier').length;
                        const staffCount = details.filter(d => d.type === 'STAFF').length;
                        const vehicleCount = details.filter(d => d.type === 'VEHICLE').length;
                        const shopCount = details.filter(d => d.type === 'SHOP' || d.type === 'Expense').length;

                        return (
                          <tr
                            key={r.id || idx}
                            onClick={() => handleOpenEdit(r, true)}
                            className={isSelectedDate ? 'df-active-row' : ''}
                            style={{
                              background: isSelectedDate ? '#f0f9ff' : (idx % 2 === 0 ? '#ffffff' : '#fcfcfd'),
                              borderBottom: '1px solid #e2e8f0',
                              transition: 'background 0.15s',
                              cursor: 'pointer'
                            }}
                            title="Click row to load all income & expense vouchers for this date"
                          >
                            {/* Date */}
                            <td style={{ padding: '10px 10px', fontWeight: 800, whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Calendar size={13} color="#0284c7" />
                                <span>{dateFormatted}</span>
                              </div>
                              {isSelectedDate && (
                                <span className="badge badge-cyan" style={{ fontSize: '9.5px', marginTop: '3px', padding: '1px 5px', fontWeight: 800 }}>
                                  {editingRecord ? '✏️ Loaded in Form' : 'Active Date'}
                                </span>
                              )}
                            </td>

                            {/* Cash In */}
                            <td style={{ padding: '10px 10px', textAlign: 'right' }} className="mono">
                              <span style={{ color: '#059669', fontWeight: 800, background: '#f0fdf4', padding: '3px 7px', borderRadius: '6px' }}>
                                {currency}{parseFloat(r.cash_earned || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                            </td>

                            {/* UPI In */}
                            <td style={{ padding: '10px 10px', textAlign: 'right' }} className="mono">
                              <span style={{ color: '#0284c7', fontWeight: 800, background: '#f0f9ff', padding: '3px 7px', borderRadius: '6px' }}>
                                {currency}{parseFloat(r.upi_earned || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                            </td>

                            {/* Total Inflow */}
                            <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 900, color: '#047857' }} className="mono">
                              {currency}{parseFloat(r.total_earned || ((parseFloat(r.cash_earned) || 0) + (parseFloat(r.upi_earned) || 0))).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>

                            {/* Total Outflow */}
                            <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 900, color: '#be123c' }} className="mono">
                              {currency}{parseFloat(r.total_paid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>

                            {/* Vouchers & Expense Breakdown */}
                            <td style={{ padding: '8px 10px' }}>
                              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                                {vendorCount > 0 && (
                                  <span className="badge badge-purple" style={{ fontSize: '10.5px', padding: '2px 6px', fontWeight: 800 }}>
                                    🏢 {vendorCount} {vendorCount === 1 ? 'Vendor' : 'Vendors'}
                                  </span>
                                )}
                                {staffCount > 0 && (
                                  <span className="badge badge-cyan" style={{ fontSize: '10.5px', padding: '2px 6px', fontWeight: 800 }}>
                                    👤 {staffCount} Staff
                                  </span>
                                )}
                                {vehicleCount > 0 && (
                                  <span className="badge badge-amber" style={{ fontSize: '10.5px', padding: '2px 6px', fontWeight: 800 }}>
                                    🚗 Vehicle
                                  </span>
                                )}
                                {shopCount > 0 && (
                                  <span className="badge badge-rose" style={{ fontSize: '10.5px', padding: '2px 6px', fontWeight: 800 }}>
                                    ☕ Shop
                                  </span>
                                )}
                                {details.length === 0 && (
                                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>No line items</span>
                                )}
                              </div>
                            </td>

                            {/* Net Day Change */}
                            <td style={{ padding: '10px 10px', textAlign: 'right' }} className="mono">
                              <span style={{
                                color: isPositive ? '#059669' : '#dc2626',
                                fontWeight: 800,
                                fontSize: '12.5px'
                              }}>
                                {isPositive ? '+' : ''}{currency}{netVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                            </td>

                            {/* Closing Balance */}
                            <td style={{ padding: '10px 10px', textAlign: 'right' }} className="mono">
                              <span style={{
                                fontSize: '13px',
                                fontWeight: 900,
                                color: '#0369a1',
                                background: '#e0f2fe',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                border: '1px solid #bae6fd'
                              }}>
                                {currency}{parseFloat(r.closing_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                            </td>

                            {/* Row Action Buttons */}
                            <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEdit(r, true);
                                  }}
                                  className="btn btn-secondary btn-sm"
                                  style={{ padding: '5px 8px', color: '#0284c7', background: '#f0f9ff', border: '1px solid #bae6fd', fontWeight: 800 }}
                                  title="Edit in Register"
                                >
                                  <Edit3 size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setViewingRecord(r);
                                  }}
                                  className="btn btn-secondary btn-sm"
                                  style={{ padding: '5px 8px', color: '#475569', fontWeight: 700 }}
                                  title="View Statement Voucher"
                                >
                                  <Eye size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteRecord(r);
                                  }}
                                  className="btn btn-secondary btn-sm"
                                  style={{ padding: '5px 8px', color: '#ef4444', background: '#fef2f2', border: '1px solid #fecdd3' }}
                                  title="Delete Record"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>

                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* MOBILE RESPONSIVE REGISTER CARDS (< 769px) */}
              <div className="df-cards-mobile" style={{ marginTop: '12px' }}>
                {filteredRegisterRecords.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px 16px', background: '#f8fafc', borderRadius: '12px', color: '#94a3b8' }}>
                    <FileSpreadsheet size={28} style={{ margin: '0 auto 6px', opacity: 0.5 }} />
                    <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)' }}>No saved records found</div>
                  </div>
                ) : (
                  filteredRegisterRecords.map((r, idx) => {
                    const isSelectedDate = r.date === formData.date;
                    const netVal = parseFloat(r.net_day_change) || 0;
                    const isPositive = netVal >= 0;
                    const dateFormatted = new Date(r.date).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    });

                    const details = Array.isArray(r.payment_details) ? r.payment_details : [];
                    const vendorCount = details.filter(d => d.type === 'VENDOR' || d.type === 'Supplier').length;
                    const staffCount = details.filter(d => d.type === 'STAFF').length;
                    const vehicleCount = details.filter(d => d.type === 'VEHICLE').length;
                    const shopCount = details.filter(d => d.type === 'SHOP' || d.type === 'Expense').length;

                    return (
                      <div
                        key={r.id || idx}
                        style={{
                          background: isSelectedDate ? '#f0f9ff' : '#ffffff',
                          borderRadius: '12px',
                          border: isSelectedDate ? '2px solid #0284c7' : '1.5px solid #cbd5e1',
                          padding: '12px 14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                          boxShadow: isSelectedDate ? '0 4px 14px rgba(2, 132, 199, 0.15)' : '0 2px 6px rgba(0,0,0,0.03)'
                        }}
                      >
                        {/* Top: Date & Net Day */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Calendar size={15} color="#0284c7" />
                            <strong style={{ fontSize: '13.5px', color: 'var(--text-main)' }}>{dateFormatted}</strong>
                            {isSelectedDate && (
                              <span className="badge badge-cyan" style={{ fontSize: '10px', padding: '2px 6px', fontWeight: 800 }}>
                                Active
                              </span>
                            )}
                          </div>

                          <span style={{
                            fontSize: '12px',
                            fontWeight: 900,
                            color: isPositive ? '#059669' : '#dc2626',
                            background: isPositive ? '#ecfdf5' : '#fef2f2',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            border: '1px solid ' + (isPositive ? '#bbf7d0' : '#fecdd3')
                          }}>
                            {isPositive ? '+' : ''}{currency}{netVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>

                        {/* 4 Metrics in 2x2 Grid */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(2, 1fr)',
                          gap: '6px',
                          background: isSelectedDate ? '#ffffff' : '#f8fafc',
                          padding: '8px 10px',
                          borderRadius: '8px'
                        }}>
                          <div>
                            <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#059669', textTransform: 'uppercase' }}>💵 Cash In</div>
                            <div className="mono" style={{ fontSize: '13.5px', fontWeight: 900, color: '#059669' }}>
                              {currency}{parseFloat(r.cash_earned || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </div>
                          </div>

                          <div>
                            <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase' }}>📱 UPI In</div>
                            <div className="mono" style={{ fontSize: '13.5px', fontWeight: 900, color: '#0284c7' }}>
                              {currency}{parseFloat(r.upi_earned || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </div>
                          </div>

                          <div>
                            <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#e11d48', textTransform: 'uppercase' }}>🔴 Paid Out</div>
                            <div className="mono" style={{ fontSize: '13.5px', fontWeight: 900, color: '#e11d48' }}>
                              {currency}{parseFloat(r.total_paid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </div>
                          </div>

                          <div>
                            <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#0369a1', textTransform: 'uppercase' }}>💼 Closing Firm</div>
                            <div className="mono" style={{ fontSize: '13.5px', fontWeight: 900, color: '#0284c7' }}>
                              {currency}{parseFloat(r.closing_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                        </div>

                        {/* Expense Tags */}
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                          {vendorCount > 0 && <span className="badge badge-purple" style={{ fontSize: '10px' }}>🏢 {vendorCount} Vendors</span>}
                          {staffCount > 0 && <span className="badge badge-cyan" style={{ fontSize: '10px' }}>👤 {staffCount} Staff</span>}
                          {vehicleCount > 0 && <span className="badge badge-amber" style={{ fontSize: '10px' }}>🚗 Vehicle</span>}
                          {shopCount > 0 && <span className="badge badge-rose" style={{ fontSize: '10px' }}>☕ Shop</span>}
                        </div>

                        {/* Actions Row */}
                        <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '8px' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(r, true)}
                            className="btn btn-secondary btn-sm"
                            style={{ flex: 1, padding: '7px 10px', fontSize: '12px', fontWeight: 800, color: '#0284c7', background: '#f0f9ff', border: '1px solid #bae6fd', justifyContent: 'center' }}
                          >
                            <Edit3 size={13} /> Edit Entry
                          </button>
                          <button
                            type="button"
                            onClick={() => setViewingRecord(r)}
                            className="btn btn-secondary btn-sm"
                            style={{ flex: 1, padding: '7px 10px', fontSize: '12px', fontWeight: 700, justifyContent: 'center' }}
                          >
                            <Eye size={13} /> Voucher
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRecord(r)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '7px 10px', color: '#ef4444', background: '#fef2f2', border: '1px solid #fecdd3' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

        </div>
      )}

      {/* =========================================================================
          VIEW 2: VENDOR BILLS & CREDIT TRACKER (WHOLESALE PURCHASES & DUES)
          ========================================================================= */}
      {activeViewMode === 'vendor_bills' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
          
          {/* 4 TOP KPI CARDS: SUMMARY OF WHOLESALE BILLS & DUES */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '14px'
          }}>
            
            {/* 1. Total Invoiced Bills */}
            <div className="glass-panel" style={{
              padding: '16px 18px',
              background: '#ffffff',
              borderRadius: '14px',
              border: '1.5px solid #d8b4fe',
              boxShadow: '0 4px 14px rgba(168, 85, 247, 0.08)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#7e22ce', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Total Invoiced Purchases
                </span>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#faf5ff', color: '#7e22ce', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={18} />
                </div>
              </div>
              <div className="mono" style={{ fontSize: '22px', fontWeight: 900, color: '#6b21a8', marginTop: '6px' }}>
                {currency}{parseFloat(vendorBillsSummary?.total_invoiced_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '12px', color: '#9333ea', marginTop: '4px', fontWeight: 700 }}>
                {vendorBillsSummary?.total_vendor_bills || 0} Total Wholesale Bills Logged
              </div>
            </div>

            {/* 2. Paid to Suppliers */}
            <div className="glass-panel" style={{
              padding: '16px 18px',
              background: '#ffffff',
              borderRadius: '14px',
              border: '1.5px solid #86efac',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.08)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#047857', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Total Paid to Vendors
                </span>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f0fdf4', color: '#047857', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle2 size={18} />
                </div>
              </div>
              <div className="mono" style={{ fontSize: '22px', fontWeight: 900, color: '#047857', marginTop: '6px' }}>
                {currency}{parseFloat(vendorBillsSummary?.total_paid_to_vendors || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '12px', color: '#059669', marginTop: '4px', fontWeight: 700 }}>
                {vendorBillsSummary?.paid_bills_count || 0} Bills Cleared (100% Settled)
              </div>
            </div>

            {/* 3. Pending Vendor Dues */}
            <div className="glass-panel" style={{
              padding: '16px 18px',
              background: '#ffffff',
              borderRadius: '14px',
              border: '1.5px solid #fde68a',
              boxShadow: '0 4px 14px rgba(245, 158, 11, 0.08)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Outstanding Balance Due
                </span>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fffbeb', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Clock size={18} />
                </div>
              </div>
              <div className="mono" style={{ fontSize: '22px', fontWeight: 900, color: '#b45309', marginTop: '6px' }}>
                {currency}{parseFloat(vendorBillsSummary?.total_pending_due || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '12px', color: '#d97706', marginTop: '4px', fontWeight: 700 }}>
                {vendorBillsSummary?.pending_bills_count || 0} Bills Pending Settlement
              </div>
            </div>

            {/* 4. Overdue & Alerts */}
            <div className="glass-panel" style={{
              padding: '16px 18px',
              background: '#ffffff',
              borderRadius: '14px',
              border: '1.5px solid #fca5a5',
              boxShadow: '0 4px 14px rgba(239, 68, 68, 0.08)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Overdue & Due Soon
                </span>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertTriangle size={18} />
                </div>
              </div>
              <div className="mono" style={{ fontSize: '22px', fontWeight: 900, color: '#dc2626', marginTop: '6px' }}>
                {currency}{parseFloat(vendorBillsSummary?.overdue_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', fontWeight: 700 }}>
                {vendorBillsSummary?.overdue_bills_count || 0} Overdue • {vendorBillsSummary?.upcoming_due_7days_count || 0} Due This Week
              </div>
            </div>

          </div>

          {/* ACTION TOOLBAR: FILTERS, SEARCH, SUPPLIER DROPDOWN, ADD BUTTON */}
          <div className="glass-panel" style={{
            padding: '16px 20px',
            background: '#ffffff',
            borderRadius: '16px',
            border: '1.5px solid #cbd5e1',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}>
            
            {/* Top Toolbar Row */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              
              {/* Filter Pills */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => setVendorBillsFilter('ALL')}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1.5px solid ' + (vendorBillsFilter === 'ALL' ? '#7c3aed' : '#e2e8f0'),
                    background: vendorBillsFilter === 'ALL' ? '#f5f3ff' : '#ffffff',
                    color: vendorBillsFilter === 'ALL' ? '#6d28d9' : '#64748b',
                    fontWeight: 800,
                    fontSize: '12.5px',
                    cursor: 'pointer'
                  }}
                >
                  All Bills ({vendorBillsSummary?.total_vendor_bills || 0})
                </button>

                <button
                  type="button"
                  onClick={() => setVendorBillsFilter('OVERDUE')}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1.5px solid ' + (vendorBillsFilter === 'OVERDUE' ? '#ef4444' : '#e2e8f0'),
                    background: vendorBillsFilter === 'OVERDUE' ? '#fef2f2' : '#ffffff',
                    color: vendorBillsFilter === 'OVERDUE' ? '#dc2626' : '#64748b',
                    fontWeight: 800,
                    fontSize: '12.5px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <AlertTriangle size={14} />
                  <span>🔴 Overdue ({vendorBillsSummary?.overdue_bills_count || 0})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setVendorBillsFilter('PENDING')}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1.5px solid ' + (vendorBillsFilter === 'PENDING' ? '#f59e0b' : '#e2e8f0'),
                    background: vendorBillsFilter === 'PENDING' ? '#fffbeb' : '#ffffff',
                    color: vendorBillsFilter === 'PENDING' ? '#b45309' : '#64748b',
                    fontWeight: 800,
                    fontSize: '12.5px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Clock size={14} />
                  <span>🟡 Pending / Due ({vendorBillsSummary?.pending_bills_count || 0})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setVendorBillsFilter('PAID')}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1.5px solid ' + (vendorBillsFilter === 'PAID' ? '#10b981' : '#e2e8f0'),
                    background: vendorBillsFilter === 'PAID' ? '#ecfdf5' : '#ffffff',
                    color: vendorBillsFilter === 'PAID' ? '#047857' : '#64748b',
                    fontWeight: 800,
                    fontSize: '12.5px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <CheckCircle2 size={14} />
                  <span>🟢 Paid & Cleared ({vendorBillsSummary?.paid_bills_count || 0})</span>
                </button>
              </div>

              {/* Primary Action Button */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => loadVendorBills()}
                  disabled={vendorBillsLoading}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '9px 12px', fontWeight: 800, borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  title="Refresh bills list"
                >
                  <RefreshCw size={15} className={vendorBillsLoading ? 'animate-spin' : ''} />
                  <span>Refresh</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenAddBill}
                  style={{
                    background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '10px 18px',
                    fontSize: '13.5px',
                    fontWeight: 900,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 14px rgba(124, 58, 237, 0.3)'
                  }}
                >
                  <Plus size={16} />
                  <span>+ Add Wholesale Bill</span>
                </button>
              </div>

            </div>

            {/* Bottom Toolbar Row: Supplier Dropdown + Search Box */}
            <div style={{
              display: 'flex',
              gap: '10px',
              flexWrap: 'wrap',
              alignItems: 'center'
            }}>
              {/* Supplier Filter */}
              <div style={{ minWidth: '220px', flex: '0 0 auto' }}>
                <select
                  value={selectedSupplierFilter}
                  onChange={(e) => setSelectedSupplierFilter(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13px',
                    fontWeight: 700,
                    background: '#ffffff',
                    color: '#1e293b',
                    outline: 'none'
                  }}
                >
                  <option value="">-- All Suppliers / Wholesalers --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Search Box */}
              <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Search by Bill #, Supplier Name, GSTIN, Notes..."
                  value={vendorBillSearch}
                  onChange={(e) => setVendorBillSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadVendorBills()}
                  style={{
                    width: '100%',
                    padding: '9px 12px 9px 36px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>

              {vendorBillSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setVendorBillSearch('');
                    loadVendorBills();
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '8px 12px', fontWeight: 700 }}
                >
                  Clear Search
                </button>
              )}
            </div>

          </div>

          {/* =========================================================================
              DESKTOP TABLE VIEW (>= 769px)
              ========================================================================= */}
          <div className="df-table-desktop" style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1.5px solid #cbd5e1',
            overflowX: 'auto',
            boxShadow: '0 4px 16px rgba(0,0,0,0.04)'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                  <th style={{ padding: '12px 10px', width: '40px', textAlign: 'center', fontWeight: 800, color: '#334155' }}>#</th>
                  <th style={{ padding: '12px 12px', minWidth: '200px', fontWeight: 800, color: '#334155' }}>Supplier / Wholesaler</th>
                  <th style={{ padding: '12px 10px', width: '150px', fontWeight: 800, color: '#334155' }}>Invoice # & Date</th>
                  <th style={{ padding: '12px 10px', width: '160px', fontWeight: 800, color: '#334155' }}>Credit Terms & Due Date</th>
                  <th style={{ padding: '12px 10px', width: '170px', fontWeight: 800, color: '#334155' }}>Credit Days Left / Status</th>
                  <th style={{ padding: '12px 10px', width: '130px', fontWeight: 800, color: '#334155', textAlign: 'right' }}>Total Bill ({currency})</th>
                  <th style={{ padding: '12px 12px', width: '160px', fontWeight: 800, color: '#be123c', textAlign: 'right' }}>Paid / Balance Due ({currency})</th>
                  <th style={{ padding: '12px 10px', width: '180px', textAlign: 'center', fontWeight: 800, color: '#334155' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {vendorBillsLoading ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '40px 16px', color: '#64748b' }}>
                      <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                      <div>Loading wholesale bills...</div>
                    </td>
                  </tr>
                ) : vendorBills.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '50px 16px', color: '#94a3b8' }}>
                      <Building2 size={36} style={{ margin: '0 auto 10px', opacity: 0.5, color: '#6d28d9' }} />
                      <div style={{ fontSize: '15px', fontWeight: 800, color: '#334155' }}>No wholesale supplier bills found</div>
                      <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '4px' }}>
                        {vendorBillsFilter !== 'ALL' || selectedSupplierFilter || vendorBillSearch 
                          ? 'Try changing or clearing your filters' 
                          : 'Click below to add your first wholesale supplier bill & track credit days'}
                      </div>
                      <button
                        type="button"
                        onClick={handleOpenAddBill}
                        style={{
                          marginTop: '14px',
                          padding: '9px 18px',
                          borderRadius: '8px',
                          background: '#7c3aed',
                          color: '#ffffff',
                          border: 'none',
                          fontWeight: 800,
                          fontSize: '13px',
                          cursor: 'pointer'
                        }}
                      >
                        + Add Wholesale Bill
                      </button>
                    </td>
                  </tr>
                ) : (
                  vendorBills.map((b, index) => {
                    const isFullyPaid = b.status === 'PAID' || parseFloat(b.balance_due) <= 0;
                    const isOverdue = b.is_overdue || b.days_left < 0;
                    const rowBg = index % 2 === 0 ? '#ffffff' : '#fcfcfd';

                    return (
                      <tr
                        key={b.id || index}
                        onClick={() => handleOpenBillHistory(b)}
                        style={{
                          background: isOverdue && !isFullyPaid ? '#fff1f2' : rowBg,
                          borderBottom: '1px solid #e2e8f0',
                          cursor: 'pointer'
                        }}
                        title="Click to view payment installments history"
                      >
                        {/* 1. Index */}
                        <td style={{ textAlign: 'center', fontWeight: 800, color: '#64748b', padding: '12px 4px' }}>
                          {index + 1}
                        </td>

                        {/* 2. Supplier Info */}
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              background: '#f3e8ff',
                              color: '#7e22ce',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 900,
                              fontSize: '14px',
                              flexShrink: 0
                            }}>
                              🏢
                            </div>
                            <div>
                              <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '13.5px' }}>
                                {b.supplier_name}
                              </div>
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px', fontSize: '11px', color: '#64748b' }}>
                                {b.supplier_phone && <span>📞 {b.supplier_phone}</span>}
                                {b.supplier_gstin && <span className="badge badge-gray mono" style={{ fontSize: '10px' }}>GST: {b.supplier_gstin}</span>}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 3. Invoice Number & Date */}
                        <td style={{ padding: '10px 10px' }}>
                          <div style={{ fontWeight: 800, color: '#0369a1', fontSize: '13px' }} className="mono">
                            #{b.bill_number}
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                            {new Date(b.bill_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                        </td>

                        {/* 4. Credit Terms & Due Date */}
                        <td style={{ padding: '10px 10px' }}>
                          <div style={{ fontWeight: 700, color: '#334155', fontSize: '12.5px' }}>
                            {b.credit_days} Days Credit
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#475569', marginTop: '2px' }}>
                            Due: <strong>{new Date(b.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>
                          </div>
                        </td>

                        {/* 5. Credit Days Left / Status Badge */}
                        <td style={{ padding: '10px 10px' }}>
                          {isFullyPaid ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '4px 10px',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: 800,
                              background: '#ecfdf5',
                              color: '#059669',
                              border: '1px solid #a7f3d0'
                            }}>
                              <CheckCircle size={14} /> Paid & Cleared
                            </span>
                          ) : isOverdue ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '4px 10px',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: 900,
                              background: '#fef2f2',
                              color: '#dc2626',
                              border: '1.5px solid #fca5a5'
                            }}>
                              <AlertTriangle size={14} /> Overdue by {Math.abs(b.days_left)} Days
                            </span>
                          ) : b.days_left === 0 ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '4px 10px',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: 900,
                              background: '#fffbeb',
                              color: '#b45309',
                              border: '1.5px solid #fde68a'
                            }}>
                              <Clock size={14} /> Due Today!
                            </span>
                          ) : b.days_left <= 5 ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '4px 10px',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: 800,
                              background: '#fffbeb',
                              color: '#d97706',
                              border: '1px solid #fde68a'
                            }}>
                              <Clock size={14} /> Due in {b.days_left} Days
                            </span>
                          ) : (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '4px 10px',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: 800,
                              background: '#f0f9ff',
                              color: '#0284c7',
                              border: '1px solid #bae6fd'
                            }}>
                              <Clock size={14} /> {b.days_left} Days Left
                            </span>
                          )}
                        </td>

                        {/* 6. Total Amount */}
                        <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 900, color: '#1e293b', fontSize: '14.5px' }} className="mono">
                          {currency}{parseFloat(b.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>

                        {/* 7. Paid & Balance Due */}
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          <div style={{ fontSize: '11.5px', color: '#059669', fontWeight: 700 }} className="mono">
                            Paid: {currency}{parseFloat(b.paid_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </div>
                          <div style={{
                            fontSize: '14.5px',
                            fontWeight: 900,
                            color: parseFloat(b.balance_due) > 0 ? '#dc2626' : '#059669',
                            marginTop: '2px'
                          }} className="mono">
                            Due: {currency}{parseFloat(b.balance_due || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </div>
                        </td>

                        {/* 8. Actions */}
                        <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                            
                            {/* 1-Click Pay / Settle Button */}
                            {!isFullyPaid ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenRecordPayment(b);
                                }}
                                style={{
                                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '6px',
                                  padding: '5px 9px',
                                  fontSize: '11.5px',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)'
                                }}
                                title="Record payment installment or full settlement"
                              >
                                <Banknote size={13} /> Settle
                              </button>
                            ) : (
                              <span style={{ fontSize: '11px', color: '#059669', fontWeight: 800, padding: '4px 6px' }}>
                                Cleared
                              </span>
                            )}

                            {/* View History Ledger */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenBillHistory(b);
                              }}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '5px 7px', color: '#7c3aed', background: '#faf5ff', border: '1px solid #d8b4fe' }}
                              title="View payment installments history"
                            >
                              <Receipt size={13} />
                            </button>

                            {/* Edit Bill */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditBill(b);
                              }}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '5px 7px', color: '#0284c7' }}
                              title="Edit Bill Details"
                            >
                              <Edit3 size={13} />
                            </button>

                            {/* Delete Bill */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteBill(b);
                              }}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '5px 7px', color: '#dc2626', background: '#fef2f2', border: '1px solid #fecdd3' }}
                              title="Delete Bill"
                            >
                              <Trash2 size={13} />
                            </button>

                          </div>
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* =========================================================================
              MOBILE CARDS VIEW (< 769px)
              ========================================================================= */}
          <div className="df-cards-mobile">
            {vendorBillsLoading ? (
              <div style={{ textAlign: 'center', padding: '30px 16px', color: '#64748b' }}>
                <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                <div>Loading wholesale bills...</div>
              </div>
            ) : vendorBills.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 16px', background: '#ffffff', borderRadius: '12px', color: '#94a3b8' }}>
                <Building2 size={30} style={{ margin: '0 auto 6px', opacity: 0.5, color: '#7c3aed' }} />
                <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#1e293b' }}>No wholesale supplier bills found</div>
              </div>
            ) : (
              vendorBills.map((b, idx) => {
                const isFullyPaid = b.status === 'PAID' || parseFloat(b.balance_due) <= 0;
                const isOverdue = b.is_overdue || b.days_left < 0;

                return (
                  <div
                    key={b.id || idx}
                    style={{
                      background: isOverdue && !isFullyPaid ? '#fff1f2' : '#ffffff',
                      borderRadius: '14px',
                      border: isOverdue && !isFullyPaid ? '1.5px solid #fca5a5' : '1.5px solid #cbd5e1',
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                    }}
                  >
                    {/* Top: Supplier & Status Badge */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 900, color: '#1e293b' }}>
                          🏢 {b.supplier_name}
                        </div>
                        <div style={{ fontSize: '12px', color: '#0369a1', fontWeight: 700, marginTop: '1px' }} className="mono">
                          Bill #{b.bill_number} • {new Date(b.bill_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div>
                        {isFullyPaid ? (
                          <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800, background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }}>
                            ✅ Paid
                          </span>
                        ) : isOverdue ? (
                          <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 900, background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5' }}>
                            🔴 Overdue {Math.abs(b.days_left)}d
                          </span>
                        ) : (
                          <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800, background: '#f0f9ff', color: '#0284c7', border: '1px solid #bae6fd' }}>
                            ⏳ {b.days_left}d Left
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle: Amount Breakdown Grid */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '6px',
                      background: '#f8fafc',
                      padding: '8px 10px',
                      borderRadius: '10px'
                    }}>
                      <div>
                        <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Total Bill</div>
                        <div style={{ fontSize: '13px', fontWeight: 900, color: '#1e293b' }} className="mono">
                          {currency}{parseFloat(b.total_amount || 0).toLocaleString('en-IN')}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: '#059669', fontWeight: 700, textTransform: 'uppercase' }}>Paid</div>
                        <div style={{ fontSize: '13px', fontWeight: 900, color: '#059669' }} className="mono">
                          {currency}{parseFloat(b.paid_amount || 0).toLocaleString('en-IN')}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: '#dc2626', fontWeight: 700, textTransform: 'uppercase' }}>Balance Due</div>
                        <div style={{ fontSize: '13px', fontWeight: 900, color: parseFloat(b.balance_due) > 0 ? '#dc2626' : '#059669' }} className="mono">
                          {currency}{parseFloat(b.balance_due || 0).toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>

                    {/* Due Date Details */}
                    <div style={{ fontSize: '11.5px', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Credit: <strong>{b.credit_days} Days</strong></span>
                      <span>Due: <strong>{new Date(b.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></span>
                    </div>

                    {/* Action Buttons Row */}
                    <div style={{ display: 'flex', gap: '6px', marginTop: '4px', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                      {!isFullyPaid ? (
                        <button
                          type="button"
                          onClick={() => handleOpenRecordPayment(b)}
                          style={{
                            flex: 1.5,
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '8px 10px',
                            fontSize: '12px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                          }}
                        >
                          <Banknote size={14} /> Pay / Settle
                        </button>
                      ) : (
                        <div style={{ flex: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, color: '#059669' }}>
                          ✅ Fully Cleared
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenBillHistory(b)}
                        className="btn btn-secondary btn-sm"
                        style={{ flex: 1, padding: '7px 8px', fontSize: '11.5px', fontWeight: 700, justifyContent: 'center', color: '#7c3aed' }}
                      >
                        <Receipt size={13} /> History
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEditBill(b)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '7px 8px' }}
                      >
                        <Edit3 size={13} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteBill(b)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '7px 8px', color: '#dc2626' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                  </div>
                );
              })
            )}
          </div>

        </div>
      )}

      {/* =========================================================================
          VIEW 3: HISTORY LEDGER & REPORTS (CHRONOLOGICAL RECORDS + EXCEL + PRINT)
          ========================================================================= */}
      {activeViewMode === 'ledger' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
          
          {/* Top Controls: Search, Month, Excel Export */}
          <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            
            {/* Search Input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '240px', flex: 1 }}>
              <div style={{ position: 'relative', width: '100%', maxWidth: '360px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Search vendor, staff, charge code, remarks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadFinanceData()}
                  className="input-field"
                  style={{ paddingLeft: '36px', fontSize: '13px', height: '40px' }}
                />
              </div>
            </div>

            {/* Filter & Export Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              
              {/* Month Selector */}
              <select
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  setStartDate('');
                  setEndDate('');
                }}
                className="input-field"
                style={{ width: '130px', fontSize: '12.5px', height: '40px' }}
              >
                <option value="">All Months</option>
                <option value="1">January</option>
                <option value="2">February</option>
                <option value="3">March</option>
                <option value="4">April</option>
                <option value="5">May</option>
                <option value="6">June</option>
                <option value="7">July</option>
                <option value="8">August</option>
                <option value="9">September</option>
                <option value="10">October</option>
                <option value="11">November</option>
                <option value="12">December</option>
              </select>

              {/* Year Selector */}
              {selectedMonth && (
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="input-field"
                  style={{ width: '90px', fontSize: '12.5px', height: '40px' }}
                >
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                  <option value="2027">2027</option>
                </select>
              )}

              {/* Export Excel Button */}
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={exportingExcel}
                className="btn btn-secondary"
                style={{ height: '40px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
              >
                <FileSpreadsheet size={16} color="#059669" />
                <span>{exportingExcel ? 'Exporting...' : 'Export Excel'}</span>
              </button>

              {/* Add New Day Button */}
              <button
                type="button"
                onClick={() => handleOpenNewEntry()}
                className="btn btn-primary"
                style={{ height: '40px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800 }}
              >
                <PlusCircle size={16} />
                <span>+ Record Day</span>
              </button>

            </div>
          </div>

          {/* Visual Analytics Chart */}
          {chartData.length > 0 && (
            <div className="glass-panel" style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                    Daily Cash Inflow, UPI Inflow & Expense Trend
                  </h3>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    Visual day-by-day comparison of intake vs payouts
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span className="badge badge-emerald">Cash In</span>
                  <span className="badge badge-cyan">UPI In</span>
                  <span className="badge badge-rose">Paid Out</span>
                  <span className="badge badge-purple">Firm Balance</span>
                </div>
              </div>

              <div style={{ height: '220px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" opacity={0.6} />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => `${currency}${Math.abs(v) >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                    <Tooltip 
                      contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} 
                      formatter={(value, name) => [`${currency}${parseFloat(value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, name]}
                      labelFormatter={(label, payload) => payload?.[0]?.payload?.fullDate || label}
                    />
                    <Bar dataKey="cash" name="Cash Received" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30} />
                    <Bar dataKey="upi" name="UPI Received" fill="#0284c7" radius={[4, 4, 0, 0]} maxBarSize={30} />
                    <Bar dataKey="paid" name="Money Paid" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={30} />
                    <Line type="monotone" dataKey="balance" name="Firm Balance" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Main Ledger Table */}
          <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Receipt size={17} color="#0284c7" />
                <span>Financial Ledger History</span>
                <span className="badge badge-gray" style={{ fontSize: '11px' }}>{records.length} Recorded Days</span>
              </div>
            </div>

            <div className="data-table-container" style={{ maxHeight: '600px', overflowY: 'auto' }}>
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ width: '140px', padding: '12px 14px', fontWeight: 800, color: '#334155' }}>Date</th>
                    <th style={{ textAlign: 'right', padding: '12px 14px', fontWeight: 800, color: '#0284c7' }}>Daily Sales ({currency})</th>
                    <th style={{ textAlign: 'right', padding: '12px 14px', fontWeight: 800, color: '#be123c' }}>Daily Total Expense ({currency})</th>
                    <th style={{ textAlign: 'right', padding: '12px 14px', fontWeight: 800, color: '#0369a1' }}>Closing Balance ({currency})</th>
                    <th style={{ textAlign: 'center', width: '120px', padding: '12px 10px', fontWeight: 800, color: '#334155' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                        <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                        <div>Loading accounts ledger...</div>
                      </td>
                    </tr>
                  ) : records.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '50px 20px', color: '#94a3b8' }}>
                        <Landmark size={36} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                        <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)' }}>No accounts records yet</div>
                        <div style={{ fontSize: '12px', marginTop: '4px' }}>Click below to record today's daily accounts & expenses</div>
                        <button
                          type="button"
                          onClick={() => handleOpenNewEntry()}
                          className="btn btn-primary btn-sm"
                          style={{ marginTop: '14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                          <PlusCircle size={14} /> Record Today's Accounts
                        </button>
                      </td>
                    </tr>
                  ) : (
                    records.map((r, idx) => {
                      const dateFormatted = new Date(r.date).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      });

                      return (
                        <tr
                          key={r.id || idx}
                          onClick={() => handleOpenEdit(r, true)}
                          style={{
                            cursor: 'pointer',
                            background: idx % 2 === 0 ? '#ffffff' : '#fcfcfd',
                            borderBottom: '1px solid #e2e8f0',
                            transition: 'background 0.15s'
                          }}
                          title="Click row to edit accounts for this date"
                        >
                          {/* 1. Date */}
                          <td style={{ fontWeight: 800, color: 'var(--text-main)', whiteSpace: 'nowrap', padding: '12px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Calendar size={14} color="#0284c7" />
                              <span>{dateFormatted}</span>
                            </div>
                          </td>

                          {/* 2. Daily Sales */}
                          <td style={{ textAlign: 'right', fontWeight: 800, color: '#0284c7', padding: '12px 14px' }} className="mono">
                            {currency}{parseFloat(r.daily_sales || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>

                          {/* 3. Daily Total Expense */}
                          <td style={{ textAlign: 'right', fontWeight: 900, color: '#be123c', padding: '12px 14px' }} className="mono">
                            <span style={{ background: '#fff1f2', padding: '4px 9px', borderRadius: '6px', border: '1px solid #fecdd3' }}>
                              {currency}{parseFloat(r.total_paid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </td>

                          {/* 4. Closing Balance */}
                          <td style={{ textAlign: 'right', padding: '12px 14px' }} className="mono">
                            <span style={{
                              fontSize: '13.5px',
                              fontWeight: 900,
                              color: '#0369a1',
                              background: '#e0f2fe',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              border: '1.5px solid #bae6fd'
                            }}>
                              {currency}{parseFloat(r.closing_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </td>

                          {/* 5. Actions */}
                          <td style={{ textAlign: 'center', padding: '12px 10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setViewingRecord(r);
                                }}
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '5px 8px', color: '#0284c7', background: '#f0f9ff', border: '1px solid #bae6fd' }}
                                title="View Statement Voucher"
                              >
                                <Eye size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEdit(r, true);
                                }}
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '5px 8px', color: '#059669', background: '#f0fdf4', border: '1px solid #bbf7d0', fontWeight: 800 }}
                                title="Edit in Table Register"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteRecord(r);
                                }}
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '5px 8px', color: '#ef4444', background: '#fef2f2', border: '1px solid #fecdd3' }}
                                title="Delete Record"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* =========================================================================
          VIEW MODAL: PRINTABLE DAY CLOSE VOUCHER / STATEMENT
          ========================================================================= */}
      {viewingRecord && (
        <div className="modal-backdrop" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div className="modal-panel" style={{
            background: 'var(--bg-card)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '640px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
            border: '1px solid var(--border-subtle)',
            overflow: 'hidden'
          }}>
            
            {/* Voucher Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-subtle)',
              background: '#0f172a',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 900, letterSpacing: '0.02em' }}>
                  {profile?.name || 'TOP MEDICAL PHARMACY'}
                </div>
                <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '2px' }}>
                  Daily Financial Statement & Expense Settlement Voucher
                </div>
              </div>
              <button
                onClick={() => setViewingRecord(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Voucher Content */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-subtle)', paddingBottom: '10px' }}>
                <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>Date of Record:</span>
                <strong style={{ fontSize: '14px', color: 'var(--text-main)' }}>
                  {new Date(viewingRecord.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                </strong>
              </div>

              {/* Inflow Breakdown */}
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '12px 14px' }}>
                <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#059669', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Money Inflows (Earned)
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '4px' }}>
                  <span style={{ color: '#475569' }}>Total Gross Sales:</span>
                  <span className="mono" style={{ fontWeight: 700 }}>{currency}{parseFloat(viewingRecord.daily_sales || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '4px' }}>
                  <span style={{ color: '#059669', fontWeight: 700 }}>• Cash Received:</span>
                  <span className="mono" style={{ fontWeight: 800, color: '#059669' }}>{currency}{parseFloat(viewingRecord.cash_earned || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '4px' }}>
                  <span style={{ color: '#0284c7', fontWeight: 700 }}>• UPI Received:</span>
                  <span className="mono" style={{ fontWeight: 800, color: '#0284c7' }}>{currency}{parseFloat(viewingRecord.upi_earned || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', fontWeight: 900, borderTop: '1px solid #bbf7d0', paddingTop: '6px', marginTop: '6px' }}>
                  <span>Total Money Earned:</span>
                  <span className="mono" style={{ color: '#059669' }}>{currency}{parseFloat(viewingRecord.total_earned || (parseFloat(viewingRecord.cash_earned||0)+parseFloat(viewingRecord.upi_earned||0))).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Outflow Breakdown */}
              <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '10px', padding: '12px 14px' }}>
                <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#e11d48', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Money Outflows (Disbursements)
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '4px' }}>
                  <span style={{ color: '#475569' }}>• Vendor / Supplier Payouts:</span>
                  <span className="mono">{currency}{parseFloat(viewingRecord.supplier_payments || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '4px' }}>
                  <span style={{ color: '#475569' }}>• Staff Expenses (Charge Code Mapped):</span>
                  <span className="mono">{currency}{parseFloat(viewingRecord.staff_expenses || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '4px' }}>
                  <span style={{ color: '#475569' }}>• Vehicle & Fuel Expenses:</span>
                  <span className="mono">{currency}{parseFloat(viewingRecord.vehicle_expenses || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '4px' }}>
                  <span style={{ color: '#475569' }}>• Shop & Operating Expenses:</span>
                  <span className="mono">{currency}{parseFloat(viewingRecord.expenses || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', fontWeight: 900, borderTop: '1px solid #fecdd3', paddingTop: '6px', marginTop: '6px' }}>
                  <span style={{ color: '#e11d48' }}>Total Money Paid:</span>
                  <span className="mono" style={{ color: '#e11d48' }}>{currency}{parseFloat(viewingRecord.total_paid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Itemized Entries List */}
              {Array.isArray(viewingRecord.payment_details) && viewingRecord.payment_details.length > 0 && (
                <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '12px 14px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>
                    Itemized Payment Entries ({viewingRecord.payment_details.length}):
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {viewingRecord.payment_details.map((it, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '6px 10px', background: 'var(--bg-main)', borderRadius: '8px', alignItems: 'center' }}>
                        <div>
                          <strong style={{ color: 'var(--text-main)' }}>
                            {it.type === 'VENDOR' ? '🏢 ' : (it.type === 'STAFF' ? '👤 ' : (it.type === 'VEHICLE' ? '🚗 ' : '☕ '))}
                            {it.recipient || it.staff_name || it.vehicle_info || it.category || 'Expense'}
                          </strong>
                          {it.charge_code && (
                            <span className="badge badge-cyan mono" style={{ fontSize: '10.5px', marginLeft: '6px', fontWeight: 800 }}>
                              [{it.charge_code}]
                            </span>
                          )}
                          {it.purpose && (
                            <span style={{ color: '#64748b', fontSize: '11px', marginLeft: '6px' }}>
                              ({it.purpose})
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="badge badge-gray" style={{ fontSize: '10px' }}>{it.payment_mode || 'CASH'}</span>
                          <span className="mono" style={{ fontWeight: 800, color: '#e11d48' }}>
                            {currency}{parseFloat(it.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Firm Balances */}
              <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '10px', padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '4px' }}>
                  <span style={{ color: '#475569' }}>Opening Balance:</span>
                  <span className="mono">{currency}{parseFloat(viewingRecord.opening_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '4px' }}>
                  <span style={{ color: '#475569' }}>Net Day Change:</span>
                  <span className="mono" style={{ fontWeight: 800, color: parseFloat(viewingRecord.net_day_change) >= 0 ? '#059669' : '#e11d48' }}>
                    {parseFloat(viewingRecord.net_day_change) >= 0 ? '+' : ''}{currency}{parseFloat(viewingRecord.net_day_change || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14.5px', fontWeight: 900, borderTop: '1px solid #bae6fd', paddingTop: '8px', marginTop: '6px' }}>
                  <span style={{ color: '#0369a1' }}>Closing Balance in Firm:</span>
                  <span className="mono" style={{ color: '#0284c7', fontSize: '17px' }}>{currency}{parseFloat(viewingRecord.closing_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Remarks */}
              {viewingRecord.notes && (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'var(--bg-main)', padding: '8px 12px', borderRadius: '6px' }}>
                  <strong>Notes:</strong> {viewingRecord.notes}
                </div>
              )}
            </div>

            {/* Voucher Footer */}
            <div style={{
              padding: '14px 20px',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--bg-card)'
            }}>
              <button
                onClick={() => {
                  const rec = viewingRecord;
                  setViewingRecord(null);
                  handleOpenEdit(rec, true);
                }}
                className="btn btn-secondary btn-sm"
                style={{ fontWeight: 700 }}
              >
                <Edit3 size={14} /> Edit in Register
              </button>

              <button
                onClick={() => window.print()}
                className="btn btn-primary btn-sm"
                style={{ fontWeight: 800 }}
              >
                <Printer size={15} /> Print Voucher
              </button>
            </div>

          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: ADD / EDIT WHOLESALE SUPPLIER BILL
          ========================================================================= */}
      {isAddBillModalOpen && (
        <div className="modal-backdrop" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div className="modal-panel" style={{
            background: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '560px',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
            border: '1.5px solid #d8b4fe',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={20} />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900 }}>
                  {editingBill ? 'Edit Wholesale Supplier Bill' : 'Add Wholesale Supplier Bill'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddBillModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveBill} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto' }}>
              
              {/* Supplier Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                  🏢 Supplier / Wholesaler Name *
                </label>
                {suppliers.length > 0 && (
                  <select
                    value={billFormData.supplier}
                    onChange={(e) => {
                      const suppId = e.target.value;
                      if (!suppId) {
                        setBillFormData(prev => ({ ...prev, supplier: '', supplier_name: '', supplier_phone: '', supplier_gstin: '' }));
                        return;
                      }
                      const supp = suppliers.find(s => s.id.toString() === suppId.toString());
                      if (supp) {
                        setBillFormData(prev => ({
                          ...prev,
                          supplier: supp.id,
                          supplier_name: supp.name,
                          supplier_phone: supp.phone || '',
                          supplier_gstin: supp.gstin || ''
                        }));
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '13px',
                      fontWeight: 700,
                      marginBottom: '6px',
                      background: '#f8fafc',
                      outline: 'none'
                    }}
                  >
                    <option value="">-- Choose from Registered Suppliers --</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name} {s.phone ? `(${s.phone})` : ''}</option>
                    ))}
                  </select>
                )}
                <input
                  type="text"
                  required
                  placeholder="Or enter custom Supplier Name"
                  value={billFormData.supplier_name}
                  onChange={(e) => setBillFormData({ ...billFormData, supplier_name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13px',
                    fontWeight: 700,
                    outline: 'none'
                  }}
                />
              </div>

              {/* Phone & GSTIN */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 800, color: '#64748b', marginBottom: '4px' }}>
                    📞 Supplier Phone (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 9876543210"
                    value={billFormData.supplier_phone}
                    onChange={(e) => setBillFormData({ ...billFormData, supplier_phone: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 800, color: '#64748b', marginBottom: '4px' }}>
                    GSTIN / Tax ID (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 29AAAAA0000A1Z5"
                    value={billFormData.supplier_gstin}
                    onChange={(e) => setBillFormData({ ...billFormData, supplier_gstin: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', outline: 'none' }}
                  />
                </div>
              </div>

              {/* Bill Number & Bill Date */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                    📄 Bill / Invoice # *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. INV-9042"
                    value={billFormData.bill_number}
                    onChange={(e) => setBillFormData({ ...billFormData, bill_number: e.target.value })}
                    className="mono"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1.5px solid #0284c7', fontSize: '13px', fontWeight: 800, outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                    📅 Bill Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={billFormData.bill_date}
                    onChange={(e) => handleUpdateBillDate(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px', fontWeight: 700, outline: 'none' }}
                  />
                </div>
              </div>

              {/* Credit Days & Due Date */}
              <div style={{ background: '#f5f3ff', padding: '12px 14px', borderRadius: '10px', border: '1px solid #d8b4fe' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12.5px', fontWeight: 800, color: '#6d28d9' }}>
                    ⏳ Credit Days & Payment Deadline:
                  </label>
                  <span style={{ fontSize: '12px', fontWeight: 900, color: '#7e22ce' }}>
                    {billFormData.credit_days} Days Credit
                  </span>
                </div>

                {/* Quick Chips for Credit Days */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                  {[7, 14, 21, 30, 45, 60].map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => handleUpdateBillCreditDays(d)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: '1px solid ' + (parseInt(billFormData.credit_days) === d ? '#7c3aed' : '#cbd5e1'),
                        background: parseInt(billFormData.credit_days) === d ? '#7c3aed' : '#ffffff',
                        color: parseInt(billFormData.credit_days) === d ? '#ffffff' : '#475569',
                        fontWeight: 800,
                        fontSize: '11.5px',
                        cursor: 'pointer'
                      }}
                    >
                      {d} Days
                    </button>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '10px', alignItems: 'center' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#64748b', fontWeight: 700, marginBottom: '2px' }}>
                      Custom Days:
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={billFormData.credit_days}
                      onChange={(e) => handleUpdateBillCreditDays(e.target.value)}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 800, outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#64748b', fontWeight: 700, marginBottom: '2px' }}>
                      Computed Due Date:
                    </label>
                    <input
                      type="date"
                      required
                      value={billFormData.due_date}
                      onChange={(e) => setBillFormData({ ...billFormData, due_date: e.target.value })}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #7c3aed', fontSize: '13px', fontWeight: 800, color: '#6d28d9', outline: 'none' }}
                    />
                  </div>
                </div>
              </div>

              {/* Total Amount */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: '#be123c', marginBottom: '4px' }}>
                  💰 Total Bill Amount ({currency}) *
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px', fontWeight: 900, color: '#be123c' }}>
                    {currency}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={billFormData.total_amount}
                    onChange={(e) => setBillFormData({ ...billFormData, total_amount: e.target.value })}
                    className="mono"
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 28px',
                      borderRadius: '8px',
                      border: '2px solid #f43f5e',
                      fontSize: '18px',
                      fontWeight: 900,
                      color: '#be123c',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>
                  📝 Notes / Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Antibiotics & IV fluid stock order"
                  value={billFormData.notes}
                  onChange={(e) => setBillFormData({ ...billFormData, notes: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', outline: 'none' }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setIsAddBillModalOpen(false)}
                  className="btn btn-secondary"
                  style={{ fontWeight: 700 }}
                  disabled={isSavingBill}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingBill}
                  style={{
                    background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 22px',
                    fontWeight: 900,
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Save size={16} />
                  <span>{isSavingBill ? 'Saving Bill...' : (editingBill ? 'Update Bill' : 'Save Wholesale Bill')}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: RECORD VENDOR PAYMENT / SETTLEMENT (WITH 1-CLICK DAILY SYNC)
          ========================================================================= */}
      {isPayBillModalOpen && activeBillForPayment && (
        <div className="modal-backdrop" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div className="modal-panel" style={{
            background: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '540px',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
            border: '1.5px solid #86efac',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Banknote size={22} />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900 }}>
                  Record Supplier Bill Payment
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPayBillModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Bill Overview Banner */}
            <div style={{ background: '#f0fdf4', padding: '14px 20px', borderBottom: '1px solid #bbf7d0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 900, color: '#065f46' }}>
                    🏢 {activeBillForPayment.supplier_name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#047857', marginTop: '2px' }} className="mono">
                    Bill #{activeBillForPayment.bill_number} • Due: {new Date(activeBillForPayment.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: '#dc2626', fontWeight: 800, textTransform: 'uppercase' }}>
                    Current Balance Due
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: '#be123c' }} className="mono">
                    {currency}{parseFloat(activeBillForPayment.balance_due || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Form */}
            <form onSubmit={handleRecordPaymentSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto' }}>
              
              {/* Payment Amount & Quick Full Pay Chip */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 800, color: '#065f46' }}>
                    💵 Payment Amount ({currency}) *
                  </label>
                  <button
                    type="button"
                    onClick={() => setPaymentFormData({ ...paymentFormData, amount: activeBillForPayment.balance_due.toString() })}
                    style={{
                      background: '#ecfdf5',
                      border: '1px solid #a7f3d0',
                      color: '#059669',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    ⚡ Full Balance ({currency}{activeBillForPayment.balance_due})
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '17px', fontWeight: 900, color: '#059669' }}>
                    {currency}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={paymentFormData.amount}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                    className="mono"
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 30px',
                      borderRadius: '8px',
                      border: '2px solid #10b981',
                      fontSize: '18px',
                      fontWeight: 900,
                      color: '#047857',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Payment Mode & Payment Date */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                    💳 Payment Mode *
                  </label>
                  <select
                    value={paymentFormData.payment_mode}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, payment_mode: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 10px',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '13px',
                      fontWeight: 800,
                      color: '#1e293b',
                      background: '#ffffff',
                      outline: 'none'
                    }}
                  >
                    <option value="CASH">💵 CASH (Counter Draw)</option>
                    <option value="UPI">📱 UPI (GPay / PhonePe / Paytm)</option>
                    <option value="NEFT">🏦 Bank Transfer (NEFT / IMPS / RTGS)</option>
                    <option value="CHEQUE">📜 Cheque</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                    📅 Payment Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentFormData.payment_date}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, payment_date: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px', fontWeight: 700, outline: 'none' }}
                  />
                </div>
              </div>

              {/* Reference Number */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>
                  Reference / UTR / Cheque # (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. UPI Ref # 428901239841 or Chq # 44021"
                  value={paymentFormData.reference_number}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, reference_number: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', outline: 'none' }}
                />
              </div>

              {/* Notes */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>
                  Payment Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Paid via shop counter cash"
                  value={paymentFormData.notes}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', outline: 'none' }}
                />
              </div>

              {/* CRITICAL RECONCILIATION FEATURE: 1-Click Sync into Daily Accounts Register */}
              <div style={{
                background: '#f0f9ff',
                padding: '12px 14px',
                borderRadius: '10px',
                border: '1.5px solid #bae6fd',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px'
              }}>
                <input
                  type="checkbox"
                  id="sync_daily_acc"
                  checked={paymentFormData.sync_to_daily_accounts}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, sync_to_daily_accounts: e.target.checked })}
                  style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: '#0284c7', cursor: 'pointer' }}
                />
                <label htmlFor="sync_daily_acc" style={{ fontSize: '12.5px', cursor: 'pointer', color: '#0369a1', lineHeight: '1.4' }}>
                  <strong style={{ display: 'block', color: '#0284c7' }}>
                    ⚡ Auto-Sync Outflow to Daily Cash Register ({paymentFormData.payment_date})
                  </strong>
                  Automatically records this payment as a <strong>Vendor Payout</strong> in today's Daily Accounts Register, updating your daily closing cash drawer balance.
                </label>
              </div>

              {/* Modal Buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '6px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setIsPayBillModalOpen(false)}
                  className="btn btn-secondary"
                  disabled={isProcessingPayment}
                  style={{ fontWeight: 700 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessingPayment}
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '11px 24px',
                    fontWeight: 900,
                    fontSize: '14.5px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
                  }}
                >
                  <Save size={16} />
                  <span>{isProcessingPayment ? 'Recording Payment...' : 'Confirm & Settle Payment'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: VENDOR BILL PAYMENT HISTORY & LEDGER
          ========================================================================= */}
      {isBillHistoryModalOpen && activeBillForHistory && (
        <div className="modal-backdrop" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div className="modal-panel" style={{
            background: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '580px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
            border: '1.5px solid #d8b4fe',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              padding: '16px 20px',
              background: '#1e1b4b',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 900 }}>
                  Wholesale Bill Payment Ledger: #{activeBillForHistory.bill_number}
                </div>
                <div style={{ fontSize: '11.5px', color: '#a5b4fc', marginTop: '2px' }}>
                  🏢 {activeBillForHistory.supplier_name}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBillHistoryModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Bill Summary Banner */}
            <div style={{
              padding: '12px 20px',
              background: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '10px'
            }}>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>Total Invoiced</div>
                <div style={{ fontSize: '14px', fontWeight: 900, color: '#1e293b' }} className="mono">
                  {currency}{parseFloat(activeBillForHistory.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#059669', fontWeight: 700 }}>Total Paid</div>
                <div style={{ fontSize: '14px', fontWeight: 900, color: '#059669' }} className="mono">
                  {currency}{parseFloat(activeBillForHistory.paid_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#dc2626', fontWeight: 700 }}>Balance Due</div>
                <div style={{ fontSize: '14px', fontWeight: 900, color: parseFloat(activeBillForHistory.balance_due) > 0 ? '#dc2626' : '#059669' }} className="mono">
                  {currency}{parseFloat(activeBillForHistory.balance_due || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {/* Installments List */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
              <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#334155', marginBottom: '2px' }}>
                Payment Installments History ({Array.isArray(activeBillForHistory.payment_history) ? activeBillForHistory.payment_history.length : 0}):
              </div>

              {!Array.isArray(activeBillForHistory.payment_history) || activeBillForHistory.payment_history.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 16px', background: '#f8fafc', borderRadius: '10px', color: '#94a3b8' }}>
                  <Clock size={24} style={{ margin: '0 auto 6px', opacity: 0.5 }} />
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#64748b' }}>No payments recorded yet for this bill</div>
                </div>
              ) : (
                activeBillForHistory.payment_history.map((pay, pIdx) => (
                  <div
                    key={pIdx}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '10px',
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CheckCircle2 size={15} color="#059669" />
                        <strong style={{ fontSize: '13px', color: '#065f46' }}>
                          Installment #{pIdx + 1} • {pay.payment_date || pay.created_at?.slice(0, 10)}
                        </strong>
                        <span className="badge badge-gray mono" style={{ fontSize: '10px' }}>
                          {pay.payment_mode || 'CASH'}
                        </span>
                      </div>
                      {(pay.reference_number || pay.notes) && (
                        <div style={{ fontSize: '11.5px', color: '#047857', marginTop: '3px', marginLeft: '21px' }}>
                          {pay.reference_number && <span>Ref: <strong>{pay.reference_number}</strong> </span>}
                          {pay.notes && <span>• {pay.notes}</span>}
                        </div>
                      )}
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span className="mono" style={{ fontSize: '16px', fontWeight: 900, color: '#047857' }}>
                        {currency}{parseFloat(pay.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              {parseFloat(activeBillForHistory.balance_due) > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    const b = activeBillForHistory;
                    setIsBillHistoryModalOpen(false);
                    handleOpenRecordPayment(b);
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '12.5px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Banknote size={15} /> Record Next Payment
                </button>
              ) : (
                <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#059669' }}>
                  ✅ 100% Fully Settled
                </div>
              )}

              <button
                type="button"
                onClick={() => setIsBillHistoryModalOpen(false)}
                className="btn btn-secondary btn-sm"
                style={{ fontWeight: 700 }}
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
