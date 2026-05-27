// backend/src/server.js
// Main application entry point

console.log('[STARTUP] Loading .env...');
require('dotenv').config();

console.log('[STARTUP] Loading core dependencies...');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cron = require('node-cron');

// ─── IMPORTS ────────────────────────────────────────────────────────────
console.log('[STARTUP] Loading config modules...');
const logger = require('./config/logger');
const startupLogger = require('./config/startupLogger');
console.log('[STARTUP] Loading db module...');
const { query, testConnection } = require('./config/db');
console.log('[STARTUP] Loading dbRetry module...');
const { ensureDbConnected } = require('./config/dbRetry');
console.log('[STARTUP] Loading middleware...');
const { errorHandler, notFound } = require('./middleware/errorHandler');

// ─── ROUTES ────────────────────────────────────────────────────────────
console.log('[STARTUP] Loading routes...');
const routes = require('./routes');
console.log('[STARTUP] All modules loaded successfully');

// ─── SERVER SETUP ───────────────────────────────────────────────────────
const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3000;

// ─── SOCKET.IO ──────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: [process.env.FRONTEND_URL, process.env.ADMIN_URL, 'http://localhost:5173', 'http://localhost:5174'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

io.on('connection', (socket) => {
  logger.debug(`Socket connected: ${socket.id}`);

  socket.on('join_user_room', (userId) => {
    socket.join(`user_${userId}`);
    logger.debug(`User ${userId} joined their room`);
  });

  socket.on('join_admin_room', () => {
    socket.join('admin_room');
    logger.debug('Admin joined admin room');
  });

  socket.on('disconnect', () => {
    logger.debug(`Socket disconnected: ${socket.id}`);
  });
});

// Make io available to routes and services
app.set('io', io);
global.io = io;

// ─── SECURITY MIDDLEWARE ────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for now
  crossOriginResourcePolicy: false,
}));

app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      process.env.ADMIN_URL,
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:3000',
    ].filter(Boolean);

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true,
}));

// ─── BODY PARSING ───────────────────────────────────────────────────────
// Raw body for webhook signature verification (Paystack, PayPal)
app.use('/api/webhooks', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── LOGGING ────────────────────────────────────────────────────────────
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', {
  stream: {
    write: (msg) => logger.http(msg.trim()),
  },
  skip: (req) => req.path === '/health',
}));

// ─── RATE LIMITING ──────────────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: { success: false, message: 'Too many requests. Please slow down.' },
  skip: (req) => req.path.startsWith('/api/webhooks'),
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many auth attempts. Try again later.' },
});

app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);

// ─── HEALTH CHECK ───────────────────────────────────────────────────────
app.get('/health', async (req, res) => {
  try {
    // Check database
    await query('SELECT NOW()');

    res.json({
      success: true,
      message: 'Server is healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  } catch (err) {
    logger.error('Health check failed:', err);
    res.status(503).json({
      success: false,
      message: 'Service unavailable',
      error: err.message,
    });
  }
});

// ─── ROUTES (MOUNT HERE AFTER THEY'RE CREATED) ─────────────────────────
app.use('/api/auth', routes.auth);
app.use('/api/whatsapp', routes.whatsapp);
app.use('/api/business', routes.business);
app.use('/api/subscriptions', routes.subscriptions);
app.use('/api/payments', routes.payments);
app.use('/api/webhooks', routes.webhooks);
app.use('/api/admin', routes.admin);
app.use('/api/analytics', routes.analytics);

// ─── STATIC FILES ───────────────────────────────────────────────────────
// Serve frontend and admin if they exist
const path = require('path');
app.use(express.static(path.join(__dirname, '../../frontend/public')));
app.use('/admin', express.static(path.join(__dirname, '../../admin/public')));

// ─── SCHEDULED TASKS ────────────────────────────────────────────────────
// Run database cleanup every hour
cron.schedule('0 * * * *', async () => {
  logger.debug('Running scheduled task: database cleanup');
  // Add cleanup logic here
});

// Check subscription expiries every day
cron.schedule('0 0 * * *', async () => {
  logger.debug('Running scheduled task: subscription expiry check');
  // Add subscription check logic here
});

// ─── ERROR HANDLING ─────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── SERVER START ───────────────────────────────────────────────────────
try {
  httpServer.listen(PORT, '0.0.0.0', async () => {
  logger.info(`✓ Server running on http://0.0.0.0:${PORT}`);
  logger.info(`✓ Environment: ${process.env.NODE_ENV}`);
  logger.info(`✓ Frontend: ${process.env.FRONTEND_URL}`);
  logger.info(`✓ Admin: ${process.env.ADMIN_URL}`);

  // Test DB connection with retries after the server is listening so
  // failures don't prevent the process from binding to the port (Render
  // requires a listening port to consider the service healthy).
  try {
    const now = await ensureDbConnected(5);
    logger.info(`✓ DB connected after retries: ${JSON.stringify(now)}`);
    startupLogger.info('Server started with DB connected', { port: PORT });
    startupLogger.info('Env snapshot', startupLogger.envSnapshot());
  } catch (err) {
    logger.error('DB connection failed after all retries:', err);
    startupLogger.error('DB connection failed after all retries', err);
    // Don't exit; Render and health checks can detect and restart if needed
  }
  });
} catch (err) {
  logger.error('Failed to start HTTP server:', err);
  startupLogger.error('Failed to start HTTP server', err);
  process.exit(1);
}

// Global error handlers to avoid silent exits on Render and capture
// diagnostic information in the logs.
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { reason, promise });
  // keep process alive for investigation; Render will restart if needed
  startupLogger.error('Unhandled Rejection', reason, { promise: !!promise });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  // Give the log a moment to flush then exit with non-zero code so
  // Render restarts the service if the exception is unrecoverable.
  startupLogger.error('Uncaught Exception', err);
  setTimeout(() => process.exit(1), 1000);
});

// ─── GRACEFUL SHUTDOWN ──────────────────────────────────────────────────
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  httpServer.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  httpServer.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

module.exports = { app, httpServer, io };
