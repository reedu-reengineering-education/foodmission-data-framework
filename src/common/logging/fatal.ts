import { Logger } from '@nestjs/common';
import { logs } from '@opentelemetry/api-logs';
import { describeError } from '../utils/error.utils';

const FLUSH_TIMEOUT_MS = 2000;

let exiting = false;

/**
 * Log a process-ending failure through the app logger, give OpenTelemetry a
 * moment to ship the buffered record, then exit with code 1 — the same exit
 * Node would do for an uncaught error, but visible in Loki.
 */
export async function logFatalAndExit(
  label: string,
  error: unknown,
  exit: (code: number) => void = (code) => process.exit(code),
): Promise<void> {
  // A second failure while shutting down must not log/flush again.
  if (exiting) return;
  exiting = true;

  try {
    // Logger.fatal has no stack parameter (unlike error), so the stack goes
    // into the message to keep this a single record.
    const stack = error instanceof Error ? error.stack : undefined;
    Logger.fatal(
      stack
        ? `${label}: ${describeError(error)}\n${stack}`
        : `${label}: ${describeError(error)}`,
      'Process',
    );
    // Print anything Nest is still holding back (bufferLogs) if the crash
    // happened before the app logger was attached.
    Logger.flush();
    await flushLogs();
  } finally {
    exit(1);
  }
}

/** Register crash handlers so unhandled errors go through the app logger. */
export function registerProcessErrorHandlers(): void {
  process.on('unhandledRejection', (reason) => {
    void logFatalAndExit('Unhandled promise rejection', reason);
  });
  process.on('uncaughtException', (error) => {
    void logFatalAndExit('Uncaught exception', error);
  });
}

async function flushLogs(): Promise<void> {
  const provider = logs.getLoggerProvider() as {
    forceFlush?: () => Promise<void>;
  };
  if (typeof provider.forceFlush !== 'function') return;

  let timer: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      provider.forceFlush(),
      new Promise<void>((resolve) => {
        timer = setTimeout(resolve, FLUSH_TIMEOUT_MS);
      }),
    ]);
  } catch {
    // Exiting anyway; the record is already on stderr.
  } finally {
    clearTimeout(timer);
  }
}

/** Test-only: reset the once-guard. */
export function resetFatalStateForTests(): void {
  exiting = false;
}
