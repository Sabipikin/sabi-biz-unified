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
          <a href="#/readiness" data-route="readiness">Launch Readiness</a>
          <a href="#/users" data-route="users">Users</a>
          <a href="#/subscriptions" data-route="subscriptions">Subscriptions</a>
          <a href="#/payments" data-route="payments">Payments</a>
          <a href="#/analytics" data-route="analytics">Analytics</a>
          <a href="#/settings" data-route="settings">Settings</a>
          <a href="#/whatsapp" data-route="whatsapp">WhatsApp Numbers</a>
          <a href="#/automation" data-route="automation">Automation</a>
          <button type="button" class="btn-logout" onclick="adminLogout()">Logout</button>
        </div>
      </nav>

      <main class="admin-main-content">
        <section id="content" class="admin-content"></section>
      </main>
    </div>
    <!-- Edit user modal -->
    <div id="editUserModal" class="modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.4); align-items:center; justify-content:center;">
      <div style="background:#fff; padding:16px; width:420px; max-width:95%; border-radius:8px; box-shadow:0 8px 24px rgba(0,0,0,0.2);">
        <h3>Edit User</h3>
        <form id="editUserForm">
          <div class="form-group">
            <label for="editName">Full name</label>
            <input id="editName" name="name" type="text" />
          </div>
          <div class="form-group">
            <label for="editEmail">Email</label>
            <input id="editEmail" name="email" type="email" />
          </div>
          <div class="form-group">
            <label for="editShopName">Shop name</label>
            <input id="editShopName" name="shop_name" type="text" />
          </div>
          <div class="form-group">
            <label for="editPlan">Subscription plan</label>
            <input id="editPlan" name="subscription_plan" type="text" />
          </div>
          <div class="form-group">
            <label for="editExpires">Expires at (ISO)</label>
            <input id="editExpires" name="subscription_expires_at" type="text" placeholder="2026-01-01T00:00:00Z" />
          </div>
          <div class="form-group">
            <label for="editStatus">Status</label>
            <select id="editStatus" name="status">
              <option value="active">active</option>
              <option value="suspended">suspended</option>
              <option value="deleted">deleted</option>
            </select>
          </div>
          <div style="display:flex; gap:8px; justify-content:flex-end; margin-top:12px;">
            <button type="button" id="editCancel" class="btn-secondary">Cancel</button>
            <button type="submit" id="editSave" class="btn-primary">Save</button>
          </div>
        </form>
      </div>
    </div>
  `;

  // WhatsApp logs modal appended to DOM for admin flows
  const logsModal = document.createElement('div');
  logsModal.id = 'whatsappLogsModal';
  logsModal.className = 'modal';
  logsModal.style.display = 'none';
  logsModal.style.position = 'fixed';
  logsModal.style.inset = '0';
  logsModal.style.background = 'rgba(0,0,0,0.4)';
  logsModal.style.alignItems = 'center';
  logsModal.style.justifyContent = 'center';
  logsModal.innerHTML = `
    <div style="background:#fff; padding:16px; width:760px; max-width:95%; border-radius:8px;">
      <h3>WhatsApp Connection Logs</h3>
      <div id="whatsappLogsContent" style="max-height:420px; overflow:auto; font-family:monospace; font-size:13px;"></div>
      <div style="display:flex; gap:8px; justify-content:flex-end; margin-top:12px;">
        <button id="closeWhatsappLogs" class="btn-secondary">Close</button>
      </div>
    </div>
  `;
  // ensure single modal
  const existing = document.getElementById('whatsappLogsModal');
  if (existing) existing.remove();
  document.body.appendChild(logsModal);
  document.getElementById('closeWhatsappLogs').addEventListener('click', () => { document.getElementById('whatsappLogsModal').style.display = 'none'; });
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
            <input type="email" id="email" name="email" required placeholder="admin@sabipikin.xyz">
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

  // WhatsApp logs modal
  

  setupPasswordToggles();

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

  const [overviewRes, revenueRes, subscriptionsRes, billingRes] = await Promise.all([
    AdminAPI.analytics.dashboard(),
    AdminAPI.analytics.revenue(),
    AdminAPI.analytics.subscriptions(),
    AdminAPI.analytics.billing(),
  ]);

  const overview = overviewRes?.data || {};
  const revenue = revenueRes?.data || {};
  const subStats = subscriptionsRes?.data || {};
  const billing = billingRes?.data || {};

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
          <h3>Billing Revenue</h3>
          <p class="admin-stat-number">₦${billing.total_revenue?.toLocaleString() ?? revenue.totalRevenue?.toLocaleString() ?? '0'}</p>
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
          <h3>Trial Accounts</h3>
          <p class="admin-stat-number">${billing.trial_accounts ?? 0}</p>
        </div>
        <div class="admin-stat-card">
          <h3>Churn Rate</h3>
          <p class="admin-stat-number">${billing.churn_rate ?? 0}%</p>
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

const READINESS_MODULE_LABELS = {
  database: 'Database',
  auth: 'Authentication',
  whatsapp: 'WhatsApp',
  payments: 'Payments (Paystack)',
  ai: 'AI Assistant (OpenAI)',
};

async function loadPlatformReadiness() {
  renderLoading('Loading launch readiness...');

  const res = await AdminAPI.platform.readiness();
  if (!res?.success) {
    document.getElementById('content').innerHTML = '<p class="error">Unable to load platform readiness.</p>';
    return;
  }

  const overview = res.data || {};
  const modules = overview.modules || {};
  const blockers = Array.isArray(overview.blockers) ? overview.blockers : [];

  const cards = Object.entries(modules).map(([key, mod]) => {
    const label = READINESS_MODULE_LABELS[key] || key;
    const ok = !!mod.configured && mod.status !== 'error';
    const badgeClass = ok ? 'success' : 'warning';
    const detail = mod.status ? mod.status.replace(/_/g, ' ') : (ok ? 'configured' : 'not configured');
    return `
      <div class="stat-card">
        <h3>${label}</h3>
        <p><span class="status-badge ${badgeClass}">${ok ? 'Ready' : 'Action needed'}</span></p>
        <small>${detail}</small>
      </div>
    `;
  }).join('');

  const blockerRows = blockers.map(b => `
    <tr>
      <td>${READINESS_MODULE_LABELS[b.module] || b.module}</td>
      <td>${(b.status || '').replace(/_/g, ' ')}</td>
    </tr>
  `).join('');

  document.getElementById('content').innerHTML = `
    <div class="admin-section">
      <h2>Launch Readiness</h2>
      <p>Overall platform configuration status across core systems required to serve customers.</p>
      <div class="admin-stats">
        <div class="admin-stat-card">
          <h3>Overall Status</h3>
          <p class="admin-stat-number">${overview.ready ? 'Ready' : 'Not Ready'}</p>
        </div>
        <div class="admin-stat-card">
          <h3>Blockers</h3>
          <p class="admin-stat-number">${blockers.length}</p>
        </div>
      </div>
      <div class="stats-grid">
        ${cards}
      </div>
      ${blockers.length ? `
        <h3>Outstanding Issues</h3>
        <table class="admin-table">
          <thead><tr><th>Module</th><th>Issue</th></tr></thead>
          <tbody>${blockerRows}</tbody>
        </table>
      ` : '<p>All core systems are configured and ready.</p>'}
    </div>
  `;
}

async function loadUsers() {
  renderLoading('Loading users...');

  const response = await AdminAPI.users.list();
  if (!response?.success) {
    document.getElementById('content').innerHTML = '<p class="error">Unable to load users.</p>';
    return;
  }

  const rows = response.data.map(user => {
    const actionBtn = [];
    if (user.status === 'suspended') {
      actionBtn.push(`<button class="btn-primary" data-action="activate" data-id="${user.id}">Activate</button>`);
    } else {
      actionBtn.push(`<button class="btn-secondary" data-action="suspend" data-id="${user.id}">Suspend</button>`);
    }
    actionBtn.push(`<button class="btn-edit" data-action="edit" data-id="${user.id}">Edit</button>`);
    actionBtn.push(`<button class="btn-danger" data-action="delete" data-id="${user.id}">Delete</button>`);

    return `
    <tr>
      <td>${user.email || '-'}</td>
      <td>${user.shop_name || '-'}</td>
      <td>${user.subscription_plan || 'free'}</td>
      <td><span class="status-badge ${user.status}">${user.status}</span></td>
      <td>${new Date(user.created_at).toLocaleDateString()}</td>
      <td>${actionBtn.join(' ')}</td>
    </tr>
  `;
  }).join('');

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

  document.querySelectorAll('[data-action="activate"]').forEach(button => {
    button.addEventListener('click', async () => {
      const userId = button.dataset.id;
      // Ask admin for number of days to activate (optional)
      const daysStr = window.prompt('Activate user for how many days? Leave blank for indefinite activation (no expiry).', '14');
      if (daysStr === null) return; // cancelled
      const days = daysStr.trim() === '' ? undefined : Number(daysStr);

      const payload = {};
      if (!isNaN(days) && days > 0) payload.days = days;

      const result = await AdminAPI.users.activate(userId, payload);
      if (result?.success) {
        button.textContent = 'Activated';
        button.disabled = true;
        loadUsers();
      } else {
        alert(result?.message || 'Unable to activate user');
      }
    });
  });

  document.querySelectorAll('[data-action="edit"]').forEach(button => {
    button.addEventListener('click', () => {
      const userId = button.dataset.id;
      openEditModal(userId);
    });
  });

  document.querySelectorAll('[data-action="delete"]').forEach(button => {
    button.addEventListener('click', async () => {
      const userId = button.dataset.id;
      if (!window.confirm('Are you sure you want to delete this user? This will anonymize the account and remove subscriptions.')) return;
      const result = await AdminAPI.users.delete(userId);
      if (result?.success) {
        alert('User deleted');
        loadUsers();
      } else {
        alert(result?.message || 'Unable to delete user');
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

  const [overviewRes, revenueRes, subscriptionsRes, billingRes] = await Promise.all([
    AdminAPI.analytics.dashboard(),
    AdminAPI.analytics.revenue(),
    AdminAPI.analytics.subscriptions(),
    AdminAPI.analytics.billing(),
  ]);

  if (!overviewRes?.success || !revenueRes?.success || !subscriptionsRes?.success || !billingRes?.success) {
    document.getElementById('content').innerHTML = '<p class="error">Unable to load analytics.</p>';
    return;
  }

  const overview = overviewRes.data;
  const revenue = revenueRes.data;
  const subStats = subscriptionsRes.data;
  const billing = billingRes.data;
  const planRows = (billing.revenue_by_plan || []).map(plan => `
    <tr>
      <td>${plan.name}</td>
      <td>${plan.subscriptions}</td>
      <td>₦${Number(plan.revenue || 0).toLocaleString()}</td>
    </tr>
  `).join('');

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
        <div class="admin-stat-card">
          <h3>MRR</h3>
          <p class="admin-stat-number">₦${Number(billing.mrr || 0).toLocaleString()}</p>
        </div>
        <div class="admin-stat-card">
          <h3>Conversion Rate</h3>
          <p class="admin-stat-number">${billing.conversion_rate ?? 0}%</p>
        </div>
      </div>
      <h3>Revenue by Plan</h3>
      <table class="admin-table">
        <thead>
          <tr><th>Plan</th><th>Subscriptions</th><th>Revenue</th></tr>
        </thead>
        <tbody>${planRows || '<tr><td colspan="3" class="text-center">No billing revenue yet.</td></tr>'}</tbody>
      </table>
    </div>
  `;
}

// Edit modal helpers
function openEditModal(userId) {
  const modal = document.getElementById('editUserModal');
  if (!modal) return;
  // clear
  document.getElementById('editName').value = '';
  document.getElementById('editEmail').value = '';
  document.getElementById('editShopName').value = '';
  document.getElementById('editPlan').value = '';
  document.getElementById('editExpires').value = '';
  document.getElementById('editStatus').value = 'active';

  // fetch user
  AdminAPI.users.get(userId).then(res => {
    if (!res?.success) {
      alert(res?.message || 'Unable to load user');
      return;
    }
    const u = res.data;
    document.getElementById('editName').value = u.name || '';
    document.getElementById('editEmail').value = u.email || '';
    document.getElementById('editShopName').value = u.shop_name || '';
    document.getElementById('editPlan').value = u.subscription_plan || '';
    document.getElementById('editExpires').value = u.subscription_expires_at || '';
    document.getElementById('editStatus').value = u.status || 'active';
    modal.dataset.userid = userId;
    modal.style.display = 'flex';
  }).catch(err => alert('Unable to load user'));
}

function closeEditModal() {
  const modal = document.getElementById('editUserModal');
  if (!modal) return;
  modal.style.display = 'none';
  delete modal.dataset.userid;
}

// hook up modal events
document.addEventListener('click', (e) => {
  const target = e.target;
  if (target && target.id === 'editCancel') {
    e.preventDefault();
    closeEditModal();
  }
});

document.getElementById('editUserForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const modal = document.getElementById('editUserModal');
  if (!modal) return;
  const userId = modal.dataset.userid;
  if (!userId) return alert('No user selected');

  const payload = {
    name: document.getElementById('editName').value.trim() || undefined,
    email: document.getElementById('editEmail').value.trim() || undefined,
    shop_name: document.getElementById('editShopName').value.trim() || undefined,
    subscription_plan: document.getElementById('editPlan').value.trim() || undefined,
    subscription_expires_at: document.getElementById('editExpires').value.trim() || undefined,
    status: document.getElementById('editStatus').value || undefined,
  };

  // remove undefined keys
  Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

  const res = await AdminAPI.users.update(userId, payload);
  if (res?.success) {
    alert('User updated');
    closeEditModal();
    loadUsers();
  } else {
    alert(res?.message || 'Unable to update user');
  }
});

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
    case 'whatsapp':
      await loadWhatsappAccounts();
      break;
    case 'readiness':
      await loadPlatformReadiness();
      break;
    case 'automation':
      await loadAutomation();
      break;
      break;
    case 'dashboard':
    default:
      await loadDashboard();
      break;
  }
}

async function loadWhatsappAccounts() {
  renderLoading('Loading WhatsApp accounts...');

  const [response, infraResponse] = await Promise.all([
    AdminAPI.whatsapp.accounts(),
    AdminAPI.whatsapp.infrastructure(),
  ]);
  if (!response?.success || !infraResponse?.success) {
    document.getElementById('content').innerHTML = '<p class="error">Unable to load WhatsApp accounts.</p>';
    return;
  }

  const infra = infraResponse.data || {};
  const readiness = infra.readiness || {};
  const env = readiness.env || {};
  const stats = infra.statistics || {};
  const tokenHealth = infra.token_health || {};
  const webhookHealth = infra.webhook_health || {};
  const infraLogs = Array.isArray(infra.logs) ? infra.logs : [];
  const envRows = Object.entries(env).map(([name, value]) => `
    <tr>
      <td>${name}</td>
      <td><span class="status-badge ${value ? 'success' : 'warning'}">${value ? 'Configured' : 'Missing'}</span></td>
    </tr>
  `).join('');

  const rows = response.data.map(acc => {
    const connectedAt = acc.connected_at ? new Date(acc.connected_at).toLocaleString() : '-';
    return `
      <tr>
        <td>${acc.owner_email || '-'}<br/><small>${acc.user_id}</small></td>
        <td>${acc.display_phone_number || '-'}</td>
        <td>${acc.phone_number_id || '-'}</td>
        <td>${acc.status}</td>
        <td>${connectedAt}</td>
        <td>
          <button class="btn-primary" data-action="view-logs" data-id="${acc.id}">View Logs</button>
          <button class="btn-danger" data-action="remove-account" data-id="${acc.id}">Remove</button>
        </td>
      </tr>
    `;
  }).join('');

  document.getElementById('content').innerHTML = `
    <div class="admin-section">
      <h2>WhatsApp Infrastructure</h2>
      <p>Monitor Meta readiness, environment configuration, token health, webhooks, and connected customer numbers.</p>
      <div class="stats-grid">
        <div class="stat-card"><h3>Meta Readiness</h3><p>${readiness.status || '-'}</p><small>Verification: ${readiness.verification_state || 'pending'}</small></div>
        <div class="stat-card"><h3>Accounts</h3><p>${stats.connected || 0} connected</p><small>${stats.pending || 0} pending, ${stats.disconnected || 0} disconnected</small></div>
        <div class="stat-card"><h3>Token Health</h3><p>${tokenHealth.valid_tokens || 0} valid</p><small>${tokenHealth.expiring_tokens || 0} expiring, ${tokenHealth.expired_tokens || 0} expired</small></div>
        <div class="stat-card"><h3>Webhook</h3><p>${webhookHealth.verification_status || '-'}</p><small>Last: ${webhookHealth.last_webhook ? new Date(webhookHealth.last_webhook).toLocaleString() : '-'}</small></div>
      </div>
      <div class="admin-grid two-col">
        <div>
          <h3>Environment Status</h3>
          <table class="admin-table"><tbody>${envRows}</tbody></table>
        </div>
        <div>
          <h3>Connection Logs</h3>
          <div class="logs-list">
            ${infraLogs.length ? infraLogs.slice(0, 12).map(log => `
              <div class="log-row">
                <strong>${log.status || '-'}</strong> - ${log.event || ''}
                <br><small>${log.tenant || '-'} - ${log.at ? new Date(log.at).toLocaleString() : '-'}</small>
              </div>
            `).join('') : '<p>No connection logs yet.</p>'}
          </div>
        </div>
      </div>
      <div style="margin-bottom:12px; display:flex; gap:8px; align-items:center;">
        <button id="connectWhatsappOauth" class="btn-primary">Connect via Meta (OAuth)</button>
        <small style="color:#666;">Opens Meta consent in a new tab for connecting a WhatsApp Business account</small>
      </div>
      <h3>Connected WhatsApp Numbers</h3>
      <table class="admin-table">
        <thead>
          <tr><th>Owner</th><th>Display Number</th><th>Phone ID</th><th>Status</th><th>Connected At</th><th>Action</th></tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="6" class="text-center">No WhatsApp numbers connected.</td></tr>'}</tbody>
      </table>
    </div>
  `;

  document.querySelectorAll('[data-action="view-logs"]').forEach(button => {
    button.addEventListener('click', async () => {
      const id = button.dataset.id;
      const res = await AdminAPI.whatsapp.accountLogs(id);
      const contentEl = document.getElementById('whatsappLogsContent');
      if (!res?.success) {
        contentEl.textContent = 'Unable to load logs.';
      } else {
        const logs = Array.isArray(res.data) ? res.data : [];
        contentEl.innerHTML = logs.map(l => `<div style="padding:8px;border-bottom:1px solid #eee;"><strong>${l.status}</strong> — ${l.note || ''} <br/><small>${new Date(l.at).toLocaleString()}</small></div>`).join('') || '<div class="text-center">No logs</div>';
      }
      document.getElementById('whatsappLogsModal').style.display = 'flex';
    });
  });

  document.querySelectorAll('[data-action="remove-account"]').forEach(button => {
    button.addEventListener('click', async () => {
      const id = button.dataset.id;
      if (!window.confirm('Remove this WhatsApp account? This will disconnect it for the tenant.')) return;
      const res = await AdminAPI.whatsapp.removeAccount(id);
      if (res?.success) {
        alert('Removed');
        loadWhatsappAccounts();
      } else {
        alert(res?.message || 'Unable to remove account');
      }
    });
  });

  const connectBtn = document.getElementById('connectWhatsappOauth');
  if (connectBtn) {
    connectBtn.addEventListener('click', () => {
      const url = `${AdminAPI.baseURL.replace(/\/$/, '')}/api/whatsapp/oauth/start`;
      window.open(url, '_blank', 'noopener');
    });
  }
}

async function loadAutomation() {
  renderLoading('Loading automation...');
  const res = await AdminAPI.request('/api/workflows');
  const items = res?.data || [];
  document.getElementById('content').innerHTML = `
    <div class="admin-section">
      <h2>Automation</h2>
      <p>Manage automation workflows</p>
      <div>
        <button id="createWorkflow" class="btn-primary">Create Workflow</button>
      </div>
      <div style="margin-top:12px;">
        ${items.length ? '<ul>' + items.map(w => `<li>${w.name} — ${w.status}</li>`).join('') + '</ul>' : '<p>No workflows yet</p>'}
      </div>
    </div>
  `;

  document.getElementById('createWorkflow').addEventListener('click', async () => {
    const name = window.prompt('Workflow name');
    if (!name) return;
    const payload = { name, description: '', status: 'draft' };
    const r = await AdminAPI.request('/api/workflows', { method: 'POST', body: JSON.stringify(payload) });
    if (r?.success) loadAutomation(); else alert(r?.message || 'Unable to create');
  });
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
