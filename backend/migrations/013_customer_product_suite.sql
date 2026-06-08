-- Customer-facing product suite foundation.
-- Adds the missing CRM, campaign, AI knowledge, automation, integration,
-- branding, collaboration, reporting, and enterprise support records.

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS company VARCHAR(255),
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS lead_score INT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) NOT NULL DEFAULT 'agent',
  status VARCHAR(50) NOT NULL DEFAULT 'invited',
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  joined_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  activity_type VARCHAR(80) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  company VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'new',
  source VARCHAR(120),
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  score INT NOT NULL DEFAULT 0,
  notes TEXT,
  converted_customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  converted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  stage VARCHAR(80) NOT NULL DEFAULT 'new',
  value DECIMAL(15, 2) NOT NULL DEFAULT 0,
  probability INT NOT NULL DEFAULT 10,
  expected_close_date DATE,
  status VARCHAR(50) NOT NULL DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL DEFAULT 'marketing',
  language VARCHAR(50) NOT NULL DEFAULT 'en',
  body TEXT NOT NULL,
  variables JSONB NOT NULL DEFAULT '[]'::jsonb,
  whatsapp_template_id VARCHAR(255),
  approval_status VARCHAR(50) NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audience_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  estimated_size INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  channel VARCHAR(50) NOT NULL DEFAULT 'whatsapp',
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  template_id UUID REFERENCES message_templates(id) ON DELETE SET NULL,
  segment_id UUID REFERENCES audience_segments(id) ON DELETE SET NULL,
  message_body TEXT,
  scheduled_at TIMESTAMP,
  sent_at TIMESTAMP,
  metrics JSONB NOT NULL DEFAULT '{"sent":0,"delivered":0,"read":0,"failed":0,"responses":0,"conversions":0}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  message_body TEXT NOT NULL,
  audience JSONB NOT NULL DEFAULT '{}'::jsonb,
  scheduled_at TIMESTAMP,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  sent_count INT NOT NULL DEFAULT 0,
  delivered_count INT NOT NULL DEFAULT 0,
  read_count INT NOT NULL DEFAULT 0,
  failed_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_assistants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  personality TEXT,
  instructions TEXT,
  whatsapp_account_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  support_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  sales_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  appointment_booking_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  follow_up_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS knowledge_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assistant_id UUID REFERENCES ai_assistants(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  resource_type VARCHAR(50) NOT NULL DEFAULT 'text',
  source_url TEXT,
  content TEXT,
  category VARCHAR(120),
  version INT NOT NULL DEFAULT 1,
  index_status VARCHAR(50) NOT NULL DEFAULT 'pending',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS automation_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  trigger_type VARCHAR(100) NOT NULL,
  conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  last_run_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS integration_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'not_connected',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  connected_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  key_prefix VARCHAR(32) NOT NULL,
  key_hash TEXT NOT NULL,
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_used_at TIMESTAMP,
  revoked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS webhook_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  target_url TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  secret TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS brand_settings (
  organization_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  logo_url TEXT,
  primary_color VARCHAR(20),
  secondary_color VARCHAR(20),
  email_from_name VARCHAR(255),
  custom_domain VARCHAR(255),
  white_label_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  remove_sabireply_branding BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  report_type VARCHAR(100) NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  schedule JSONB NOT NULL DEFAULT '{}'::jsonb,
  export_format VARCHAR(50),
  last_generated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  priority VARCHAR(50) NOT NULL DEFAULT 'normal',
  status VARCHAR(50) NOT NULL DEFAULT 'open',
  description TEXT,
  sla_due_at TIMESTAMP,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sla_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  support_ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  response_time_minutes INT,
  resolution_time_minutes INT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type VARCHAR(100) NOT NULL,
  severity VARCHAR(50) NOT NULL DEFAULT 'info',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_team_members_org_role ON team_members(organization_id, role, status);
CREATE INDEX IF NOT EXISTS idx_customer_activities_customer ON customer_activities(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_org_status ON leads(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_opportunities_org_stage ON opportunities(organization_id, stage, status);
CREATE INDEX IF NOT EXISTS idx_templates_org_status ON message_templates(organization_id, approval_status);
CREATE INDEX IF NOT EXISTS idx_campaigns_org_status ON campaigns(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_broadcasts_org_status ON broadcasts(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_assistants_org_status ON ai_assistants(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_knowledge_org_status ON knowledge_resources(organization_id, index_status);
CREATE INDEX IF NOT EXISTS idx_workflows_org_status ON automation_workflows(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_integrations_org_provider ON integration_connections(organization_id, provider);
CREATE INDEX IF NOT EXISTS idx_webhooks_org_status ON webhook_subscriptions(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_reports_org_type ON reports(organization_id, report_type);
CREATE INDEX IF NOT EXISTS idx_support_tickets_org_status ON support_tickets(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_security_events_org_created ON security_events(organization_id, created_at DESC);
