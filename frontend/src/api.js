const API_BASE_URL = 'http://127.0.0.1:8000/api';

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
  updateMedicine: (id, data) => request(`/inventory/medicines/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMedicine: (id) => request(`/inventory/medicines/${id}/`, { method: 'DELETE' }),

  // Batches
  getBatches: (params = '') => request(`/inventory/batches/${params ? `?${params}` : ''}`),
  createBatch: (data) => request('/inventory/batches/', { method: 'POST', body: JSON.stringify(data) }),
  updateBatch: (id, data) => request(`/inventory/batches/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
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
  scanSupplierBill: async (formData) => {
    const url = `${API_BASE_URL}/inventory/batches/scan_supplier_bill/`;
    const res = await fetch(url, {
      method: 'POST',
      body: formData, // Sending FormData directly for multipart file uploads
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to scan invoice' }));
      throw new Error(err.detail || 'Bill scanner failed to parse file.');
    }
    return await res.json();
  },
  bulkInwardFromBill: (data) => request('/inventory/batches/bulk_inward_from_bill/', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Stock Movements / Logs
  getStockMovements: () => request('/inventory/stock-movements/'),
};

export const billingAPI = {
  // Invoices
  getInvoices: (params = '') => request(`/billing/invoices/${params ? `?${params}` : ''}`),
  getInvoice: (id) => request(`/billing/invoices/${id}/`),
  createInvoice: (data) => request('/billing/invoices/', { method: 'POST', body: JSON.stringify(data) }),
  cancelInvoice: (id) => request(`/billing/invoices/${id}/cancel_invoice/`, { method: 'POST' }),
  getNextInvoiceNumber: () => request('/billing/invoices/next_number/'),

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

  // Pharmacy Profile
  getProfile: () => request('/billing/profile/'),
  updateProfile: (data) => request('/billing/profile/', { method: 'POST', body: JSON.stringify(data) }),
};

export const authAPI = {
  login: (credentials) => request('/billing/auth/login/', { method: 'POST', body: JSON.stringify(credentials) }),
};

export const analyticsAPI = {
  getSummary: () => request('/analytics/summary/'),
  getSalesTrend: (days = 7) => request(`/analytics/sales-trend/?days=${days}`),
  getCategoryDistribution: () => request('/analytics/category-distribution/'),
  getTopSelling: () => request('/analytics/top-selling/'),
};
