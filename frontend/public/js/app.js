// frontend/public/js/app.js
// Main application entry point

console.log('SabiBiz Frontend Loading...');

function resolveApiBaseUrl() {
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

const API_BASE = resolveApiBaseUrl();
const app = document.getElementById('app');
const defaultRoute = '#/dashboard';
const pendingRouteKey = 'SABIBIZ_PENDING_ROUTE';
const dashboardRoutes = new Set([
  'dashboard',
  'sales',
  'invoices',
  'inventory',
  'whatsapp',
  'customers',
  'subscriptions',
  'settings',
]);
const authRoutes = new Set(['login', 'register']);

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

    let response;
    try {
      response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
      });
    } catch (err) {
      return { success: false, message: err?.message || 'Network error' };
    }

    let payload;
    try {
      payload = await response.json();
    } catch (err) {
      payload = { success: response.ok, message: response.statusText || '' };
    }

    if (response && response.status === 401) {
      localStorage.removeItem('token');
      window.location.hash = '#/login';
    }

    return payload;
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
    salesAnalytics: () => API.request('/api/business/sales/analytics'),
    customersAnalytics: () => API.request('/api/business/customers/analytics'),
  },

  whatsapp: {
    send: (data) => API.request('/api/whatsapp/send', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  },

  analytics: {
    metrics: () => API.request('/api/analytics'),
  },

  subscriptions: {
    list: () => API.request('/api/subscriptions'),
    subscribe: (data) => API.request('/api/subscriptions/subscribe', {
      method: 'POST',
      body: JSON.stringify(data),
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
    renderDashboardShell();
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
  app.innerHTML = `
    <div class="dashboard">
      <nav class="navbar">
        <div class="navbar-brand">
          <button type="button" id="navToggle" class="nav-toggle" aria-label="Toggle menu">
            <span></span>
            <span></span>
            <span></span>
          </button>
          <h1>SabiBiz</h1>
        </div>
        <div class="navbar-menu" id="navbarMenu">
          <a href="#/dashboard" data-route="dashboard" class="nav-item">
            <span class="nav-icon">📊</span>
            <span>Dashboard</span>
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
          <a href="#/whatsapp" data-route="whatsapp" class="nav-item">
            <span class="nav-icon">💬</span>
            <span>WhatsApp</span>
          </a>
          <a href="#/subscriptions" data-route="subscriptions" class="nav-item">
            <span class="nav-icon">🎁</span>
            <span>Subscriptions</span>
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
  
  navToggle?.addEventListener('click', () => {
    navbarMenu?.classList.toggle('active');
    navToggle.classList.toggle('active');
  });

  navbarMenu?.addEventListener('click', (e) => {
    if (e.target.closest('a') && !e.target.closest('.nav-toggle')) {
      navbarMenu.classList.remove('active');
      navToggle?.classList.remove('active');
    }
  });

  document.getElementById('logoutButton').addEventListener('click', logout);
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

  if (route === 'invoices') {
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
  } else if (route === 'whatsapp') {
    renderWhatsApp();
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
  const [invoicesRes, inventoryRes, salesRes, salesAnalyticsRes, invoiceAnalyticsRes] = await Promise.all([
    API.business.invoices(),
    API.business.inventory(),
    API.business.sales(),
    API.business.salesAnalytics(),
    API.business.invoiceAnalytics(),
  ]);
  const analyticsRes = await API.analytics.metrics();

  const invoices = getResponseData(invoicesRes);
  const inventory = getResponseData(inventoryRes);
  const sales = getResponseData(salesRes);
  const salesAnalytics = getResponseData(salesAnalyticsRes, {});
  const invoiceAnalytics = getResponseData(invoiceAnalyticsRes, {});
  const metrics = getResponseData(analyticsRes);
  const errors = [
    getResponseError(invoicesRes, 'Invoices could not be loaded.'),
    getResponseError(inventoryRes, 'Inventory could not be loaded.'),
    getResponseError(salesRes, 'Sales could not be loaded.'),
    getResponseError(salesAnalyticsRes, 'Sales analytics could not be loaded.'),
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
      ${renderSalesTrendSection(salesTrend)}
      ${renderRecentMetrics(metrics)}
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
        </tr>
      `;
    }).join('');
  };

  const updateCustomerList = () => renderCustomerTable(filterCustomers());

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

  // Start in view mode
  showView();

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
      ${error ? renderSectionError(error) : ''}
      ${renderInventoryTable(items)}
    </div>
  `;

  document.getElementById('customerDetailForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;

    clearFieldErrors(form);
    const validation = validateCustomerForm(form);
    if (!validation.ok) {
      notify('Please fix the highlighted fields.', 'error');
      const firstError = form.querySelector('.input-error');
      if (firstError) firstError.focus();
      return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    setButtonLoading(submitButton, true, 'Saving...');
    showEditSpinner(true);
    const payload = validation.data;
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
}

async function renderSales() {
  const [inventoryRes, salesRes, analyticsRes] = await Promise.all([
    API.business.inventory(),
    API.business.sales(),
    API.business.salesAnalytics(),
  ]);

  const inventory = getResponseData(inventoryRes);
  const sales = getResponseData(salesRes);
  const analytics = getResponseData(analyticsRes, {});

  const errors = [
    getResponseError(inventoryRes, 'Inventory could not be loaded.'),
    getResponseError(salesRes, 'Sales could not be loaded.'),
    getResponseError(analyticsRes, 'Sales analytics could not be loaded.'),
  ].filter(Boolean);

  document.getElementById('content').innerHTML = `
    <div class="panel">
      <div class="panel-header">
        <div>
          <h2>Sales</h2>
          <p>Record daily sales and review the performance of your products.</p>
        </div>
      </div>
      ${errors.length ? renderSectionError(errors.join(' ')) : ''}
      <div class="sales-layout">
        <div class="sales-form-panel">
          <form id="salesForm" class="form-grid">
            <div class="form-group">
              <label for="saleProduct">Product</label>
              <select id="saleProduct" name="inventory_id" required>
                <option value="">Select product</option>
                ${inventory.map(item => `
                  <option value="${item.id}"
                    data-unit-price="${item.unit_price || 0}"
                    data-cost-price="${item.cost_price || 0}">
                    ${escapeHtml(item.product_name || '-')}
                  </option>
                `).join('')}
              </select>
            </div>
            <div class="form-group">
              <label for="saleDate">Sale Date</label>
              <input id="saleDate" name="sale_date" type="date" value="${new Date().toISOString().slice(0, 10)}" required>
            </div>
            <div class="form-group">
              <label for="saleUnit">Unit</label>
              <input id="saleUnit" name="unit" required placeholder="pcs, kg, bundle">
            </div>
            <div class="form-group">
              <label for="saleQuantity">Quantity</label>
              <input id="saleQuantity" name="quantity" type="number" min="1" value="1" required>
            </div>
            <div class="form-group">
              <label for="saleUnitPrice">Unit Price</label>
              <input id="saleUnitPrice" name="unit_price" type="number" min="0" step="0.01" required>
            </div>
            <div class="form-group">
              <label for="saleCostPrice">Cost Price</label>
              <input id="saleCostPrice" name="cost_price" type="number" min="0" step="0.01">
            </div>
            <div class="form-group">
              <label for="saleTotal">Total Amount</label>
              <input id="saleTotal" name="total_amount" type="number" min="0" step="0.01" required>
            </div>
            <button type="submit" class="btn-primary form-action">Record Sale</button>
          </form>
        </div>

        <div class="sales-summary-panel">
          <h3>Sales Analytics</h3>
          <div class="stats">
            <div class="stat-card">
              <h4>Total Revenue</h4>
              <p class="stat-number">${formatMoney(analytics.total_sales)}</p>
            </div>
            <div class="stat-card">
              <h4>Total Profit</h4>
              <p class="stat-number">${formatMoney(analytics.total_profit)}</p>
            </div>
            <div class="stat-card">
              <h4>Avg Margin</h4>
              <p class="stat-number">${analytics.avg_margin != null ? `${analytics.avg_margin.toFixed(2)}%` : '-'}</p>
            </div>
            <div class="stat-card">
              <h4>Total Loss</h4>
              <p class="stat-number">${formatMoney(analytics.total_loss)}</p>
            </div>
            <div class="stat-card">
              <h4>Best Product</h4>
              <p class="stat-number">${escapeHtml(analytics.top_product || '-')}</p>
            </div>
            <div class="stat-card">
              <h4>Top Sale Time</h4>
              <p class="stat-number">${escapeHtml(analytics.highest_sale_time || '-')}</p>
            </div>
          </div>
        </div>
      </div>

      ${renderSalesTable(sales)}
    </div>
  `;

  const saleProduct = document.getElementById('saleProduct');
  const saleQuantity = document.getElementById('saleQuantity');
  const saleUnitPrice = document.getElementById('saleUnitPrice');
  const saleCostPrice = document.getElementById('saleCostPrice');
  const saleTotal = document.getElementById('saleTotal');

  const syncSaleTotal = () => {
    const quantity = Number(saleQuantity?.value || 0);
    const unitPrice = Number(saleUnitPrice?.value || 0);
    saleTotal.value = (quantity * unitPrice).toFixed(2);
  };

  saleProduct?.addEventListener('change', () => {
    const selectedOption = saleProduct.selectedOptions[0];
    if (!selectedOption) return;
    saleUnitPrice.value = selectedOption.dataset.unitPrice || '';
    saleCostPrice.value = selectedOption.dataset.costPrice || '';
    syncSaleTotal();
  });

  saleQuantity?.addEventListener('input', syncSaleTotal);
  saleUnitPrice?.addEventListener('input', syncSaleTotal);

  document.getElementById('salesForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = Object.fromEntries(new FormData(event.currentTarget).entries());
    formData.quantity = Number(formData.quantity || 0);
    formData.unit_price = Number(formData.unit_price || 0);
    formData.cost_price = Number(formData.cost_price || 0);
    formData.total_amount = Number(formData.total_amount || (formData.quantity * formData.unit_price));

    const result = await API.business.createSale(formData);
    if (result?.success) {
      notify('Sale recorded successfully.');
      await renderSales();
    } else {
      notify(result?.message || 'Unable to record sale.', 'error');
    }
  });
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
            <th>Unit</th>
            <th>Quantity</th>
            <th>Unit Price</th>
            <th>Total</th>
            <th>Profit</th>
            <th>Sale Date</th>
          </tr>
        </thead>
        <tbody>
          ${sales.map(sale => `
            <tr>
              <td>${escapeHtml(sale.product_name || '-')}</td>
              <td>${escapeHtml(sale.unit || '-')}</td>
              <td>${Number(sale.quantity || 0)}</td>
              <td>${formatMoney(sale.unit_price)}</td>
              <td>${formatMoney(sale.total_amount)}</td>
              <td>${formatMoney(sale.profit)}</td>
              <td>${formatDate(sale.sale_date || sale.sale_time)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderWhatsApp() {
  document.getElementById('content').innerHTML = `
    <div class="panel">
      <div class="panel-header">
        <div>
          <h2>WhatsApp</h2>
          <p>Send customer messages from your connected WhatsApp setup.</p>
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

  document.getElementById('whatsappForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitButton = event.currentTarget.querySelector('button[type="submit"]');
    setButtonLoading(submitButton, true, 'Sending...');
    const formData = Object.fromEntries(new FormData(event.currentTarget).entries());
    formData.useAI = formData.useAI === 'true';
    const result = await API.whatsapp.send(formData);
    if (result?.success) {
      event.currentTarget.reset();
      notify('WhatsApp message queued.');
    } else {
      notify(result?.message || 'Unable to send WhatsApp message.', 'error');
    }
    setButtonLoading(submitButton, false);
  });
}

async function renderSubscriptions() {
  const response = await API.subscriptions.list();
  const subscriptions = getResponseData(response);
  const error = getResponseError(response, 'Subscriptions could not be loaded.');

  document.getElementById('content').innerHTML = `
    <div class="panel">
      <div class="panel-header">
        <div>
          <h2>Subscriptions</h2>
          <p>Review your plan history or start a monthly plan.</p>
        </div>
      </div>
      <form id="subscriptionForm" class="form-grid">
        <div class="form-group">
          <label for="plan">Plan</label>
          <select id="plan" name="plan" required>
            <option value="starter">Starter - NGN 2,990/mo</option>
            <option value="growth">Growth - NGN 4,990/mo</option>
            <option value="pro">Pro - NGN 9,990/mo</option>
          </select>
        </div>
        <div class="form-group">
          <label for="paymentMethod">Payment Method</label>
          <select id="paymentMethod" name="paymentMethod">
            <option value="manual">Manual</option>
            <option value="paystack">Paystack</option>
          </select>
        </div>
        <button type="submit" class="btn-primary form-action">Start Subscription</button>
      </form>
      ${error ? renderSectionError(error) : ''}
      ${renderSubscriptionTable(subscriptions)}
    </div>
  `;

  document.getElementById('subscriptionForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitButton = event.currentTarget.querySelector('button[type="submit"]');
    setButtonLoading(submitButton, true, 'Starting...');
    const formData = Object.fromEntries(new FormData(event.currentTarget).entries());
    const result = formData.paymentMethod === 'paystack'
      ? await API.payments.initializePaystack({ plan: formData.plan })
      : await API.subscriptions.subscribe(formData);

    if (result?.success) {
      const paymentUrl = result.data?.authorization_url;
      if (paymentUrl) {
        window.location.href = paymentUrl;
        return;
      }

      notify('Subscription started.');
      await renderSubscriptions();
    } else {
      notify(result?.message || 'Unable to start subscription.', 'error');
      setButtonLoading(submitButton, false);
    }
  });
}

function renderSubscriptionTable(subscriptions) {
  if (!subscriptions.length) {
    return '<div class="empty-state">No subscriptions yet.</div>';
  }

  return `
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Plan</th>
            <th>Status</th>
            <th>Payment</th>
            <th>Started</th>
            <th>Expires</th>
          </tr>
        </thead>
        <tbody>
          ${subscriptions.map(subscription => `
            <tr>
              <td>${escapeHtml(subscription.plan || '-')}</td>
              <td><span class="status ${escapeHtml(subscription.status || 'draft')}">${escapeHtml(subscription.status || '-')}</span></td>
              <td>${escapeHtml(subscription.payment_method || '-')}</td>
              <td>${formatDate(subscription.started_at || subscription.created_at)}</td>
              <td>${formatDate(subscription.expires_at)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

async function renderSettings() {
  const response = await API.auth.me();
  const user = response?.data || {};
  const theme = getThemePreference();

  document.getElementById('content').innerHTML = `
    <div class="panel">
      <div class="panel-header">
        <div>
          <h2>Settings</h2>
          <p>Manage your profile, password, and display preferences.</p>
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
          Don't have an account? <a href="./register.html">Sign up here for 2 weeks free</a>
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
