// frontend/public/js/app.js
// Main application entry point

console.log('🚀 SabiBiz Frontend Loading...');

// API configuration
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

// Auth functions
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
  window.location.reload();
}

// Get current page from URL hash
function getCurrentPage() {
  const hash = window.location.hash.replace(/^#\/?/, '') || 'login';
  return hash.split('/')[0] || 'login';
}

// Render app
const app = document.getElementById('app');

function renderApp() {
  const page = getCurrentPage();
  
  if (isLoggedIn()) {
    // Show dashboard
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
  } else if (page === 'register') {
    // Show signup page
    app.innerHTML = `
      <div class="auth-container">
        <div class="auth-box">
          <h1>SabiBiz</h1>
          <p>Create Your Business Account</p>
          
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
              <input type="password" id="password" name="password" required placeholder="••••••••">
            </div>
            
            <div class="form-group">
              <label for="confirmPassword">Confirm Password</label>
              <input type="password" id="confirmPassword" name="confirmPassword" required placeholder="••••••••">
            </div>
            
            <button type="submit" class="btn-primary">Create Account</button>
          </form>
          
          <p class="auth-footer">
            Already have an account? <a href="#/login">Sign in here</a>
          </p>
        </div>
      </div>
    `;
    
    // Handle signup
    const signupForm = document.getElementById('signupForm');
    const errorDiv = document.getElementById('errorMessage');
    
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorDiv.style.display = 'none';
      
      const name = document.getElementById('name').value.trim();
      const email = document.getElementById('email').value.trim();
      const phone = document.getElementById('phone').value.trim();
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirmPassword').value;
      
      // Validation
      if (!name || !email || !password) {
        errorDiv.textContent = 'Name, email, and password are required';
        errorDiv.style.display = 'block';
        return;
      }
      
      if (password !== confirmPassword) {
        errorDiv.textContent = 'Passwords do not match';
        errorDiv.style.display = 'block';
        return;
      }
      
      if (password.length < 6) {
        errorDiv.textContent = 'Password must be at least 6 characters';
        errorDiv.style.display = 'block';
        return;
      }
      
      try {
        const response = await API.auth.register({ name, email, phone, password });
        const data = await response.json();
        
        if (data.success) {
          // Auto-login after signup
          const loginResponse = await API.auth.login({ email, password });
          const loginData = await loginResponse.json();
          
          if (loginData.token) {
            setToken(loginData.token);
            window.location.href = '#/dashboard';
            setTimeout(() => window.location.reload(), 100);
          } else {
            errorDiv.textContent = 'Account created! Please sign in.';
            errorDiv.style.display = 'block';
            setTimeout(() => {
              window.location.href = '#/login';
              renderApp();
            }, 1500);
          }
        } else {
          errorDiv.textContent = data.message || 'Signup failed. Please try again.';
          errorDiv.style.display = 'block';
        }
      } catch (err) {
        errorDiv.textContent = 'Error: ' + err.message;
        errorDiv.style.display = 'block';
      }
    });
  } else {
    // Show login page
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
    const errorDiv = document.getElementById('errorMessage');
    
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorDiv.style.display = 'none';
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        try {
          const response = await API.auth.login({ email, password });
          const data = await response.json();
          
          if (data.token) {
            setToken(data.token);
            window.location.href = '#/dashboard';
            setTimeout(() => window.location.reload(), 100);
          } else {
            errorDiv.textContent = data.message || 'Login failed';
            errorDiv.style.display = 'block';
          }
        } catch (err) {
          errorDiv.textContent = 'Error: ' + err.message;
          errorDiv.style.display = 'block';
        }
      });
    }
  }
}

// Initial render
renderApp();

// Handle hash changes
window.addEventListener('hashchange', renderApp);

console.log('✓ SabiBiz Frontend Ready');
