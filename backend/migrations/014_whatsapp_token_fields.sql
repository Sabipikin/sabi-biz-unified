-- Add token metadata fields for long-lived Meta access tokens
ALTER TABLE whatsapp_accounts
  ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS token_scope TEXT,
  ADD COLUMN IF NOT EXISTS token_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS token_last_refreshed TIMESTAMP;

-- Index for expiry checks
CREATE INDEX IF NOT EXISTS idx_whatsapp_accounts_token_expires ON whatsapp_accounts(token_expires_at);
