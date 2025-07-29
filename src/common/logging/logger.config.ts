import * as winston from 'winston';
import DailyRotateFile = require('winston-daily-rotate-file');
import { utilities as nestWinstonModuleUtilities } from 'nest-winston';

export interface LoggerConfig {
  level: string;
  enableConsole: boolean;
  enableFile: boolean;
  logDir: string;
  maxFiles: string;
  maxSize: string;
  format: winston.Logform.Format;
}

export const createLoggerConfig = (): LoggerConfig => ({
  level: process.env.LOG_LEVEL || 'info',
  enableConsole: process.env.LOG_CONSOLE !== 'false',
  enableFile: process.env.LOG_FILE !== 'false',
  logDir: process.env.LOG_DIR || './logs',
  maxFiles: process.env.LOG_MAX_FILES || '14d',
  maxSize: process.env.LOG_MAX_SIZE || '20m',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, context, trace, correlationId, userId, ...meta }) => {
      const logEntry: any = {
        timestamp,
        level,
        message,
        ...meta,
      };
      
      if (context) logEntry.context = context;
      if (correlationId) logEntry.correlationId = correlationId;
      if (userId) logEntry.userId = userId;
      if (trace) logEntry.trace = trace;
      
      return JSON.stringify(logEntry);
    }),
  ),
});

export const createWinstonLogger = (config: LoggerConfig): winston.Logger => {
  const transports: winston.transport[] = [];

  // Console transport
  if (config.enableConsole) {
    transports.push(
      new winston.transports.Console({
        level: config.level,
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.ms(),
          nestWinstonModuleUtilities.format.nestLike('FOODMISSION', {
            colors: true,
            prettyPrint: true,
          }),
        ),
      }),
    );
  }

  // File transports
  if (config.enableFile) {
    // General application logs
    transports.push(
      new DailyRotateFile({
        filename: `${config.logDir}/application-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        maxFiles: config.maxFiles,
        maxSize: config.maxSize,
        level: config.level,
        format: config.format,
      }),
    );

    // Error logs
    transports.push(
      new DailyRotateFile({
        filename: `${config.logDir}/error-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        maxFiles: config.maxFiles,
        maxSize: config.maxSize,
        level: 'error',
        format: config.format,
      }),
    );

    // HTTP request logs
    transports.push(
      new DailyRotateFile({
        filename: `${config.logDir}/http-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        maxFiles: config.maxFiles,
        maxSize: config.maxSize,
        level: 'http',
        format: config.format,
      }),
    );
  }

  return winston.createLogger({
    level: config.level,
    format: config.format,
    transports,
    exitOnError: false,
  });
};

// Custom log levels
export const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'blue',
  },
};