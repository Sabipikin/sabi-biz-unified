const assert = require('assert');
const { isValidEmail, validateCustomerData } = require('../public/js/validation.node');

function testIsValidEmail() {
  assert.strictEqual(isValidEmail(''), true);
  assert.strictEqual(isValidEmail(null), true);
  assert.strictEqual(isValidEmail('user@example.com'), true);
  assert.strictEqual(isValidEmail('user.name+tag@sub.domain.co'), true);
  assert.strictEqual(isValidEmail('invalid@'), false);
  assert.strictEqual(isValidEmail('no-at-symbol.com'), false);
}

function testValidateCustomerData() {
  let res;

  res = validateCustomerData({ name: 'Alice' });
  assert.strictEqual(res.ok, true);

  res = validateCustomerData({ name: '' });
  assert.strictEqual(res.ok, false);
  assert.ok(res.errors.name);

  res = validateCustomerData({ name: 'Bob', email: 'bad-email' });
  assert.strictEqual(res.ok, false);
  assert.ok(res.errors.email);

  res = validateCustomerData({ name: 'Carol', phone: '12345' });
  assert.strictEqual(res.ok, false);
  assert.ok(res.errors.phone);

  res = validateCustomerData({ name: 'Dave', birthday: 'not-a-date' });
  assert.strictEqual(res.ok, false);
  assert.ok(res.errors.birthday);
}

try {
  testIsValidEmail();
  testValidateCustomerData();
  console.log('All validation tests passed');
  process.exit(0);
} catch (err) {
  console.error('Validation tests failed:', err.message);
  console.error(err);
  process.exit(1);
}
