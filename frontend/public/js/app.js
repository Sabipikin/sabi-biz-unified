// frontend/public/js/app.js
// Main application entry point

console.log('🚀 SabiBiz Frontend Loading...');

// API configuration
const API_BASE = window.location.origin === 'http://localhost:5173'
  ? 'http://localhost:3000'
  : window.location.origin;

const API = {
  baseURL: API_BASE,
  
  // Auth endpoints
  auth: {
    register: (data) => fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
    login: (data) => fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  },
};

// Check if user is logged in
function isLoggedIn() {
  return !!localStorage.getItem('token');
}

// Store auth token
function setToken(token) {
  localStorage.setItem('token', token);
}

// Get auth token
function getToken() {
  return localStorage.getItem('token');
}

// Logout
function logout() {
  localStorage.removeItem('token');
  window.location.reload();
}

// Render app
const app = document.getElementById('app');

if (isLoggedIn()) {
  app.innerHTML = `
    <div class="dashboard">
      <nav class="navbar">
        <div class="navbar-brand">
          <h1>SabiBiz</h1>
        </div>
        <div class="navbar-menu">
          <a href="#/dashboard">Dashboard</a>
          <a href="#/invoices">Invoices</a>
          <a href="#/inventory">Inventory</a>
          <a href="#/whatsapp">WhatsApp</a>
          <a href="#/settings">Settings</a>
          <button onclick="logout()">Logout</button>
        </div>
      </nav>
      
      <main class="main-content">
        <section id="content">
          <div class="welcome">
            <h2>Welcome to SabiBiz 👋</h2>
            <p>Your all-in-one business management tool</p>
            
            <div class="stats">
              <div class="stat-card">
                <h3>Invoices</h3>
                <p class="stat-number">0</p>
              </div>
              <div class="stat-card">
                <h3>Revenue</h3>
                <p class="stat-number">₦0</p>
              </div>
              <div class="stat-card">
                <h3>WhatsApp Messages</h3>
                <p class="stat-number">0</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  `;
} else {
  // Show login page
  app.innerHTML = `
    <div class="auth-container">
      <div class="auth-box">
        <h1>SabiBiz</h1>
        <p>Accounting & Business Management for Nigerian Entrepreneurs</p>
        
        <form id="loginForm">
          <div class="form-group">
            <label for="email">Email</label>
            <input type="email" id="email" name="email" required placeholder="your@email.com">
          </div>
          
          <div class="form-group">
            <label for="password">Password</label>
            <input type="password" id="password" name="password" required placeholder="••••••••">
          </div>
          
          <button type="submit" class="btn-primary">Sign In</button>
        </form>
        
        <p class="auth-footer">
          Don't have an account? <a href="#/register">Sign up here</a>
        </p>
      </div>
    </div>
  `;
  
  // Handle login
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      
      try {
        const response = await API.auth.login({ email, password });
        const data = await response.json();
        
        if (data.token) {
          setToken(data.token);
          window.location.reload();
        } else {
          alert('Login failed: ' + (data.message || 'Unknown error'));
        }
      } catch (err) {
        alert('Login error: ' + err.message);
      }
    });
  }
}

console.log('✓ SabiBiz Frontend Ready');
