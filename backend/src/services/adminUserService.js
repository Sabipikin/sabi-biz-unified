const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/db');

const defaultSuperAdminEmail = 'admin@sabipikin.xyz';
const defaultSuperAdminPassword = 'favCaleb@45!*#';

function getSuperAdminConfig() {
  return {
    email: (process.env.SUPER_ADMIN_EMAIL || defaultSuperAdminEmail).toLowerCase().trim(),
    password: process.env.SUPER_ADMIN_PASSWORD || defaultSuperAdminPassword,
    name: process.env.SUPER_ADMIN_NAME || 'Super Admin',
  };
}

async function ensureAdminUsersTable(db = query) {
  await db(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id UUID PRIMARY KEY,
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
}

async function ensureSuperAdmin(db = query) {
  const { email, password, name } = getSuperAdminConfig();
  const passwordHash = await bcrypt.hash(password, 10);

  await ensureAdminUsersTable(db);

  const existing = await db(
    'SELECT id FROM admin_users WHERE email = $1 LIMIT 1',
    [email]
  );

  if (existing.rows.length) {
    await db(
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
    await db(
      `INSERT INTO admin_users (
         id, email, name, password_hash, role, status, created_at, updated_at
       )
       VALUES ($1, $2, $3, $4, 'super_admin', 'active', NOW(), NOW())`,
      [uuidv4(), email, name, passwordHash]
    );
  }

  return { email };
}

module.exports = {
  ensureAdminUsersTable,
  ensureSuperAdmin,
  getSuperAdminConfig,
};
