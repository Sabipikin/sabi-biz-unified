-- Workflow builder core tables (fixes 013_workflows.sql which referenced a
-- non-existent "organizations" table and never applied successfully).

CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'draft',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  type VARCHAR(32) NOT NULL,
  node_type VARCHAR(32) NOT NULL,
  configuration JSONB DEFAULT '{}'::jsonb,
  position_x INT DEFAULT 0,
  position_y INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS workflow_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  source_node_id UUID REFERENCES workflow_nodes(id) ON DELETE CASCADE,
  target_node_id UUID REFERENCES workflow_nodes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(32) DEFAULT 'running',
  started_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITHOUT TIME ZONE,
  execution_log JSONB DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS workflow_execution_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID REFERENCES workflow_executions(id) ON DELETE CASCADE,
  node_id UUID REFERENCES workflow_nodes(id) ON DELETE SET NULL,
  status VARCHAR(32) DEFAULT 'pending',
  result JSONB DEFAULT '{}'::jsonb,
  executed_at TIMESTAMP WITHOUT TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_workflows_org ON workflows(organization_id);
CREATE INDEX IF NOT EXISTS idx_workflow_nodes_workflow ON workflow_nodes(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_connections_workflow ON workflow_connections(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow ON workflow_executions(workflow_id);
