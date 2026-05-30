import { join } from 'node:path';

const parsePort = (name, fallback) => {
  const raw = process.env[name] || String(fallback);
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    throw new Error(`${name} must be an integer between 1 and 65535`);
  }
  return value;
};

const parseRetention = () => {
  const raw = process.env.CATBOOK_BACKUP_RETENTION || '10';
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > 100) {
    throw new Error('CATBOOK_BACKUP_RETENTION must be an integer between 1 and 100');
  }
  return value;
};

export const validateRuntimeConfig = (serviceName) => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const devPassword = process.env.CATBOOK_DEV_PASSWORD || '1234';
  const config = {
    serviceName,
    nodeEnv,
    apiPort: parsePort('CATBOOK_API_PORT', 4000),
    previewPort: parsePort('CATBOOK_PREVIEW_PORT', 5173),
    devPassword,
    backupDir: process.env.CATBOOK_DB_BACKUP_DIR || join(process.cwd(), 'server', 'backups'),
    backupRetention: parseRetention(),
  };

  const warnings = [];
  if (nodeEnv === 'production' && devPassword === '1234') {
    warnings.push('CATBOOK_DEV_PASSWORD is still using the development default.');
  }
  if (nodeEnv === 'production' && config.backupDir.includes(`${join('server', 'backups')}`)) {
    warnings.push('CATBOOK_DB_BACKUP_DIR should point to durable storage in production.');
  }

  return { config, warnings };
};
