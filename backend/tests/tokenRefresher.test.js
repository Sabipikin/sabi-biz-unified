const tokenRefresher = require('../src/services/tokenRefresher');

test('tokenRefresher exposes refreshExpiringTokens', async () => {
  expect(typeof tokenRefresher.refreshExpiringTokens).toBe('function');
});
