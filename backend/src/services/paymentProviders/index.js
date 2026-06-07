const PaystackAdapter = require('./PaystackAdapter');
const StripeAdapter = require('./StripeAdapter');
const FlutterwaveAdapter = require('./FlutterwaveAdapter');

function getPaymentProvider(provider = 'paystack') {
  if (provider === 'stripe') return new StripeAdapter();
  if (provider === 'flutterwave') return new FlutterwaveAdapter();
  return new PaystackAdapter();
}

module.exports = { getPaymentProvider };
