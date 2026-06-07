const { query } = require('../config/db');

function classifyChurnRisk(lastPurchaseDate, frequency) {
  if (!lastPurchaseDate) return 'unknown';
  const daysSince = Math.floor((Date.now() - new Date(lastPurchaseDate).getTime()) / 86400000);
  if (daysSince > 90) return 'high';
  if (daysSince > 45 || Number(frequency || 0) < 0.5) return 'medium';
  return 'low';
}

class CustomerIntelligenceService {
  calculateCustomerScore(row) {
    const lifetime = Number(row.lifetime_value || 0);
    const frequency = Number(row.purchase_frequency || 0);
    const recencyBoost = row.last_purchase_date && classifyChurnRisk(row.last_purchase_date, frequency) === 'low' ? 20 : 0;
    return Math.max(0, Math.min(100, Math.round(Math.min(lifetime / 10000, 40) + Math.min(frequency * 12, 40) + recencyBoost)));
  }

  calculateLifetimeValue(row) {
    return Number(row.lifetime_value || 0);
  }

  calculateChurnRisk(row) {
    return classifyChurnRisk(row.last_purchase_date, row.purchase_frequency);
  }

  async refreshForUser(userId) {
    const result = await query(
      `WITH stats AS (
         SELECT c.id,
                COALESCE(SUM(s.total_amount), 0) AS lifetime_value,
                COALESCE(AVG(s.total_amount), 0) AS average_order_value,
                COUNT(s.id)::decimal / GREATEST(1, DATE_PART('month', AGE(NOW(), MIN(s.sale_date))) + 1) AS purchase_frequency,
                MAX(s.sale_date)::date AS last_purchase_date
         FROM customers c
         LEFT JOIN sales s ON s.customer_id = c.id AND s.user_id = c.user_id
         WHERE c.user_id = $1
         GROUP BY c.id
       )
       SELECT * FROM stats`,
      [userId]
    );

    for (const row of result.rows) {
      const churnRisk = this.calculateChurnRisk(row);
      const customerScore = this.calculateCustomerScore(row);
      const nextPurchase = row.last_purchase_date && churnRisk !== 'high'
        ? new Date(new Date(row.last_purchase_date).getTime() + Math.max(14, Math.round(30 / Math.max(Number(row.purchase_frequency || 1), 1))) * 86400000)
        : null;

      await query(
        `UPDATE customers
         SET customer_score = $1,
             loyalty_score = $2,
             lifetime_value = $3,
             purchase_frequency = $4,
             average_order_value = $5,
             last_purchase_date = $6,
             predicted_next_purchase = $7,
             churn_risk = $8,
             updated_at = NOW()
         WHERE id = $9 AND user_id = $10`,
        [
          customerScore,
          Math.max(0, Math.min(100, Math.round(customerScore * 0.85))),
          this.calculateLifetimeValue(row),
          Number(row.purchase_frequency || 0),
          Number(row.average_order_value || 0),
          row.last_purchase_date,
          nextPurchase,
          churnRisk,
          row.id,
          userId,
        ]
      );
    }
  }

  async widgets(userId) {
    await this.refreshForUser(userId);
    const [top, atRisk, repeat, dormant, vip] = await Promise.all([
      query(`SELECT id, name, phone, customer_score, lifetime_value FROM customers WHERE user_id = $1 ORDER BY lifetime_value DESC LIMIT 5`, [userId]),
      query(`SELECT id, name, phone, churn_risk, last_purchase_date FROM customers WHERE user_id = $1 AND churn_risk IN ('high', 'medium') ORDER BY last_purchase_date ASC NULLS FIRST LIMIT 5`, [userId]),
      query(`SELECT id, name, phone, purchase_frequency, loyalty_score FROM customers WHERE user_id = $1 AND purchase_frequency >= 1 ORDER BY purchase_frequency DESC LIMIT 5`, [userId]),
      query(`SELECT id, name, phone, last_purchase_date FROM customers WHERE user_id = $1 AND (last_purchase_date IS NULL OR last_purchase_date < NOW() - INTERVAL '90 days') LIMIT 5`, [userId]),
      query(`SELECT id, name, phone, customer_score, lifetime_value FROM customers WHERE user_id = $1 AND customer_score >= 70 ORDER BY customer_score DESC LIMIT 5`, [userId]),
    ]);

    return {
      top_customers: top.rows,
      at_risk_customers: atRisk.rows,
      repeat_buyers: repeat.rows,
      dormant_customers: dormant.rows,
      vip_customers: vip.rows,
    };
  }
}

module.exports = new CustomerIntelligenceService();
