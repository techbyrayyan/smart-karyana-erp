const API_BASE = '/api';

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

  let data;
  try {
    const text = await response.text();
    try {
      data = JSON.parse(text);
    } catch {
      data = {
        success: false,
        message: text && text.length < 200 ? text : `Server request error (${response.status})`,
      };
    }
  } catch (err) {
    data = { success: false, message: 'Server communication error' };
  }

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

// Categories API
export const categoryApi = {
  getAll: () => apiRequest('/categories'),
  create: (data) =>
    apiRequest('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  delete: (id) =>
    apiRequest(`/categories?id=${id}`, {
      method: 'DELETE',
    }),
};

// Rate List Management API
export const rateListApi = {
  get: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/ratelist${query ? `?${query}` : ''}`);
  },
  updatePrice: (id, price, unit = null, unitType = null, reason = '') =>
    apiRequest('/ratelist', {
      method: 'PUT',
      body: JSON.stringify({ id, price, unit, unitType, reason }),
    }),
  createProduct: (data) =>
    apiRequest('/ratelist', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  scan: (formData) =>
    apiRequest('/ratelist/scan', {
      method: 'POST',
      body: formData,
    }),
  confirm: (payload) =>
    apiRequest('/ratelist/confirm', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getHistory: () => apiRequest('/ratelist/history'),
  deleteProduct: (id) =>
    apiRequest(`/ratelist?id=${id}`, {
      method: 'DELETE',
    }),
};
