type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const getMinLevel = (): number => {
  const envLevel = (process.env.LOG_LEVEL?.toLowerCase() as LogLevel) || 'info';
  return LOG_LEVELS[envLevel] ?? LOG_LEVELS.info;
};

const SENSITIVE_KEYS = ['password', 'token', 'secret', 'apikey', 'credential'];

const redact = (data: any): any => {
  if (process.env.NODE_ENV !== 'production' || process.env.DEBUG === 'true') {
    return data;
  }

  if (typeof data !== 'object' || data === null) {
    if (typeof data === 'string') {
      const lower = data.toLowerCase();
      if (SENSITIVE_KEYS.some(key => lower.includes(key) && lower.includes(':'))) {
        return '[REDACTED]';
      }
    }
    return data;
  }

  const redacted = Array.isArray(data) ? [...data] : { ...data };
  for (const key in redacted) {
    if (SENSITIVE_KEYS.includes(key.toLowerCase())) {
      redacted[key] = '[REDACTED]';
    } else if (typeof redacted[key] === 'object') {
      redacted[key] = redact(redacted[key]);
    }
  }
  return redacted;
};

const shouldLog = (level: LogLevel): boolean => {
  if (process.env.NODE_ENV === 'test' && !process.env.ENABLE_TEST_LOGS) return false;
  if (process.env.DEBUG === 'true') return true;

  const minLevel = getMinLevel();
  return LOG_LEVELS[level] >= minLevel;
};

export const logger = {
  debug: (...args: any[]) => {
    if (shouldLog('debug')) {
      console.debug('[DEBUG]', ...args.map(redact));
    }
  },
  info: (...args: any[]) => {
    if (shouldLog('info')) {
      console.info('[INFO]', ...args.map(redact));
    }
  },
  log: (...args: any[]) => {
    if (shouldLog('info')) {
      console.log('[INFO]', ...args.map(redact));
    }
  },
  warn: (...args: any[]) => {
    if (shouldLog('warn')) {
      console.warn('[WARN]', ...args.map(redact));
    }
  },
  error: (...args: any[]) => {
    if (shouldLog('error')) {
      console.error('[ERROR]', ...args.map(redact));
    }
  }
};
