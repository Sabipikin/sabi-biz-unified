const crypto = require('crypto');
const logger = require('./logger');

let KEY = null;

function deriveKey(raw) {
  if (!raw) return null;
  return crypto.createHash('sha256').update(String(raw)).digest();
}

async function tryLoadFromAwsSecrets() {
  const secretArn = process.env.AWS_SECRET_ARN || process.env.TOKEN_MASTER_AWS_SECRET_ARN;
  const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION;
  if (!secretArn || !region) return null;
  try {
    const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
    const client = new SecretsManagerClient({ region });
    const cmd = new GetSecretValueCommand({ SecretId: secretArn });
    const resp = await client.send(cmd);
    if (resp && (resp.SecretString || resp.SecretBinary)) {
      return resp.SecretString || Buffer.from(resp.SecretBinary, 'base64').toString('utf8');
    }
  } catch (err) {
    logger.warn('AWS Secrets Manager fetch failed or SDK not installed:', err?.message || err);
  }
  return null;
}

async function tryLoadFromAzureKeyVault() {
  const vaultName = process.env.AZURE_KEY_VAULT_NAME;
  const secretName = process.env.AZURE_SECRET_NAME || process.env.TOKEN_MASTER_AZURE_SECRET_NAME;
  if (!vaultName || !secretName) return null;
  try {
    const { DefaultAzureCredential } = require('@azure/identity');
    const { SecretClient } = require('@azure/keyvault-secrets');
    const url = `https://${vaultName}.vault.azure.net`;
    const client = new SecretClient(url, new DefaultAzureCredential());
    const resp = await client.getSecret(secretName);
    return resp && resp.value;
  } catch (err) {
    logger.warn('Azure Key Vault fetch failed or SDK not installed:', err?.message || err);
  }
  return null;
}

async function tryLoadFromGcpSecretManager() {
  const name = process.env.GCP_SECRET_NAME || process.env.TOKEN_MASTER_GCP_SECRET_NAME;
  if (!name) return null;
  try {
    const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
    const client = new SecretManagerServiceClient();
    const [accessResponse] = await client.accessSecretVersion({ name });
    const payload = accessResponse && accessResponse.payload && accessResponse.payload.data;
    return payload ? payload.toString('utf8') : null;
  } catch (err) {
    logger.warn('GCP Secret Manager fetch failed or SDK not installed:', err?.message || err);
  }
  return null;
}

async function initMasterKey() {
  if (KEY) return KEY;

  // 1) direct env var
  const envKey = process.env.TOKEN_MASTER_KEY || process.env.WHATSAPP_TOKEN_MASTER_KEY || process.env.APP_SECRET;
  if (envKey) {
    KEY = deriveKey(envKey);
    logger.info('TOKEN_MASTER_KEY loaded from environment');
    return KEY;
  }

  // 2) AWS Secrets Manager
  const fromAws = await tryLoadFromAwsSecrets();
  if (fromAws) {
    KEY = deriveKey(fromAws);
    logger.info('TOKEN_MASTER_KEY loaded from AWS Secrets Manager');
    return KEY;
  }

  // 3) Azure Key Vault
  const fromAzure = await tryLoadFromAzureKeyVault();
  if (fromAzure) {
    KEY = deriveKey(fromAzure);
    logger.info('TOKEN_MASTER_KEY loaded from Azure Key Vault');
    return KEY;
  }

  // 4) GCP Secret Manager
  const fromGcp = await tryLoadFromGcpSecretManager();
  if (fromGcp) {
    KEY = deriveKey(fromGcp);
    logger.info('TOKEN_MASTER_KEY loaded from GCP Secret Manager');
    return KEY;
  }

  logger.warn('No TOKEN_MASTER_KEY configured — access_token will NOT be encrypted at rest');
  return null;
}

function encrypt(plaintext) {
  if (!KEY || !plaintext) return plaintext;
  try {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
    const encrypted = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    const payload = {
      v: 1,
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
      data: encrypted.toString('base64'),
    };
    return JSON.stringify(payload);
  } catch (err) {
    logger.error('Crypto.encrypt failed', err?.message || err);
    return plaintext;
  }
}

function decrypt(payload) {
  if (!KEY || !payload) {
    // If KEY not loaded, try to detect if payload is JSON-encrypted and avoid throwing
    try {
      const obj = JSON.parse(payload);
      if (obj && obj.data) {
        // can't decrypt without key
        return payload;
      }
    } catch (e) {
      return payload;
    }
    return payload;
  }
  try {
    let obj;
    try {
      obj = JSON.parse(payload);
    } catch (err) {
      return payload;
    }
    if (!obj || !obj.data) return payload;
    const iv = Buffer.from(obj.iv, 'base64');
    const tag = Buffer.from(obj.tag, 'base64');
    const data = Buffer.from(obj.data, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (err) {
    logger.warn('Crypto.decrypt failed; returning original payload', err?.message || err);
    return payload;
  }
}

module.exports = { encrypt, decrypt, initMasterKey };
