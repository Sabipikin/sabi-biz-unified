#!/usr/bin/env node

require('dotenv').config();

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getClient, closePool } = require('../src/config/db');

const email = (process.env.SUPER_ADMIN_EMAIL || 'admin@sabipikin.xyz').toLowerCase().trim();
const password = process.env.SUPER_ADMIN_PASSWORD;
const name = process.env.SUPER_ADMIN_NAME || 'Super Admin';

async function ensureSuperAdmin() {
  if (!password) {
    throw new Error('SUPER_ADMIN_PASSWORD is required');
  }

  const client = await getClient();

  try {
    await client.query('BEGIN');

    const passwordHash = await bcrypt.hash(password, 10);
    const existing = await client.query(
      'SELECT id FROM users WHERE email = $1 LIMIT 1',
      [email]
    );

    if (existing.rows.length) {
      await client.query(
        `UPDATE users
         SET name = COALESCE(NULLIF($2, ''), name),
             password_hash = $3,
             role = 'super_admin',
             status = 'active',
             subscription_plan = 'enterprise',
             subscription_status = 'active',
             subscription_expires_at = NULL,
             updated_at = NOW()
         WHERE email = $1`,
        [email, name, passwordHash]
      );
    } else {
      await client.query(
        `INSERT INTO users (
           id, email, name, password_hash, role, status,
           subscription_plan, subscription_status, created_at, updated_at
         )
         VALUES ($1, $2, $3, $4, 'super_admin', 'active', 'enterprise', 'active', NOW(), NOW())`,
        [uuidv4(), email, name, passwordHash]
      );
    }

    await client.query('COMMIT');
    console.log(`Super admin is ready: ${email}`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await closePool();
  }
}

ensureSuperAdmin().catch((err) => {
  console.error(`Failed to ensure super admin: ${err.message}`);
  process.exit(1);
});
