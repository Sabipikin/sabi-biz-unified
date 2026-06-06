-- AI-powered WhatsApp conversation workspace

ALTER TABLE users
ADD COLUMN IF NOT EXISTS whatsapp_phone_number_id VARCHAR(255);

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  channel VARCHAR(50) NOT NULL DEFAULT 'whatsapp',
  external_contact_phone VARCHAR(50) NOT NULL,
  contact_name VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  ai_status VARCHAR(50) NOT NULL DEFAULT 'ai_handled',
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  unread_count INT NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  direction VARCHAR(20) NOT NULL,
  sender_type VARCHAR(50) NOT NULL,
  message_text TEXT NOT NULL,
  external_message_id VARCHAR(255),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  conversation_message_id UUID REFERENCES conversation_messages(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  provider VARCHAR(50) NOT NULL DEFAULT 'openai',
  model VARCHAR(100),
  intent VARCHAR(100),
  prompt TEXT,
  context JSONB DEFAULT '{}'::jsonb,
  response_text TEXT,
  invoice_draft JSONB,
  escalated BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(50) NOT NULL DEFAULT 'completed',
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_whatsapp_phone_number_id ON users(whatsapp_phone_number_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_status ON conversations(user_id, status);
CREATE INDEX IF NOT EXISTS idx_conversations_user_ai_status ON conversations(user_id, ai_status);
CREATE INDEX IF NOT EXISTS idx_conversations_customer ON conversations(customer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_contact ON conversations(user_id, external_contact_phone);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_conversation ON conversation_messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_user_unread ON conversation_messages(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_conversation ON ai_interactions(conversation_id, created_at);
