// backend/src/routes/index.js
// Central route registry for the unified backend

module.exports = {
  auth: require('./auth'),
  whatsapp: require('./whatsapp'),
  business: require('./business'),
  subscriptions: require('./subscriptions'),
  payments: require('./payments'),
  webhooks: require('./webhooks'),
  admin: require('./admin'),
  analytics: require('./analytics'),
  conversations: require('./conversations'),
  ai: require('./ai'),
};
