-- Phase 1 foundation for multi-tenant WhatsApp accounts, AI settings, inbox handoff, and customer intelligence.

CREATE TABLE IF NOT EXISTS whatsapp_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id UUID,
  waba_id VARCHAR(255),
  phone_number_id VARCHAR(255),
  display_phone_number VARCHAR(50),
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  access_token TEXT,
  connection_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  connected_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS whatsapp_account_id UUID REFERENCES whatsapp_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS human_state VARCHAR(50) NOT NULL DEFAULT 'ai_active',
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS internal_notes JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE conversation_messages
  ADD COLUMN IF NOT EXISTS message_type VARCHAR(50) NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS ai_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  assistant_name VARCHAR(120) NOT NULL DEFAULT 'Sabi Assistant',
  business_context TEXT,
  business_category VARCHAR(120),
  tone VARCHAR(50) NOT NULL DEFAULT 'Friendly',
  language VARCHAR(50) NOT NULL DEFAULT 'English',
  business_hours JSONB NOT NULL DEFAULT '{}'::jsonb,
  escalation_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  escalation_keywords TEXT[] NOT NULL DEFAULT ARRAY['human','agent','complaint','refund']::TEXT[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE ai_interactions
  ADD COLUMN IF NOT EXISTS response TEXT,
  ADD COLUMN IF NOT EXISTS tokens_used INT;

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS customer_score INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS loyalty_score INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lifetime_value DECIMAL(15, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS purchase_frequency DECIMAL(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS average_order_value DECIMAL(15, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_purchase_date DATE,
  ADD COLUMN IF NOT EXISTS predicted_next_purchase DATE,
  ADD COLUMN IF NOT EXISTS churn_risk VARCHAR(50) NOT NULL DEFAULT 'unknown';

CREATE INDEX IF NOT EXISTS idx_whatsapp_accounts_user_status ON whatsapp_accounts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_accounts_phone_number ON whatsapp_accounts(phone_number_id);
CREATE INDEX IF NOT EXISTS idx_conversations_whatsapp_account ON conversations(whatsapp_account_id);
CREATE INDEX IF NOT EXISTS idx_conversations_human_state ON conversations(user_id, human_state);
CREATE INDEX IF NOT EXISTS idx_ai_settings_user ON ai_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_intelligence ON customers(user_id, customer_score, churn_risk);
