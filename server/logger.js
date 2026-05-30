const serializeError = (error) => {
  if (!error) return undefined;
  return {
    name: error.name || 'Error',
    message: error.message || 'Unexpected error',
  };
};

const writeLog = (level, event, metadata = {}) => {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...metadata,
  };

  const line = JSON.stringify(payload);
  if (level === 'error') {
    console.error(line);
    return;
  }
  if (level === 'warn') {
    console.warn(line);
    return;
  }
  console.log(line);
};

export const logInfo = (event, metadata = {}) => writeLog('info', event, metadata);

export const logWarn = (event, metadata = {}) => writeLog('warn', event, metadata);

export const logError = (event, error, metadata = {}) =>
  writeLog('error', event, {
    ...metadata,
    error: serializeError(error),
  });
