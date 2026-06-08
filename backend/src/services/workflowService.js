const { query } = require('../config/db');
const logger = require('../config/logger');

class WorkflowService {
  async create(organizationId, userId, payload) {
    const result = await query(
      `INSERT INTO workflows (organization_id, name, description, status, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [organizationId, payload.name, payload.description || null, payload.status || 'draft', userId]
    );
    return result.rows[0];
  }

  async update(id, organizationId, payload) {
    const result = await query(
      `UPDATE workflows SET name = COALESCE($1, name), description = COALESCE($2, description), status = COALESCE($3, status), updated_at = NOW()
       WHERE id = $4 AND organization_id = $5 RETURNING *`,
      [payload.name || null, payload.description || null, payload.status || null, id, organizationId]
    );
    return result.rows[0] || null;
  }

  async get(id, organizationId) {
    const result = await query(`SELECT * FROM workflows WHERE id = $1 AND organization_id = $2`, [id, organizationId]);
    return result.rows[0] || null;
  }

  async list(organizationId) {
    const result = await query(`SELECT * FROM workflows WHERE organization_id = $1 ORDER BY updated_at DESC`, [organizationId]);
    return result.rows;
  }

  async remove(id, organizationId) {
    const result = await query(`DELETE FROM workflows WHERE id = $1 AND organization_id = $2 RETURNING id`, [id, organizationId]);
    return result.rows[0] || null;
  }

  // Node CRUD
  async addNode(workflowId, node) {
    const result = await query(`INSERT INTO workflow_nodes (workflow_id, type, node_type, configuration, position_x, position_y) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`, [workflowId, node.type, node.node_type || 'trigger', JSON.stringify(node.configuration || {}), node.position_x || 0, node.position_y || 0]);
    return result.rows[0];
  }

  async getNodes(workflowId) {
    const result = await query(`SELECT * FROM workflow_nodes WHERE workflow_id = $1`, [workflowId]);
    return result.rows;
  }

  async addConnection(workflowId, sourceNodeId, targetNodeId) {
    const result = await query(`INSERT INTO workflow_connections (workflow_id, source_node_id, target_node_id) VALUES ($1,$2,$3) RETURNING *`, [workflowId, sourceNodeId, targetNodeId]);
    return result.rows[0];
  }
}

module.exports = new WorkflowService();
