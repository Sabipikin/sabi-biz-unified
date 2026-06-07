-- SaaS subscription and billing foundation for SabiReply/SabiBiz.

CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(80) NOT NULL UNIQUE,
  description TEXT,
  monthly_price DECIMAL(15, 2),
  yearly_price DECIMAL(15, 2),
  max_users INT,
  max_whatsapp_numbers INT,
  max_ai_assistants INT,
  monthly_conversation_limit INT,
  feature_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS organization_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  status VARCHAR(50) NOT NULL DEFAULT 'trialing',
  billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly',
  trial_start TIMESTAMP,
  trial_end TIMESTAMP,
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  next_billing_date TIMESTAMP,
  auto_renew BOOLEAN NOT NULL DEFAULT TRUE,
  payment_provider VARCHAR(50) NOT NULL DEFAULT 'paystack',
  provider_subscription_id VARCHAR(255),
  provider_reference VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS usage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  metric_type VARCHAR(80) NOT NULL,
  metric_value INT NOT NULL DEFAULT 0,
  period_month INT NOT NULL,
  period_year INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (organization_id, metric_type, period_month, period_year)
);

CREATE TABLE IF NOT EXISTS billing_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES organization_subscriptions(id) ON DELETE SET NULL,
  amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  invoice_number VARCHAR(120) UNIQUE,
  invoice_url TEXT,
  paid_at TIMESTAMP,
  provider VARCHAR(50) NOT NULL DEFAULT 'paystack',
  provider_reference VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS billing_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type VARCHAR(100) NOT NULL,
  channel VARCHAR(50) NOT NULL DEFAULT 'in_app',
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_org_subscriptions_org_status ON organization_subscriptions(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_org_subscriptions_provider_reference ON organization_subscriptions(provider_reference);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_org_period ON usage_metrics(organization_id, period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_org ON billing_invoices(organization_id, created_at);
CREATE INDEX IF NOT EXISTS idx_billing_notifications_org ON billing_notifications(organization_id, read_at);

INSERT INTO subscription_plans (
  name, slug, description, monthly_price, yearly_price, max_users, max_whatsapp_numbers,
  max_ai_assistants, monthly_conversation_limit, feature_flags, active
)
VALUES
  ('Trial', 'trial', '14-day trial for new workspaces.', 0, 0, 1, 1, 1, 100,
   '{"crm":true,"basic_analytics":true,"shared_inbox":false,"broadcast_messaging":false,"knowledge_base_upload":false,"api_access":false,"advanced_automations":false,"custom_branding":false,"team_permissions":false,"advanced_reporting":false,"integrations":false}'::jsonb, true),
  ('Starter', 'starter', 'Start with AI WhatsApp CRM for one operator.', 10000, 100000, 1, 1, 1, 1000,
   '{"crm":true,"lead_pipeline":true,"basic_analytics":true,"broadcast_messaging":true,"knowledge_base_upload":true,"shared_inbox":false,"api_access":false,"advanced_automations":false,"custom_branding":false,"team_permissions":false,"advanced_reporting":false,"integrations":false}'::jsonb, true),
  ('Growth', 'growth', 'Shared inbox and automations for growing teams.', 25000, 250000, 5, 3, NULL, 5000,
   '{"crm":true,"lead_pipeline":true,"basic_analytics":true,"broadcast_messaging":true,"knowledge_base_upload":true,"shared_inbox":true,"workflow_automation":true,"lead_scoring":true,"campaign_analytics":true,"custom_branding":true,"api_access":false,"advanced_automations":true}'::jsonb, true),
  ('Business', 'business', 'Advanced agents, reporting, and integrations.', 60000, 600000, 20, 10, NULL, 20000,
   '{"crm":true,"lead_pipeline":true,"shared_inbox":true,"workflow_automation":true,"lead_scoring":true,"campaign_analytics":true,"custom_branding":true,"ai_sales_agent":true,"ai_support_agent":true,"team_permissions":true,"advanced_reporting":true,"integrations":true,"api_access":true}'::jsonb, true),
  ('Enterprise', 'enterprise', 'Custom pricing, SLA, white label, and custom AI models.', NULL, NULL, NULL, NULL, NULL, NULL,
   '{"crm":true,"lead_pipeline":true,"shared_inbox":true,"workflow_automation":true,"lead_scoring":true,"campaign_analytics":true,"custom_branding":true,"ai_sales_agent":true,"ai_support_agent":true,"team_permissions":true,"advanced_reporting":true,"integrations":true,"api_access":true,"dedicated_support":true,"sla":true,"white_label":true,"custom_ai_models":true}'::jsonb, true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  monthly_price = EXCLUDED.monthly_price,
  yearly_price = EXCLUDED.yearly_price,
  max_users = EXCLUDED.max_users,
  max_whatsapp_numbers = EXCLUDED.max_whatsapp_numbers,
  max_ai_assistants = EXCLUDED.max_ai_assistants,
  monthly_conversation_limit = EXCLUDED.monthly_conversation_limit,
  feature_flags = EXCLUDED.feature_flags,
  active = EXCLUDED.active,
  updated_at = NOW();
