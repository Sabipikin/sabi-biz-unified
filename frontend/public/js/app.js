// frontend/public/js/app.js
// Main application entry point

console.log('SabiBiz Frontend Loading...');

function normalizeApiBaseUrl(url) {
  return String(url || '').trim().replace(/\/+$/, '');
}

function uniqueApiBaseUrls(urls) {
  return [...new Set(urls.map(normalizeApiBaseUrl).filter(Boolean))];
}

function resolveApiBaseUrls() {
  const configuredUrls = uniqueApiBaseUrls([
    window.SABIBIZ_API_BASE_URL,
    localStorage.getItem('SABIBIZ_API_BASE_URL'),
  ]);

  if (configuredUrls.length > 0) {
    return uniqueApiBaseUrls([
      ...configuredUrls,
      'https://sabi-biz-backend.onrender.com',
      'https://sabibiz.onrender.com',
    ]);
  }

  if (['localhost', '127.0.0.1'].includes(window.location.hostname)) {
    return ['http://localhost:3000'];
  }

  return [
    'https://sabi-biz-backend.onrender.com',
    'https://sabibiz.onrender.com',
  ];
}

const API_BASES = resolveApiBaseUrls();
let API_BASE = API_BASES[0];
const app = document.getElementById('app');
const defaultRoute = '#/dashboard';
const pendingRouteKey = 'SABIBIZ_PENDING_ROUTE';
const sidebarStateKey = 'SABIBIZ_SIDEBAR_COLLAPSED';
const dashboardRoutes = new Set([
  'dashboard',
  'inbox',
  'ai',
  'campaigns',
  'sales',
  'invoices',
  'inventory',
  'whatsapp',
  'customers',
  'subscriptions',
  'settings',
]);
const authRoutes = new Set(['login', 'register']);
const authFallbackEndpoints = new Set(['/api/auth/login', '/api/auth/register']);

const API = {
  baseURL: API_BASE,

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const token = getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const candidateBases = authFallbackEndpoints.has(endpoint) ? API_BASES : [API_BASE];
    let lastResult = null;

    for (let index = 0; index < candidateBases.length; index += 1) {
      const baseUrl = candidateBases[index];
      let response;

      try {
        response = await fetch(`${baseUrl}${endpoint}`, {
          ...options,
          headers,
        });
      } catch (err) {
        lastResult = { success: false, message: err?.message || 'Network error', apiBaseUrl: baseUrl };
        if (authFallbackEndpoints.has(endpoint) && index < candidateBases.length - 1) {
          console.warn(`API request failed on ${baseUrl}; trying fallback backend.`);
          continue;
        }
        return lastResult;
      }

      let payload;
      try {
        payload = await response.json();
      } catch (err) {
        payload = { success: response.ok, message: response.statusText || '' };
      }

      lastResult = { ...payload, apiBaseUrl: baseUrl, status: response.status };

      if (response.ok && baseUrl !== API_BASE) {
        API_BASE = baseUrl;
        API.baseURL = baseUrl;
        localStorage.setItem('SABIBIZ_API_BASE_URL', baseUrl);
      }

      if (response && response.status === 401) {
        localStorage.removeItem('token');
        window.location.hash = '#/login';
      }

      if (
        authFallbackEndpoints.has(endpoint) &&
        response.status === 404 &&
        index < candidateBases.length - 1
      ) {
        console.warn(`Auth endpoint not found on ${baseUrl}; trying fallback backend.`);
        continue;
      }

      return lastResult;
    }

    return {
      ...(lastResult || {}),
      success: false,
      message: `Auth endpoint was not found on any configured backend. Tried: ${candidateBases.join(', ')}`,
    };
  },

  auth: {
    register: (data) => API.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    login: (data) => API.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    me: () => API.request('/api/auth/me'),
    updateMe: (data) => API.request('/api/auth/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    updatePassword: (data) => API.request('/api/auth/password', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  },

  business: {
    customers: () => API.request('/api/business/customers'),
    customer: (id) => API.request(`/api/business/customers/${id}`),
    createCustomer: (data) => API.request('/api/business/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    updateCustomer: (id, data) => API.request(`/api/business/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    deleteCustomer: (id) => API.request(`/api/business/customers/${id}`, {
      method: 'DELETE',
    }),
    invoices: () => API.request('/api/business/invoices'),
    invoice: (id) => API.request(`/api/business/invoices/${id}`),
    createInvoice: (data) => API.request('/api/business/invoices', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    updateInvoice: (id, data) => API.request(`/api/business/invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    sendInvoice: (id, data) => API.request(`/api/business/invoices/${id}/send`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    invoiceAnalytics: () => API.request('/api/business/invoices/analytics'),
    milestoneMessages: () => API.request('/api/business/milestones'),
    milestoneTemplates: () => API.request('/api/business/milestones/templates'),
    saveMilestoneTemplates: (data) => API.request('/api/business/milestones/templates', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    generateMilestoneMessage: (customerId, type) => API.request(`/api/business/milestones/generate?customerId=${encodeURIComponent(customerId)}&type=${encodeURIComponent(type)}`),
    sendMilestoneMessage: (data) => API.request('/api/business/milestones/send', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    inventory: () => API.request('/api/business/inventory'),
    createInventoryItem: (data) => API.request('/api/business/inventory', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    sales: () => API.request('/api/business/sales'),
    createSale: (data) => API.request('/api/business/sales', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    createBulkSales: (data) => API.request('/api/business/sales/bulk', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    updateSale: (id, data) => API.request(`/api/business/sales/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    deleteSale: (id) => API.request(`/api/business/sales/${id}`, {
      method: 'DELETE',
    }),
    salesAnalytics: () => API.request('/api/business/sales/analytics'),
    customersAnalytics: () => API.request('/api/business/customers/analytics'),
  },

  whatsapp: {
    send: (data) => API.request('/api/whatsapp/send', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    accounts: () => API.request('/api/whatsapp/accounts'),
    createAccount: (data) => API.request('/api/whatsapp/accounts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    updateAccount: (id, data) => API.request(`/api/whatsapp/accounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    deleteAccount: (id) => API.request(`/api/whatsapp/accounts/${id}`, {
      method: 'DELETE',
    }),
  },

  conversations: {
    list: () => API.request('/api/conversations'),
    create: (data) => API.request('/api/conversations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    detail: (id) => API.request(`/api/conversations/${id}`),
    assign: (id, data = {}) => API.request(`/api/conversations/${id}/assign`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    reply: (id, data) => API.request(`/api/conversations/${id}/reply`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    close: (id) => API.request(`/api/conversations/${id}/close`, {
      method: 'POST',
    }),
    resumeAi: (id) => API.request(`/api/conversations/${id}/resume-ai`, {
      method: 'POST',
    }),
    addNote: (id, data) => API.request(`/api/conversations/${id}/notes`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  },

  ai: {
    settings: () => API.request('/api/ai/settings'),
    saveSettings: (data) => API.request('/api/ai/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  },

  analytics: {
    metrics: () => API.request('/api/analytics'),
    customerIntelligence: () => API.request('/api/analytics/customer-intelligence'),
  },

  subscriptions: {
    list: () => API.request('/api/subscriptions'),
    subscribe: (data) => API.request('/api/subscriptions/subscribe', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  },

  billing: {
    currentPlan: () => API.request('/api/billing/current-plan'),
    usage: () => API.request('/api/billing/usage'),
    invoices: () => API.request('/api/billing/invoices'),
    upgrade: (data) => API.request('/api/billing/upgrade', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    downgrade: (data) => API.request('/api/billing/downgrade', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    cancel: () => API.request('/api/billing/cancel', {
      method: 'POST',
    }),
    reactivate: () => API.request('/api/billing/reactivate', {
      method: 'POST',
    }),
  },

  payments: {
    initializePaystack: (data) => API.request('/api/payments/paystack/initialize', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  },
};

function isLoggedIn() {
  return !!localStorage.getItem('token');
}

function setToken(token) {
  localStorage.setItem('token', token);
}

function getToken() {
  return localStorage.getItem('token');
}

function logout() {
  localStorage.removeItem('token');
  window.location.hash = '#/login';
  renderApp();
}

function isSidebarCollapsed() {
  return localStorage.getItem(sidebarStateKey) === 'true';
}

function setSidebarCollapsed(collapsed) {
  localStorage.setItem(sidebarStateKey, collapsed ? 'true' : 'false');
  document.querySelector('.dashboard')?.classList.toggle('sidebar-collapsed', collapsed);

  const button = document.getElementById('sidebarCollapse');
  if (button) {
    button.setAttribute('aria-expanded', String(!collapsed));
    button.setAttribute('aria-label', collapsed ? 'Expand menu' : 'Collapse menu');
    button.title = collapsed ? 'Expand menu' : 'Collapse menu';
  }
}

function applyNavIconLabels() {
  const labels = {
    dashboard: 'D',
    inbox: 'IN',
    ai: 'AI',
    campaigns: 'CA',
    invoices: 'I',
    inventory: 'N',
    sales: 'S',
    customers: 'C',
    subscriptions: 'P',
    settings: 'G',
  };

  document.querySelectorAll('.nav-item[data-route]').forEach(item => {
    const icon = item.querySelector('.nav-icon');
    const label = labels[item.dataset.route];
    if (icon && label) {
      icon.textContent = label;
    }
  });

  const logoutIcon = document.querySelector('#logoutButton .nav-icon');
  if (logoutIcon) {
    logoutIcon.textContent = 'L';
  }
}

function normalizeRouteName(route) {
  const normalized = String(route || '')
    .trim()
    .replace(/^#\/?/, '')
    .replace(/^\/+/, '')
    .split('/')[0]
    .toLowerCase();

  return normalized || 'login';
}

function parseRouteHash(hash = window.location.hash) {
  const sanitized = String(hash || '').trim().replace(/^#\/?/, '').replace(/\/+$/, '');
  const segments = sanitized.split('/').filter(Boolean);
  return {
    page: (segments[0] || 'login').toLowerCase(),
    id: segments[1] || null,
  };
}

function getCurrentRoute() {
  return parseRouteHash();
}

function getDefaultDashboardRoute() {
  const configuredRoute = normalizeRouteName(window.SABIBIZ_INITIAL_ROUTE || defaultRoute);
  return dashboardRoutes.has(configuredRoute) ? configuredRoute : 'dashboard';
}

function getDefaultDashboardHash() {
  return `#/${getDefaultDashboardRoute()}`;
}

function getRouteHash(route) {
  return `#/${route}`;
}

function isRegisterPath() {
  const path = window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
  return path === 'register' || path.endsWith('/register.html');
}

function redirectDashboardHashToAppShell(route) {
  const appUrl = window.SABIBIZ_APP_URL || `${window.location.origin}/`;
  const target = new URL(appUrl, window.location.href);
  target.hash = getRouteHash(route);
  window.location.replace(target.toString());
}

function getCurrentPage() {
  if (window.location.hash) {
    return getCurrentRoute().page;
  }

  const path = window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
  if (path === 'register' || path.endsWith('/register.html')) {
    return 'register';
  }

  return 'login';
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatMoney(value) {
  return `NGN ${Number(value || 0).toLocaleString()}`;
}

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : '-';
}

function formatExactDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

function normalizePhoneNumber(phone = '') {
  return String(phone || '').replace(/[^+0-9]/g, '');
}

function buildInvoiceReceiptText(invoice) {
  const lines = [];
  lines.push(`Invoice #${invoice.id}`);
  lines.push(`Customer: ${invoice.customer_name || 'N/A'}`);
  if (invoice.customer_phone) lines.push(`Phone: ${invoice.customer_phone}`);
  if (invoice.customer_email) lines.push(`Email: ${invoice.customer_email}`);
  if (invoice.delivery_address) lines.push(`Delivery Address: ${invoice.delivery_address}`);
  if (invoice.due_date) lines.push(`Due Date: ${formatDate(invoice.due_date)}`);
  if (invoice.description) lines.push(`Description: ${invoice.description}`);
  lines.push('');
  lines.push('Items:');

  const items = Array.isArray(invoice.invoice_items) ? invoice.invoice_items : [];
  if (items.length) {
    items.forEach((item, index) => {
      const name = item.product_name || item.inventory_name || `Item ${index + 1}`;
      const quantity = Number(item.quantity || 0);
      const unitPrice = Number(item.unit_price || 0);
      const totalPrice = Number(item.total_price || quantity * unitPrice);
      lines.push(`${index + 1}. ${name} — ${quantity} x ${formatMoney(unitPrice)} = ${formatMoney(totalPrice)}`);
    });
  } else {
    lines.push('No line items available.');
  }

  lines.push('');
  lines.push(`Total: ${formatMoney(invoice.amount)}`);
  lines.push('');
  lines.push('Thank you for your business.');

  return lines.join('\n');
}

function createMailtoLink(to, subject, body) {
  const params = new URLSearchParams();
  if (subject) params.set('subject', subject);
  if (body) params.set('body', body);
  return `mailto:${encodeURIComponent(to || '')}?${params.toString()}`;
}

function createWhatsAppLink(phone, body) {
  const normalizedPhone = normalizePhoneNumber(phone);
  const text = encodeURIComponent(body || '');
  if (normalizedPhone) {
    return `https://wa.me/${normalizedPhone.replace(/^\+/, '')}?text=${text}`;
  }
  return `https://api.whatsapp.com/send?text=${text}`;
}

function openInvoiceEmailCompose(invoice) {
  if (!invoice.customer_email) {
    return false;
  }

  const subject = `Invoice #${invoice.id} from ${window.SABIBIZ_APP_NAME || 'SabiBiz'}`;
  const body = buildInvoiceReceiptText(invoice);
  const mailto = createMailtoLink(invoice.customer_email, subject, body);
  window.location.href = mailto;
  return true;
}

function openInvoiceWhatsAppCompose(invoice) {
  if (!invoice.customer_phone) {
    return false;
  }

  const body = buildInvoiceReceiptText(invoice);
  const whatsappUrl = createWhatsAppLink(invoice.customer_phone, body);
  window.open(whatsappUrl, '_blank');
  return true;
}

function getResponseData(response, fallback = []) {
  if (!response?.success) return fallback;
  return response.data ?? fallback;
}

function getResponseError(response, fallback = 'Unable to load this section.') {
  return response?.success ? '' : response?.message || fallback;
}

function capitalize(value) {
  const text = String(value || '');
  return text ? `${text.charAt(0).toUpperCase()}${text.slice(1).toLowerCase()}` : '';
}

function setButtonLoading(button, isLoading, loadingText) {
  if (!button) return;

  if (isLoading) {
    button.dataset.originalText = button.textContent;
    button.textContent = loadingText;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.originalText || button.textContent;
    button.disabled = false;
    delete button.dataset.originalText;
  }
}

function ensureEditSpinner() {
  const btn = document.getElementById('toggleEditCustomer');
  if (!btn) return null;
  let spinner = btn.querySelector('.edit-spinner');
  if (!spinner) {
    spinner = document.createElement('span');
    spinner.className = 'edit-spinner';
    spinner.setAttribute('aria-hidden', 'true');
    btn.appendChild(spinner);
  }
  return { btn, spinner };
}

function showEditSpinner(show) {
  const res = ensureEditSpinner();
  if (!res) return;
  if (show) {
    res.spinner.classList.add('visible');
    res.btn.disabled = true;
  } else {
    res.spinner.classList.remove('visible');
    res.btn.disabled = false;
  }
}

function formatPhoneAsYouType(val) {
  if (!val) return '';
  const hasPlus = String(val || '').trim().startsWith('+');
  const digits = String(val || '').replace(/[^0-9]/g, '');
  if (hasPlus) {
    let cc = '';
    let rest = digits;
    if (digits.length > 10) {
      cc = digits.slice(0, digits.length - 10);
      rest = digits.slice(digits.length - 10);
    } else if (digits.length <= 3) {
      cc = digits;
      rest = '';
    }
    let formattedRest = '';
    if (!rest) formattedRest = '';
    else if (rest.length <= 3) formattedRest = rest;
    else if (rest.length <= 6) formattedRest = `${rest.slice(0,3)} ${rest.slice(3)}`;
    else formattedRest = `${rest.slice(0,3)} ${rest.slice(3,6)} ${rest.slice(6)}`;
    return cc ? `+${cc}${formattedRest ? ' ' + formattedRest : ''}` : `+${formattedRest}`;
  }

  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0,3)} ${digits.slice(3)}`;
  return `${digits.slice(0,3)} ${digits.slice(3,6)} ${digits.slice(6,10)}`;
}

function renderSectionError(message) {
  return `<div class="section-alert">${escapeHtml(message)}</div>`;
}

function notify(message, type = 'success') {
  const notice = document.getElementById('notice');
  if (!notice) return;

  notice.textContent = message;
  notice.className = `notice ${type}`;
  notice.style.display = 'block';
  setTimeout(() => {
    notice.style.display = 'none';
  }, 3500);
}

function clearFieldErrors(form) {
  if (!form) return;
  form.querySelectorAll('.field-error').forEach(el => el.remove());
  form.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
}

function setFieldError(input, message) {
  if (!input) return;
  input.classList.add('input-error');
  const err = document.createElement('div');
  err.className = 'field-error';
  err.textContent = message;
  if (input.nextSibling) {
    input.parentNode.insertBefore(err, input.nextSibling);
  } else {
    input.parentNode.appendChild(err);
  }
}

function isValidEmail(email) {
  if (!email) return true;
  // simple email regex
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

function normalizePhone(value) {
  if (!value) return '';
  // keep leading + then digits, otherwise keep digits
  const trimmed = String(value).trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/[^0-9]/g, '');
  return hasPlus ? `+${digits}` : digits;
}

function isValidPhone(value) {
  if (!value) return false;
  const v = String(value).trim();
  // Accept E.164-ish formats: optional +, 7-15 digits total
  return /^\+?[1-9][0-9]{6,14}$/.test(v.replace(/[^0-9+]/g, ''));
}

function parseRecipientString(rawList, selEl) {
  const arr = (rawList || '').split(',').map(s => s.trim()).filter(Boolean);
  const seen = new Set();
  const customersByPhone = {};
  (window._cachedCustomers || []).forEach(c => {
    if (c.phone) customersByPhone[normalizePhone(c.phone)] = c;
  });

  const items = arr.map(raw => {
    const normalized = normalizePhone(raw);
    const valid = isValidPhone(normalized);
    const customer = customersByPhone[normalized] || null;
    return { raw, normalized, valid, customer };
  }).filter(it => {
    if (!it.normalized) return false;
    if (seen.has(it.normalized)) return false;
    seen.add(it.normalized);
    return true;
  });

  // also include phones from selected customers if provided
  if (selEl) {
    const selectedIds = Array.from(selEl.selectedOptions || []).map(o => o.value).filter(Boolean);
    selectedIds.forEach(id => {
      const opt = selEl.querySelector(`option[value="${id}"]`);
      const p = (opt?.dataset?.phone || '').trim();
      if (p) {
        const normalized = normalizePhone(p);
        if (!seen.has(normalized)) {
          seen.add(normalized);
          const customer = (window._cachedCustomers || []).find(c => normalizePhone(c.phone) === normalized) || null;
          items.push({ raw: p, normalized, valid: isValidPhone(normalized), customer });
        }
      }
    });
  }

  return items;
}

function showConfirmationPreview(items, onConfirm, onCancel) {
  // items: [{raw, normalized, valid, customer}]
  const existing = document.getElementById('confirmationPreviewModal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'confirmationPreviewModal';
  modal.style.position = 'fixed';
  modal.style.left = '0';
  modal.style.top = '0';
  modal.style.right = '0';
  modal.style.bottom = '0';
  modal.style.background = 'rgba(0,0,0,0.4)';
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.zIndex = '9999';

  const box = document.createElement('div');
  box.style.background = '#fff';
  box.style.padding = '16px';
  box.style.borderRadius = '6px';
  box.style.maxWidth = '720px';
  box.style.width = '90%';
  box.style.maxHeight = '80%';
  box.style.overflow = 'auto';

  const title = document.createElement('h3');
  title.textContent = 'Confirm recipients';
  box.appendChild(title);

  const list = document.createElement('div');
  list.style.margin = '8px 0 12px 0';
  items.forEach(it => {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.justifyContent = 'space-between';
    row.style.padding = '6px 0';
    const left = document.createElement('div');
    left.textContent = `${it.customer ? it.customer.name + ' — ' : ''}${it.raw}`;
    const right = document.createElement('div');
    right.textContent = it.valid ? 'Valid' : 'Invalid';
    right.style.color = it.valid ? 'green' : 'red';
    row.appendChild(left);
    row.appendChild(right);
    list.appendChild(row);
  });
  box.appendChild(list);

  const note = document.createElement('div');
  note.style.fontSize = '13px';
  note.style.color = '#555';
  note.style.marginBottom = '12px';
  note.textContent = 'Only valid numbers will be sent. Invalid numbers will be skipped.';
  box.appendChild(note);

  const btnRow = document.createElement('div');
  btnRow.style.display = 'flex';
  btnRow.style.justifyContent = 'flex-end';
  btnRow.style.gap = '8px';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'btn secondary';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', () => { modal.remove(); if (onCancel) onCancel(); });

  const confirmBtn = document.createElement('button');
  confirmBtn.type = 'button';
  confirmBtn.className = 'btn-primary';
  confirmBtn.textContent = 'Confirm and Send';
  confirmBtn.addEventListener('click', () => { modal.remove(); if (onConfirm) onConfirm(); });

  btnRow.appendChild(cancelBtn);
  btnRow.appendChild(confirmBtn);
  box.appendChild(btnRow);
  modal.appendChild(box);
  document.body.appendChild(modal);
}

function validateCustomerForm(form) {
  const errors = [];
  const data = Object.fromEntries(new FormData(form).entries());

  clearFieldErrors(form);

  const nameInput = form.querySelector('[name="name"]');
  if (!data.name || !String(data.name).trim()) {
    setFieldError(nameInput, 'Name is required.');
    errors.push('name');
  }

  const emailInput = form.querySelector('[name="email"]');
  if (data.email && !isValidEmail(data.email)) {
    setFieldError(emailInput, 'Invalid email address.');
    errors.push('email');
  }

  const phoneInput = form.querySelector('[name="phone"]');
  if (data.phone && String(data.phone).replace(/[^0-9+]/g, '').length < 7) {
    setFieldError(phoneInput, 'Please enter a valid phone number.');
    errors.push('phone');
  }

  // basic date sanity (YYYY-MM-DD) — accept empty
  const dateFields = ['birthday', 'anniversary'];
  for (const field of dateFields) {
    const input = form.querySelector(`[name="${field}"]`);
    const val = data[field];
    if (val) {
      const ts = Date.parse(val);
      if (Number.isNaN(ts)) {
        setFieldError(input, 'Invalid date format.');
        errors.push(field);
      }
    }
  }

  return { ok: errors.length === 0, data };
}

function renderApp() {
  applyTheme();
  const page = getCurrentPage();

  if (window.location.hash && isRegisterPath() && dashboardRoutes.has(page)) {
    redirectDashboardHashToAppShell(page);
    return;
  }

  if (isLoggedIn() && !window.location.hash) {
    window.location.hash = getDefaultDashboardHash();
    return;
  }

  if (isLoggedIn() && authRoutes.has(page)) {
    window.location.hash = getDefaultDashboardHash();
    return;
  }

  if (isLoggedIn() && !dashboardRoutes.has(page)) {
    window.location.hash = getDefaultDashboardHash();
    return;
  }

  if (isLoggedIn()) {
    if (!document.querySelector('.dashboard')) {
      renderDashboardShell();
    }
    navigateDashboard(page);
  } else if (dashboardRoutes.has(page)) {
    localStorage.setItem(pendingRouteKey, getRouteHash(page));
    renderLogin();
  } else if (page === 'register') {
    renderRegister();
  } else {
    renderLogin();
  }

  setupPasswordToggles();
}

function renderDashboardShell() {
  const collapsed = isSidebarCollapsed();
  app.innerHTML = `
    <div class="dashboard ${collapsed ? 'sidebar-collapsed' : ''}">
      <button type="button" id="navToggle" class="nav-toggle" aria-label="Open menu" aria-expanded="false" aria-controls="navbarMenu">
        <span></span>
        <span></span>
        <span></span>
      </button>
      <div class="nav-backdrop" id="navBackdrop" aria-hidden="true"></div>
      <nav class="navbar" aria-label="Primary navigation">
        <div class="navbar-brand">
          <h1><span class="brand-mark">S</span><span class="brand-text">SabiBiz</span></h1>
          <button type="button" id="sidebarCollapse" class="sidebar-collapse" aria-controls="navbarMenu" aria-expanded="${String(!collapsed)}" aria-label="${collapsed ? 'Expand menu' : 'Collapse menu'}" title="${collapsed ? 'Expand menu' : 'Collapse menu'}">
            <span aria-hidden="true"></span>
          </button>
        </div>
        <div class="navbar-menu" id="navbarMenu">
          <a href="#/dashboard" data-route="dashboard" class="nav-item">
            <span class="nav-icon">📊</span>
            <span>Dashboard</span>
          </a>
          <a href="#/inbox" data-route="inbox" class="nav-item">
            <span class="nav-icon">IN</span>
            <span>Inbox</span>
          </a>
          <a href="#/ai" data-route="ai" class="nav-item">
            <span class="nav-icon">AI</span>
            <span>AI Assistant</span>
          </a>
          <a href="#/invoices" data-route="invoices" class="nav-item">
            <span class="nav-icon">📄</span>
            <span>Invoices</span>
          </a>
          <a href="#/inventory" data-route="inventory" class="nav-item">
            <span class="nav-icon">📦</span>
            <span>Inventory</span>
          </a>
          <a href="#/sales" data-route="sales" class="nav-item">
            <span class="nav-icon">💰</span>
            <span>Sales</span>
          </a>
          <a href="#/customers" data-route="customers" class="nav-item">
            <span class="nav-icon">👥</span>
            <span>Customers</span>
          </a>
          <a href="#/campaigns" data-route="campaigns" class="nav-item">
            <span class="nav-icon">CA</span>
            <span>Campaigns</span>
          </a>
          <a href="#/subscriptions" data-route="subscriptions" class="nav-item">
            <span class="nav-icon">🎁</span>
            <span>Billing</span>
          </a>
          <a href="#/settings" data-route="settings" class="nav-item">
            <span class="nav-icon">⚙️</span>
            <span>Settings</span>
          </a>
          <button type="button" id="logoutButton" class="nav-item logout-btn">
            <span class="nav-icon">🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </nav>

      <main class="main-content">
        <div id="notice" class="notice" style="display: none;"></div>
        <section id="content"></section>
      </main>
    </div>
  `;

  const navToggle = document.getElementById('navToggle');
  const navbarMenu = document.getElementById('navbarMenu');
  const sidebarCollapse = document.getElementById('sidebarCollapse');
  const dashboard = document.querySelector('.dashboard');
  const navBackdrop = document.getElementById('navBackdrop');
  applyNavIconLabels();

  function setMobileMenuOpen(isOpen) {
    dashboard?.classList.toggle('mobile-menu-open', isOpen);
    navbarMenu?.classList.toggle('active', isOpen);
    navToggle?.classList.toggle('active', isOpen);
    navToggle?.setAttribute('aria-expanded', String(isOpen));
    navToggle?.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
  }
  
  navToggle?.addEventListener('click', () => {
    setMobileMenuOpen(!dashboard?.classList.contains('mobile-menu-open'));
  });

  navBackdrop?.addEventListener('click', () => setMobileMenuOpen(false));

  sidebarCollapse?.addEventListener('click', () => {
    setSidebarCollapsed(!document.querySelector('.dashboard')?.classList.contains('sidebar-collapsed'));
  });

  navbarMenu?.addEventListener('click', (e) => {
    if (e.target.closest('a') && !e.target.closest('.nav-toggle')) {
      setMobileMenuOpen(false);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      setMobileMenuOpen(false);
    }
  });

  document.getElementById('logoutButton').addEventListener('click', logout);
  setSidebarCollapsed(collapsed);
  updateCustomerList();

  // cache customers for quick lookup by phone during group sends
  window._cachedCustomers = customers;

  // update recipients field when selection changes
  document.getElementById('milestoneCustomerSelect')?.addEventListener('change', (e) => {
    const sel = e.currentTarget;
    const recipientsEl = document.getElementById('milestoneRecipients');
    if (!recipientsEl) return;
    const selected = Array.from(sel.selectedOptions || []).map(o => (o.dataset?.phone || '').trim()).filter(Boolean);
    const existing = (recipientsEl.value || '').split(',').map(s => s.trim()).filter(Boolean);
    const merged = Array.from(new Set(existing.concat(selected)));
    if (merged.length) recipientsEl.value = merged.join(', ');
  });

  // Milestone message generator handlers
  document.getElementById('generateBirthdayForSelected')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const sel = document.getElementById('milestoneCustomerSelect');
    const customerId = sel?.value;
    if (!customerId) {
      notify('Please select a customer to personalize the message.', 'error');
      return;
    }
    // support multiple selections: if multiple selected, generate sample from first and auto-fill recipients
    const selEl = document.getElementById('milestoneCustomerSelect');
    const selectedOptions = Array.from(selEl.selectedOptions || []).map(o => o.value).filter(Boolean);
    if (selectedOptions.length === 0) {
      notify('Please select at least one customer.', 'error');
      return;
    }
    const firstId = selectedOptions[0];
    const res = await API.business.generateMilestoneMessage(firstId, 'birthday');
    const data = getResponseData(res, null);
    if (!data) {
      notify(getResponseError(res, 'Unable to generate birthday message.'), 'error');
      return;
    }
    document.getElementById('milestoneMessagePreview').value = data.message_text || '';
    // populate recipients input with phones of selected customers
    const recipientsEl = document.getElementById('milestoneRecipients');
    const phones = selectedOptions.map(id => {
      const opt = selEl.querySelector(`option[value="${id}"]`);
      return (opt?.dataset?.phone || '').trim();
    }).filter(Boolean);
    if (phones.length) {
      const existing = (recipientsEl.value || '').split(',').map(s => s.trim()).filter(Boolean);
      const merged = Array.from(new Set(existing.concat(phones)));
      recipientsEl.value = merged.join(', ');
    }
    notify('Birthday message generated. For multiple recipients, #name will be personalized on send.');
  });

  document.getElementById('generateAnniversaryForSelected')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const sel = document.getElementById('milestoneCustomerSelect');
    const customerId = sel?.value;
    if (!customerId) {
      notify('Please select a customer to personalize the message.', 'error');
      return;
    }
    const selEl = document.getElementById('milestoneCustomerSelect');
    const selectedOptions = Array.from(selEl.selectedOptions || []).map(o => o.value).filter(Boolean);
    if (selectedOptions.length === 0) {
      notify('Please select at least one customer.', 'error');
      return;
    }
    const firstId = selectedOptions[0];
    const res = await API.business.generateMilestoneMessage(firstId, 'anniversary');
    const data = getResponseData(res, null);
    if (!data) {
      notify(getResponseError(res, 'Unable to generate anniversary message.'), 'error');
      return;
    }
    document.getElementById('milestoneMessagePreview').value = data.message_text || '';
    const recipientsEl = document.getElementById('milestoneRecipients');
    const phones = selectedOptions.map(id => {
      const opt = selEl.querySelector(`option[value="${id}"]`);
      return (opt?.dataset?.phone || '').trim();
    }).filter(Boolean);
    if (phones.length) {
      const existing = (recipientsEl.value || '').split(',').map(s => s.trim()).filter(Boolean);
      const merged = Array.from(new Set(existing.concat(phones)));
      recipientsEl.value = merged.join(', ');
    }
    notify('Anniversary message generated. For multiple recipients, #name will be personalized on send.');
  });

  document.getElementById('sendMilestoneForSelected')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const selEl = document.getElementById('milestoneCustomerSelect');
    const recipientsRaw = (document.getElementById('milestoneRecipients')?.value || '');
    const msgTemplate = document.getElementById('milestoneMessagePreview')?.value || '';
    if (!msgTemplate.trim()) {
      notify('Message is empty. Generate or type a message before sending.', 'error');
      return;
    }

    const items = parseRecipientString(recipientsRaw, selEl);
    if (!items.length) {
      notify('No recipient phone numbers found. Select customers or add phone numbers.', 'error');
      return;
    }

    showConfirmationPreview(items, async () => {
      const validItems = items.filter(i => i.valid);
      if (!validItems.length) {
        notify('No valid phone numbers to send to.', 'error');
        return;
      }

      const results = [];
      for (const it of validItems) {
        const personalized = msgTemplate.replace(/#name/g, it.customer ? (it.customer.name || '') : '');
        try {
          const resp = await API.whatsapp.send({ toPhone: it.normalized, message: personalized });
          results.push({ phone: it.normalized, ok: resp?.success !== false });
        } catch (err) {
          results.push({ phone: it.normalized, ok: false, error: err?.message });
        }
      }

      const successCount = results.filter(r => r.ok).length;
      const failCount = results.length - successCount;
      const invalidCount = items.filter(i => !i.valid).length;
      notify(`${successCount} message(s) sent${failCount ? `, ${failCount} failed` : ''}${invalidCount ? `, ${invalidCount} invalid skipped` : ''}.`);
      if (successCount) document.getElementById('milestoneMessagePreview').value = '';
    }, () => {
      // cancelled
      notify('Send cancelled.');
    });
  });

  document.getElementById('copyMilestoneMessage')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('milestoneMessagePreview')?.value || '';
    if (!msg.trim()) {
      notify('Nothing to copy.', 'error');
      return;
    }

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(msg);
        notify('Message copied to clipboard.');
        updateMilestoneCopyStatus('Copied!');
        return;
      }
    } catch (err) {
      // fall back
    }

    try {
      const ta = document.createElement('textarea');
      ta.value = msg;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      notify('Message copied to clipboard.');
      updateMilestoneCopyStatus('Copied!');
      return;
    } catch (err) {
      // continue to failure
    }
    notify('Unable to copy message.', 'error');
  });
}

function updateMilestoneCopyStatus(text) {
  const status = document.getElementById('copyMilestoneStatus');
  if (!status) return;
  status.textContent = text;
  status.classList.add('visible');
  clearTimeout(status._copyStatusTimer);
  status._copyStatusTimer = setTimeout(() => {
    status.textContent = '';
    status.classList.remove('visible');
  }, 2000);
}

function setActiveRoute(route) {
  document.querySelectorAll('.nav-item').forEach(link => {
    link.classList.toggle('active', link.dataset.route === route);
  });
}

async function navigateDashboard(route) {
  const content = document.getElementById('content');
  if (!content) return;

  const routeInfo = getCurrentRoute();
  setActiveRoute(route);
  content.innerHTML = '<div class="panel"><p>Loading...</p></div>';

  if (route === 'inbox' || route === 'whatsapp') {
    await renderInbox();
  } else if (route === 'ai') {
    await renderAiAssistant();
  } else if (route === 'campaigns') {
    await renderCampaigns();
  } else if (route === 'invoices') {
    await renderInvoices();
  } else if (route === 'inventory') {
    await renderInventory();
  } else if (route === 'sales') {
    await renderSales();
  } else if (route === 'customers') {
    if (routeInfo.id) {
      await renderCustomerDetail(routeInfo.id);
    } else {
      await renderCustomers();
    }
  } else if (route === 'subscriptions') {
    await renderSubscriptions();
  } else if (route === 'settings') {
    await renderSettings();
  } else {
    await renderOverview();
  }

  setupPasswordToggles();
}

async function renderOverview() {
  const [invoicesRes, inventoryRes, salesRes, salesAnalyticsRes, invoiceAnalyticsRes, customersAnalyticsRes, milestoneMessagesRes] = await Promise.all([
    API.business.invoices(),
    API.business.inventory(),
    API.business.sales(),
    API.business.salesAnalytics(),
    API.business.invoiceAnalytics(),
    API.business.customersAnalytics(),
    API.business.milestoneMessages(),
  ]);
  const analyticsRes = await API.analytics.metrics();

  const invoices = getResponseData(invoicesRes);
  const inventory = getResponseData(inventoryRes);
  const sales = getResponseData(salesRes);
  const salesAnalytics = getResponseData(salesAnalyticsRes, {});
  const invoiceAnalytics = getResponseData(invoiceAnalyticsRes, {});
  const customersAnalytics = getResponseData(customersAnalyticsRes, {});
  const milestoneMessages = getResponseData(milestoneMessagesRes, { pending: 0, sent: 0, messages: [] });
  const metrics = getResponseData(analyticsRes);
  const errors = [
    getResponseError(invoicesRes, 'Invoices could not be loaded.'),
    getResponseError(inventoryRes, 'Inventory could not be loaded.'),
    getResponseError(salesRes, 'Sales could not be loaded.'),
    getResponseError(salesAnalyticsRes, 'Sales analytics could not be loaded.'),
    getResponseError(invoiceAnalyticsRes, 'Invoice analytics could not be loaded.'),
    getResponseError(customersAnalyticsRes, 'Customer analytics could not be loaded.'),
    getResponseError(milestoneMessagesRes, 'Milestone messages could not be loaded.'),
    getResponseError(analyticsRes, 'Analytics could not be loaded.'),
  ].filter(Boolean);
  const revenue = invoices
    .filter(invoice => invoice.status === 'paid')
    .reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
  const salesTrend = getSalesTrendData(sales);

  document.getElementById('content').innerHTML = `
    <div class="welcome">
      <h2>Dashboard</h2>
      <p>Your business activity at a glance.</p>
      ${errors.length ? renderSectionError(errors.join(' ')) : ''}
      <div class="stats">
        <div class="stat-card">
          <h3>Invoices</h3>
          <p class="stat-number">${invoices.length}</p>
        </div>
        <div class="stat-card">
          <h3>Paid Revenue</h3>
          <p class="stat-number">${formatMoney(revenue)}</p>
        </div>
        <div class="stat-card">
          <h3>Inventory Items</h3>
          <p class="stat-number">${inventory.length}</p>
        </div>
      </div>
      ${renderSalesOverviewSection(salesAnalytics)}
      ${renderInvoiceAnalyticsSection(invoiceAnalytics)}
      ${renderMilestoneOverviewSection(customersAnalytics, milestoneMessages)}
      ${renderSalesTrendSection(salesTrend)}
      ${renderRecentMetrics(metrics)}
    </div>
  `;

  document.getElementById('editMilestoneTemplatesButton')?.addEventListener('click', async () => {
    const templatesRes = await API.business.milestoneTemplates();
    const templates = getResponseData(templatesRes, {});
    if (!templates) {
      notify(getResponseError(templatesRes, 'Unable to load milestone templates.'), 'error');
      return;
    }

    const birthdayTemplate = window.prompt('Edit birthday message template', templates.birthday_message_template || '');
    if (birthdayTemplate === null) return;
    const anniversaryTemplate = window.prompt('Edit anniversary message template', templates.anniversary_message_template || '');
    if (anniversaryTemplate === null) return;

    const saveRes = await API.business.saveMilestoneTemplates({
      birthday_message_template: birthdayTemplate,
      anniversary_message_template: anniversaryTemplate,
    });
    if (!getResponseData(saveRes, null)) {
      notify(getResponseError(saveRes, 'Failed to save milestone templates.'), 'error');
      return;
    }
    notify('Milestone templates updated successfully.');
  });

  document.querySelectorAll('.generate-milestone-message').forEach(button => {
    button.addEventListener('click', async () => {
      const customerId = button.dataset.customerId;
      const milestoneType = button.dataset.milestoneType;
      const messageRes = await API.business.generateMilestoneMessage(customerId, milestoneType);
      const messageData = getResponseData(messageRes, null);
      if (!messageData) {
        notify(getResponseError(messageRes, 'Unable to generate milestone message.'), 'error');
        return;
      }

      const editedMessage = window.prompt(`Edit ${milestoneType} message for ${messageData.customer_name}`, messageData.message_text);
      if (editedMessage === null) return;

      const sendRes = await API.business.sendMilestoneMessage({
        customerId,
        milestoneType,
        messageText: editedMessage,
      });
      if (!getResponseData(sendRes, null)) {
        notify(getResponseError(sendRes, 'Failed to send milestone message.'), 'error');
        return;
      }
      notify('Milestone message is queued for delivery.');
      await renderOverview();
    });
  });
}

function renderMilestoneOverviewSection(analytics, milestoneMessages) {
  const upcomingBirthdays = analytics?.upcoming_birthdays || [];
  const upcomingAnniversaries = analytics?.upcoming_anniversaries || [];
  return `
    <div class="subsection compact-overview">
      <h3>Milestone Messages</h3>
      <div class="overview-grid">
        <div class="overview-card">
          <h4>Pending</h4>
          <p>${milestoneMessages.pending || 0}</p>
        </div>
        <div class="overview-card">
          <h4>Sent</h4>
          <p>${milestoneMessages.sent || 0}</p>
        </div>
        <div class="overview-card milestone-templates-card">
          <h4>Message Templates</h4>
          <p>Use the default templates or edit them to personalize every milestone.</p>
          <button type="button" id="editMilestoneTemplatesButton" class="btn small">Edit templates</button>
        </div>
      </div>
      <div class="overview-grid milestone-event-grid">
        <div class="overview-card">
          <h4>Upcoming Birthdays</h4>
          <ul class="event-list">
            ${upcomingBirthdays.length ? upcomingBirthdays.map(customer => `
              <li>
                <strong>${escapeHtml(customer.name)}</strong><br>
                ${formatExactDate(customer.next_date)}<br>
                <button type="button" class="btn small generate-milestone-message" data-customer-id="${escapeHtml(customer.id)}" data-milestone-type="birthday">Generate message</button>
              </li>
            `).join('') : '<li>No birthdays in the next 30 days</li>'}
          </ul>
        </div>
        <div class="overview-card">
          <h4>Upcoming Anniversaries</h4>
          <ul class="event-list">
            ${upcomingAnniversaries.length ? upcomingAnniversaries.map(customer => `
              <li>
                <strong>${escapeHtml(customer.name)}</strong><br>
                ${formatExactDate(customer.next_date)}<br>
                <button type="button" class="btn small generate-milestone-message" data-customer-id="${escapeHtml(customer.id)}" data-milestone-type="anniversary">Generate message</button>
              </li>
            `).join('') : '<li>No anniversaries in the next 30 days</li>'}
          </ul>
        </div>
      </div>
    </div>
  `;
}

function renderSalesOverviewSection(analytics) {
  if (!analytics || Object.keys(analytics).length === 0) {
    return '';
  }

  return `
    <div class="subsection compact-overview">
      <h3>Sales Overview</h3>
      <div class="overview-grid">
        <div class="overview-card">
          <h4>Total Revenue</h4>
          <p>${formatMoney(analytics.total_sales)}</p>
        </div>
        <div class="overview-card">
          <h4>Total Profit</h4>
          <p>${formatMoney(analytics.total_profit)}</p>
        </div>
        <div class="overview-card">
          <h4>Avg Margin</h4>
          <p>${analytics.avg_margin != null ? `${analytics.avg_margin.toFixed(2)}%` : '-'}</p>
        </div>
        <div class="overview-card">
          <h4>Total Loss</h4>
          <p>${formatMoney(analytics.total_loss)}</p>
        </div>
        <div class="overview-card">
          <h4>Best Product</h4>
          <p>${escapeHtml(analytics.top_product || '-')}</p>
        </div>
        <div class="overview-card">
          <h4>Top Sale Time</h4>
          <p>${escapeHtml(analytics.highest_sale_time || '-')}</p>
        </div>
      </div>
    </div>
  `;
}

function getSalesTrendData(sales) {
  const dateMap = {};
  const now = new Date();

  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    const key = date.toISOString().slice(0, 10);
    dateMap[key] = 0;
  }

  sales.forEach((sale) => {
    const dateKey = (sale.sale_date || sale.sale_time || '').slice(0, 10);
    if (dateKey && Object.prototype.hasOwnProperty.call(dateMap, dateKey)) {
      dateMap[dateKey] += Number(sale.total_amount || 0);
    }
  });

  return Object.keys(dateMap).map(date => ({
    date,
    value: dateMap[date],
  }));
}

function renderSalesTrendSection(trend) {
  if (!Array.isArray(trend) || trend.length === 0) {
    return '';
  }

  const maxValue = Math.max(...trend.map(point => point.value), 1);
  const total = trend.reduce((sum, point) => sum + point.value, 0);
  const latest = trend[trend.length - 1]?.value || 0;
  const previous = trend[trend.length - 2]?.value || 0;
  const trendDirection = latest >= previous ? 'up' : 'down';
  const change = previous === 0 ? latest : ((latest - previous) / Math.max(previous, 1)) * 100;

  return `
    <div class="subsection sales-trend">
      <div class="sales-trend-header">
        <div>
          <h3>Sales Trend</h3>
          <p>Recent daily sales performance.</p>
        </div>
        <div class="sales-trend-summary ${trendDirection}">
          <span>${trendDirection === 'up' ? '▲' : '▼'}</span>
          <span class="trend-badge ${trendDirection}">${change.toFixed(1)}%</span>
          <small>vs yesterday</small>
        </div>
      </div>
      <div class="sparkline" role="img" aria-label="Sales trend sparkline">
        ${trend.map(point => `
          <div class="sparkline-bar" style="height: ${Math.max(10, (point.value / maxValue) * 100)}%" title="${point.date}: ${formatMoney(point.value)}"></div>
        `).join('')}
      </div>
      <div class="sparkline-legend">
        ${trend.map(point => `
          <span>${point.date.slice(5)}</span>
        `).join('')}
      </div>
    </div>
  `;
}

function renderRecentMetrics(metrics) {
  if (!metrics.length) {
    return '';
  }

  return `
    <div class="subsection">
      <h3>Recent Metrics</h3>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Metric</th>
              <th>Value</th>
              <th>Period</th>
            </tr>
          </thead>
          <tbody>
            ${metrics.slice(0, 5).map(metric => `
              <tr>
                <td>${escapeHtml(metric.metric_type || '-')}</td>
                <td>${escapeHtml(metric.metric_value ?? '-')}</td>
                <td>${formatDate(metric.period_date)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

async function renderInvoices() {
  const [invoicesRes, inventoryRes, customersRes, analyticsRes] = await Promise.all([
    API.business.invoices(),
    API.business.inventory(),
    API.business.customers(),
    API.business.invoiceAnalytics(),
  ]);

  const invoices = getResponseData(invoicesRes);
  const inventory = getResponseData(inventoryRes);
  const customers = getResponseData(customersRes);
  const analytics = getResponseData(analyticsRes, {});

  const errors = [
    getResponseError(invoicesRes, 'Invoices could not be loaded.'),
    getResponseError(inventoryRes, 'Inventory could not be loaded.'),
    getResponseError(customersRes, 'Customers could not be loaded.'),
    getResponseError(analyticsRes, 'Invoice analytics could not be loaded.'),
  ].filter(Boolean);

  document.getElementById('content').innerHTML = `
    <div class="panel">
      <div class="panel-header">
        <div>
          <h2>Invoices</h2>
          <p>Create, edit, and send invoices to customers.</p>
        </div>
      </div>
      ${errors.length ? renderSectionError(errors.join(' ')) : ''}
      ${renderInvoiceAnalyticsSection(analytics)}
      
      <form id="invoiceForm" class="invoice-form">
        <input type="hidden" id="invoiceCustomerId" name="customer_id">
        
        <!-- CUSTOMER SECTION -->
        <div class="invoice-section">
          <div class="section-header">
            <h3>Customer Information</h3>
          </div>
          <div class="section-content">
            <div class="form-row">
              <div class="form-group">
                <label for="invoiceCustomerSelect">Select Existing Customer</label>
                <select id="invoiceCustomerSelect" class="form-control">
                  <option value="">+ New Customer</option>
                  ${customers.map(customer => `
                    <option value="${customer.id}"
                      data-phone="${escapeHtml(customer.phone || '')}"
                      data-email="${escapeHtml(customer.email || '')}"
                      data-delivery-address="${escapeHtml(customer.delivery_address || '')}">
                      ${escapeHtml(customer.name)}${customer.phone ? ` — ${escapeHtml(customer.phone)}` : ''}${customer.email ? ` — ${escapeHtml(customer.email)}` : ''}
                    </option>
                  `).join('')}
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="invoiceCustomer">Customer Name *</label>
                <input id="invoiceCustomer" name="customer_name" placeholder="Full name" required>
              </div>
              <div class="form-group">
                <label for="invoicePhone">Phone Number</label>
                <input id="invoicePhone" name="customer_phone" type="tel" placeholder="+234...">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="invoiceEmail">Email Address</label>
                <input id="invoiceEmail" name="customer_email" type="email" placeholder="customer@example.com">
              </div>
              <div class="form-group">
                <label for="invoiceDeliveryAddress">Delivery Address</label>
                <input id="invoiceDeliveryAddress" name="delivery_address" placeholder="Delivery / shipping address">
              </div>
            </div>
          </div>
        </div>

        <!-- INVOICE DETAILS SECTION -->
        <div class="invoice-section">
          <div class="section-header">
            <h3>Invoice Details</h3>
          </div>
          <div class="section-content">
            <div class="form-row">
              <div class="form-group">
                <label for="invoiceDueDate">Due Date</label>
                <input id="invoiceDueDate" name="due_date" type="date">
              </div>
              <div class="form-group">
                <label for="invoiceStatus">Status</label>
                <select id="invoiceStatus" name="status">
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="invoiceDescription">Product Summary</label>
                <textarea id="invoiceDescription" name="description" placeholder="Product list and quantities will be generated here as you add items" rows="3"></textarea>
              </div>
            </div>
            <div class="form-row checkbox-row">
              <div class="form-group checkbox-group">
                <label>
                  <input id="invoiceAutoMail" name="auto_mail" type="checkbox">
                  <span>Auto send via Email</span>
                </label>
              </div>
              <div class="form-group checkbox-group">
                <label>
                  <input id="invoiceAutoWhatsapp" name="auto_whatsapp" type="checkbox">
                  <span>Auto send via WhatsApp</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- PRODUCTS SECTION -->
        <div class="invoice-section">
          <div class="section-header">
            <h3>Products & Services</h3>
            <button type="button" id="addInvoiceItem" class="btn-secondary btn-sm">+ Add Item</button>
          </div>
          <div class="section-content">
            <div id="invoiceItemsContainer" class="invoice-items-list">
              ${createInvoiceItemRow(0, inventory)}
            </div>
          </div>
        </div>

        <!-- INVOICE TOTAL SECTION -->
        <div class="invoice-section total-section">
          <div class="total-display">
            <div class="total-label">Invoice Total</div>
            <div class="total-amount">
              <span id="invoiceTotalDisplay">NGN 0.00</span>
              <input id="invoiceAmount" name="amount" type="hidden" value="0">
            </div>
          </div>
        </div>

        <!-- SUBMIT BUTTON -->
        <div class="invoice-section">
          <button type="submit" class="btn-primary btn-lg form-action" id="invoiceSubmitButton">Create Invoice</button>
        </div>
      </form>
      ${renderInvoiceTable(invoices)}
    </div>
  `;

  const invoiceCustomerSelect = document.getElementById('invoiceCustomerSelect');
  const invoiceCustomer = document.getElementById('invoiceCustomer');
  const invoicePhone = document.getElementById('invoicePhone');
  const invoiceEmail = document.getElementById('invoiceEmail');
  const invoiceDeliveryAddress = document.getElementById('invoiceDeliveryAddress');
  const invoiceAmount = document.getElementById('invoiceAmount');
  const invoiceItemsContainer = document.getElementById('invoiceItemsContainer');
  const invoiceForm = document.getElementById('invoiceForm');
  const invoiceSubmitButton = document.getElementById('invoiceSubmitButton');
  let editingInvoiceId = null;

  const setTotalAmount = () => {
    const items = Array.from(invoiceItemsContainer.querySelectorAll('.invoice-item-row'));
    const total = items.reduce((sum, row) => {
      const value = Number(row.querySelector('[name="total_price"]').value || 0);
      return sum + value;
    }, 0);
    invoiceAmount.value = total.toFixed(2);
    const totalDisplay = document.getElementById('invoiceTotalDisplay');
    if (totalDisplay) {
      totalDisplay.textContent = `NGN ${total.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
    }
  };

  const generateDescriptionFromItems = () => {
    const rows = Array.from(invoiceItemsContainer.querySelectorAll('.invoice-item-row'));
    const lines = rows
      .map(row => {
        const name = row.querySelector('[name="product_name"]').value.trim() || 'Unnamed product';
        const quantity = Number(row.querySelector('[name="quantity"]').value || 0);
        return quantity > 0 ? `${quantity} x ${name}` : null;
      })
      .filter(line => line);

    return lines.length ? lines.join('\n') : '';
  };

  const syncRowTotal = (row) => {
    const quantity = Number(row.querySelector('[name="quantity"]').value || 0);
    const unitPrice = Number(row.querySelector('[name="unit_price"]').value || 0);
    row.querySelector('[name="total_price"]').value = (quantity * unitPrice).toFixed(2);
    setTotalAmount();
    document.getElementById('invoiceDescription').value = generateDescriptionFromItems();
  };

  const refreshInvoiceTotals = () => {
    Array.from(invoiceItemsContainer.querySelectorAll('.invoice-item-row')).forEach(syncRowTotal);
    setTotalAmount();
  };

  invoiceCustomerSelect.addEventListener('change', () => {
    const selected = invoiceCustomerSelect.selectedOptions[0];
    if (!selected || !selected.value) {
      document.getElementById('invoiceCustomerId').value = '';
      invoiceCustomer.value = '';
      invoicePhone.value = '';
      invoiceEmail.value = '';
      invoiceDeliveryAddress.value = '';
      return;
    }
    document.getElementById('invoiceCustomerId').value = selected.value;
    invoiceCustomer.value = selected.textContent.split(' — ')[0].trim();
    invoicePhone.value = selected.dataset.phone || '';
    invoiceEmail.value = selected.dataset.email || '';
    invoiceDeliveryAddress.value = selected.dataset.deliveryAddress || '';
  });

  document.getElementById('addInvoiceItem').addEventListener('click', () => {
    const rowCount = invoiceItemsContainer.querySelectorAll('.invoice-item-row').length;
    invoiceItemsContainer.insertAdjacentHTML('beforeend', createInvoiceItemRow(rowCount, inventory));
    document.getElementById('invoiceDescription').value = generateDescriptionFromItems();
  });

  invoiceItemsContainer.addEventListener('input', (event) => {
    const row = event.target.closest('.invoice-item-row');
    if (!row) return;
    if (event.target.matches('[name="inventory_id"]')) {
      const selected = event.target.selectedOptions[0];
      if (selected) {
        row.querySelector('[name="product_name"]').value = selected.dataset.name || row.querySelector('[name="product_name"]').value;
        row.querySelector('[name="unit_price"]').value = selected.dataset.unitPrice || '0';
      }
      syncRowTotal(row);
    }
    if (event.target.matches('[name="quantity"], [name="unit_price"], [name="product_name"]')) {
      syncRowTotal(row);
    }
  });

  invoiceItemsContainer.addEventListener('click', (event) => {
    const removeButton = event.target.closest('.remove-invoice-item');
    if (!removeButton) return;
    event.preventDefault();
    const row = removeButton.closest('.invoice-item-row');
    row?.remove();
    refreshInvoiceTotals();
    document.getElementById('invoiceDescription').value = generateDescriptionFromItems();
  });

  const populateInvoiceForm = (invoice) => {
    editingInvoiceId = invoice.id;
    document.getElementById('invoiceCustomerId').value = invoice.customer_id || '';
    invoiceCustomerSelect.value = invoice.customer_id || '';
    invoiceCustomer.value = invoice.customer_name || '';
    invoicePhone.value = invoice.customer_phone || '';
    invoiceEmail.value = invoice.customer_email || '';
    invoiceDeliveryAddress.value = invoice.delivery_address || '';
    invoiceAmount.value = invoice.amount || 0;
    document.getElementById('invoiceDueDate').value = invoice.due_date || '';
    document.getElementById('invoiceStatus').value = invoice.status || 'draft';
    document.getElementById('invoiceDescription').value = invoice.items ? invoice.items.map(item => `${Number(item.quantity || 0)} x ${item.product_name || item.inventory_name || 'Unnamed product'}`).join('\n') : '';
    document.getElementById('invoiceAutoMail').checked = !!invoice.auto_mail;
    document.getElementById('invoiceAutoWhatsapp').checked = !!invoice.auto_whatsapp;
    invoiceItemsContainer.innerHTML = invoice.items.map((item, index) => createInvoiceItemRow(index, inventory, item)).join('');
    refreshInvoiceTotals();
    invoiceSubmitButton.textContent = 'Update Invoice';
  };

  const clearInvoiceForm = () => {
    editingInvoiceId = null;
    document.getElementById('invoiceCustomerId').value = '';
    invoiceCustomerSelect.value = '';
    invoiceCustomer.value = '';
    invoicePhone.value = '';
    invoiceEmail.value = '';
    invoiceDeliveryAddress.value = '';
    invoiceAmount.value = '0.00';
    document.getElementById('invoiceDueDate').value = '';
    document.getElementById('invoiceStatus').value = 'draft';
    document.getElementById('invoiceDescription').value = '';
    document.getElementById('invoiceAutoMail').checked = false;
    document.getElementById('invoiceAutoWhatsapp').checked = false;
    invoiceItemsContainer.innerHTML = createInvoiceItemRow(0, inventory);
    invoiceSubmitButton.textContent = 'Create Invoice';
  };

  invoiceForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    setButtonLoading(invoiceSubmitButton, true, editingInvoiceId ? 'Updating...' : 'Saving...');
    const rawData = Object.fromEntries(new FormData(invoiceForm).entries());
    const items = Array.from(invoiceItemsContainer.querySelectorAll('.invoice-item-row')).map(row => ({
      inventory_id: row.querySelector('[name="inventory_id"]').value || null,
      product_name: row.querySelector('[name="product_name"]').value.trim(),
      quantity: Number(row.querySelector('[name="quantity"]').value || 0),
      unit_price: Number(row.querySelector('[name="unit_price"]').value || 0),
      total_price: Number(row.querySelector('[name="total_price"]').value || 0),
    })).filter(item => item.product_name && item.quantity > 0);

    const data = {
      customer_id: rawData.customer_id || null,
      customer_name: rawData.customer_name,
      customer_phone: rawData.customer_phone,
      customer_email: rawData.customer_email || null,
      delivery_address: rawData.delivery_address || null,
      amount: Number(rawData.amount || 0),
      due_date: rawData.due_date || null,
      status: rawData.status || 'draft',
      description: rawData.description || null,
      auto_mail: document.getElementById('invoiceAutoMail').checked,
      auto_whatsapp: document.getElementById('invoiceAutoWhatsapp').checked,
      invoice_items: items,
    };

    const result = editingInvoiceId
      ? await API.business.updateInvoice(editingInvoiceId, data)
      : await API.business.createInvoice(data);

    if (result?.success) {
      notify(editingInvoiceId ? 'Invoice updated.' : 'Invoice created.');
      clearInvoiceForm();
      await renderInvoices();
    } else {
      notify(result?.message || 'Unable to save invoice.', 'error');
      setButtonLoading(invoiceSubmitButton, false);
    }
  });

  document.getElementById('content')?.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;

    const invoiceId = button.dataset.invoiceId;
    if (!invoiceId) return;

    if (button.dataset.action === 'edit') {
      const response = await API.business.invoice(invoiceId);
      const invoice = getResponseData(response, null);
      if (invoice) {
        populateInvoiceForm(invoice);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        notify(response?.message || 'Unable to load invoice.', 'error');
      }
      return;
    }

    if (button.dataset.action === 'whatsapp' || button.dataset.action === 'email') {
      const response = await API.business.invoice(invoiceId);
      const invoice = getResponseData(response, null);
      if (!invoice) {
        notify(response?.message || 'Unable to load invoice details.', 'error');
        return;
      }

      const isWhatsApp = button.dataset.action === 'whatsapp';
      const opened = isWhatsApp
        ? openInvoiceWhatsAppCompose(invoice)
        : openInvoiceEmailCompose(invoice);

      if (!opened) {
        const missingField = isWhatsApp ? 'phone number' : 'email address';
        notify(`Unable to ${button.dataset.action} invoice: customer ${missingField} is missing.`, 'error');
        return;
      }

      notify(`Opening ${button.dataset.action} compose window...`);
      return;
    }
  });
}

function renderInvoiceTable(invoices) {
  if (!invoices.length) {
    return '<div class="empty-state">No invoices yet. Create your first invoice above!</div>';
  }

  return `
    <div class="invoices-section">
      <div class="section-header">
        <h3>Recent Invoices</h3>
      </div>
      <div class="invoices-list">
        ${invoices.map(invoice => `
          <div class="invoice-card">
            <div class="invoice-card-header">
              <div class="invoice-info">
                <h4>${escapeHtml(invoice.customer_name || '-')}</h4>
                <p class="invoice-id">Invoice #${invoice.id}</p>
                ${( !invoice.customer_phone || !invoice.customer_email ) ? `
                  <div class="invoice-badges">
                    ${!invoice.customer_phone ? '<span class="contact-badge">Missing phone</span>' : ''}
                    ${!invoice.customer_email ? '<span class="contact-badge">Missing email</span>' : ''}
                  </div>
                ` : ''}
              </div>
              <span class="status ${escapeHtml(invoice.status || 'draft')}">${escapeHtml(invoice.status || 'draft')}</span>
            </div>
            <div class="invoice-card-body">
              <div class="invoice-detail">
                <span class="label">Amount</span>
                <span class="value">${formatMoney(invoice.amount)}</span>
              </div>
              <div class="invoice-detail">
                <span class="label">Items</span>
                <span class="value">${Number(invoice.item_count || 0)}</span>
              </div>
              <div class="invoice-detail">
                <span class="label">Due</span>
                <span class="value">${formatDate(invoice.due_date) || '-'}</span>
              </div>
            </div>
            <div class="invoice-card-actions">
              <button class="btn-link" data-action="edit" data-invoice-id="${invoice.id}">Edit</button>
              <button class="btn-link" ${!invoice.customer_phone ? 'disabled title="Add customer phone to enable WhatsApp"' : ''} data-action="whatsapp" data-invoice-id="${invoice.id}">WhatsApp</button>
              <button class="btn-link" ${!invoice.customer_email ? 'disabled title="Add customer email to enable Email"' : ''} data-action="email" data-invoice-id="${invoice.id}">Email</button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderInvoiceAnalyticsSection(analytics) {
  return `
    <div class="overview-grid">
      <div class="overview-card">
        <h4>Total Invoices</h4>
        <p>${analytics.total_invoices ?? 0}</p>
      </div>
      <div class="overview-card">
        <h4>Paid</h4>
        <p>${analytics.paid_invoices ?? 0}</p>
      </div>
      <div class="overview-card">
        <h4>Pending</h4>
        <p>${formatMoney(analytics.pending_amount)}</p>
      </div>
      <div class="overview-card">
        <h4>Overdue</h4>
        <p>${formatMoney(analytics.overdue_amount)}</p>
      </div>
      <div class="overview-card">
        <h4>Items Sold</h4>
        <p>${analytics.total_items_sold ?? 0}</p>
      </div>
      <div class="overview-card">
        <h4>Top Product</h4>
        <p>${escapeHtml(analytics.top_product || '-')}</p>
      </div>
    </div>
  `;
}

function createInvoiceItemRow(index, inventory, item = {}) {
  return `
    <div class="invoice-item-row" data-row="${index}">
      <div class="item-card">
        <div class="item-header">
          <div class="item-number">#${index + 1}</div>
          <button type="button" class="btn-remove remove-invoice-item" title="Remove item">×</button>
        </div>
        
        <div class="item-form-group">
          <label>Product / Service</label>
          <select name="inventory_id" class="invoice-product-select form-control">
            <option value="">Select from inventory</option>
            ${inventory.map(product => `
              <option value="${product.id}"
                data-name="${escapeHtml(product.product_name)}"
                data-unit-price="${product.unit_price || 0}"
                ${item.inventory_id === product.id ? 'selected' : ''}>
                ${escapeHtml(product.product_name)} (NGN ${Number(product.unit_price || 0).toFixed(2)})
              </option>
            `).join('')}
          </select>
          <input type="text" name="product_name" class="form-control" value="${escapeHtml(item.product_name || '')}" placeholder="Or type product name">
        </div>
        
        <div class="item-grid">
          <div class="item-form-group">
            <label>Quantity</label>
            <input name="quantity" type="number" min="1" class="form-control" value="${Number(item.quantity || 1)}">
          </div>
          
          <div class="item-form-group">
            <label>Unit Price (NGN)</label>
            <input name="unit_price" type="number" min="0" step="0.01" class="form-control" value="${Number(item.unit_price || 0).toFixed(2)}">
          </div>
          
          <div class="item-form-group">
            <label>Total (NGN)</label>
            <input name="total_price" type="number" min="0" step="0.01" class="form-control total-price-input" value="${Number(item.total_price || (Number(item.quantity || 1) * Number(item.unit_price || 0))).toFixed(2)}" readonly>
          </div>
        </div>
      </div>
    </div>
  `;
}

async function renderCustomers() {
  const [customersRes, analyticsRes] = await Promise.all([
    API.business.customers(),
    API.business.customersAnalytics(),
  ]);

  const customers = getResponseData(customersRes);
  const analytics = getResponseData(analyticsRes, {});

  const errors = [
    getResponseError(customersRes, 'Customers could not be loaded.'),
    getResponseError(analyticsRes, 'Customer analytics could not be loaded.'),
  ].filter(Boolean);

  document.getElementById('content').innerHTML = `
    <div class="panel">
      <div class="panel-header">
        <div>
          <h2>Customers</h2>
          <p>Manage customer profiles, track customer purchases, and uncover loyalty insights.</p>
        </div>
      </div>
      ${errors.length ? renderSectionError(errors.join(' ')) : ''}

      <div class="overview-grid customer-overview-grid">
        <div class="overview-card">
          <h4>Total Customers</h4>
          <p>${analytics.total_customers ?? 0}</p>
        </div>
        <div class="overview-card">
          <h4>Invoices Paid</h4>
          <p>${analytics.paid_invoices ?? 0}</p>
        </div>
        <div class="overview-card">
          <h4>Pending Invoices</h4>
          <p>${analytics.pending_invoices ?? 0}</p>
        </div>
        <div class="overview-card">
          <h4>Total Revenue</h4>
          <p>${formatMoney(analytics.total_revenue)}</p>
        </div>
        <div class="overview-card">
          <h4>Total Profit</h4>
          <p>${formatMoney(analytics.total_profit)}</p>
        </div>
        <div class="overview-card">
          <h4>Top Product</h4>
          <p>${escapeHtml(analytics.top_product || '-')}</p>
        </div>
      </div>

      <div class="panel-section customer-actions">
        <div class="section-header">
          <h3>Create New Customer</h3>
        </div>
        <form id="customerForm" class="form-grid customer-form">
          <div class="form-row">
            <div class="form-group">
              <label for="customerName">Customer Name *</label>
              <input id="customerName" name="name" type="text" required placeholder="Full name">
            </div>
            <div class="form-group">
              <label for="customerPhone">Phone</label>
              <input id="customerPhone" name="phone" type="tel" placeholder="+234...">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="customerEmail">Email</label>
              <input id="customerEmail" name="email" type="email" placeholder="customer@example.com">
            </div>
            <div class="form-group">
              <label for="customerCity">City</label>
              <input id="customerCity" name="city" placeholder="City">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="customerRegion">Region</label>
              <input id="customerRegion" name="region" placeholder="State / region">
            </div>
            <div class="form-group">
              <label for="customerDeliveryAddress">Delivery Address</label>
              <input id="customerDeliveryAddress" name="delivery_address" placeholder="Street, area, landmark">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="customerBirthday">Birthday</label>
              <input id="customerBirthday" name="birthday" type="date">
            </div>
            <div class="form-group">
              <label for="customerAnniversary">Anniversary</label>
              <input id="customerAnniversary" name="anniversary" type="date">
            </div>
          </div>
          <div class="form-row checkbox-row">
            <div class="form-group checkbox-group">
              <label>
                <input id="customerAutoBirthday" name="auto_birthday" type="checkbox">
                <span>Auto birthday messages</span>
              </label>
            </div>
            <div class="form-group checkbox-group">
              <label>
                <input id="customerAutoAnniversary" name="auto_anniversary" type="checkbox">
                <span>Auto anniversary messages</span>
              </label>
            </div>
          </div>
          <div class="invoice-section">
            <button type="submit" class="btn-primary btn-lg form-action">Create Customer</button>
          </div>
        </form>
      </div>

      <div class="panel-section milestone-generator">
        <div class="section-header">
          <div>
            <h3>Milestone Message Generator</h3>
            <p>Generate personalized messages for birthdays or anniversaries.</p>
          </div>
        </div>
        <div class="milestone-body">
          <div class="form-row">
            <div class="form-group">
              <label for="milestoneCustomerSelect">Select Customer(s)</label>
              <select id="milestoneCustomerSelect" multiple size="6">
                ${customers.map(c => `<option value="${c.id}" data-phone="${escapeHtml(c.phone||'')}">${escapeHtml(c.name)}${c.phone ? ` — ${escapeHtml(c.phone)}` : ''}</option>`).join('')}
              </select>
              <p class="form-help">Hold Ctrl/Cmd or Shift to select multiple customers.</p>
            </div>
            <div class="form-group">
              <label>&nbsp;</label>
              <div class="button-row">
                <button id="generateBirthdayForSelected" class="btn">Generate Birthday message</button>
                <button id="generateAnniversaryForSelected" class="btn">Generate Anniversary message</button>
              </div>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group" style="flex:1">
              <label for="milestoneRecipients">Recipients (phones, comma separated)</label>
              <input id="milestoneRecipients" class="form-control" placeholder="+2348012345678, +447712345678" />
              <p class="form-help">Selected customers' phone numbers are auto-added here. You can also paste extra numbers.</p>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group" style="flex:1">
              <label for="milestoneMessagePreview">Message Preview</label>
              <textarea id="milestoneMessagePreview" rows="4" class="form-control" placeholder="Generated message will appear here. Use #name to personalize per recipient."></textarea>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <button id="sendMilestoneForSelected" class="btn-primary">Send Generated Message</button>
              <button id="copyMilestoneMessage" class="btn">Copy</button>
              <span id="copyMilestoneStatus" class="copy-status"></span>
            </div>
          </div>
        </div>
      </div>

      <div class="panel-section customer-list-section">
        <div class="section-header customer-list-header">
          <div>
            <h3>Customer Directory</h3>
            <p>Filter customers by name, city, region, or invoice status.</p>
          </div>
          <div class="customer-filters">
            <input id="customerSearch" type="search" placeholder="Search name, email, or phone">
            <select id="customerCityFilter">
              <option value="">All cities</option>
              ${[...new Set(customers.filter(c => c.city).map(c => c.city))].sort().map(city => `
                <option value="${escapeHtml(city)}">${escapeHtml(city)}</option>
              `).join('')}
            </select>
            <select id="customerRegionFilter">
              <option value="">All regions</option>
              ${[...new Set(customers.filter(c => c.region).map(c => c.region))].sort().map(region => `
                <option value="${escapeHtml(region)}">${escapeHtml(region)}</option>
              `).join('')}
            </select>
            <select id="customerStatusFilter">
              <option value="">All statuses</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
            </select>
            <button id="downloadCustomersButton" class="btn btn-secondary">Download Excel</button>
          </div>
        </div>
        <div class="table-wrap">
          <table class="data-table customer-list-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Contact</th>
                <th>Location</th>
                <th>Revenue</th>
                <th>Profit</th>
                <th>Invoices</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="customerTableBody">
              ${customers.map(customer => {
                const status = customer.pending_invoices ? 'pending' : 'paid';
                return `
                  <tr>
                    <td><a class="customer-link" href="#/customers/${customer.id}">${escapeHtml(customer.name)}</a></td>
                    <td>${escapeHtml(customer.email || customer.phone || '-')}</td>
                    <td>${escapeHtml(customer.city || '-')}, ${escapeHtml(customer.region || '-')}</td>
                    <td>${formatMoney(customer.total_spent)}</td>
                    <td>${formatMoney(customer.total_profit)}</td>
                    <td>${customer.invoice_count || 0}</td>
                    <td><span class="status-pill ${status}">${status === 'pending' ? `${customer.pending_invoices} pending` : 'Paid'}</span></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="panel-section customer-grouping">
        <div class="section-header">
          <h3>Region & City Groups</h3>
        </div>
        <div class="overview-grid">
          ${analytics.top_regions?.map(region => `
            <div class="overview-card">
              <h4>${escapeHtml(region.region || 'Unknown')}</h4>
              <p>${region.customers} customers</p>
              <p>${formatMoney(region.revenue)}</p>
            </div>
          `).join('')}
          ${analytics.top_cities?.map(city => `
            <div class="overview-card">
              <h4>${escapeHtml(city.city || 'Unknown')}</h4>
              <p>${city.customers} customers</p>
              <p>${formatMoney(city.revenue)}</p>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="panel-section customer-events">
        <div class="section-header">
          <h3>Upcoming Milestones</h3>
        </div>
        <div class="overview-grid">
          <div class="overview-card">
            <h4>Birthdays</h4>
            <ul class="event-list">
              ${analytics.upcoming_birthdays?.length ? analytics.upcoming_birthdays.map(customer => `
                <li>${escapeHtml(customer.name)} — ${formatDate(customer.birthday)}</li>
              `).join('') : '<li>No upcoming birthdays</li>'}
            </ul>
          </div>
          <div class="overview-card">
            <h4>Anniversaries</h4>
            <ul class="event-list">
              ${analytics.upcoming_anniversaries?.length ? analytics.upcoming_anniversaries.map(customer => `
                <li>${escapeHtml(customer.name)} — ${formatDate(customer.anniversary)}</li>
              `).join('') : '<li>No upcoming anniversaries</li>'}
            </ul>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('customerForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const payload = Object.fromEntries(formData.entries());
    payload.auto_birthday = document.getElementById('customerAutoBirthday').checked;
    payload.auto_anniversary = document.getElementById('customerAutoAnniversary').checked;
    const response = await API.business.createCustomer(payload);
    const customer = getResponseData(response, null);
    if (customer) {
      notify('Customer created successfully.');
      await renderCustomers();
    } else {
      notify(response?.message || 'Unable to create customer.', 'error');
    }
  });

  const searchInput = document.getElementById('customerSearch');
  const cityFilter = document.getElementById('customerCityFilter');
  const regionFilter = document.getElementById('customerRegionFilter');
  const statusFilter = document.getElementById('customerStatusFilter');
  const customerTableBody = document.getElementById('customerTableBody');

  const filterCustomers = () => {
    const searchValue = searchInput?.value.trim().toLowerCase() || '';
    const cityValue = cityFilter?.value || '';
    const regionValue = regionFilter?.value || '';
    const statusValue = statusFilter?.value || '';

    return customers.filter(customer => {
      const text = `${customer.name || ''} ${customer.email || ''} ${customer.phone || ''}`.toLowerCase();
      const matchesSearch = !searchValue || text.includes(searchValue);
      const matchesCity = !cityValue || (customer.city || '').toLowerCase() === cityValue.toLowerCase();
      const matchesRegion = !regionValue || (customer.region || '').toLowerCase() === regionValue.toLowerCase();
      const matchesStatus = !statusValue || (statusValue === 'pending' ? customer.pending_invoices > 0 : customer.pending_invoices === 0);
      return matchesSearch && matchesCity && matchesRegion && matchesStatus;
    });
  };

  const renderCustomerTable = (items) => {
    if (!customerTableBody) return;

    if (!items.length) {
      customerTableBody.innerHTML = `
        <tr class="empty-row">
          <td colspan="7">No customers match the filter criteria.</td>
        </tr>
      `;
      return;
    }

    customerTableBody.innerHTML = items.map(customer => {
      const status = customer.pending_invoices ? 'pending' : 'paid';
      return `
        <tr>
          <td><a class="customer-link" href="#/customers/${customer.id}">${escapeHtml(customer.name)}</a></td>
          <td>${escapeHtml(customer.email || customer.phone || '-')}</td>
          <td>${escapeHtml(customer.city || '-')}, ${escapeHtml(customer.region || '-')}</td>
          <td>${formatMoney(customer.total_spent)}</td>
          <td>${formatMoney(customer.total_profit)}</td>
          <td>${customer.invoice_count || 0}</td>
          <td><span class="status-pill ${status}">${status === 'pending' ? `${customer.pending_invoices} pending` : 'Paid'}</span></td>
          <td class="table-actions-cell">
            <button type="button" class="btn small" data-action="edit-customer" data-customer-id="${customer.id}">Edit</button>
            <button type="button" class="btn small danger delete-customer" data-customer-id="${customer.id}">Delete</button>
          </td>
        </tr>
      `;
    }).join('');
  };

  const updateCustomerList = () => renderCustomerTable(filterCustomers());

  document.getElementById('customerTableBody')?.addEventListener('click', async (event) => {
    const editBtn = event.target.closest('[data-action="edit-customer"]');
    if (editBtn) {
      const customerId = editBtn.dataset.customerId;
      if (customerId) {
        window.location.hash = `#/customers/${customerId}`;
      }
      return;
    }

    const deleteBtn = event.target.closest('.delete-customer');
    if (deleteBtn) {
      event.preventDefault();
      const customerId = deleteBtn.dataset.customerId;
      if (!customerId) return;
      if (!confirm('Delete this customer? This will keep invoices but remove the customer profile.')) return;
      const response = await API.business.deleteCustomer(customerId);
      if (response?.success) {
        notify('Customer deleted.');
        await renderCustomers();
      } else {
        notify(response?.message || 'Unable to delete customer.', 'error');
      }
      return;
    }
  });

  document.getElementById('downloadCustomersButton')?.addEventListener('click', async (event) => {
    event.preventDefault();
    const url = `${API_BASE}/api/business/customers/export`;
    try {
      const token = getToken();
      const resp = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined,
        },
      });
      if (!resp.ok) {
        const payload = await resp.json().catch(() => null);
        notify(payload?.message || 'Customer export failed', 'error');
        return;
      }
      const blob = await resp.blob();
      let filename = `customers_export.xlsx`;
      const disp = resp.headers.get('Content-Disposition');
      if (disp) {
        const m = disp.match(/filename="?([^";]+)"?/);
        if (m) filename = m[1];
      }
      const urlBlob = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = urlBlob;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(urlBlob);
      notify('Customer export downloaded.');
    } catch (err) {
      notify(err?.message || 'Customer export failed', 'error');
    }
  });

  [searchInput, cityFilter, regionFilter, statusFilter].forEach((input) => {
    if (!input) return;
    input.addEventListener(input.tagName === 'SELECT' ? 'change' : 'input', updateCustomerList);
  });

  updateCustomerList();
}

async function renderCustomerDetail(customerId) {
  const response = await API.business.customer(customerId);
  const customer = getResponseData(response, null);
  const error = getResponseError(response, 'Customer could not be loaded.');

  document.getElementById('content').innerHTML = `
    <div class="panel">
      <div class="panel-header">
        <div>
          <h2>Customer Detail</h2>
          <p>View customer profile information, purchase history, and invoice status.</p>
        </div>
        <div class="header-actions">
          <button id="backToCustomers" class="btn-secondary">Back to Customers</button>
          <button id="toggleEditCustomer" class="btn-primary">Edit</button>
          <button id="deleteCustomerButton" class="btn danger">Delete</button>
        </div>
      </div>
      ${error ? renderSectionError(error) : ''}
      ${customer ? `
        <div class="customer-detail-grid">
          <div id="customerView" class="detail-card">
            <h3>${escapeHtml(customer.name)}</h3>
            <p>${escapeHtml(customer.email || customer.phone || 'No contact details')}</p>
            <p>${escapeHtml(customer.delivery_address || 'No delivery address')}</p>
            <p>${escapeHtml(customer.city || '-')}, ${escapeHtml(customer.region || '-')}</p>
            <p>Birthday: ${customer.birthday ? formatDate(customer.birthday) : '-'}</p>
            <p>Anniversary: ${customer.anniversary ? formatDate(customer.anniversary) : '-'}</p>
            <p>Auto birthday messages: ${customer.auto_birthday ? 'Enabled' : 'Disabled'}</p>
            <p>Auto anniversary messages: ${customer.auto_anniversary ? 'Enabled' : 'Disabled'}</p>
            <div class="button-row milestone-actions">
              ${customer.birthday ? `<button type="button" id="generateBirthdayForCustomer" class="btn small">Generate birthday message</button>` : ''}
              ${customer.birthday ? `<button type="button" id="sendBirthdayForCustomer" class="btn small">Send birthday message</button>` : ''}
              ${customer.anniversary ? `<button type="button" id="generateAnniversaryForCustomer" class="btn small">Generate anniversary message</button>` : ''}
              ${customer.anniversary ? `<button type="button" id="sendAnniversaryForCustomer" class="btn small">Send anniversary message</button>` : ''}
            </div>
          </div>
          <form id="customerDetailForm" class="detail-form" style="display:none">
            <div class="detail-card">
              <h3>Edit Customer</h3>
              <div class="form-group">
                <label for="detailCustomerName">Name</label>
                <input id="detailCustomerName" name="name" type="text" required value="${escapeHtml(customer.name)}">
              </div>
              <div class="form-group">
                <label for="detailCustomerPhone">Phone</label>
                <input id="detailCustomerPhone" name="phone" type="tel" value="${escapeHtml(customer.phone || '')}">
              </div>
              <div class="form-group">
                <label for="detailCustomerEmail">Email</label>
                <input id="detailCustomerEmail" name="email" type="email" value="${escapeHtml(customer.email || '')}">
              </div>
              <div class="form-group">
                <label for="detailCustomerCity">City</label>
                <input id="detailCustomerCity" name="city" value="${escapeHtml(customer.city || '')}">
              </div>
              <div class="form-group">
                <label for="detailCustomerRegion">Region</label>
                <input id="detailCustomerRegion" name="region" value="${escapeHtml(customer.region || '')}">
              </div>
              <div class="form-group">
                <label for="detailCustomerDeliveryAddress">Delivery Address</label>
                <input id="detailCustomerDeliveryAddress" name="delivery_address" value="${escapeHtml(customer.delivery_address || '')}">
              </div>
              <div class="form-group">
                <label for="detailCustomerBirthday">Birthday</label>
                <input id="detailCustomerBirthday" name="birthday" type="date" value="${escapeHtml(customer.birthday || '')}">
              </div>
              <div class="form-group">
                <label for="detailCustomerAnniversary">Anniversary</label>
                <input id="detailCustomerAnniversary" name="anniversary" type="date" value="${escapeHtml(customer.anniversary || '')}">
              </div>
              <div class="form-row checkbox-row">
                <div class="form-group checkbox-group">
                  <label>
                    <input id="detailCustomerAutoBirthday" name="auto_birthday" type="checkbox" ${customer.auto_birthday ? 'checked' : ''}>
                    <span>Auto birthday messages</span>
                  </label>
                </div>
                <div class="form-group checkbox-group">
                  <label>
                    <input id="detailCustomerAutoAnniversary" name="auto_anniversary" type="checkbox" ${customer.auto_anniversary ? 'checked' : ''}>
                    <span>Auto anniversary messages</span>
                  </label>
                </div>
              </div>
              <div class="invoice-section">
                <button type="submit" class="btn-primary btn-lg">Save Changes</button>
                <button type="button" id="cancelCustomerEdit" class="btn-secondary btn-lg">Cancel</button>
              </div>
            </div>
            <div class="detail-card">
              <h3>Purchase Summary</h3>
              <div class="overview-grid">
                <div class="overview-card">
                  <h4>Total Invoices</h4>
                  <p>${customer.invoice_count || 0}</p>
                </div>
                <div class="overview-card">
                  <h4>Paid</h4>
                  <p>${customer.paid_invoices || 0}</p>
                </div>
                <div class="overview-card">
                  <h4>Pending</h4>
                  <p>${customer.pending_invoices || 0}</p>
                </div>
                <div class="overview-card">
                  <h4>Revenue</h4>
                  <p>${formatMoney(customer.total_spent)}</p>
                </div>
                <div class="overview-card">
                  <h4>Profit</h4>
                  <p>${formatMoney(customer.total_profit)}</p>
                </div>
              </div>
            </div>
          </form>
        <div class="table-wrap">
          <h3 class="section-title">Invoice History</h3>
          <table class="data-table customer-list-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Status</th>
                <th>Amount</th>
                <th>Due Date</th>
                <th>Paid Date</th>
              </tr>
            </thead>
            <tbody>
              ${customer.invoices?.length ? customer.invoices.map(invoice => `
                <tr>
                  <td><a class="customer-link" href="#/invoices/${invoice.id}">#${invoice.id}</a></td>
                  <td><span class="status-pill ${invoice.status === 'paid' ? 'paid' : 'pending'}">${capitalize(invoice.status)}</span></td>
                  <td>${formatMoney(invoice.amount)}</td>
                  <td>${invoice.due_date ? formatDate(invoice.due_date) : '-'}</td>
                  <td>${invoice.paid_date ? formatDate(invoice.paid_date) : '-'}</td>
                </tr>
              `).join('') : `
                <tr class="empty-row">
                  <td colspan="5">No invoices found for this customer.</td>
                </tr>
              `}
            </tbody>
          </table>
        </div>
      ` : ''}
    </div>
  `;

  document.getElementById('customerDetailForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitButton = event.currentTarget.querySelector('button[type="submit"]');
    setButtonLoading(submitButton, true, 'Saving...');
    showEditSpinner(true);
    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());
    payload.auto_birthday = document.getElementById('detailCustomerAutoBirthday').checked;
    payload.auto_anniversary = document.getElementById('detailCustomerAutoAnniversary').checked;
    // Optimistic UI update: apply changes immediately to the view
    const prevState = { ...customer };
    const optimisticCustomer = Object.assign({}, customer, {
      ...payload,
      auto_birthday: !!payload.auto_birthday,
      auto_anniversary: !!payload.auto_anniversary,
    });

    const viewEl = document.getElementById('customerView');
    const renderView = (c) => {
      if (!viewEl) return;
      viewEl.innerHTML = `
        <h3>${escapeHtml(c.name)}</h3>
        <p>${escapeHtml(c.email || c.phone || 'No contact details')}</p>
        <p>${escapeHtml(c.delivery_address || 'No delivery address')}</p>
        <p>${escapeHtml(c.city || '-')}, ${escapeHtml(c.region || '-')}</p>
        <p>Birthday: ${c.birthday ? formatDate(c.birthday) : '-'}</p>
        <p>Anniversary: ${c.anniversary ? formatDate(c.anniversary) : '-'}</p>
        <p>Auto birthday messages: ${c.auto_birthday ? 'Enabled' : 'Disabled'}</p>
        <p>Auto anniversary messages: ${c.auto_anniversary ? 'Enabled' : 'Disabled'}</p>
      `;
    };

    // apply optimistic render
    renderView(optimisticCustomer);

    // send update to server
    const updateResponse = await API.business.updateCustomer(customerId, payload);
    showEditSpinner(false);
    const updatedCustomer = getResponseData(updateResponse, null);
    if (updatedCustomer) {
      notify('Customer updated successfully.');
      // refresh from server to ensure consistency
      await renderCustomerDetail(customerId);
    } else {
      // rollback optimistic update
      notify(updateResponse?.message || 'Unable to update customer.', 'error');
      renderView(prevState);
      setButtonLoading(submitButton, false);
    }
  });

  document.getElementById('cancelCustomerEdit')?.addEventListener('click', () => {
    renderCustomerDetail(customerId);
  });

  // Toggle view/edit modes
  const toggleBtn = document.getElementById('toggleEditCustomer');
  const viewEl = document.getElementById('customerView');
  const formEl = document.getElementById('customerDetailForm');

  const showView = () => {
    if (viewEl) viewEl.style.display = '';
    if (formEl) formEl.style.display = 'none';
    if (toggleBtn) toggleBtn.textContent = 'Edit';
  };

  const showEdit = () => {
    if (viewEl) viewEl.style.display = 'none';
    if (formEl) formEl.style.display = '';
    if (toggleBtn) toggleBtn.textContent = 'View';
  };

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      if (formEl && formEl.style.display === 'none') {
        showEdit();
      } else {
        showView();
      }
    });
  }

  async function handleCustomerMilestoneAction(type, showEditDialog) {
    const messageRes = await API.business.generateMilestoneMessage(customerId, type);
    const messageData = getResponseData(messageRes, null);
    if (!messageData) {
      notify(getResponseError(messageRes, `Unable to generate ${type} message.`), 'error');
      return;
    }

    let finalText = messageData.message_text;
    if (showEditDialog) {
      const edited = window.prompt(`Edit ${type} message for ${messageData.customer_name}`, finalText);
      if (edited === null) {
        return;
      }
      finalText = edited.trim();
      if (!finalText) {
        notify('Message cannot be empty.', 'error');
        return;
      }
    }

    const sendRes = await API.business.sendMilestoneMessage({
      customerId,
      milestoneType: type,
      messageText: finalText,
    });

    if (!getResponseData(sendRes, null)) {
      notify(getResponseError(sendRes, `Failed to send ${type} message.`), 'error');
      return;
    }

    notify(`${type === 'birthday' ? 'Birthday' : 'Anniversary'} message sent. If auto send failed, use the send button again.`);
  }

  document.getElementById('generateBirthdayForCustomer')?.addEventListener('click', async () => {
    await handleCustomerMilestoneAction('birthday', true);
  });
  document.getElementById('sendBirthdayForCustomer')?.addEventListener('click', async () => {
    await handleCustomerMilestoneAction('birthday', false);
  });
  document.getElementById('generateAnniversaryForCustomer')?.addEventListener('click', async () => {
    await handleCustomerMilestoneAction('anniversary', true);
  });
  document.getElementById('sendAnniversaryForCustomer')?.addEventListener('click', async () => {
    await handleCustomerMilestoneAction('anniversary', false);
  });

  // Start in view mode
  showView();

  document.getElementById('deleteCustomerButton')?.addEventListener('click', async () => {
    if (!confirm('Delete this customer? This will keep invoices but remove the customer profile.')) return;
    const response = await API.business.deleteCustomer(customerId);
    if (response?.success) {
      notify('Customer deleted.');
      window.location.hash = '#/customers';
      await renderCustomers();
    } else {
      notify(response?.message || 'Unable to delete customer.', 'error');
    }
  });

  // Live per-field validation while typing or on blur
  (function setupLiveValidation() {
    const form = document.getElementById('customerDetailForm');
    if (!form) return;

    const validateField = (input) => {
      if (!input) return;
      const name = input.name;
      // clear previous error for this field
      const prev = input.parentNode.querySelector('.field-error');
      if (prev) prev.remove();
      input.classList.remove('input-error');
      input.classList.remove('input-valid');
      const icon = input.parentNode.querySelector('.validation-icon');
      if (icon) {
        icon.classList.remove('show', 'valid', 'invalid');
      }

      const val = input.value;
      let fieldValid = true;
      if (name === 'name') {
        if (!val || !String(val).trim()) { setFieldError(input, 'Name is required.'); fieldValid = false; }
      } else if (name === 'email') {
        if (val && !isValidEmail(val)) { setFieldError(input, 'Invalid email address.'); fieldValid = false; }
      } else if (name === 'phone') {
        if (val && String(val).replace(/[^0-9+]/g, '').length < 7) { setFieldError(input, 'Please enter a valid phone number.'); fieldValid = false; }
      } else if (name === 'birthday' || name === 'anniversary') {
        if (val) {
          const ts = Date.parse(val);
          if (Number.isNaN(ts)) { setFieldError(input, 'Invalid date format.'); fieldValid = false; }
        }
      }

      if (fieldValid) {
        input.classList.add('input-valid');
        if (icon) {
          icon.classList.add('show', 'valid');
        }
      } else {
        if (icon) icon.classList.add('show', 'invalid');
      }
    };

    const fields = ['name', 'email', 'phone', 'birthday', 'anniversary'];
    fields.forEach((fieldName) => {
      const input = form.querySelector(`[name="${fieldName}"]`);
      if (!input) return;
      const eventType = fieldName === 'email' ? 'blur' : 'input';
      input.addEventListener(eventType, () => validateField(input));
      // also validate on change for date pickers
      input.addEventListener('change', () => validateField(input));
      // validate on paste and normalize phone
      input.addEventListener('paste', (ev) => {
        if (fieldName === 'phone') {
          const pasted = ev.clipboardData?.getData('text') || '';
          const cleaned = normalizePhone(pasted);
          ev.preventDefault();
          // insert normalized phone
          const start = input.selectionStart || 0;
          const end = input.selectionEnd || 0;
          const newVal = input.value.slice(0, start) + cleaned + input.value.slice(end);
          input.value = newVal;
          validateField(input);
        }
      });

      // live phone formatting while typing
      if (fieldName === 'phone') {
        input.addEventListener('input', () => {
          const formatted = formatPhoneAsYouType(input.value || '');
          input.value = formatted;
          validateField(input);
        });
      }
    });
  })();

  document.getElementById('backToCustomers')?.addEventListener('click', () => {
    window.location.hash = '#/customers';
  });
}

async function renderInventory() {
  document.getElementById('content').innerHTML = `
    <div class="panel">
      <div class="panel-header">
        <div>
          <h2>Inventory</h2>
          <p>Loading inventory...</p>
        </div>
      </div>
      <div class="inventory-loading">
        <div class="spinner"></div>
        <p>Fetching inventory items…</p>
      </div>
    </div>
  `;

  const response = await API.business.inventory();
  const items = getResponseData(response);
  const error = getResponseError(response, 'Inventory could not be loaded.');

  document.getElementById('content').innerHTML = `
    <div class="panel">
      <div class="panel-header">
        <div>
          <h2>Inventory</h2>
          <p>Add stock items and monitor reorder levels.</p>
        </div>
      </div>
      <form id="inventoryForm" class="form-grid">
        <div class="form-group">
          <label for="productName">Product Name</label>
          <input id="productName" name="product_name" required>
        </div>
        <div class="form-group">
          <label for="quantity">Quantity</label>
          <input id="quantity" name="quantity" type="number" min="0" required>
        </div>
        <div class="form-group">
          <label for="unitPrice">Unit Price</label>
          <input id="unitPrice" name="unit_price" type="number" min="0" step="0.01">
        </div>
        <div class="form-group">
          <label for="costPrice">Cost Price</label>
          <input id="costPrice" name="cost_price" type="number" min="0" step="0.01">
        </div>
        <div class="form-group">
          <label for="reorderLevel">Reorder Level</label>
          <input id="reorderLevel" name="reorder_level" type="number" min="0" value="10">
        </div>
        <div class="form-group form-span">
          <label for="supplier">Supplier</label>
          <input id="supplier" name="supplier">
        </div>
        <button type="submit" class="btn-primary form-action">Add Item</button>
      </form>
      ${error ? renderSectionError(error) + `
        <div class="panel-actions"><button id="retryInventory" class="btn">Retry</button></div>
      ` : renderInventoryTable(items)}
    </div>
  `;

  document.getElementById('inventoryForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;

    clearFieldErrors(form);
    const payload = {
      product_name: form.product_name.value.trim(),
      quantity: Number(form.quantity.value || 0),
      unit_price: Number(form.unit_price.value || 0),
      cost_price: Number(form.cost_price.value || 0),
      reorder_level: Number(form.reorder_level.value || 10),
      supplier: form.supplier.value.trim() || null,
    };

    if (!payload.product_name) {
      setFieldError(form.product_name, 'Product name is required.');
      notify('Please fix the highlighted fields.', 'error');
      form.product_name.focus();
      return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    setButtonLoading(submitButton, true, 'Saving...');
    const response = await API.business.createInventoryItem(payload);
    setButtonLoading(submitButton, false);

    const item = getResponseData(response, null);
    if (item) {
      notify('Inventory item added successfully.');
      form.reset();
      form.reorder_level.value = '10';
      await renderInventory();
    } else {
      notify(response?.message || 'Unable to add inventory item.', 'error');
    }
  });

  // Retry button when inventory load fails
  document.getElementById('retryInventory')?.addEventListener('click', async () => {
    await renderInventory();
  });
}

function renderInventoryTable(items) {
  if (!items || !items.length) {
    return '<div class="empty-state">No inventory items yet. Add a new stock item above.</div>';
  }

  return `
    <div class="table-wrap inventory-table-wrap">
      <table class="data-table inventory-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Qty</th>
            <th>Unit Price</th>
            <th>Cost Price</th>
            <th>Reorder Level</th>
            <th>Supplier</th>
            <th>Added</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(item => `
            <tr>
              <td>${escapeHtml(item.product_name)}</td>
              <td>${Number(item.quantity)}</td>
              <td>${formatMoney(item.unit_price)}</td>
              <td>${formatMoney(item.cost_price)}</td>
              <td>${item.reorder_level != null ? escapeHtml(String(item.reorder_level)) : '-'}</td>
              <td>${escapeHtml(item.supplier || '-')}</td>
              <td>${formatExactDate(item.created_at)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

async function renderSales() {
  const [inventoryRes, customersRes, salesRes, analyticsRes] = await Promise.all([
    API.business.inventory(),
    API.business.customers(),
    API.business.sales(),
    API.business.salesAnalytics(),
  ]);

  const inventory = getResponseData(inventoryRes, []);
  const customers = getResponseData(customersRes, []);
  const sales = getResponseData(salesRes, []);
  const analytics = getResponseData(analyticsRes, {});

  const errors = [
    getResponseError(inventoryRes, 'Inventory could not be loaded.'),
    getResponseError(customersRes, 'Customers could not be loaded.'),
    getResponseError(salesRes, 'Sales could not be loaded.'),
    getResponseError(analyticsRes, 'Sales analytics could not be loaded.'),
  ].filter(Boolean);

  document.getElementById('content').innerHTML = `
    <div class="panel">
      <div class="panel-header">
        <div>
          <h2>Sales</h2>
          <p>Record sales, track inventory impact, and monitor profit/loss performance.</p>
        </div>
      </div>
      ${errors.length ? renderSectionError(errors.join(' ')) : ''}

      <div class="sales-analytics-strip">
        <div class="stat-card compact">
          <h4>Total Revenue</h4>
          <p class="stat-number">${formatMoney(analytics.total_sales || 0)}</p>
        </div>
        <div class="stat-card compact">
          <h4>Total Profit</h4>
          <p class="stat-number">${formatMoney(analytics.total_profit || 0)}</p>
        </div>
        <div class="stat-card compact">
          <h4>Total Loss</h4>
          <p class="stat-number">${formatMoney(analytics.total_loss || 0)}</p>
        </div>
        <div class="stat-card compact">
          <h4>Avg Margin</h4>
          <p class="stat-number">${analytics.avg_margin != null ? analytics.avg_margin.toFixed(1) + '%' : '-'}</p>
        </div>
        <div class="stat-card compact">
          <h4>Top Product</h4>
          <p class="stat-number">${escapeHtml(analytics.top_product || '-')}</p>
        </div>
      </div>

      <div class="sales-form-container">
        <h3>Record New Sale</h3>
        <form id="salesForm" class="sales-form-modern">
          <div class="form-section">
            <h4>Customer Information (Optional)</h4>
            <div class="customer-selector" id="customerSelector">
              <div class="form-group">
                <label for="saleCustomer">Select or Create Customer</label>
                <select id="saleCustomer" name="customer_id">
                  <option value="">No customer (Cash sale)</option>
                  ${customers.map(c => `<option value="${c.id}">${escapeHtml(c.name)}${c.phone ? ` — ${escapeHtml(c.phone)}` : ''}</option>`).join('')}
                  <option value="__new__">+ Create new customer</option>
                </select>
                <p class="form-help">Choose an existing customer or create a new one for this sale.</p>
              </div>
              <div id="newCustomerForm" style="display:none">
                <div class="form-group">
                  <label for="newCustomerName">Customer Name</label>
                  <input id="newCustomerName" type="text" placeholder="Full name">
                </div>
                <div class="form-group">
                  <label for="newCustomerPhone">Phone</label>
                  <input id="newCustomerPhone" type="tel" placeholder="+234...">
                </div>
                <button type="button" id="cancelNewCustomer" class="btn secondary small">Cancel</button>
              </div>
            </div>
          </div>

          <div class="form-section">
            <h4>Sale Date</h4>
            <div class="form-group">
              <label for="saleDateInput">Date</label>
              <input id="saleDateInput" name="sale_date" type="date" value="${new Date().toISOString().slice(0, 10)}" required>
            </div>
          </div>

          <div class="form-section">
            <h4>Products (Add one or more)</h4>
            <p class="form-help">Each card below represents one product line. Click "+ Add Product" to include multiple products in the same sale.</p>
            <div id="productsContainer" class="products-container"></div>
            <button type="button" id="addProductButton" class="btn secondary">+ Add Product</button>
          </div>

          <div class="form-section form-actions">
            <button type="submit" class="btn-primary">Record Sale</button>
            <button type="button" id="resetSalesForm" class="btn secondary">Reset</button>
          </div>
        </form>
      </div>

      <div class="sales-history-section">
        <h3>Sales History</h3>
        <div class="form-row">
          <div class="form-group">
            <label for="salesFrom">From</label>
            <input id="salesFrom" type="date" value="${new Date(new Date().setDate(new Date().getDate()-30)).toISOString().slice(0,10)}">
          </div>
          <div class="form-group">
            <label for="salesTo">To</label>
            <input id="salesTo" type="date" value="${new Date().toISOString().slice(0,10)}">
          </div>
          <div class="form-group">
            <label>&nbsp;</label>
            <div class="button-row">
              <button type="button" id="filterSalesButton" class="btn secondary small">Filter</button>
              <button type="button" id="downloadSalesButton" class="btn-primary small">Download Excel</button>
            </div>
          </div>
        </div>
        <div id="salesTableContainer">
          ${renderSalesTable(sales)}
        </div>
      </div>
    </div>
  `;

  let productIndex = 0;
  const productsContainer = document.getElementById('productsContainer');
  const saleCustomerSelect = document.getElementById('saleCustomer');
  const newCustomerForm = document.getElementById('newCustomerForm');
  const salesForm = document.getElementById('salesForm');
  let editingSaleId = null;
  const salesSubmitButton = salesForm.querySelector('button[type="submit"]');

  function renderProductCard(index) {
    const inventoryOptions = inventory.map(item => `
      <option value="${item.id}" 
        data-unit-price="${item.unit_price || 0}"
        data-cost-price="${item.cost_price || 0}"
        data-available="${item.quantity || 0}">
        ${escapeHtml(item.product_name || '-')} (Qty: ${item.quantity || 0})
      </option>
    `).join('');

    return `
      <div class="product-card" data-product-index="${index}">
        <div class="card-header">
          <h5>Product ${index + 1}</h5>
          <button type="button" class="btn-remove-product" data-index="${index}">Remove</button>
        </div>
        <div class="card-content">
          <div class="form-row">
            <div class="form-group">
              <label for="product_${index}">Product</label>
              <select name="product_${index}" class="product-select" data-index="${index}">
                <option value="">Select product</option>
                ${inventoryOptions}
              </select>
            </div>
            <div class="form-group">
              <label for="quantity_${index}">Quantity</label>
              <input type="number" name="quantity_${index}" class="quantity-input" data-index="${index}" min="1" value="1" required>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="unitPrice_${index}">Unit Price (₦)</label>
              <input type="number" name="unitPrice_${index}" class="unit-price-input" data-index="${index}" step="0.01" min="0" required>
            </div>
            <div class="form-group">
              <label for="costPrice_${index}">Cost Price (₦)</label>
              <input type="number" name="costPrice_${index}" class="cost-price-input" data-index="${index}" step="0.01" min="0">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="bonus_${index}">Bonus/Adjustment (₦)</label>
              <input type="number" name="bonus_${index}" class="bonus-input" data-index="${index}" step="0.01" value="0">
            </div>
            <div class="form-group">
              <label for="reason_${index}">Reason (optional)</label>
              <input type="text" name="reason_${index}" class="reason-input" data-index="${index}" placeholder="e.g., bulk discount, damage">
            </div>
          </div>
          <div class="product-summary">
            <div class="summary-line">
              <span>Subtotal:</span>
              <span class="subtotal-${index}">₦0.00</span>
            </div>
            <div class="summary-line">
              <span>Profit/Loss:</span>
              <span class="profit-${index}">₦0.00</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function attachProductListeners(card, index) {
    const productSelect = card.querySelector(`[name="product_${index}"]`);
    const quantityInput = card.querySelector(`[name="quantity_${index}"]`);
    const unitPriceInput = card.querySelector(`[name="unitPrice_${index}"]`);
    const costPriceInput = card.querySelector(`[name="costPrice_${index}"]`);
    const bonusInput = card.querySelector(`[name="bonus_${index}"]`);

    const updateSummary = () => {
      const qty = Number(quantityInput?.value || 0);
      const unitPrice = Number(unitPriceInput?.value || 0);
      const costPrice = Number(costPriceInput?.value || 0);
      const bonus = Number(bonusInput?.value || 0);

      const subtotal = qty * unitPrice;
      const profit = (qty * (unitPrice - costPrice)) + bonus;

      const subtotalEl = card.querySelector(`.subtotal-${index}`);
      const profitEl = card.querySelector(`.profit-${index}`);
      if (subtotalEl) subtotalEl.textContent = formatMoney(subtotal);
      if (profitEl) profitEl.textContent = formatMoney(profit);
    };

    productSelect?.addEventListener('change', () => {
      const option = productSelect.selectedOptions[0];
      if (unitPriceInput) unitPriceInput.value = option?.dataset.unitPrice || '';
      if (costPriceInput) costPriceInput.value = option?.dataset.costPrice || '';
      updateSummary();
    });

    quantityInput?.addEventListener('input', updateSummary);
    unitPriceInput?.addEventListener('input', updateSummary);
    costPriceInput?.addEventListener('input', updateSummary);
    bonusInput?.addEventListener('input', updateSummary);

    const removeButton = card.querySelector('.btn-remove-product');
    removeButton?.addEventListener('click', (e) => {
      e.preventDefault();
      card.remove();
    });
  }

  function addProductCard() {
    const card = document.createElement('div');
    card.innerHTML = renderProductCard(productIndex);
    const cardElement = card.firstElementChild;
    productsContainer.appendChild(cardElement);
    attachProductListeners(cardElement, productIndex);
    productIndex++;
  }

  document.getElementById('addProductButton')?.addEventListener('click', (e) => {
    e.preventDefault();
    addProductCard();
  });

  document.getElementById('resetSalesForm')?.addEventListener('click', (e) => {
    e.preventDefault();
    salesForm.reset();
    productsContainer.innerHTML = '';
    productIndex = 0;
    saleCustomerSelect.value = '';
    newCustomerForm.style.display = 'none';
  });

  saleCustomerSelect?.addEventListener('change', () => {
    if (saleCustomerSelect.value === '__new__') {
      newCustomerForm.style.display = 'block';
      saleCustomerSelect.value = '';
    } else {
      newCustomerForm.style.display = 'none';
    }
  });

  document.getElementById('cancelNewCustomer')?.addEventListener('click', (e) => {
    e.preventDefault();
    newCustomerForm.style.display = 'none';
    saleCustomerSelect.value = '';
  });

  // Add initial product card
  addProductCard();

  salesForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    setButtonLoading(salesSubmitButton, true, editingSaleId ? 'Saving...' : 'Recording...');

    const productCards = productsContainer.querySelectorAll('.product-card');
    if (productCards.length === 0) {
      notify('Add at least one product to record a sale.', 'error');
      return;
    }

    const products = [];
    let valid = true;

    productCards.forEach((card) => {
      const productId = card.querySelector('.product-select')?.value;
      const qty = Number(card.querySelector('.quantity-input')?.value || 0);
      const unitPrice = Number(card.querySelector('.unit-price-input')?.value || 0);
      const costPrice = Number(card.querySelector('.cost-price-input')?.value || 0);
      const bonus = Number(card.querySelector('.bonus-input')?.value || 0);
      const reason = card.querySelector('.reason-input')?.value || '';

      if (!productId || qty <= 0 || unitPrice <= 0) {
        valid = false;
        return;
      }

      products.push({
        inventoryId: productId,
        quantity: qty,
        unitPrice,
        costPrice,
        bonusAdjustment: bonus,
        adjustmentReason: reason,
      });
    });

    if (!valid) {
      notify('Please fill in all required fields correctly.', 'error');
      return;
    }

    // Check if creating new customer
    let customerId = saleCustomerSelect.value;
    if (!customerId && newCustomerForm.style.display !== 'none') {
      const newName = document.getElementById('newCustomerName')?.value.trim();
      const newPhone = document.getElementById('newCustomerPhone')?.value.trim();
      if (newName) {
        const newCustomerRes = await API.business.createCustomer({
          name: newName,
          phone: newPhone || null,
        });
        const newCustomerData = getResponseData(newCustomerRes, null);
        if (newCustomerData) {
          customerId = newCustomerData.id;
        }
      }
    }

    const salesData = {
      customerId: customerId || null,
      saleDate: document.getElementById('saleDateInput')?.value,
      products,
    };

    try {
      let result;
      if (editingSaleId) {
        // editing a single existing sale - use first product only
        const p = products[0];
        const singleSale = {
          inventory_id: p.inventoryId,
          product_name: p.productName || null,
          quantity: p.quantity,
          unit_price: p.unitPrice,
          cost_price: p.costPrice,
          bonus_adjustment: p.bonusAdjustment,
          adjustment_reason: p.adjustmentReason || null,
          customer_id: salesData.customerId || null,
          sale_date: salesData.saleDate,
        };
        result = await API.business.updateSale(editingSaleId, singleSale);
      } else {
        result = await API.business.createBulkSales(salesData);
      }

      if (result?.success) {
        if (editingSaleId) {
          notify('Sale updated.');
          editingSaleId = null;
        } else {
          notify('Sales recorded successfully.');
        }
        await renderSales();
      } else {
        notify(result?.message || 'Unable to record sales.', 'error');
      }
    } catch (err) {
      notify(err?.message || 'Unable to record sales.', 'error');
    } finally {
      setButtonLoading(salesSubmitButton, false);
    }
  });

  // delegated handlers for edit/delete actions in sales cards and table
  document.getElementById('content')?.addEventListener('click', async (ev) => {
    const editBtn = ev.target.closest('.edit-sale');
    if (editBtn) {
      ev.preventDefault();
      const saleId = editBtn.dataset.saleId;
      const sale = sales.find(s => String(s.id) === String(saleId));
      if (!sale) {
        notify('Sale not found.', 'error');
        return;
      }
      // prepare form for editing single sale
      editingSaleId = saleId;
      productsContainer.innerHTML = '';
      productIndex = 0;
      addProductCard();
      const card = productsContainer.querySelector('.product-card');
      // set inventory selection if available
      if (sale.inventory_id) {
        const select = card.querySelector('.product-select');
        if (select) select.value = sale.inventory_id;
      }
      card.querySelector('.quantity-input').value = sale.quantity || 1;
      card.querySelector('.unit-price-input').value = sale.unit_price || 0;
      card.querySelector('.cost-price-input').value = sale.cost_price || 0;
      card.querySelector('.bonus-input').value = sale.bonus_adjustment || 0;
      card.querySelector('.reason-input').value = sale.adjustment_reason || '';
      document.getElementById('saleDateInput').value = sale.sale_date ? sale.sale_date.slice(0,10) : new Date().toISOString().slice(0,10);
      saleCustomerSelect.value = sale.customer_id || '';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const delBtn = ev.target.closest('.delete-sale');
    if (delBtn) {
      ev.preventDefault();
      const saleId = delBtn.dataset.saleId;
      if (!confirm('Delete this sale? This will restore inventory.')) return;
      const res = await API.business.deleteSale(saleId);
      if (res?.success) {
        notify('Sale deleted.');
        await renderSales();
      } else {
        notify(res?.message || 'Unable to delete sale.', 'error');
      }
      return;
    }
  });

  // Sales table filter and export
  document.getElementById('filterSalesButton')?.addEventListener('click', (e) => {
    e.preventDefault();
    const from = document.getElementById('salesFrom').value;
    const to = document.getElementById('salesTo').value;
    const filtered = sales.filter(s => {
      const d = s.sale_date ? s.sale_date.slice(0,10) : (s.sale_time ? s.sale_time.slice(0,10) : null);
      if (!d) return false;
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });
    document.getElementById('salesTableContainer').innerHTML = renderSalesTable(filtered);
  });

  document.getElementById('downloadSalesButton')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const from = document.getElementById('salesFrom').value;
    const to = document.getElementById('salesTo').value;
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const url = `${API_BASE}/api/business/sales/export?${params.toString()}`;
    try {
      const token = getToken();
      const resp = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined,
        },
      });
      if (!resp.ok) {
        const payload = await resp.json().catch(() => null);
        notify(payload?.message || 'Export failed', 'error');
        return;
      }
      const blob = await resp.blob();
      let filename = `sales_${from || 'start'}_to_${to || 'end'}.xlsx`;
      const disp = resp.headers.get('Content-Disposition');
      if (disp) {
        const m = disp.match(/filename="?([^";]+)"?/);
        if (m) filename = m[1];
      }
      const urlBlob = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = urlBlob;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(urlBlob);
      notify('Export downloaded.');
    } catch (err) {
      notify(err?.message || 'Export failed', 'error');
    }
  });

  function generateSalesCSV(rows) {
    const headers = ['id','product_name','quantity','unit_price','total_amount','profit','bonus_adjustment','adjustment_reason','customer_id','sale_date'];
    const lines = [headers.join(',')];
    rows.forEach(r => {
      const line = [
        r.id,
        `"${(r.product_name||'').replace(/"/g,'""')}"`,
        r.quantity || 0,
        r.unit_price || 0,
        r.total_amount || 0,
        r.profit || 0,
        r.bonus_adjustment || 0,
        `"${(r.adjustment_reason||'').replace(/"/g,'""') }"`,
        r.customer_id || '',
        r.sale_date || r.sale_time || ''
      ];
      lines.push(line.join(','));
    });
    return lines.join('\n');
  }
}

function renderSalesHistoryCards(sales) {
  if (!sales || sales.length === 0) {
    return '<div class="empty-state">No sales recorded yet.</div>';
  }

  const cardsHtml = sales.slice(0, 20).map(sale => `
    <div class="sales-card">
      <div class="card-header">
        <h5>${escapeHtml(sale.product_name || '-')}</h5>
        <div class="card-actions">
          <button class="btn small edit-sale" data-sale-id="${sale.id}">Edit</button>
          <button class="btn small danger delete-sale" data-sale-id="${sale.id}">Delete</button>
        </div>
        <span class="card-date">${formatDate(sale.sale_date || sale.sale_time)}</span>
      </div>
      <div class="card-body">
        <div class="card-row">
          <span class="label">Qty:</span>
          <span class="value">${Number(sale.quantity || 0)}</span>
        </div>
        <div class="card-row">
          <span class="label">Unit Price:</span>
          <span class="value">${formatMoney(sale.unit_price)}</span>
        </div>
        <div class="card-row">
          <span class="label">Total:</span>
          <span class="value">${formatMoney(sale.total_amount)}</span>
        </div>
        <div class="card-row profit-row ${Number(sale.profit || 0) >= 0 ? 'profitable' : 'loss'}">
          <span class="label">Profit/Loss:</span>
          <span class="value">${formatMoney(sale.profit)}</span>
        </div>
        ${sale.bonus_adjustment ? `<div class="card-row"><span class="label">Adjustment:</span><span class="value">${formatMoney(sale.bonus_adjustment)}</span></div>` : ''}
        ${sale.customer_id ? `<div class="card-row"><span class="label">Customer:</span><span class="value">Linked</span></div>` : ''}
      </div>
    </div>
  `).join('');

  return `<div class="sales-cards-grid">${cardsHtml}</div>`;
}


function renderSalesTable(sales) {
  if (!sales.length) {
    return '<div class="empty-state">No sales recorded yet.</div>';
  }

  return `
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Quantity</th>
            <th>Unit Price</th>
            <th>Total</th>
            <th>Profit</th>
            <th>Sale Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${sales.map(sale => `
            <tr>
              <td>${escapeHtml(sale.product_name || '-')}</td>
              <td>${Number(sale.quantity || 0)}</td>
              <td>${formatMoney(sale.unit_price)}</td>
              <td>${formatMoney(sale.total_amount)}</td>
              <td>${formatMoney(sale.profit)}</td>
              <td>${formatDate(sale.sale_date || sale.sale_time)}</td>
              <td>
                <button class="btn small edit-sale" data-sale-id="${sale.id}">Edit</button>
                <button class="btn small danger delete-sale" data-sale-id="${sale.id}">Delete</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

async function renderWhatsAppLegacy() {
  const [customersRes, templatesRes] = await Promise.all([
    API.business.customers(),
    API.business.milestoneTemplates(),
  ]);

  const customers = getResponseData(customersRes, []);
  const templates = getResponseData(templatesRes, {
    birthday_message_template: '',
    anniversary_message_template: '',
  });

  const customerOptions = customers.map(customer => `
    <option value="${escapeHtml(customer.id)}">${escapeHtml(customer.name)}${customer.phone ? ` — ${escapeHtml(customer.phone)}` : ''}</option>
  `).join('');

  document.getElementById('content').innerHTML = `
    <div class="panel">
      <div class="panel-header">
        <div>
          <h2>WhatsApp</h2>
          <p>Send personalized milestone messages and WhatsApp updates from one place.</p>
        </div>
      </div>

      <div class="subsection compact-overview">
        <h3>Milestone Message Generator</h3>
        <div class="overview-grid milestone-event-grid">
          <div class="overview-card milestone-card">
            <h4>Birthday message</h4>
            <p>${escapeHtml(templates.birthday_message_template)}</p>
            <button type="button" id="generateBirthdayMessage" class="btn small">Generate for selected customer</button>
          </div>
          <div class="overview-card milestone-card">
            <h4>Anniversary message</h4>
            <p>${escapeHtml(templates.anniversary_message_template)}</p>
            <button type="button" id="generateAnniversaryMessage" class="btn small">Generate for selected customer</button>
          </div>
        </div>
        <div class="form-group">
          <label for="milestoneCustomerSelect">Customer</label>
          <select id="milestoneCustomerSelect" class="wide-select">
            <option value="">Select customer</option>
            ${customerOptions}
          </select>
        </div>
        <div id="milestoneMessagePreview" class="form-group milestone-preview" style="display:none">
          <label>Generated message</label>
          <textarea id="milestoneMessageText" rows="6"></textarea>
          <div class="button-row">
            <button type="button" id="editMilestoneMessageButton" class="btn secondary">Edit message</button>
            <button type="button" id="sendMilestoneMessageButton" class="btn-primary">Send milestone message</button>
          </div>
        </div>
      </div>

      <form id="whatsappForm" class="form-grid">
        <div class="form-group">
          <label for="toPhone">Phone Number</label>
          <input id="toPhone" name="toPhone" type="tel" required placeholder="+234...">
        </div>
        <div class="form-group">
          <label for="useAI">AI Assisted</label>
          <select id="useAI" name="useAI">
            <option value="false">No</option>
            <option value="true">Yes</option>
          </select>
        </div>
        <div class="form-group form-span">
          <label for="message">Message</label>
          <textarea id="message" name="message" rows="6" required></textarea>
        </div>
        <button type="submit" class="btn-primary form-action">Send Message</button>
      </form>
    </div>
  `;

  let generatedType = null;
  let generatedCustomerId = null;

  const milestoneMessagePreview = document.getElementById('milestoneMessagePreview');
  const milestoneMessageText = document.getElementById('milestoneMessageText');
  const customerSelect = document.getElementById('milestoneCustomerSelect');
  const sendButton = document.getElementById('sendMilestoneMessageButton');

  async function generateMessage(type) {
    const customerId = customerSelect?.value;
    if (!customerId) {
      notify('Please select a customer to personalize the message.', 'error');
      return;
    }

    const messageRes = await API.business.generateMilestoneMessage(customerId, type);
    const messageData = getResponseData(messageRes, null);
    if (!messageData) {
      notify(getResponseError(messageRes, 'Unable to generate milestone message.'), 'error');
      return;
    }

    generatedType = type;
    generatedCustomerId = customerId;
    milestoneMessageText.value = messageData.message_text;
    milestoneMessagePreview.style.display = 'block';
    notify(`${type === 'birthday' ? 'Birthday' : 'Anniversary'} message generated. You can edit it before sending.`);
  }

  document.getElementById('generateBirthdayMessage')?.addEventListener('click', async () => {
    await generateMessage('birthday');
  });

  document.getElementById('generateAnniversaryMessage')?.addEventListener('click', async () => {
    await generateMessage('anniversary');
  });

  document.getElementById('editMilestoneMessageButton')?.addEventListener('click', () => {
    if (!milestoneMessagePreview || milestoneMessagePreview.style.display === 'none') {
      notify('Generate a milestone message first.', 'error');
      return;
    }
    milestoneMessageText.focus();
  });

  sendButton?.addEventListener('click', async () => {
    if (!generatedCustomerId || !generatedType) {
      notify('Generate a message before sending.', 'error');
      return;
    }
    const text = milestoneMessageText.value.trim();
    if (!text) {
      notify('Message cannot be empty.', 'error');
      return;
    }

    const sendRes = await API.business.sendMilestoneMessage({
      customerId: generatedCustomerId,
      milestoneType: generatedType,
      messageText: text,
    });
    if (!getResponseData(sendRes, null)) {
      notify(getResponseError(sendRes, 'Failed to send milestone message.'), 'error');
      return;
    }

    notify('Milestone message sent. It will be retried automatically if delivery fails.');
    milestoneMessagePreview.style.display = 'none';
    generatedType = null;
    generatedCustomerId = null;
    customerSelect.value = '';
  });

  document.getElementById('whatsappForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitButton = event.currentTarget.querySelector('button[type="submit"]');
    setButtonLoading(submitButton, true, 'Sending...');
    const formData = Object.fromEntries(new FormData(event.currentTarget).entries());
    formData.useAI = formData.useAI === 'true';
    const recipients = parseRecipientString(formData.toPhone);
    if (!recipients.length) {
      notify('Please enter a recipient phone number.', 'error');
      setButtonLoading(submitButton, false);
      return;
    }

    showConfirmationPreview(recipients, async () => {
      const valid = recipients.filter(r => r.valid);
      if (!valid.length) {
        notify('No valid phone numbers to send to.', 'error');
        setButtonLoading(submitButton, false);
        return;
      }

      // send to first valid (single-form) or iterate if multiple provided
      let anySuccess = false;
      for (const rec of valid) {
        const payload = { toPhone: rec.normalized, message: formData.message, useAI: formData.useAI };
        const res = await API.whatsapp.send(payload);
        if (res?.success) anySuccess = true;
      }

      if (anySuccess) {
        event.currentTarget.reset();
        notify('WhatsApp message queued.');
      } else {
        notify('Unable to send WhatsApp message.', 'error');
      }
      setButtonLoading(submitButton, false);
    }, () => {
      setButtonLoading(submitButton, false);
      notify('Send cancelled.');
    });
  });
}

async function renderWhatsApp() {
  const response = await API.conversations.list();
  const payload = getResponseData(response, { summary: {}, conversations: [] });
  const error = getResponseError(response, 'Conversations could not be loaded.');
  const summary = payload.summary || {};
  const conversations = payload.conversations || [];
  const selectedId = conversations[0]?.id || null;

  document.getElementById('content').innerHTML = `
    <div class="panel">
      <div class="panel-header">
        <div>
          <h2>WhatsApp Sales Assistant</h2>
          <p>Monitor AI conversations, unread customer messages, and human takeover from one workspace.</p>
        </div>
        <button type="button" id="refreshConversations" class="btn secondary">Refresh</button>
      </div>
      ${error ? renderSectionError(error) : ''}
      <div class="conversation-metrics">
        <div class="overview-card">
          <h4>Active chats</h4>
          <p>${Number(summary.active_chats || 0)}</p>
        </div>
        <div class="overview-card">
          <h4>AI handled</h4>
          <p>${Number(summary.ai_handled_chats || 0)}</p>
        </div>
        <div class="overview-card">
          <h4>Human takeover</h4>
          <p>${Number(summary.human_takeover || 0)}</p>
        </div>
        <div class="overview-card">
          <h4>Unread messages</h4>
          <p>${Number(summary.unread_messages || 0)}</p>
        </div>
      </div>
      <div class="conversation-dashboard">
        <aside class="conversation-list" id="conversationList">
          ${renderConversationList(conversations, selectedId)}
        </aside>
        <section class="conversation-detail" id="conversationDetail">
          ${selectedId ? '<div class="empty-state">Loading conversation...</div>' : '<div class="empty-state">No conversations yet. Incoming WhatsApp messages will appear here after the webhook receives them.</div>'}
        </section>
      </div>
    </div>
  `;

  document.getElementById('refreshConversations')?.addEventListener('click', renderWhatsApp);
  document.getElementById('conversationList')?.addEventListener('click', async (event) => {
    const item = event.target.closest('[data-conversation-id]');
    if (!item) return;
    document.querySelectorAll('.conversation-item').forEach(el => el.classList.remove('active'));
    item.classList.add('active');
    await loadConversationDetail(item.dataset.conversationId);
  });

  if (selectedId) {
    await loadConversationDetail(selectedId);
  }
}

async function renderInbox() {
  await renderWhatsApp();
}

function renderConversationList(conversations, selectedId) {
  if (!conversations.length) {
    return '<div class="empty-state">No active chats.</div>';
  }

  return conversations.map(conversation => `
    <button type="button" class="conversation-item ${conversation.id === selectedId ? 'active' : ''}" data-conversation-id="${escapeHtml(conversation.id)}">
      <span class="conversation-item-top">
        <strong>${escapeHtml(conversation.customer_name || conversation.contact_name || conversation.external_contact_phone)}</strong>
        ${Number(conversation.unread_count || 0) ? `<span class="unread-badge">${Number(conversation.unread_count || 0)}</span>` : ''}
      </span>
      <span class="conversation-item-meta">
        <span class="status ${escapeHtml(conversation.ai_status || 'active')}">${escapeHtml((conversation.ai_status || 'active').replace(/_/g, ' '))}</span>
        <span>${formatDate(conversation.last_message_at)}</span>
      </span>
      <span class="conversation-snippet">${escapeHtml(conversation.last_message_text || 'No messages yet')}</span>
    </button>
  `).join('');
}

async function loadConversationDetail(conversationId) {
  const container = document.getElementById('conversationDetail');
  if (!container) return;
  container.innerHTML = '<div class="empty-state">Loading conversation...</div>';

  const response = await API.conversations.detail(conversationId);
  const conversation = getResponseData(response, null);
  if (!conversation) {
    container.innerHTML = renderSectionError(getResponseError(response, 'Conversation could not be loaded.'));
    return;
  }

  container.innerHTML = renderConversationDetail(conversation);

  document.getElementById('assignConversation')?.addEventListener('click', async () => {
    const result = await API.conversations.assign(conversation.id, {});
    if (result?.success) {
      notify('Conversation assigned for human takeover.');
      await renderWhatsApp();
    } else {
      notify(result?.message || 'Unable to assign conversation.', 'error');
    }
  });

  document.getElementById('resumeAiConversation')?.addEventListener('click', async () => {
    const result = await API.conversations.resumeAi(conversation.id);
    if (result?.success) {
      notify('AI resumed for this conversation.');
      await renderInbox();
    } else {
      notify(result?.message || 'Unable to resume AI.', 'error');
    }
  });

  document.getElementById('closeConversation')?.addEventListener('click', async () => {
    const result = await API.conversations.close(conversation.id);
    if (result?.success) {
      notify('Conversation resolved.');
      await renderInbox();
    } else {
      notify(result?.message || 'Unable to close conversation.', 'error');
    }
  });

  document.getElementById('internalNoteForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const note = document.getElementById('internalNoteText').value.trim();
    if (!note) {
      notify('Note cannot be empty.', 'error');
      return;
    }
    const result = await API.conversations.addNote(conversation.id, { note });
    if (result?.success) {
      notify('Internal note added.');
      await loadConversationDetail(conversation.id);
    } else {
      notify(result?.message || 'Unable to add note.', 'error');
    }
  });

  document.getElementById('conversationReplyForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitButton = event.currentTarget.querySelector('button[type="submit"]');
    setButtonLoading(submitButton, true, 'Sending...');
    const message = document.getElementById('conversationReplyText').value.trim();
    if (!message) {
      notify('Reply cannot be empty.', 'error');
      setButtonLoading(submitButton, false);
      return;
    }

    const result = await API.conversations.reply(conversation.id, { message, useAI: false });
    if (result?.success) {
      notify('Reply sent.');
      await loadConversationDetail(conversation.id);
    } else {
      notify(result?.message || 'Unable to send reply.', 'error');
    }
    setButtonLoading(submitButton, false);
  });
}

function renderConversationDetail(conversation) {
  const messages = conversation.messages || [];
  const notes = Array.isArray(conversation.internal_notes) ? conversation.internal_notes : [];
  const tags = Array.isArray(conversation.tags) ? conversation.tags : [];
  const latestAi = (conversation.ai_interactions || [])[0];
  const invoiceDraft = latestAi?.invoice_draft;

  return `
    <div class="conversation-detail-header">
      <div>
        <h3>${escapeHtml(conversation.customer_name || conversation.contact_name || conversation.external_contact_phone)}</h3>
        <p>${escapeHtml(conversation.external_contact_phone || '')}</p>
      </div>
      <div class="button-row conversation-actions">
        <span class="status ${escapeHtml(conversation.status || 'active')}">${escapeHtml(conversation.status || 'active')}</span>
        <button type="button" id="assignConversation" class="btn secondary">Take Over</button>
        <button type="button" id="resumeAiConversation" class="btn secondary">Resume AI</button>
        <button type="button" id="closeConversation" class="btn secondary">Close</button>
      </div>
    </div>
    <div class="conversation-side-panel">
      <div>
        <h4>Customer Profile</h4>
        <p>${escapeHtml(conversation.customer_email || conversation.customer_phone || conversation.external_contact_phone || '-')}</p>
        <p>AI: ${conversation.ai_enabled === false ? 'Paused' : 'Active'} | Handoff: ${escapeHtml(conversation.human_state || 'ai_active')}</p>
      </div>
      <div>
        <h4>Tags</h4>
        <p>${tags.length ? tags.map(tag => `<span class="status">${escapeHtml(tag)}</span>`).join(' ') : 'No tags yet'}</p>
      </div>
    </div>
    ${invoiceDraft ? renderInvoiceDraft(invoiceDraft) : ''}
    <div class="message-thread">
      ${messages.length ? messages.map(message => `
        <div class="message-bubble ${message.direction === 'outbound' ? 'outbound' : 'inbound'}">
          <div class="message-meta">${escapeHtml(message.sender_type)} - ${formatDate(message.created_at)}</div>
          <div>${escapeHtml(message.message_text).replace(/\n/g, '<br>')}</div>
        </div>
      `).join('') : '<div class="empty-state">No messages in this conversation.</div>'}
    </div>
    <form id="conversationReplyForm" class="conversation-reply">
      <textarea id="conversationReplyText" rows="4" required placeholder="Type a human reply..."></textarea>
      <button type="submit" class="btn-primary">Send reply</button>
    </form>
    <form id="internalNoteForm" class="conversation-reply">
      <textarea id="internalNoteText" rows="3" required placeholder="Add an internal note..."></textarea>
      <button type="submit" class="btn-secondary">Add note</button>
    </form>
    <div class="internal-notes">
      <h4>Internal Notes</h4>
      ${notes.length ? notes.map(note => `<p>${escapeHtml(note.note || '')}<br><small>${formatDate(note.created_at)}</small></p>`).join('') : '<p>No internal notes yet.</p>'}
    </div>
  `;
}

function renderInvoiceDraft(invoiceDraft) {
  const items = Array.isArray(invoiceDraft.invoice_items) ? invoiceDraft.invoice_items : [];
  return `
    <div class="invoice-draft">
      <h4>AI invoice draft</h4>
      <p>${escapeHtml(invoiceDraft.customer_name || 'Customer')} - ${formatMoney(invoiceDraft.amount)}</p>
      ${items.length ? `
        <ul>
          ${items.map(item => `<li>${escapeHtml(item.product_name)} - ${Number(item.quantity || 0)} x ${formatMoney(item.unit_price)}</li>`).join('')}
        </ul>
      ` : ''}
    </div>
  `;
}

async function renderSubscriptions() {
  const [currentRes, invoicesRes] = await Promise.all([
    API.billing.currentPlan(),
    API.billing.invoices(),
  ]);
  const payload = getResponseData(currentRes, { subscription: null, plans: [], usage: {} });
  const invoices = getResponseData(invoicesRes, []);
  const error = getResponseError(currentRes, 'Billing details could not be loaded.') || getResponseError(invoicesRes, 'Billing history could not be loaded.');
  const subscription = payload.subscription || {};
  const plans = payload.plans || [];
  const usage = payload.usage || {};
  const billingCycle = subscription.billing_cycle || 'monthly';

  document.getElementById('content').innerHTML = `
    <div class="panel">
      <div class="panel-header">
        <div>
          <h2>Billing</h2>
          <p>Manage your plan, usage, Paystack billing, and invoice history.</p>
        </div>
      </div>
      ${error ? renderSectionError(error) : ''}

      <div class="billing-summary">
        <div class="overview-card">
          <h4>Current Plan</h4>
          <p>${escapeHtml(subscription.plan_name || 'Trial')}</p>
          <span class="status ${escapeHtml(subscription.status || 'trialing')}">${escapeHtml(subscription.status || 'trialing')}</span>
        </div>
        <div class="overview-card">
          <h4>Billing Cycle</h4>
          <p>${escapeHtml(billingCycle)}</p>
        </div>
        <div class="overview-card">
          <h4>Renewal Date</h4>
          <p>${subscription.next_billing_date ? formatDate(subscription.next_billing_date) : '-'}</p>
        </div>
      </div>

      <div class="subsection compact-overview">
        <h3>Usage</h3>
        <div class="usage-grid">
          ${renderUsageMetric('Users', usage.users)}
          ${renderUsageMetric('Conversations', usage.conversations)}
          ${renderUsageMetric('AI Assistants', usage.ai_assistants)}
          ${renderUsageMetric('WhatsApp Numbers', usage.whatsapp_numbers)}
        </div>
      </div>

      <div class="subsection compact-overview">
        <div class="panel-header nested">
          <div>
            <h3>Plans</h3>
            <p>Switch monthly or yearly plans. Checkout is powered by Paystack.</p>
          </div>
          <select id="billingCycleSelect" class="compact-select">
            <option value="monthly" ${billingCycle === 'monthly' ? 'selected' : ''}>Monthly</option>
            <option value="yearly" ${billingCycle === 'yearly' ? 'selected' : ''}>Yearly</option>
          </select>
        </div>
        <div class="pricing-grid">
          ${plans.map(plan => renderPricingCard(plan, subscription, billingCycle)).join('')}
        </div>
      </div>

      <div class="subsection compact-overview">
        <h3>Billing History</h3>
        ${renderBillingInvoiceTable(invoices)}
      </div>
    </div>
  `;

  document.querySelectorAll('[data-billing-plan]').forEach(button => {
    button.addEventListener('click', async () => {
      const plan = button.dataset.billingPlan;
      const cycle = document.getElementById('billingCycleSelect')?.value || 'monthly';
      const currentPrice = Number(subscription[cycle === 'yearly' ? 'yearly_price' : 'monthly_price'] || 0);
      const targetPrice = Number(button.dataset.planPrice || 0);
      const action = targetPrice < currentPrice ? 'downgrade' : 'upgrade';
      setButtonLoading(button, true, 'Opening Paystack...');
      const result = action === 'downgrade'
        ? await API.billing.downgrade({ plan, billingCycle: cycle })
        : await API.billing.upgrade({ plan, billingCycle: cycle });

      if (!result?.success) {
        notify(result?.message || 'Unable to start Paystack checkout.', 'error');
        setButtonLoading(button, false);
        return;
      }
      const paymentUrl = result.data?.authorization_url;
      if (paymentUrl) {
        window.location.href = paymentUrl;
        return;
      }
      notify('Plan change created.');
      await renderSubscriptions();
    });
  });
}

function renderUsageMetric(label, metric = {}) {
  const used = Number(metric.used || 0);
  const limit = metric.limit === null || metric.limit === undefined ? null : Number(metric.limit);
  const percent = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const displayLimit = limit === null ? 'Unlimited' : limit.toLocaleString();
  return `
    <div class="usage-card">
      <div class="usage-card-top">
        <strong>${escapeHtml(label)}</strong>
        <span>${used.toLocaleString()} / ${displayLimit}</span>
      </div>
      <div class="usage-progress"><span style="width:${percent}%"></span></div>
    </div>
  `;
}

function renderPricingCard(plan, subscription, billingCycle) {
  const price = Number(billingCycle === 'yearly' ? plan.yearly_price : plan.monthly_price || 0);
  const isCurrent = subscription.plan_slug === plan.slug;
  const isEnterprise = plan.slug === 'enterprise';
  return `
    <div class="pricing-card ${isCurrent ? 'current' : ''}">
      <h4>${escapeHtml(plan.name)}</h4>
      <p>${escapeHtml(plan.description || '')}</p>
      <div class="plan-price">${isEnterprise ? 'Custom' : formatMoney(price)}<span>${isEnterprise ? '' : `/${billingCycle === 'yearly' ? 'yr' : 'mo'}`}</span></div>
      <ul>
        <li>${plan.max_users == null ? 'Unlimited' : plan.max_users} users</li>
        <li>${plan.max_whatsapp_numbers == null ? 'Unlimited' : plan.max_whatsapp_numbers} WhatsApp numbers</li>
        <li>${plan.monthly_conversation_limit == null ? 'Unlimited' : Number(plan.monthly_conversation_limit).toLocaleString()} conversations/month</li>
      </ul>
      <button type="button" class="btn-primary" data-billing-plan="${escapeHtml(plan.slug)}" data-plan-price="${price}" ${isCurrent || isEnterprise ? 'disabled' : ''}>
        ${isCurrent ? 'Current Plan' : isEnterprise ? 'Contact Sales' : 'Choose Plan'}
      </button>
    </div>
  `;
}

function renderBillingInvoiceTable(invoices) {
  if (!invoices.length) {
    return '<div class="empty-state">No billing invoices yet.</div>';
  }

  return `
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Invoice</th>
            <th>Status</th>
            <th>Amount</th>
            <th>Paid</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          ${invoices.map(invoice => `
            <tr>
              <td>${escapeHtml(invoice.invoice_number || invoice.id)}</td>
              <td><span class="status ${escapeHtml(invoice.status || 'pending')}">${escapeHtml(invoice.status || 'pending')}</span></td>
              <td>${formatMoney(invoice.amount)}</td>
              <td>${invoice.paid_at ? formatDate(invoice.paid_at) : '-'}</td>
              <td>${formatDate(invoice.created_at)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

async function renderAiAssistant() {
  const response = await API.ai.settings();
  const settings = getResponseData(response, {});
  const error = getResponseError(response, 'AI settings could not be loaded.');

  document.getElementById('content').innerHTML = `
    <div class="panel">
      <div class="panel-header">
        <div>
          <h2>AI Assistant</h2>
          <p>Configure how SabiBiz responds, escalates, and speaks with customers in WhatsApp conversations.</p>
        </div>
      </div>
      ${error ? renderSectionError(error) : ''}
      <form id="aiSettingsForm" class="settings-card wide-card">
        <div class="form-row">
          <div class="form-group">
            <label for="aiAssistantName">Assistant Name</label>
            <input id="aiAssistantName" name="assistant_name" value="${escapeHtml(settings.assistant_name || 'Sabi Assistant')}" required>
          </div>
          <div class="form-group">
            <label for="aiBusinessCategory">Business Category</label>
            <input id="aiBusinessCategory" name="business_category" value="${escapeHtml(settings.business_category || '')}" placeholder="Retail, fashion, electronics...">
          </div>
        </div>
        <div class="form-group">
          <label for="aiBusinessContext">Business Description</label>
          <textarea id="aiBusinessContext" name="business_context" rows="5" placeholder="Products, pricing rules, delivery policy, refund policy...">${escapeHtml(settings.business_context || '')}</textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="aiTone">Tone</label>
            <select id="aiTone" name="tone">
              ${['Friendly', 'Professional', 'Sales-focused'].map(tone => `<option value="${tone}" ${settings.tone === tone ? 'selected' : ''}>${tone}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label for="aiLanguage">Language</label>
            <select id="aiLanguage" name="language">
              ${['English', 'Pidgin', 'Yoruba', 'Hausa', 'Igbo'].map(language => `<option value="${language}" ${settings.language === language ? 'selected' : ''}>${language}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row checkbox-row">
          <div class="form-group checkbox-group">
            <label>
              <input id="aiEnabled" name="enabled" type="checkbox" ${settings.enabled !== false ? 'checked' : ''}>
              <span>AI assistant enabled</span>
            </label>
          </div>
          <div class="form-group checkbox-group">
            <label>
              <input id="aiEscalationEnabled" name="escalation_enabled" type="checkbox" ${settings.escalation_enabled !== false ? 'checked' : ''}>
              <span>Human escalation enabled</span>
            </label>
          </div>
        </div>
        <div class="form-group">
          <label for="aiEscalationKeywords">Escalation Keywords</label>
          <input id="aiEscalationKeywords" name="escalation_keywords" value="${escapeHtml((settings.escalation_keywords || ['human', 'agent', 'complaint', 'refund']).join(', '))}">
        </div>
        <button type="submit" class="btn-primary">Save AI Settings</button>
      </form>
    </div>
  `;

  document.getElementById('aiSettingsForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const submitButton = form.querySelector('button[type="submit"]');
    const data = Object.fromEntries(new FormData(form).entries());
    data.enabled = document.getElementById('aiEnabled').checked;
    data.escalation_enabled = document.getElementById('aiEscalationEnabled').checked;
    data.escalation_keywords = String(data.escalation_keywords || '').split(',').map(item => item.trim()).filter(Boolean);
    setButtonLoading(submitButton, true, 'Saving...');
    const result = await API.ai.saveSettings(data);
    setButtonLoading(submitButton, false);
    if (getResponseData(result, null)) {
      notify('AI assistant settings saved.');
    } else {
      notify(getResponseError(result, 'Unable to save AI settings.'), 'error');
    }
  });
}

async function renderCampaigns() {
  document.getElementById('content').innerHTML = `
    <div class="panel">
      <div class="panel-header">
        <div>
          <h2>Campaigns</h2>
          <p>Broadcasts and segmented WhatsApp campaigns are coming soon.</p>
        </div>
      </div>
      <div class="empty-state">Campaigns will use the same customer intelligence, WhatsApp accounts, and AI settings already prepared in this phase.</div>
    </div>
  `;
}

function renderWhatsAppAccounts(accounts = []) {
  if (!accounts.length) {
    return '<div class="empty-state">No WhatsApp numbers connected yet.</div>';
  }

  return `
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Number</th>
            <th>Status</th>
            <th>Phone Number ID</th>
            <th>Connected</th>
          </tr>
        </thead>
        <tbody>
          ${accounts.map(account => `
            <tr>
              <td>${escapeHtml(account.display_phone_number || '-')}</td>
              <td><span class="status ${escapeHtml(account.status || 'pending')}">${escapeHtml(account.status || 'pending')}</span></td>
              <td>${escapeHtml(account.phone_number_id || '-')}</td>
              <td>${account.connected_at ? formatDate(account.connected_at) : '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

async function renderSettings() {
  const [response, accountsRes] = await Promise.all([
    API.auth.me(),
    API.whatsapp.accounts(),
  ]);
  const user = response?.data || {};
  const accounts = getResponseData(accountsRes, []);
  const theme = getThemePreference();

  document.getElementById('content').innerHTML = `
    <div class="panel">
      <div class="panel-header">
        <div>
          <h2>Settings</h2>
          <p>Manage your profile, WhatsApp connection readiness, password, and display preferences.</p>
        </div>
      </div>
      <div class="settings-grid">
        <form id="profileForm" class="settings-card">
          <h3>Personal Details</h3>
          <div class="form-group">
            <label for="settingsName">Full Name</label>
            <input id="settingsName" name="name" value="${escapeHtml(user.name || '')}" required>
          </div>
          <div class="form-group">
            <label for="settingsEmail">Email</label>
            <input id="settingsEmail" name="email" type="email" value="${escapeHtml(user.email || '')}" required>
          </div>
          <div class="form-group">
            <label for="settingsPhone">Phone</label>
            <input id="settingsPhone" name="phone" type="tel" value="${escapeHtml(user.phone || '')}">
          </div>
          <div class="form-group">
            <label for="settingsShop">Shop Name</label>
            <input id="settingsShop" name="shop_name" value="${escapeHtml(user.shop_name || '')}">
          </div>
          <div class="form-group">
            <label for="settingsBusinessType">Business Type</label>
            <input id="settingsBusinessType" name="business_type" value="${escapeHtml(user.business_type || '')}">
          </div>
          <button type="submit" class="btn-primary">Save Details</button>
        </form>

        <form id="passwordForm" class="settings-card">
          <h3>Password</h3>
          <div class="form-group">
            <label for="currentPassword">Current Password</label>
            <input id="currentPassword" name="currentPassword" type="password" required>
          </div>
          <div class="form-group">
            <label for="newPassword">New Password</label>
            <input id="newPassword" name="newPassword" type="password" required>
          </div>
          <button type="submit" class="btn-primary">Update Password</button>
        </form>

        <div class="settings-card">
          <h3>WhatsApp</h3>
          <p class="form-help">Business verification is pending. Account records live here so Embedded Signup can be connected later without global WhatsApp tokens.</p>
          <button type="button" id="connectWhatsappSoon" class="btn-primary" disabled>Connect WhatsApp (Coming Soon)</button>
          ${renderWhatsAppAccounts(accounts)}
        </div>

        <div class="settings-card">
          <h3>Appearance</h3>
          <div class="theme-options" role="radiogroup" aria-label="Theme">
            <label><input type="radio" name="theme" value="system" ${theme === 'system' ? 'checked' : ''}> System</label>
            <label><input type="radio" name="theme" value="light" ${theme === 'light' ? 'checked' : ''}> Light</label>
            <label><input type="radio" name="theme" value="dark" ${theme === 'dark' ? 'checked' : ''}> Dark</label>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('profileForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitButton = event.currentTarget.querySelector('button[type="submit"]');
    setButtonLoading(submitButton, true, 'Saving...');
    const formData = Object.fromEntries(new FormData(event.currentTarget).entries());
    const result = await API.auth.updateMe(formData);
    if (result?.success) {
      notify('Personal details updated.');
    } else {
      notify(result?.message || 'Unable to update details.', 'error');
    }
    setButtonLoading(submitButton, false);
  });

  document.getElementById('passwordForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitButton = event.currentTarget.querySelector('button[type="submit"]');
    setButtonLoading(submitButton, true, 'Updating...');
    const formData = Object.fromEntries(new FormData(event.currentTarget).entries());
    const result = await API.auth.updatePassword(formData);
    if (result?.success) {
      event.currentTarget.reset();
      setupPasswordToggles();
      notify('Password updated.');
    } else {
      notify(result?.message || 'Unable to update password.', 'error');
    }
    setButtonLoading(submitButton, false);
  });

  document.querySelectorAll('input[name="theme"]').forEach(input => {
    input.addEventListener('change', () => {
      setThemePreference(input.value);
      notify('Theme preference saved.');
    });
  });
}

function renderLogin() {
  app.innerHTML = `
    <div class="auth-container">
      <div class="auth-box">
        <h1>SabiBiz</h1>
        <p>Accounting & Business Management for Nigerian Entrepreneurs</p>
        <div id="errorMessage" class="error-message" style="display: none;"></div>
        <form id="loginForm">
          <div class="form-group">
            <label for="email">Email</label>
            <input type="email" id="email" name="email" required placeholder="your@email.com">
          </div>
          <div class="form-group">
            <label for="password">Password</label>
            <input type="password" id="password" name="password" required placeholder="Password">
          </div>
          <button type="submit" class="btn-primary">Sign In</button>
        </form>
        <p class="auth-footer">
          Don't have an account? <a href="#/register">Sign up here for 2 weeks free</a>
        </p>
      </div>
    </div>
  `;

  document.getElementById('loginForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.style.display = 'none';

    const response = await API.auth.login({
      email: document.getElementById('email').value.trim(),
      password: document.getElementById('password').value,
    });

    if (response?.token) {
      setToken(response.token);
      const pendingRoute = localStorage.getItem(pendingRouteKey);
      localStorage.removeItem(pendingRouteKey);
      window.location.hash = pendingRoute || defaultRoute;
      renderApp();
    } else {
      errorDiv.textContent = response?.message || 'Login failed';
      errorDiv.style.display = 'block';
    }
  });
}

function renderRegister() {
  app.innerHTML = `
    <div class="auth-container">
      <div class="auth-box">
        <h1>SabiBiz</h1>
        <p>Create your account and start a 14-day free trial.</p>
        <div class="trial-banner">No payment required. Full access for 2 weeks.</div>
        <div id="errorMessage" class="error-message" style="display: none;"></div>
        <form id="signupForm">
          <div class="form-group">
            <label for="name">Full Name</label>
            <input type="text" id="name" name="name" required placeholder="John Doe">
          </div>
          <div class="form-group">
            <label for="email">Email</label>
            <input type="email" id="email" name="email" required placeholder="your@email.com">
          </div>
          <div class="form-group">
            <label for="phone">Phone (Optional)</label>
            <input type="tel" id="phone" name="phone" placeholder="+234 xxx xxx xxxx">
          </div>
          <div class="form-group">
            <label for="password">Password</label>
            <input type="password" id="password" name="password" required placeholder="Password">
          </div>
          <div class="form-group">
            <label for="confirmPassword">Confirm Password</label>
            <input type="password" id="confirmPassword" name="confirmPassword" required placeholder="Password">
          </div>
          <button type="submit" class="btn-primary" id="signupButton">Start Free Trial</button>
        </form>
        <p class="auth-footer">
          Already have an account? <a href="#/login">Sign in here</a>
        </p>
      </div>
    </div>
  `;

  document.getElementById('signupForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const errorDiv = document.getElementById('errorMessage');
    const signupButton = document.getElementById('signupButton');
    errorDiv.style.display = 'none';
    signupButton.disabled = true;
    signupButton.textContent = 'Creating account...';

    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (password !== confirmPassword) {
      errorDiv.textContent = 'Passwords do not match';
      errorDiv.style.display = 'block';
      signupButton.disabled = false;
      signupButton.textContent = 'Start Free Trial';
      return;
    }

    const response = await API.auth.register({ name, email, phone, password });
    if (response?.success && (response.token || response.data?.token)) {
      setToken(response.token || response.data.token);
      window.location.hash = defaultRoute;
      renderApp();
    } else {
      errorDiv.textContent = response?.message || 'Signup failed. Please try again.';
      errorDiv.style.display = 'block';
      signupButton.disabled = false;
      signupButton.textContent = 'Start Free Trial';
    }
  });
}

function setupPasswordToggles() {
  document.querySelectorAll('input[type="password"]').forEach(input => {
    if (input.parentElement?.classList.contains('password-field')) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'password-field';
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'password-toggle';
    button.textContent = 'Show';
    button.setAttribute('aria-label', `Show ${input.name || 'password'}`);
    wrapper.appendChild(button);

    button.addEventListener('click', () => {
      const shouldShow = input.type === 'password';
      input.type = shouldShow ? 'text' : 'password';
      button.textContent = shouldShow ? 'Hide' : 'Show';
      button.setAttribute('aria-label', `${shouldShow ? 'Hide' : 'Show'} ${input.name || 'password'}`);
    });
  });
}

function getThemePreference() {
  return localStorage.getItem('themePreference') || 'system';
}

function setThemePreference(theme) {
  localStorage.setItem('themePreference', theme);
  applyTheme();
}

function applyTheme() {
  const theme = getThemePreference();
  document.documentElement.dataset.theme = theme;
}

renderApp();
window.addEventListener('hashchange', renderApp);
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (getThemePreference() === 'system') {
    applyTheme();
  }
});

console.log('SabiBiz Frontend Ready');
