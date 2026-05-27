// admin/public/js/api.js
// Admin API client

const API_BASE = window.location.origin === 'http://localhost:5174'
  ? 'http://localhost:3000'
  : window.location.origin;

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
