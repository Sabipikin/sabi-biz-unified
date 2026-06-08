const workflowService = require('./workflowService');
const workflowEngine = require('./workflowEngine');
const logger = require('../config/logger');

class TriggerEngine {
  constructor() {
    this.handlers = {};
  }

  async registerTriggersForOrganization(orgId) {
    // load active workflows for org and register triggers
    const workflows = await workflowService.list(orgId);
    for (const wf of workflows) {
      if (wf.status !== 'active') continue;
      const nodes = await workflowService.getNodes(wf.id);
      for (const node of nodes) {
        if (node.type === 'trigger') {
          const triggerType = node.configuration && node.configuration.trigger_type;
          if (triggerType) {
            this.registerTrigger(triggerType, async (payload) => {
              try {
                await workflowEngine.executeWorkflow(wf.id, { trigger: triggerType, payload });
              } catch (err) {
                logger.error('Trigger handler failed', err);
              }
            });
          }
        }
      }
    }
  }

  registerTrigger(triggerName, handler) {
    if (!this.handlers[triggerName]) this.handlers[triggerName] = [];
    this.handlers[triggerName].push(handler);
  }

  async emitTrigger(triggerName, context) {
    const handlers = this.handlers[triggerName] || [];
    logger.debug(`Emitting trigger ${triggerName} to ${handlers.length} handlers`);
    for (const h of handlers) {
      try {
        // run without awaiting to avoid blocking
        h(context).catch(err => logger.error('Trigger handler error', err));
      } catch (err) {
        logger.error('Trigger handler threw', err);
      }
    }
  }
}

module.exports = new TriggerEngine();
