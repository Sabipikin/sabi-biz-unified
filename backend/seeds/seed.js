// backend/seeds/seed.js
// Sample data seeding script

const { query } = require('../src/config/db');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const logger = require('../src/config/logger');

/**
 * Seed database with sample data
 */
async function seedDatabase() {
  try {
    logger.info('Starting database seeding...');

    // Create admin user
    const adminId = uuidv4();
    const adminPasswordHash = await bcrypt.hash('Admin@123456', 10);

    await query(
      `INSERT INTO users (id, email, phone, name, shop_name, password_hash, role, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        adminId,
        'admin@sabibiz.com',
        '+2349012345678',
        'Admin User',
        'Sabi Admin',
        adminPasswordHash,
        'admin',
        'active',
      ]
    );

    logger.info('✓ Created admin user: admin@sabibiz.com / Admin@123456');

    // Create sample user
    const userId = uuidv4();
    const userPasswordHash = await bcrypt.hash('User@123456', 10);

    await query(
      `INSERT INTO users (id, email, phone, name, shop_name, password_hash, role, subscription_plan, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
      [
        userId,
        'user@sabibiz.com',
        '+2349087654321',
        'John Doe',
        'John\'s Shop',
        userPasswordHash,
        'user',
        'starter',
        'active',
      ]
    );

    logger.info('✓ Created sample user: user@sabibiz.com / User@123456');

    // Create sample subscription
    await query(
      `INSERT INTO subscriptions (id, user_id, plan, payment_method, status, amount, currency, billing_cycle, next_billing_date, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW() + INTERVAL '30 days', NOW())`,
      [uuidv4(), userId, 'starter', 'paystack', 'active', 3000, 'NGN', 'monthly']
    );

    logger.info('✓ Created sample subscription');

    // Create sample invoices
    const invoiceId = uuidv4();
    await query(
      `INSERT INTO invoices (id, user_id, customer_name, customer_phone, amount, description, status, due_date, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        invoiceId,
        userId,
        'Kunle Stores',
        '+2349123456789',
        50000,
        'Bulk rice and beans delivery',
        'sent',
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ]
    );

    logger.info('✓ Created sample invoice');

    // Create sample inventory
    await query(
      `INSERT INTO inventory (id, user_id, product_name, quantity, unit_price, reorder_level, supplier, created_at)
       VALUES 
       ($1, $2, $3, $4, $5, $6, $7, NOW()),
       ($8, $2, $9, $10, $11, $12, $13, NOW()),
       ($14, $2, $15, $16, $17, $18, $19, NOW())`,
      [
        uuidv4(), userId, 'Rice (50kg bag)', 45, 18000, 10, 'Delta Traders',
        uuidv4(), userId, 'Beans (25kg bag)', 60, 15000, 10, 'Kano Suppliers',
        uuidv4(), userId, 'Garri (18kg bag)', 30, 8000, 5, 'Oyo Wholesalers',
      ]
    );

    logger.info('✓ Created sample inventory items');

    // Create AI config
    await query(
      `INSERT INTO ai_configs (id, user_id, enabled, system_prompt, temperature, max_tokens, model, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        uuidv4(),
        userId,
        true,
        'You are a helpful assistant for a Nigerian retail business. Respond in English or Pidgin as appropriate.',
        0.7,
        500,
        'gpt-4o-mini',
      ]
    );

    logger.info('✓ Created sample AI configuration');

    logger.info('✓ Database seeding completed successfully!');
    logger.info('\nTest Credentials:');
    logger.info('  Admin: admin@sabibiz.com / Admin@123456');
    logger.info('  User:  user@sabibiz.com / User@123456');

    process.exit(0);
  } catch (err) {
    logger.error('Seeding failed:', err);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
