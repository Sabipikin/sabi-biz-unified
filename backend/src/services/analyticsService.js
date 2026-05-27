// backend/src/services/analyticsService.js

const { query } = require('../config/db');

class AnalyticsService {
  async getMetrics(userId) {
    const result = await query(
      `SELECT metric_type, metric_value, period_date, created_at
       FROM analytics
       WHERE user_id = $1
       ORDER BY period_date DESC, created_at DESC
       LIMIT 50`,
      [userId]
    );
    return result.rows;
  }
}

module.exports = new AnalyticsService();
