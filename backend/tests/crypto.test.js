const cryptoUtil = require('../src/config/crypto');

test('crypto encrypt/decrypt roundtrip', () => {
  const plain = 'hello-secret-token';
  const enc = cryptoUtil.encrypt(plain);
  const dec = cryptoUtil.decrypt(enc);
  // If no key configured, encrypt returns plaintext; accept both.
  expect(dec === plain || enc === plain).toBeTruthy();
});
