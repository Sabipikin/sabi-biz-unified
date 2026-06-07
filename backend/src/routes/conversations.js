const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const conversationService = require('../services/conversationService');

router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const result = await conversationService.list(req.user.userId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const conversation = await conversationService.getById(req.user.userId, req.params.id);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }
    res.json({ success: true, data: conversation });
  } catch (err) {
    next(err);
  }
});

router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const conversation = await conversationService.create(req.user.userId, req.body);
    res.status(201).json({ success: true, data: conversation });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/assign', authMiddleware, async (req, res, next) => {
  try {
    const conversation = await conversationService.assign(req.user.userId, req.params.id, req.body.assignedTo || null);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }
    res.json({ success: true, data: conversation });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/close', authMiddleware, async (req, res, next) => {
  try {
    const conversation = await conversationService.close(req.user.userId, req.params.id);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }
    res.json({ success: true, data: conversation });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/resume-ai', authMiddleware, async (req, res, next) => {
  try {
    const conversation = await conversationService.resumeAi(req.user.userId, req.params.id);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }
    res.json({ success: true, data: conversation });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/notes', authMiddleware, async (req, res, next) => {
  try {
    const note = String(req.body.note || '').trim();
    if (!note) {
      return res.status(400).json({ success: false, message: 'Note is required' });
    }
    const conversation = await conversationService.addNote(req.user.userId, req.params.id, note);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }
    res.json({ success: true, data: conversation });
  } catch (err) {
    next(err);
  }
});

router.put('/:id/tags', authMiddleware, async (req, res, next) => {
  try {
    const conversation = await conversationService.updateTags(req.user.userId, req.params.id, req.body.tags || []);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }
    res.json({ success: true, data: conversation });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/reply', authMiddleware, async (req, res, next) => {
  try {
    const message = String(req.body.message || '').trim();
    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const result = await conversationService.reply(req.user.userId, req.params.id, message, req.body.useAI === true);
    if (!result) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
