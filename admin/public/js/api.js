// admin/public/js/api.js
// Admin API client

function resolveAdminApiBaseUrl() {
  const configuredUrl =
    window.SABIBIZ_API_BASE_URL ||
    localStorage.getItem('SABIBIZ_API_BASE_URL') ||
    '';

  if (configuredUrl.trim()) {
    return configuredUrl.replace(/\/+$/, '');
  }

  if (['localhost', '127.0.0.1'].includes(window.location.hostname)) {
    return 'http://localhost:3000';
  }

  return 'https://sabi-biz-backend.onrender.com';
}

const API_BASE = resolveAdminApiBaseUrl();

const AdminAPI = {
  baseURL: API_BASE,

  // Make authenticated request
  async request(endpoint, options = {}) {
    const token = localStorage.getItem('adminToken');
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      localStorage.removeItem('adminToken');
      window.location.reload();
      return { success: false, message: 'Unauthorized' };
    }

    let payload;
    try {
      payload = await response.json();
    } catch (e) {
      return { success: response.ok, message: response.statusText };
    }

    return payload;
  },

  // Users
  users: {
    list: () => AdminAPI.request('/api/admin/users'),
    get: (id) => AdminAPI.request(`/api/admin/users/${id}`),
    suspend: (id) => AdminAPI.request(`/api/admin/users/${id}/suspend`, { method: 'POST' }),
    activate: (id, opts = {}) => AdminAPI.request(`/api/admin/users/${id}/activate`, { method: 'POST', body: JSON.stringify(opts) }),
    update: (id, data) => AdminAPI.request(`/api/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => AdminAPI.request(`/api/admin/users/${id}`, { method: 'DELETE' }),
  },

  // Subscriptions
  subscriptions: {
    list: () => AdminAPI.request('/api/admin/subscriptions'),
    get: (id) => AdminAPI.request(`/api/admin/subscriptions/${id}`),
  },

  // Payments
  payments: {
    list: () => AdminAPI.request('/api/admin/payments'),
  },

  // Analytics
  analytics: {
    dashboard: () => AdminAPI.request('/api/admin/analytics/dashboard'),
    revenue: () => AdminAPI.request('/api/admin/analytics/revenue'),
    subscriptions: () => AdminAPI.request('/api/admin/analytics/subscriptions'),
    billing: () => AdminAPI.request('/api/admin/analytics/billing'),
  },
  // WhatsApp admin tools
  whatsapp: {
    accounts: () => AdminAPI.request('/api/admin/whatsapp/accounts'),
    infrastructure: () => AdminAPI.request('/api/admin/whatsapp/infrastructure'),
    accountLogs: (id) => AdminAPI.request(`/api/admin/whatsapp/accounts/${id}/logs`),
    removeAccount: (id) => AdminAPI.request(`/api/admin/whatsapp/accounts/${id}`, { method: 'DELETE' }),
  },
};

// Auth helpers
function isAdminLoggedIn() {
  return !!localStorage.getItem('adminToken');
}

function setAdminToken(token) {
  localStorage.setItem('adminToken', token);
}

function adminLogout() {
  localStorage.removeItem('adminToken');
  window.location.reload();
}
