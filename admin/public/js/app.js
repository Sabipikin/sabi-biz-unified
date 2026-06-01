// admin/public/js/app.js
// Admin dashboard application

console.log('🔧 SabiBiz Admin Dashboard Loading...');

const app = document.getElementById('app');
const defaultRoute = '#/dashboard';

function renderShell() {
  app.innerHTML = `
    <div class="admin-dashboard">
      <nav class="admin-navbar" aria-label="Admin sidebar">
        <div class="admin-navbar-header">
          <div class="admin-navbar-brand">
            <h1>SabiBiz Admin</h1>
          </div>
          <button id="adminMenuToggle" class="mobile-menu-toggle" type="button" aria-expanded="false" aria-label="Open admin navigation">
            ☰
          </button>
        </div>

        <div class="admin-navbar-menu">
          <a href="#/dashboard" data-route="dashboard">Dashboard</a>
          <a href="#/users" data-route="users">Users</a>
          <a href="#/subscriptions" data-route="subscriptions">Subscriptions</a>
          <a href="#/payments" data-route="payments">Payments</a>
          <a href="#/analytics" data-route="analytics">Analytics</a>
          <a href="#/settings" data-route="settings">Settings</a>
          <button type="button" class="btn-logout" onclick="adminLogout()">Logout</button>
        </div>
      </nav>

      <main class="admin-main-content">
        <section id="content" class="admin-content"></section>
      </main>
    </div>
  `;
}

function renderLogin() {
  app.innerHTML = `
    <div class="admin-auth-container">
      <div class="admin-auth-box">
        <h1>SabiBiz Admin</h1>
        <p>Administration Panel</p>

        <form id="adminLoginForm">
          <div class="form-group">
            <label for="email">Email</label>
            <input type="email" id="email" name="email" required placeholder="admin@sabibiz.com">
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <input type="password" id="password" name="password" required placeholder="••••••••">
          </div>

          <button type="submit" class="btn-primary">Sign In as Admin</button>
        </form>
      </div>
    </div>
  `;

  const loginForm = document.getElementById('adminLoginForm');
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    const response = await AdminAPI.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response?.token && ['admin', 'super_admin'].includes(response.user?.role)) {
      setAdminToken(response.token);
      window.location.hash = defaultRoute;
      initializeAdminUI();
    } else {
      alert(response?.message || 'Admin access denied or invalid credentials');
    }
  });
}

function setActiveNav(route) {
  document.querySelectorAll('.admin-navbar-menu a').forEach(link => {
    link.classList.toggle('active', link.dataset.route === route);
  });
}

function toggleMobileMenu() {
  const nav = document.querySelector('.admin-navbar');
  const button = document.getElementById('adminMenuToggle');
  if (!nav || !button) return;

  const isOpen = nav.classList.toggle('nav-open');
  button.setAttribute('aria-expanded', String(isOpen));
}

function closeMobileMenu() {
  const nav = document.querySelector('.admin-navbar');
  const button = document.getElementById('adminMenuToggle');
  if (!nav || !button) return;

  if (nav.classList.contains('nav-open')) {
    nav.classList.remove('nav-open');
    button.setAttribute('aria-expanded', 'false');
  }
}

function renderLoading(message = 'Loading...') {
  const content = document.getElementById('content');
  if (content) {
    content.innerHTML = `<div class="loader"><p>${message}</p></div>`;
  }
}

async function loadDashboard() {
  renderLoading('Loading dashboard...');

  const [overviewRes, revenueRes, subscriptionsRes] = await Promise.all([
    AdminAPI.analytics.dashboard(),
    AdminAPI.analytics.revenue(),
    AdminAPI.analytics.subscriptions(),
  ]);

  const overview = overviewRes?.data || {};
  const revenue = revenueRes?.data || {};
  const subStats = subscriptionsRes?.data || {};

  document.getElementById('content').innerHTML = `
    <div class="admin-welcome">
      <h2>Admin Dashboard</h2>
      <p>Welcome to SabiBiz Administration Panel</p>

      <div class="admin-stats">
        <div class="admin-stat-card">
          <h3>Total Users</h3>
          <p class="admin-stat-number">${overview.totalUsers ?? 0}</p>
        </div>
        <div class="admin-stat-card">
          <h3>Active Subscriptions</h3>
          <p class="admin-stat-number">${overview.activeSubscriptions ?? 0}</p>
        </div>
        <div class="admin-stat-card">
          <h3>Total Revenue</h3>
          <p class="admin-stat-number">₦${revenue.totalRevenue?.toLocaleString() ?? '0'}</p>
        </div>
        <div class="admin-stat-card">
          <h3>Paid Invoices</h3>
          <p class="admin-stat-number">${revenue.paidInvoices ?? 0}</p>
        </div>
      </div>
      <div class="admin-stats">
        <div class="admin-stat-card">
          <h3>Active Subscriptions</h3>
          <p class="admin-stat-number">${subStats.active ?? overview.activeSubscriptions ?? 0}</p>
        </div>
        <div class="admin-stat-card">
          <h3>Pending Subscriptions</h3>
          <p class="admin-stat-number">${subStats.pending ?? 0}</p>
        </div>
        <div class="admin-stat-card">
          <h3>Cancelled Subscriptions</h3>
          <p class="admin-stat-number">${subStats.cancelled ?? 0}</p>
        </div>
      </div>

      <div class="admin-section">
        <h3>Recent Users</h3>
        <table class="admin-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Shop Name</th>
              <th>Plan</th>
              <th>Status</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody id="usersTable"><tr><td colspan="5" class="text-center">Loading users...</td></tr></tbody>
        </table>
      </div>
    </div>
  `;

  const usersRes = await AdminAPI.users.list();
  const usersTable = document.getElementById('usersTable');
  if (!usersRes?.success) {
    usersTable.innerHTML = '<tr><td colspan="5" class="text-center">Unable to load users</td></tr>';
    return;
  }

  if (!usersRes.data.length) {
    usersTable.innerHTML = '<tr><td colspan="5" class="text-center">No users yet</td></tr>';
    return;
  }

  usersTable.innerHTML = usersRes.data.map(user => `
    <tr>
      <td>${user.email}</td>
      <td>${user.shop_name || '-'}</td>
      <td>${user.subscription_plan || 'free'}</td>
      <td><span class="status-badge ${user.status}">${user.status}</span></td>
      <td>${new Date(user.created_at).toLocaleDateString()}</td>
    </tr>
  `).join('');
}

async function loadUsers() {
  renderLoading('Loading users...');

  const response = await AdminAPI.users.list();
  if (!response?.success) {
    document.getElementById('content').innerHTML = '<p class="error">Unable to load users.</p>';
    return;
  }

  const rows = response.data.map(user => `
    <tr>
      <td>${user.email}</td>
      <td>${user.shop_name || '-'}</td>
      <td>${user.subscription_plan || 'free'}</td>
      <td><span class="status-badge ${user.status}">${user.status}</span></td>
      <td>${new Date(user.created_at).toLocaleDateString()}</td>
      <td><button class="btn-secondary" data-action="suspend" data-id="${user.id}">Suspend</button></td>
    </tr>
  `).join('');

  document.getElementById('content').innerHTML = `
    <div class="admin-section">
      <h2>Users</h2>
      <table class="admin-table">
        <thead>
          <tr>
            <th>Email</th>
            <th>Shop Name</th>
            <th>Plan</th>
            <th>Status</th>
            <th>Joined</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;

  document.querySelectorAll('[data-action="suspend"]').forEach(button => {
    button.addEventListener('click', async () => {
      const userId = button.dataset.id;
      const result = await AdminAPI.users.suspend(userId);
      if (result?.success) {
        button.textContent = 'Suspended';
        button.disabled = true;
        loadUsers();
      } else {
        alert(result?.message || 'Unable to suspend user');
      }
    });
  });
}

async function loadSubscriptions() {
  renderLoading('Loading subscriptions...');

  const response = await AdminAPI.subscriptions.list();
  if (!response?.success) {
    document.getElementById('content').innerHTML = '<p class="error">Unable to load subscriptions.</p>';
    return;
  }

  const rows = response.data.map(sub => `
    <tr>
      <td>${sub.id}</td>
      <td>${sub.user_id}</td>
      <td>${sub.plan}</td>
      <td>${sub.status}</td>
      <td>${sub.payment_method || '-'}</td>
      <td>${new Date(sub.created_at).toLocaleDateString()}</td>
    </tr>
  `).join('');

  document.getElementById('content').innerHTML = `
    <div class="admin-section">
      <h2>Subscriptions</h2>
      <table class="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>User ID</th>
            <th>Plan</th>
            <th>Status</th>
            <th>Payment Method</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

async function loadPayments() {
  renderLoading('Loading payment history...');

  const response = await AdminAPI.payments.list();
  if (!response?.success) {
    document.getElementById('content').innerHTML = '<p class="error">Unable to load payments.</p>';
    return;
  }

  const rows = response.data.map(invoice => `
    <tr>
      <td>${invoice.id}</td>
      <td>${invoice.user_id}</td>
      <td>₦${Number(invoice.amount).toLocaleString()}</td>
      <td>${invoice.currency.toUpperCase()}</td>
      <td>${invoice.status}</td>
      <td>${invoice.paid_date ? new Date(invoice.paid_date).toLocaleDateString() : '-'}</td>
      <td>${new Date(invoice.created_at).toLocaleDateString()}</td>
    </tr>
  `).join('');

  document.getElementById('content').innerHTML = `
    <div class="admin-section">
      <h2>Payments</h2>
      <table class="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>User ID</th>
            <th>Amount</th>
            <th>Currency</th>
            <th>Status</th>
            <th>Paid</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

async function loadAnalytics() {
  renderLoading('Loading analytics...');

  const [overviewRes, revenueRes, subscriptionsRes] = await Promise.all([
    AdminAPI.analytics.dashboard(),
    AdminAPI.analytics.revenue(),
    AdminAPI.analytics.subscriptions(),
  ]);

  if (!overviewRes?.success || !revenueRes?.success || !subscriptionsRes?.success) {
    document.getElementById('content').innerHTML = '<p class="error">Unable to load analytics.</p>';
    return;
  }

  const overview = overviewRes.data;
  const revenue = revenueRes.data;
  const subStats = subscriptionsRes.data;

  document.getElementById('content').innerHTML = `
    <div class="admin-section">
      <h2>Analytics</h2>
      <div class="admin-stats">
        <div class="admin-stat-card">
          <h3>Total Users</h3>
          <p class="admin-stat-number">${overview.totalUsers ?? 0}</p>
        </div>
        <div class="admin-stat-card">
          <h3>Total Revenue</h3>
          <p class="admin-stat-number">₦${revenue.totalRevenue?.toLocaleString() ?? '0'}</p>
        </div>
        <div class="admin-stat-card">
          <h3>Paid Invoices</h3>
          <p class="admin-stat-number">${revenue.paidInvoices ?? 0}</p>
        </div>
        <div class="admin-stat-card">
          <h3>Invoices</h3>
          <p class="admin-stat-number">${overview.totalInvoices ?? 0}</p>
        </div>
      </div>
      <div class="admin-stats">
        <div class="admin-stat-card">
          <h3>Active Subscriptions</h3>
          <p class="admin-stat-number">${subStats.active ?? overview.activeSubscriptions ?? 0}</p>
        </div>
        <div class="admin-stat-card">
          <h3>Pending Subscriptions</h3>
          <p class="admin-stat-number">${subStats.pending ?? 0}</p>
        </div>
        <div class="admin-stat-card">
          <h3>Cancelled Subscriptions</h3>
          <p class="admin-stat-number">${subStats.cancelled ?? 0}</p>
        </div>
      </div>
    </div>
  `;
}

function loadSettings() {
  document.getElementById('content').innerHTML = `
    <div class="admin-section">
      <h2>Settings</h2>
      <p>Settings management coming soon.</p>
    </div>
  `;
}

async function navigate() {
  const hash = window.location.hash || defaultRoute;
  const route = hash.replace('#/', '') || 'dashboard';
  setActiveNav(route);

  switch (route) {
    case 'users':
      await loadUsers();
      break;
    case 'subscriptions':
      await loadSubscriptions();
      break;
    case 'payments':
      await loadPayments();
      break;
    case 'analytics':
      await loadAnalytics();
      break;
    case 'settings':
      loadSettings();
      break;
    case 'dashboard':
    default:
      await loadDashboard();
      break;
  }
}

function initializeAdminUI() {
  if (!isAdminLoggedIn()) {
    renderLogin();
    return;
  }

  renderShell();
  navigate();
  window.addEventListener('hashchange', () => {
    closeMobileMenu();
    navigate();
  });

  const toggleButton = document.getElementById('adminMenuToggle');
  if (toggleButton) {
    toggleButton.addEventListener('click', toggleMobileMenu);
  }

  document.querySelectorAll('.admin-navbar-menu a').forEach(link => {
    link.addEventListener('click', closeMobileMenu);
  });
}

initializeAdminUI();

console.log('✓ Admin Dashboard Ready');
