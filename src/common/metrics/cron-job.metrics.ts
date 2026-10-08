import { getOrCreateCounter, getOrCreateGauge } from './prom-registry';

/*
 * Scheduled-job health. Labelled `task`, not `job`: Prometheus already uses
 * `job` for the scrape job and would rename ours to `exported_job`.
 *
 * Every replica runs @Cron jobs and exposes its own series, so alert on the
 * freshest one, e.g.
 * `time() - max by (task) (cron_job_last_success_timestamp_seconds) > 26 * 3600`.
 */

export const cronJobLastSuccessTimestamp = getOrCreateGauge({
  name: 'cron_job_last_success_timestamp_seconds',
  help: 'Unix time of the last successful run of a scheduled task',
  labelNames: ['task'] as const,
});

export const cronJobFailuresTotal = getOrCreateCounter({
  name: 'cron_job_failures_total',
  help: 'Total number of failed scheduled task runs',
  labelNames: ['task'] as const,
});

export const cronJobDurationSeconds = getOrCreateGauge({
  name: 'cron_job_last_duration_seconds',
  help: 'Duration of the last run of a scheduled task, successful or not',
  labelNames: ['task'] as const,
});

/**
 * Runs `fn` and records its outcome under `task`. Rethrows, so callers keep
 * their own error handling.
 */
export async function trackCronJob<T>(
  task: string,
  fn: () => Promise<T>,
): Promise<T> {
  const start = process.hrtime.bigint();
  try {
    const result = await fn();
    cronJobLastSuccessTimestamp.set({ task }, Date.now() / 1000);
    return result;
  } catch (error) {
    cronJobFailuresTotal.inc({ task });
    throw error;
  } finally {
    cronJobDurationSeconds.set(
      { task },
      Number(process.hrtime.bigint() - start) / 1e9,
    );
  }
}
