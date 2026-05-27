// backend/src/services/authService.js
// Authentication business logic

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/db');
const logger = require('../config/logger');
const { ValidationError, NotFoundError } = require('../utils/errors');

/**
 * Register a new user
 */
exports.register = async ({ name, email, password, phone }) => {
  try {
    // Validate inputs
    if (!email || !password || !name) {
      throw new ValidationError('Missing required fields');
    }

    // Check if user exists
    const existing = await query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existing.rows.length > 0) {
      throw new ValidationError('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const userId = uuidv4();
    const result = await query(
      `INSERT INTO users (id, name, email, phone, password_hash, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING id, name, email, phone, role, status`,
      [userId, name, email.toLowerCase(), phone, passwordHash]
    );

    logger.info(`User registered: ${email}`);
    return result.rows[0];
  } catch (err) {
    logger.error('Registration error:', err);
    throw err;
  }
};

/**
 * Login with email and password
 */
exports.login = async ({ email, password }) => {
  try {
    if (!email || !password) {
      throw new ValidationError('Email and password required');
    }

    // Find user
    const result = await query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      throw new ValidationError('Invalid email or password');
    }

    const user = result.rows[0];

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      throw new ValidationError('Invalid email or password');
    }

    // Update last login
    await query(
      'UPDATE users SET last_login_at = NOW() WHERE id = $1',
      [user.id]
    );

    logger.info(`User logged in: ${email}`);

    // Generate JWT
    const token = this.generateJWT(user.id, user.email, user.role);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        subscription_plan: user.subscription_plan,
      },
      token,
    };
  } catch (err) {
    logger.error('Login error:', err);
    throw err;
  }
};

/**
 * Generate JWT token
 */
exports.generateJWT = (userId, email, role = 'user') => {
  return jwt.sign(
    { userId, email, role },
    process.env.JWT_SECRET,
    {
      algorithm: process.env.JWT_ALGORITHM || 'HS256',
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    }
  );
};

/**
 * Verify JWT token
 */
exports.verifyJWT = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: [process.env.JWT_ALGORITHM || 'HS256'],
    });
  } catch (err) {
    logger.warn('JWT verification failed:', err.message);
    throw new ValidationError('Invalid or expired token');
  }
};

/**
 * Get user by ID
 */
exports.getUserById = async (userId) => {
  try {
    const result = await query(
      `SELECT id, name, email, phone, role, subscription_plan, subscription_status, 
              whatsapp_enabled, ai_enabled, status, created_at 
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('User');
    }

    return result.rows[0];
  } catch (err) {
    logger.error('Get user error:', err);
    throw err;
  }
};

module.exports = exports;
