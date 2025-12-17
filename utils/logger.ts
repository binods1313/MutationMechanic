// Simple structured logger for frontend
const LOG_LEVELS = {
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  DEBUG: 'DEBUG',
} as const;

type LogLevel = keyof typeof LOG_LEVELS;

const formatMessage = (level: LogLevel, message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  return {
    timestamp,
    level,
    message,
    data,
  };
};

const logger = {
  info: (message: string, data?: any) => {
    console.info(`[INFO] ${message}`, data || '');
  },
  warn: (message: string, data?: any) => {
    console.warn(`[WARN] ${message}`, data || '');
  },
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${message}`, error || '');
  },
  debug: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${message}`, data || '');
    }
  },
};

export default logger;