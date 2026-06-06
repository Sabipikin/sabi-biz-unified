jest.mock('../src/config/db', () => ({
  query: jest.fn(),
}));

const { query } = require('../src/config/db');
const aiContextGenerator = require('../src/services/aiContextGenerator');

describe('aiContextGenerator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('generate assembles business, customer, invoices, products, inventory, and recent messages', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ id: 'user-1', name: 'Ada', shop_name: 'Ada Stores', business_type: 'retail' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'customer-1', name: 'Tunde', phone: '2348000000000' }] })
      .mockResolvedValueOnce({ rows: [{ product_name: 'Rice', quantity: 2, unit_price: 1000, total_amount: 2000, sale_date: '2026-06-01' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'invoice-1', amount: 2000, status: 'draft', customer_name: 'Tunde' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'inventory-1', product_name: 'Rice', quantity: 5, unit_price: 1200, cost_price: 900 }] })
      .mockResolvedValueOnce({ rows: [{ direction: 'inbound', sender_type: 'customer', message_text: 'Do you have rice?', created_at: new Date() }] });

    const context = await aiContextGenerator.generate('user-1', 'customer-1', 'conversation-1');

    expect(context.business_name).toBe('Ada Stores');
    expect(context.products).toEqual(expect.arrayContaining([
      expect.objectContaining({ product_name: 'Rice', quantity: 5, unit_price: 1200 }),
    ]));
    expect(context.available_inventory).toEqual([
      { product_name: 'Rice', quantity: 5, available: true },
    ]);
    expect(context.customer_history[0].product_name).toBe('Rice');
    expect(context.recent_invoices[0].id).toBe('invoice-1');
    expect(context.recent_conversations[0].message_text).toBe('Do you have rice?');
  });
});
