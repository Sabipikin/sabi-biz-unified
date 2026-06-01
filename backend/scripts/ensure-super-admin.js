#!/usr/bin/env node

require('dotenv').config();

const { getClient, closePool } = require('../src/config/db');
const adminUserService = require('../src/services/adminUserService');

async function ensureSuperAdmin() {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    const admin = await adminUserService.ensureSuperAdmin(
      (text, params) => client.query(text, params)
    );

    await client.query('COMMIT');
    console.log(`Super admin is ready: ${admin.email}`);
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
