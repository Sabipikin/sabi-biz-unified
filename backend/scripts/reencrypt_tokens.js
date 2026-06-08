#!/usr/bin/env node
"use strict";
const { query } = require('../src/config/db');
const crypto = require('../src/config/crypto');
const logger = require('../src/config/logger');

async function reencrypt() {
  try {
    await crypto.initMasterKey();

    const res = await query(`SELECT id, access_token FROM whatsapp_accounts WHERE access_token IS NOT NULL`);
    const rows = res.rows || [];
    logger.info(`Found ${rows.length} accounts with access_token`);
    let updated = 0;
    for (const r of rows) {
      const token = r.access_token;
      // Detect already-encrypted payload (JSON with data)
      let isEncrypted = false;
      try {
        const obj = JSON.parse(token);
        if (obj && obj.data) isEncrypted = true;
      } catch (err) {
        isEncrypted = false;
      }

      if (!isEncrypted) {
        const enc = crypto.encrypt(token);
        await query(`UPDATE whatsapp_accounts SET access_token = $1 WHERE id = $2`, [enc, r.id]);
        updated++;
        logger.info(`Re-encrypted token for account ${r.id}`);
      }
    }
    logger.info(`Re-encryption complete. ${updated} accounts updated.`);
    process.exit(0);
  } catch (err) {
    logger.error('Re-encrypt tokens failed', err?.message || err);
    process.exit(1);
  }
}

reencrypt();
