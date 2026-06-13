const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { checkSubscription, enforceWritableWorkspace } = require('../middleware/subscription');
const workflowService = require('../services/workflowService');
const triggerEngine = require('../services/triggerEngine');
const logger = require('../config/logger');

// list
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const orgId = req.user.userId;
    const items = await workflowService.list(orgId);
    res.json({ success: true, data: items });
  } catch (err) { next(err); }
});

// create
router.post('/', authMiddleware, checkSubscription, enforceWritableWorkspace, async (req, res, next) => {
  try {
    const orgId = req.user.userId;
    const wf = await workflowService.create(orgId, req.user.userId, req.body);
    // register triggers for this org
    await triggerEngine.registerTriggersForOrganization(orgId);
    res.status(201).json({ success: true, data: wf });
  } catch (err) { next(err); }
});

router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const orgId = req.user.userId;
    const wf = await workflowService.get(req.params.id, orgId);
    if (!wf) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: wf });
  } catch (err) { next(err); }
});

router.put('/:id', authMiddleware, enforceWritableWorkspace, async (req, res, next) => {
  try {
    const orgId = req.user.userId;
    const wf = await workflowService.update(req.params.id, orgId, req.body);
    if (!wf) return res.status(404).json({ success: false, message: 'Not found' });
    await triggerEngine.registerTriggersForOrganization(orgId);
    res.json({ success: true, data: wf });
  } catch (err) { next(err); }
});

router.delete('/:id', authMiddleware, enforceWritableWorkspace, async (req, res, next) => {
  try {
    const orgId = req.user.userId;
    const r = await workflowService.remove(req.params.id, orgId);
    if (!r) return res.status(404).json({ success: false, message: 'Not found' });
    await triggerEngine.registerTriggersForOrganization(orgId);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// Builder graph (nodes + connections)
router.get('/:id/graph', authMiddleware, async (req, res, next) => {
  try {
    const orgId = req.user.userId;
    const wf = await workflowService.get(req.params.id, orgId);
    if (!wf) return res.status(404).json({ success: false, message: 'Not found' });
    const graph = await workflowService.getGraph(req.params.id);
    res.json({ success: true, data: graph });
  } catch (err) { next(err); }
});

// Nodes
router.post('/:id/nodes', authMiddleware, enforceWritableWorkspace, async (req, res, next) => {
  try {
    const orgId = req.user.userId;
    const wf = await workflowService.get(req.params.id, orgId);
    if (!wf) return res.status(404).json({ success: false, message: 'Not found' });
    const node = await workflowService.addNode(req.params.id, req.body);
    res.status(201).json({ success: true, data: node });
  } catch (err) { next(err); }
});

router.put('/:id/nodes/:nodeId', authMiddleware, enforceWritableWorkspace, async (req, res, next) => {
  try {
    const orgId = req.user.userId;
    const wf = await workflowService.get(req.params.id, orgId);
    if (!wf) return res.status(404).json({ success: false, message: 'Not found' });
    const node = await workflowService.updateNode(req.params.id, req.params.nodeId, req.body);
    if (!node) return res.status(404).json({ success: false, message: 'Node not found' });
    res.json({ success: true, data: node });
  } catch (err) { next(err); }
});

router.delete('/:id/nodes/:nodeId', authMiddleware, enforceWritableWorkspace, async (req, res, next) => {
  try {
    const orgId = req.user.userId;
    const wf = await workflowService.get(req.params.id, orgId);
    if (!wf) return res.status(404).json({ success: false, message: 'Not found' });
    const node = await workflowService.removeNode(req.params.id, req.params.nodeId);
    if (!node) return res.status(404).json({ success: false, message: 'Node not found' });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// Connections
router.post('/:id/connections', authMiddleware, enforceWritableWorkspace, async (req, res, next) => {
  try {
    const orgId = req.user.userId;
    const wf = await workflowService.get(req.params.id, orgId);
    if (!wf) return res.status(404).json({ success: false, message: 'Not found' });
    const { source_node_id, target_node_id } = req.body;
    if (!source_node_id || !target_node_id) {
      return res.status(400).json({ success: false, message: 'source_node_id and target_node_id are required' });
    }
    const connection = await workflowService.addConnection(req.params.id, source_node_id, target_node_id);
    res.status(201).json({ success: true, data: connection });
  } catch (err) { next(err); }
});

router.delete('/:id/connections/:connectionId', authMiddleware, enforceWritableWorkspace, async (req, res, next) => {
  try {
    const orgId = req.user.userId;
    const wf = await workflowService.get(req.params.id, orgId);
    if (!wf) return res.status(404).json({ success: false, message: 'Not found' });
    const connection = await workflowService.removeConnection(req.params.id, req.params.connectionId);
    if (!connection) return res.status(404).json({ success: false, message: 'Connection not found' });
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
