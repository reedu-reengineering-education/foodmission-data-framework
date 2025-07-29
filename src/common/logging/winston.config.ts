import { WinstonModuleOptions } from 'nest-winston';
import * as winston from 'winston';

const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

// Custom format for development
const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, context, stack, correlationId }) => {
    const correlationInfo = correlationId ? `[${correlationId}] ` : '';
    const contextInfo = context ? ` ${JSON.stringify(context)}` : '';
    const stackInfo = stack ? `\n${stack}` : '';
    return `${timestamp} ${level}: ${correlationInfo}${message}${contextInfo}${stackInfo}`;
  }),
);

// Custom format for production (structured JSON)
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf((info) => {
    const { timestamp, level, message, context, stack, correlationId, ...meta } = info;
    return JSON.stringify({
      timestamp,
      level,
      message,
      correlationId,
      context,
      stack,
      ...meta,
    });
  }),
);

// Create transports based on environment
const createTransports = (): winston.transport[] => {
  const transports: winston.transport[] = [];

  if (isTest) {
    // In test environment, only log errors to console
    transports.push(
      new winston.transports.Console({
        level: 'error',
        format: winston.format.simple(),
        silent: process.env.SILENT_LOGS === 'true',
      }),
    );
  } else if (isDevelopment) {
    // Development: colorized console output
    transports.push(
      new winston.transports.Console({
        level: 'debug',
        format: developmentFormat,
      }),
    );
  } else {
    // Production: structured JSON logs
    transports.push(
      new winston.transports.Console({
        level: 'info',
        format: productionFormat,
      }),
    );

    // Add file transports for production
    transports.push(
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: productionFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
      new winston.transports.File({
        filename: 'logs/combined.log',
        format: productionFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
    );
  }

  return transports;
};

export const winstonConfig: WinstonModuleOptions = {
  level: isTest ? 'error' : isDevelopment ? 'debug' : 'info',
  format: isDevelopment ? developmentFormat : productionFormat,
  transports: createTransports(),
  exitOnError: false,
  // Add default metadata
  defaultMeta: {
    service: 'foodmission-api',
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
  },
};

// Export logger instance for direct use
export const logger = winston.createLogger(winstonConfig);