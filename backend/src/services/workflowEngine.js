const { query } = require('../config/db');
const workflowService = require('./workflowService');
const actionExecutor = require('./actionExecutor');
const conditionEvaluator = require('./conditionEvaluator');
const logger = require('../config/logger');

class WorkflowEngine {
  async executeWorkflow(workflowId, context = {}) {
    // create execution record
    const wf = await workflowService.get(workflowId, context.organizationId || null);
    if (!wf) throw new Error('Workflow not found');

    const execRes = await query(`INSERT INTO workflow_executions (workflow_id, organization_id, status, execution_log) VALUES ($1,$2,'running','[]') RETURNING *`, [workflowId, context.organizationId || null]);
    const execution = execRes.rows[0];

    try {
      const nodes = await workflowService.getNodes(workflowId);
      // find trigger nodes and start from them
      const startNodes = nodes.filter(n => n.type === 'trigger');
      for (const start of startNodes) {
        await this.executeNodeRecursive(execution.id, start, nodes, context);
      }

      await query(`UPDATE workflow_executions SET status='completed', completed_at=NOW() WHERE id = $1`, [execution.id]);
    } catch (err) {
      logger.error('Workflow execution failed', err);
      await query(`UPDATE workflow_executions SET status='failed', execution_log = execution_log || $2, completed_at=NOW() WHERE id = $1`, [execution.id, JSON.stringify([{ error: err.message, ts: new Date().toISOString() }])]);
    }
  }

  async executeNodeRecursive(executionId, node, allNodes, context) {
    // create step record
    await query(`INSERT INTO workflow_execution_steps (execution_id, node_id, status, executed_at) VALUES ($1,$2,'running',NOW())`, [executionId, node.id]);

    try {
      if (node.type === 'condition') {
        const ok = await conditionEvaluator.evaluate(node.configuration, context);
        await query(`UPDATE workflow_execution_steps SET status='completed', result=$2, executed_at=NOW() WHERE execution_id=$1 AND node_id=$3`, [executionId, JSON.stringify({ passed: !!ok }), node.id]);
        if (!ok) return; // stop this branch
      } else if (node.type === 'action') {
        const result = await actionExecutor.executeAction(node.configuration, context);
        await query(`UPDATE workflow_execution_steps SET status='completed', result=$2, executed_at=NOW() WHERE execution_id=$1 AND node_id=$3`, [executionId, JSON.stringify(result || {}), node.id]);
      }

      // find outgoing connections
      const connectionsRes = await query(`SELECT target_node_id FROM workflow_connections WHERE source_node_id = $1`, [node.id]);
      const targets = connectionsRes.rows.map(r => r.target_node_id);
      for (const tId of targets) {
        const next = allNodes.find(n => n.id === tId);
        if (next) {
          await this.executeNodeRecursive(executionId, next, allNodes, context);
        }
      }
    } catch (err) {
      logger.error('Node execution failed', err);
      await query(`UPDATE workflow_execution_steps SET status='failed', result=$2, executed_at=NOW() WHERE execution_id=$1 AND node_id=$3`, [executionId, JSON.stringify({ error: err.message }), node.id]);
    }
  }

  async executeNode(nodeId, context) {
    const nodeRes = await query(`SELECT * FROM workflow_nodes WHERE id = $1`, [nodeId]);
    const node = nodeRes.rows[0];
    if (!node) throw new Error('Node not found');
    // reuse action/condition logic
    if (node.type === 'condition') return conditionEvaluator.evaluate(node.configuration, context);
    if (node.type === 'action') return actionExecutor.executeAction(node.configuration, context);
    return null;
  }

  async resumeWorkflow(executionId) {
    // TODO: support pausing/resume
    return null;
  }

  async cancelWorkflow(executionId) {
    await query(`UPDATE workflow_executions SET status='cancelled', completed_at=NOW() WHERE id = $1`, [executionId]);
  }
}

module.exports = new WorkflowEngine();
