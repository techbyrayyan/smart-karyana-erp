// When executed on the server (SSR / Route handlers), use the bound SERVER_URL if available;
// in the browser, call the relative /api path which Vercel rewrites to the server service.
const API_BASE = typeof window === 'undefined' && process.env.SERVER_URL
  ? `${process.env.SERVER_URL}/api`
  : '/api';

/**
 * Universal API fetch wrapper with JWT authentication
 */
export async function apiRequest(endpoint, options = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('smart_khata_token') : null;

  const headers = {
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // If not FormData, default to application/json
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({ success: false, message: 'Server response error' }));

  if (!response.ok) {
    // If unauthorized, redirect to login if client-side
    if (response.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('smart_khata_token');
      localStorage.removeItem('smart_khata_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }

  return data;
}

// Authentication API
export const authApi = {
  login: (username, password) =>
    apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  getProfile: () => apiRequest('/auth/profile'),
  updateProfile: (profileData) =>
    apiRequest('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    }),
  changePassword: (currentPassword, newPassword) =>
    apiRequest('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
};

// Products API
export const productApi = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/products${query ? `?${query}` : ''}`);
  },
  getById: (id) => apiRequest(`/products/${id}`),
  create: (data) =>
    apiRequest('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id, data) =>
    apiRequest(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id) =>
    apiRequest(`/products/${id}`, {
      method: 'DELETE',
    }),
};

// AI Invoice Scanner API
export const aiInvoiceApi = {
  scanInvoice: (formData) =>
    apiRequest('/ai-invoice/scan', {
      method: 'POST',
      body: formData, // FormData with invoiceImages
    }),
  confirmPurchase: (purchaseData) =>
    apiRequest('/ai-invoice/confirm', {
      method: 'POST',
      body: JSON.stringify(purchaseData),
    }),
};

// Sales / POS Billing API
export const saleApi = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/sales${query ? `?${query}` : ''}`);
  },
  getById: (id) => apiRequest(`/sales/${id}`),
  create: (data) =>
    apiRequest('/sales', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id, data) =>
    apiRequest(`/sales/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  void: (id) =>
    apiRequest(`/sales/${id}/void`, {
      method: 'POST',
    }),
};

// Customers API
export const customerApi = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/customers${query ? `?${query}` : ''}`);
  },
  getById: (id) => apiRequest(`/customers/${id}`),
  create: (data) =>
    apiRequest('/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id, data) =>
    apiRequest(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  recordPayment: (id, amount, notes) =>
    apiRequest(`/customers/${id}/payment`, {
      method: 'POST',
      body: JSON.stringify({ amount, notes }),
    }),
  delete: (id) =>
    apiRequest(`/customers/${id}`, {
      method: 'DELETE',
    }),
};

// Purchases API
export const purchaseApi = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/purchases${query ? `?${query}` : ''}`);
  },
  getById: (id) => apiRequest(`/purchases/${id}`),
  createManual: (data) =>
    apiRequest('/purchases/manual', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// Expenses API
export const expenseApi = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/expenses${query ? `?${query}` : ''}`);
  },
  create: (data) =>
    apiRequest('/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  delete: (id) =>
    apiRequest(`/expenses/${id}`, {
      method: 'DELETE',
    }),
};

// Reports API
export const reportApi = {
  getDashboardStats: () => apiRequest('/reports/dashboard'),
  getFinancialReports: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/reports/financial${query ? `?${query}` : ''}`);
  },
};
