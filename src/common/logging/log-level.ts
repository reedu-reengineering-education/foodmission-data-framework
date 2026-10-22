import { LogLevel } from '@nestjs/common';

/** Values accepted by LOG_LEVEL (see environment.validation.ts). */
export const APP_LOG_LEVELS = [
  'error',
  'warn',
  'info',
  'debug',
  'verbose',
] as const;

export type AppLogLevel = (typeof APP_LOG_LEVELS)[number];

export const DEFAULT_LOG_LEVEL: AppLogLevel = 'info';

/** Reads LOG_LEVEL; missing or unknown values fall back to `info`. */
export function resolveLogLevel(
  value: string | undefined = process.env.LOG_LEVEL,
): AppLogLevel {
  const candidate = value?.trim().toLowerCase();
  return (APP_LOG_LEVELS as readonly string[]).includes(candidate ?? '')
    ? (candidate as AppLogLevel)
    : DEFAULT_LOG_LEVEL;
}

const NEST_LEVELS: Record<AppLogLevel, LogLevel[]> = {
  error: ['fatal', 'error'],
  warn: ['fatal', 'error', 'warn'],
  info: ['fatal', 'error', 'warn', 'log'],
  debug: ['fatal', 'error', 'warn', 'log', 'debug'],
  verbose: ['fatal', 'error', 'warn', 'log', 'debug', 'verbose'],
};

/** Levels Nest's built-in logger should print for the given LOG_LEVEL. */
export function nestLogLevels(level: AppLogLevel = resolveLogLevel()) {
  return NEST_LEVELS[level];
}
