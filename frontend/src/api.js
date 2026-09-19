const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (
  typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://127.0.0.1:8000/api'
    : 'https://top-medical-backend.onrender.com/api'
);

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(
        typeof errorData === 'object'
          ? Object.entries(errorData).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | ')
          : errorData || 'Request failed'
      );
    }
    // Handle 204 No Content
    if (response.status === 204) return null;
    return await response.json();
  } catch (error) {
    console.error(`API Error on [${options.method || 'GET'}] ${endpoint}:`, error);
    throw error;
  }
}

export const inventoryAPI = {
  // Medicines
  getMedicines: (params = '') => request(`/inventory/medicines/${params ? `?${params}` : ''}`),
  searchPOS: (q = '') => request(`/inventory/medicines/pos_search/?q=${encodeURIComponent(q)}`),
  getLowStock: () => request('/inventory/medicines/low_stock/'),
  getMedicine: (id) => request(`/inventory/medicines/${id}/`),
  createMedicine: (data) => request('/inventory/medicines/', { method: 'POST', body: JSON.stringify(data) }),
  quickAddTabletStock: (data) => request('/inventory/medicines/quick_add_tablet_stock/', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateMedicine: (id, data) => request(`/inventory/medicines/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMedicine: (id) => request(`/inventory/medicines/${id}/`, { method: 'DELETE' }),
  getQuickChocolateItem: () => request('/inventory/medicines/quick_chocolate_item/'),

  // Batches
  getBatches: (params = '') => request(`/inventory/batches/${params ? `?${params}` : ''}`),
  getStockTable: (params = '') => request(`/inventory/batches/stock_table/${params ? `?${params}` : ''}`),
  createBatch: (data) => request('/inventory/batches/', { method: 'POST', body: JSON.stringify(data) }),
  updateBatch: (id, data) => request(`/inventory/batches/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
  quickUpdateBatch: (id, data) => request(`/inventory/batches/${id}/quick_update/`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  bulkQuickUpdateBatches: (updates) => request('/inventory/batches/bulk_quick_update/', {
    method: 'POST',
    body: JSON.stringify({ updates })
  }),
  adjustStock: (id, pack_delta, loose_delta, reason) => request(`/inventory/batches/${id}/adjust_stock/`, {
    method: 'POST',
    body: JSON.stringify({ pack_delta, loose_delta, reason }),
  }),
  getExpiringSoon: (days = 90) => request(`/inventory/batches/expiring_soon/?days=${days}`),
  getExpired: () => request('/inventory/batches/expired/'),

  // Categories & Suppliers
  getCategories: () => request('/inventory/categories/'),
  createCategory: (data) => request('/inventory/categories/', { method: 'POST', body: JSON.stringify(data) }),
  getSuppliers: () => request('/inventory/suppliers/'),
  createSupplier: (data) => request('/inventory/suppliers/', { method: 'POST', body: JSON.stringify(data) }),
  updateSupplier: (id, data) => request(`/inventory/suppliers/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),

  // AI / OCR Supplier Bill Inward Scanner
  scanSupplierBill: async (payload) => {
    const url = `${API_BASE_URL}/inventory/batches/scan_supplier_bill/`;
    const isFormData = payload instanceof FormData;
    const res = await fetch(url, {
      method: 'POST',
      headers: isFormData ? {} : { 'Content-Type': 'application/json' },
      body: isFormData ? payload : JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to scan invoice' }));
      throw new Error(err.error || err.detail || 'Bill scanner failed to parse file.');
    }
    return await res.json();
  },
  bulkInwardFromBill: (data) => request('/inventory/batches/bulk_inward_from_bill/', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Excel Bulk Inventory Upload
  uploadExcel: async (payload) => {
    const url = `${API_BASE_URL}/inventory/medicines/bulk_upload_excel/`;
    const isFormData = payload instanceof FormData;
    const res = await fetch(url, {
      method: 'POST',
      headers: isFormData ? {} : { 'Content-Type': 'application/json' },
      body: isFormData ? payload : JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to upload Excel file' }));
      const msg = err.error || err.detail || (typeof err === 'object' ? Object.entries(err).map(([k, v]) => `${k}: ${v}`).join(', ') : 'Excel bulk upload failed.');
      throw new Error(msg);
    }
    return await res.json();
  },

  // Daily Updated Inventory Stock
  getDailyUpdated: (params = '') => request(`/inventory/batches/daily_updated/${params ? `?${params}` : ''}`),

  // Stock Movements / Logs
  getStockMovements: () => request('/inventory/stock-movements/'),
};

export const billingAPI = {
  // Invoices
  getInvoices: (params = '') => request(`/billing/invoices/${params ? `?${params}` : ''}`),
  getInvoice: (id) => request(`/billing/invoices/${id}/`),
  createInvoice: (data) => request('/billing/invoices/', { method: 'POST', body: JSON.stringify(data) }),
  updateInvoiceDiscount: (id, data) => request(`/billing/invoices/${id}/update_discount/`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  cancelInvoice: (id) => request(`/billing/invoices/${id}/cancel_invoice/`, { method: 'POST' }),
  getNextInvoiceNumber: () => request('/billing/invoices/next_number/'),
  getPaymentSummary: (params = '') => request(`/billing/invoices/payment_summary/${params ? `?${params}` : ''}`),
  exportBillsExcel: async (params = '') => {
    const url = `${API_BASE_URL}/billing/invoices/export_excel/${params ? `?${params}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to download Excel report' }));
      throw new Error(err.error || err.detail || 'Failed to download Excel report.');
    }
    const blob = await res.blob();
    const disposition = res.headers.get('Content-Disposition') || '';
    let filename = `TopMedical_Bills_${new Date().toISOString().slice(0, 10)}.xlsx`;
    const match = disposition.match(/filename="?([^"]+)"?/);
    if (match && match[1]) {
      filename = match[1];
    }
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(blobUrl);
    return { success: true, filename };
  },

  // Customers
  getCustomers: (search = '') => request(`/billing/customers/${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  createCustomer: (data) => request('/billing/customers/', { method: 'POST', body: JSON.stringify(data) }),
  updateCustomer: (id, data) => request(`/billing/customers/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),

  // Doctors
  getDoctors: (search = '') => request(`/billing/doctors/${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  createDoctor: (data) => request('/billing/doctors/', { method: 'POST', body: JSON.stringify(data) }),
  updateDoctor: (id, data) => request(`/billing/doctors/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),

  // Staff & Charge Codes
  getStaff: () => request('/billing/staff/'),
  createStaff: (data) => request('/billing/staff/', { method: 'POST', body: JSON.stringify(data) }),
  updateStaff: (id, data) => request(`/billing/staff/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteStaff: (id) => request(`/billing/staff/${id}/`, { method: 'DELETE' }),

  // Pharmacy Profile
  getProfile: () => request('/billing/profile/'),
  updateProfile: (data) => request('/billing/profile/', { method: 'POST', body: JSON.stringify(data) }),
};

export const authAPI = {
  login: (credentials) => request('/billing/auth/login/', { method: 'POST', body: JSON.stringify(credentials) }),
};

export const analyticsAPI = {
  getSummary: () => request('/analytics/summary/'),
  getPaymentBreakdown: (params = '') => request(`/analytics/payment-breakdown/${params ? `?${params}` : ''}`),
  getSalesTrend: (days = 7) => request(`/analytics/sales-trend/?days=${days}`),
  getCategoryDistribution: () => request('/analytics/category-distribution/'),
  getTopSelling: () => request('/analytics/top-selling/'),
  getDailySoldReport: (params = '') => request(`/analytics/daily-sold-report/${params ? `?${params}` : ''}`),
};

export const dailyFinanceAPI = {
  getRecords: (params = '') => request(`/billing/daily-finance/${params ? `?${params}` : ''}`),
  getRecord: (id) => request(`/billing/daily-finance/${id}/`),
  createRecord: (data) => request('/billing/daily-finance/', { method: 'POST', body: JSON.stringify(data) }),
  updateRecord: (id, data) => request(`/billing/daily-finance/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
  patchRecord: (id, data) => request(`/billing/daily-finance/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteRecord: (id) => request(`/billing/daily-finance/${id}/`, { method: 'DELETE' }),
  autoFetchDay: (date = '') => request(`/billing/daily-finance/auto_fetch_pos_day/${date ? `?date=${encodeURIComponent(date)}` : ''}`),
  getSummaryStats: () => request('/billing/daily-finance/summary_stats/'),
  exportExcel: async (params = '') => {
    const url = `${API_BASE_URL}/billing/daily-finance/export_excel/${params ? `?${params}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to download Excel report' }));
      throw new Error(err.error || err.detail || 'Failed to download Excel report.');
    }
    const blob = await res.blob();
    const disposition = res.headers.get('Content-Disposition') || '';
    let filename = `TopMedical_DailyFinance_${new Date().toISOString().slice(0, 10)}.xlsx`;
    const match = disposition.match(/filename="?([^"]+)"?/);
    if (match && match[1]) {
      filename = match[1];
    }
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(blobUrl);
    return { success: true, filename };
  },
};

export const vendorBillsAPI = {
  getBills: (params = '') => request(`/billing/vendor-bills/${params ? `?${params}` : ''}`),
  getBill: (id) => request(`/billing/vendor-bills/${id}/`),
  createBill: (data) => request('/billing/vendor-bills/', { method: 'POST', body: JSON.stringify(data) }),
  updateBill: (id, data) => request(`/billing/vendor-bills/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
  patchBill: (id, data) => request(`/billing/vendor-bills/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteBill: (id) => request(`/billing/vendor-bills/${id}/`, { method: 'DELETE' }),
  recordPayment: (id, data) => request(`/billing/vendor-bills/${id}/record_payment/`, { method: 'POST', body: JSON.stringify(data) }),
  getSummary: () => request('/billing/vendor-bills/summary/'),
};


