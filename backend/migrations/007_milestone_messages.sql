-- backend/migrations/007_milestone_messages.sql

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS birthday_message_template TEXT DEFAULT 'Happy Birthday {{name}}! Warm wishes from {{business_name}} on your special day.',
  ADD COLUMN IF NOT EXISTS anniversary_message_template TEXT DEFAULT 'Happy Anniversary {{name}}! Warm wishes from {{business_name}} on this special milestone.';

CREATE TABLE IF NOT EXISTS milestone_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  milestone_type VARCHAR(50) NOT NULL,
  target_date DATE NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  channel VARCHAR(50) NOT NULL DEFAULT 'whatsapp',
  message_text TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_milestone_messages_user_id ON milestone_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_milestone_messages_customer_id ON milestone_messages(customer_id);
CREATE INDEX IF NOT EXISTS idx_milestone_messages_status ON milestone_messages(status);
CREATE INDEX IF NOT EXISTS idx_milestone_messages_target_date ON milestone_messages(target_date);
