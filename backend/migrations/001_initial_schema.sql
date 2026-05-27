/* ═══════════════════════════════════════════════════════════════════════════
   INITIAL DATABASE SCHEMA
   ═══════════════════════════════════════════════════════════════════════════ */

-- ─── EXTENSIONS ──────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── USERS TABLE ─────────────────────────────────────────────────────────
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20) UNIQUE,
  password_hash VARCHAR(255),
  name VARCHAR(255) NOT NULL,
  shop_name VARCHAR(255),
  business_type VARCHAR(100),
  
  -- SSO Fields
  neon_user_id VARCHAR(255) UNIQUE,
  google_id VARCHAR(255) UNIQUE,
  apple_id VARCHAR(255) UNIQUE,
  
  -- Subscription
  subscription_plan VARCHAR(50) DEFAULT 'free',
  subscription_status VARCHAR(50) DEFAULT 'active',
  subscription_expires_at TIMESTAMP,
  
  -- WhatsApp
  whatsapp_enabled BOOLEAN DEFAULT FALSE,
  whatsapp_phone VARCHAR(20),
  whatsapp_verified BOOLEAN DEFAULT FALSE,
  
  -- AI Settings
  ai_enabled BOOLEAN DEFAULT FALSE,
  openai_api_key VARCHAR(255),
  
  -- Status
  role VARCHAR(50) DEFAULT 'user',
  status VARCHAR(50) DEFAULT 'active',
  last_login_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─── SUBSCRIPTIONS TABLE ─────────────────────────────────────────────────
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan VARCHAR(50) NOT NULL,
  payment_method VARCHAR(50),
  status VARCHAR(50) DEFAULT 'pending',
  
  -- Paystack
  paystack_reference VARCHAR(255) UNIQUE,
  paystack_subscription_id VARCHAR(255),
  
  -- PayPal
  paypal_subscription_id VARCHAR(255),
  
  -- Billing
  amount DECIMAL(10, 2),
  currency VARCHAR(3) DEFAULT 'NGN',
  billing_cycle VARCHAR(50) DEFAULT 'monthly',
  next_billing_date TIMESTAMP,
  last_payment_date TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─── WHATSAPP MESSAGES TABLE ────────────────────────────────────────────
CREATE TABLE whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_phone VARCHAR(20),
  to_phone VARCHAR(20),
  message_text TEXT,
  message_type VARCHAR(50) DEFAULT 'text',
  message_id VARCHAR(255),
  media_id VARCHAR(255),
  is_incoming BOOLEAN DEFAULT FALSE,
  is_from_ai BOOLEAN DEFAULT FALSE,
  status VARCHAR(50) DEFAULT 'sent',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─── INVOICES TABLE ─────────────────────────────────────────────────────
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  customer_name VARCHAR(255),
  customer_phone VARCHAR(20),
  amount DECIMAL(10, 2),
  description TEXT,
  status VARCHAR(50) DEFAULT 'draft',
  due_date DATE,
  paid_date DATE,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─── INVENTORY TABLE ────────────────────────────────────────────────────
CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_name VARCHAR(255) NOT NULL,
  quantity INT DEFAULT 0,
  unit_price DECIMAL(10, 2),
  reorder_level INT DEFAULT 10,
  supplier VARCHAR(255),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─── AI CONFIGURATIONS TABLE ────────────────────────────────────────────
CREATE TABLE ai_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT FALSE,
  system_prompt TEXT,
  temperature DECIMAL(3, 2) DEFAULT 0.7,
  max_tokens INT DEFAULT 500,
  model VARCHAR(50) DEFAULT 'gpt-4o-mini',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─── ANALYTICS TABLE ────────────────────────────────────────────────────
CREATE TABLE analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  metric_type VARCHAR(100),
  metric_value DECIMAL(15, 2),
  period_date DATE,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─── AUDIT LOGS TABLE ───────────────────────────────────────────────────
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(255),
  resource_type VARCHAR(100),
  resource_id VARCHAR(255),
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(50),
  user_agent TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─── INDEXES ────────────────────────────────────────────────────────────
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_neon_id ON users(neon_user_id);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_messages_user_id ON whatsapp_messages(user_id);
CREATE INDEX idx_messages_created_at ON whatsapp_messages(created_at);
CREATE INDEX idx_messages_phone ON whatsapp_messages(from_phone, to_phone);
CREATE INDEX idx_invoices_user_id ON invoices(user_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_inventory_user_id ON inventory(user_id);
CREATE INDEX idx_analytics_user_period ON analytics(user_id, period_date);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);

-- ─── SAMPLE DATA (OPTIONAL) ─────────────────────────────────────────────
-- INSERT INTO users (id, email, phone, name, shop_name, password_hash, role, created_at)
-- VALUES (
--   gen_random_uuid(),
--   'admin@sabibiz.com',
--   '+2349012345678',
--   'Admin User',
--   'Sabi Admin',
--   '$2a$10$...',
--   'admin',
--   CURRENT_TIMESTAMP
-- );
