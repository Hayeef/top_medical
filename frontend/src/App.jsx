import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ReceiptModal from './components/ReceiptModal';
import AddMedicineModal from './components/AddMedicineModal';
import AddBatchModal from './components/AddBatchModal';
import StockAdjustModal from './components/StockAdjustModal';
import CustomerModal from './components/CustomerModal';
import DoctorModal from './components/DoctorModal';
import ScanSupplierBillModal from './components/ScanSupplierBillModal';
import ExcelBulkUploadModal from './components/ExcelBulkUploadModal';

import LoginPage from './pages/LoginPage';
import PosBillingPage from './pages/PosBillingPage';
import DashboardPage from './pages/DashboardPage';
import InventoryPage from './pages/InventoryPage';
import AlertsPage from './pages/AlertsPage';
import InvoicesPage from './pages/InvoicesPage';
import ContactsPage from './pages/ContactsPage';
import SettingsPage from './pages/SettingsPage';

import { inventoryAPI, billingAPI, analyticsAPI } from './api';

export default function App() {
  const [authUser, setAuthUser] = useState(() => {
    try {
      const saved = localStorage.getItem('tm_auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState('pos'); // Default to POS for ultra-fast counter billing
  const [loading, setLoading] = useState(true);

  // Data states
  const [summary, setSummary] = useState(null);
  const [salesTrend, setSalesTrend] = useState([]);
  const [categoriesDist, setCategoriesDist] = useState([]);
  const [topSelling, setTopSelling] = useState([]);
  
  const [medicines, setMedicines] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [profile, setProfile] = useState(null);

  // Modal dialog states
  const [isAddMedicineOpen, setIsAddMedicineOpen] = useState(false);
  const [isAddBatchOpen, setIsAddBatchOpen] = useState(false);
  const [isScanBillOpen, setIsScanBillOpen] = useState(false);
  const [isExcelUploadOpen, setIsExcelUploadOpen] = useState(false);
  const [batchPrefillMedId, setBatchPrefillMedId] = useState(null);
  const [isStockAdjustOpen, setIsStockAdjustOpen] = useState(false);
  const [batchToAdjust, setBatchToAdjust] = useState(null);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isAddDoctorOpen, setIsAddDoctorOpen] = useState(false);
  const [receiptInvoice, setReceiptInvoice] = useState(null);

  // Load all pharmacy datasets
  const loadInitialData = async () => {
    try {
      const [
        summaryData,
        trendData,
        distData,
        topData,
        medsData,
        catsData,
        suppsData,
        custsData,
        docsData,
        staffData,
        profData
      ] = await Promise.allSettled([
        analyticsAPI.getSummary(),
        analyticsAPI.getSalesTrend(7),
        analyticsAPI.getCategoryDistribution(),
        analyticsAPI.getTopSelling(),
        inventoryAPI.getMedicines(),
        inventoryAPI.getCategories(),
        inventoryAPI.getSuppliers(),
        billingAPI.getCustomers(),
        billingAPI.getDoctors(),
        billingAPI.getStaff(),
        billingAPI.getProfile(),
      ]);

      if (summaryData.status === 'fulfilled') setSummary(summaryData.value);
      if (trendData.status === 'fulfilled') setSalesTrend(trendData.value || []);
      if (distData.status === 'fulfilled') setCategoriesDist(distData.value || []);
      if (topData.status === 'fulfilled') setTopSelling(topData.value || []);
      
      if (medsData.status === 'fulfilled') setMedicines(medsData.value?.results || medsData.value || []);
      if (catsData.status === 'fulfilled') setCategories(catsData.value?.results || catsData.value || []);
      if (suppsData.status === 'fulfilled') setSuppliers(suppsData.value?.results || suppsData.value || []);
      if (custsData.status === 'fulfilled') setCustomers(custsData.value?.results || custsData.value || []);
      if (docsData.status === 'fulfilled') setDoctors(docsData.value?.results || docsData.value || []);
      if (staffData.status === 'fulfilled') setStaffList(staffData.value?.results || staffData.value || []);
      if (profData.status === 'fulfilled') setProfile(profData.value);
    } catch (err) {
      console.error('Initial data loading failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Global Keyboard Shortcuts (F2 -> POS, F3 -> Add Medicine, F4 -> Stock Inward)
  useEffect(() => {
    const handleGlobalShortcuts = (e) => {
      if (e.key === 'F2') {
        e.preventDefault();
        setActiveTab('pos');
      } else if (e.key === 'F3') {
        e.preventDefault();
        setIsAddMedicineOpen(true);
      } else if (e.key === 'F4') {
        e.preventDefault();
        setBatchPrefillMedId(null);
        setIsAddBatchOpen(true);
      }
    };
    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, []);

  // Modal Handlers
  const handleOpenAddBatch = (medicineId = null) => {
    setBatchPrefillMedId(medicineId);
    setIsAddBatchOpen(true);
  };

  const handleOpenStockAdjust = (batch) => {
    setBatchToAdjust(batch);
    setIsStockAdjustOpen(true);
  };

  const handleMedicineCreated = (newMed) => {
    setMedicines(prev => [newMed, ...prev]);
    loadInitialData();
  };

  const handleBatchCreated = () => {
    loadInitialData();
  };

  const handleStockAdjusted = () => {
    loadInitialData();
  };

  const handleCustomerCreated = (newCust) => {
    setCustomers(prev => [newCust, ...prev]);
  };

  const handleDoctorCreated = (newDoc) => {
    setDoctors(prev => [newDoc, ...prev]);
  };

  const handleInvoiceCreated = () => {
    loadInitialData();
  };

  const handleLogout = () => {
    localStorage.removeItem('tm_auth_user');
    localStorage.removeItem('tm_auth_token');
    setAuthUser(null);
    setActiveTab('pos');
  };

  // If not authenticated, display Login Interface
  if (!authUser) {
    return (
      <LoginPage 
        onLoginSuccess={(user) => {
          setAuthUser(user);
          loadInitialData();
        }} 
      />
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100vw', background: 'var(--bg-main)' }}>
      {/* Fixed Sidebar */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        alertCounts={summary}
        profile={profile} 
        user={authUser}
        onLogout={handleLogout}
        onOpenScanBill={() => setIsScanBillOpen(true)}
      />

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Header 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          summary={summary}
          profile={profile}
          user={authUser}
          onLogout={handleLogout}
          onOpenAddMedicine={() => setIsAddMedicineOpen(true)}
          onOpenAddBatch={() => handleOpenAddBatch(null)}
          onOpenScanBill={() => setIsScanBillOpen(true)}
          onOpenExcelUpload={() => setIsExcelUploadOpen(true)}
        />

        <main style={{ flex: 1, overflowY: 'auto' }}>
          {activeTab === 'pos' && (
            <PosBillingPage
              profile={profile}
              customers={customers}
              doctors={doctors}
              staffList={staffList}
              onOpenAddCustomer={() => setIsAddCustomerOpen(true)}
              onOpenAddDoctor={() => setIsAddDoctorOpen(true)}
              onInvoiceCreated={handleInvoiceCreated}
              onOpenReceipt={(inv) => setReceiptInvoice(inv)}
            />
          )}

          {activeTab === 'dashboard' && (
            <DashboardPage
              summary={summary}
              salesTrend={salesTrend}
              categoriesDist={categoriesDist}
              topSelling={topSelling}
              profile={profile}
              user={authUser}
              setActiveTab={setActiveTab}
              onOpenAddMedicine={() => setIsAddMedicineOpen(true)}
              onOpenAddBatch={() => handleOpenAddBatch(null)}
              onOpenScanBill={() => setIsScanBillOpen(true)}
            />
          )}

          {activeTab === 'inventory' && (
            <InventoryPage
              medicines={medicines}
              categories={categories}
              profile={profile}
              user={authUser}
              onOpenAddMedicine={() => setIsAddMedicineOpen(true)}
              onOpenAddBatch={handleOpenAddBatch}
              onOpenStockAdjust={handleOpenStockAdjust}
              onOpenScanBill={() => setIsScanBillOpen(true)}
              onOpenExcelUpload={() => setIsExcelUploadOpen(true)}
            />
          )}

          {activeTab === 'alerts' && (
            <AlertsPage
              profile={profile}
              onOpenAddBatch={handleOpenAddBatch}
              onOpenStockAdjust={handleOpenStockAdjust}
            />
          )}

          {activeTab === 'invoices' && (
            <InvoicesPage
              profile={profile}
              user={authUser}
              onOpenReceipt={(inv) => setReceiptInvoice(inv)}
            />
          )}

          {activeTab === 'contacts' && (
            <ContactsPage
              customers={customers}
              suppliers={suppliers}
              doctors={doctors}
              profile={profile}
              onOpenAddCustomer={() => setIsAddCustomerOpen(true)}
              onOpenAddDoctor={() => setIsAddDoctorOpen(true)}
              onRefresh={loadInitialData}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsPage
              profile={profile}
              onProfileUpdated={(updated) => setProfile(updated)}
            />
          )}
        </main>
      </div>

      {/* MODALS */}
      {isExcelUploadOpen && (
        <ExcelBulkUploadModal
          onClose={() => setIsExcelUploadOpen(false)}
          onStockInwarded={loadInitialData}
        />
      )}

      {isScanBillOpen && (
        <ScanSupplierBillModal
          onClose={() => setIsScanBillOpen(false)}
          onStockInwarded={loadInitialData}
        />
      )}

      {receiptInvoice && (
        <ReceiptModal
          invoice={receiptInvoice}
          profile={profile}
          onClose={() => setReceiptInvoice(null)}
        />
      )}

      {isAddMedicineOpen && (
        <AddMedicineModal
          categories={categories}
          onClose={() => setIsAddMedicineOpen(false)}
          onCreated={handleMedicineCreated}
        />
      )}

      {isAddBatchOpen && (
        <AddBatchModal
          medicines={medicines}
          suppliers={suppliers}
          defaultMedicineId={batchPrefillMedId}
          onClose={() => setIsAddBatchOpen(false)}
          onCreated={handleBatchCreated}
        />
      )}

      {isStockAdjustOpen && (
        <StockAdjustModal
          batch={batchToAdjust}
          onClose={() => setIsStockAdjustOpen(false)}
          onAdjusted={handleStockAdjusted}
        />
      )}

      {isAddCustomerOpen && (
        <CustomerModal
          doctors={doctors}
          onClose={() => setIsAddCustomerOpen(false)}
          onCreated={handleCustomerCreated}
        />
      )}

      {isAddDoctorOpen && (
        <DoctorModal
          onClose={() => setIsAddDoctorOpen(false)}
          onCreated={handleDoctorCreated}
        />
      )}
    </div>
  );
}
