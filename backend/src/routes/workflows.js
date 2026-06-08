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
    const orgId = req.user.organization_id;
    const items = await workflowService.list(orgId);
    res.json({ success: true, data: items });
  } catch (err) { next(err); }
});

// create
router.post('/', authMiddleware, checkSubscription, enforceWritableWorkspace, async (req, res, next) => {
  try {
    const orgId = req.user.organization_id;
    const wf = await workflowService.create(orgId, req.user.userId, req.body);
    // register triggers for this org
    await triggerEngine.registerTriggersForOrganization(orgId);
    res.status(201).json({ success: true, data: wf });
  } catch (err) { next(err); }
});

router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const orgId = req.user.organization_id;
    const wf = await workflowService.get(req.params.id, orgId);
    if (!wf) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: wf });
  } catch (err) { next(err); }
});

router.put('/:id', authMiddleware, enforceWritableWorkspace, async (req, res, next) => {
  try {
    const orgId = req.user.organization_id;
    const wf = await workflowService.update(req.params.id, orgId, req.body);
    if (!wf) return res.status(404).json({ success: false, message: 'Not found' });
    await triggerEngine.registerTriggersForOrganization(orgId);
    res.json({ success: true, data: wf });
  } catch (err) { next(err); }
});

router.delete('/:id', authMiddleware, enforceWritableWorkspace, async (req, res, next) => {
  try {
    const orgId = req.user.organization_id;
    const r = await workflowService.remove(req.params.id, orgId);
    if (!r) return res.status(404).json({ success: false, message: 'Not found' });
    await triggerEngine.registerTriggersForOrganization(orgId);
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
