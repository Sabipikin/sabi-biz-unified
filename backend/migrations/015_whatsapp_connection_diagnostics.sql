-- Add connection diagnostics fields for hosted WhatsApp connection flow
ALTER TABLE whatsapp_accounts
  ADD COLUMN IF NOT EXISTS webhook_subscribed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS quality_rating VARCHAR(50),
  ADD COLUMN IF NOT EXISTS business_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS last_diagnostics_at TIMESTAMP;
