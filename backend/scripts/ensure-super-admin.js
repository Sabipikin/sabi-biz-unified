#!/usr/bin/env node

require('dotenv').config();

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getClient, closePool } = require('../src/config/db');

const email = (process.env.SUPER_ADMIN_EMAIL || 'admin@sabipikin.xyz').toLowerCase().trim();
const password = process.env.SUPER_ADMIN_PASSWORD || 'favCaleb@45!*#';
const name = process.env.SUPER_ADMIN_NAME || 'Super Admin';

async function ensureSuperAdmin() {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'admin',
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        last_login_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT admin_users_role_check CHECK (role IN ('admin', 'super_admin')),
        CONSTRAINT admin_users_status_check CHECK (status IN ('active', 'suspended'))
      )
    `);

    const passwordHash = await bcrypt.hash(password, 10);
    const existing = await client.query(
      'SELECT id FROM admin_users WHERE email = $1 LIMIT 1',
      [email]
    );

    if (existing.rows.length) {
      await client.query(
        `UPDATE admin_users
         SET name = COALESCE(NULLIF($2, ''), name),
             password_hash = $3,
             role = 'super_admin',
             status = 'active',
             updated_at = NOW()
         WHERE email = $1`,
        [email, name, passwordHash]
      );
    } else {
      await client.query(
        `INSERT INTO admin_users (
           id, email, name, password_hash, role, status, created_at, updated_at
         )
         VALUES ($1, $2, $3, $4, 'super_admin', 'active', NOW(), NOW())`,
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
