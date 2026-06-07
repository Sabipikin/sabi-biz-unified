class PaymentProvider {
  async createCustomer() {
    throw new Error('createCustomer() must be implemented');
  }

  async createSubscription() {
    throw new Error('createSubscription() must be implemented');
  }

  async cancelSubscription() {
    throw new Error('cancelSubscription() must be implemented');
  }

  async changePlan() {
    throw new Error('changePlan() must be implemented');
  }

  async generateInvoice() {
    throw new Error('generateInvoice() must be implemented');
  }
}

module.exports = PaymentProvider;
