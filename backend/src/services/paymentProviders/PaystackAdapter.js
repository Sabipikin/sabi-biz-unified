const PaymentProvider = require('./PaymentProvider');
const paystackService = require('../paystackService');

class PaystackAdapter extends PaymentProvider {
  async createCustomer({ user }) {
    return {
      provider: 'paystack',
      email: user.email,
      name: user.name,
    };
  }

  async createSubscription({ user, plan, billingCycle, amount, metadata = {} }) {
    const payment = await paystackService.initializePayment({
      email: user.email,
      amount,
      plan: plan.slug,
      userId: user.id,
      currency: 'NGN',
      metadata: {
        ...metadata,
        billingCycle,
        planId: plan.id,
      },
    });

    return {
      provider: 'paystack',
      authorization_url: payment.authorization_url,
      reference: payment.reference,
      access_code: payment.access_code,
    };
  }

  async cancelSubscription({ subscription }) {
    return {
      provider: 'paystack',
      providerSubscriptionId: subscription.provider_subscription_id || null,
      cancelled: true,
      remoteCancelRequired: !!subscription.provider_subscription_id,
    };
  }

  async changePlan({ user, plan, billingCycle, amount, metadata = {} }) {
    return this.createSubscription({ user, plan, billingCycle, amount, metadata });
  }

  async generateInvoice({ invoice }) {
    return {
      provider: 'paystack',
      invoiceUrl: invoice.invoice_url || null,
    };
  }
}

module.exports = PaystackAdapter;
