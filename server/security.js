import { randomUUID } from 'node:crypto';
import { withDatabase } from './database.js';

export const mutationMethods = new Set(['POST', 'PATCH', 'DELETE']);

export const newCsrfToken = () => randomUUID();

export const apiError = (status, message, code = 'API_ERROR', details = undefined) => ({
  error: {
    code,
    message,
    ...(details ? { details } : {}),
  },
});

export const isStrongEnoughDevPassword = (password) =>
  String(password || '').length >= 4;

export const auditLog = async ({ actorUserId = '', action, entityType = 'system', entityId = '', metadata = {} }) =>
  withDatabase((database) => {
    database.auditLogs.push({
      id: `AUD-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      actorUserId,
      action,
      entityType,
      entityId,
      metadata,
      createdAt: new Date().toISOString(),
    });
  });

export const parsePositiveInteger = (value, fallback = 1) => {
  const number = Number(value ?? fallback);
  if (!Number.isInteger(number) || number < 1) return null;
  return number;
};

export const parseNonNegativeInteger = (value, fallback = 0) => {
  const number = Number(value ?? fallback);
  if (!Number.isInteger(number) || number < 0) return null;
  return number;
};
