-- Create table to store short-lived OAuth states for WhatsApp connect
CREATE TABLE IF NOT EXISTS oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nonce VARCHAR(255) NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITHOUT TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_oauth_states_user ON oauth_states(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_states_used ON oauth_states(used);
