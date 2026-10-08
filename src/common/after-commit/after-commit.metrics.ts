import { getOrCreateCounter, getOrCreateGauge } from '../metrics/prom-registry';

/**
 * Tasks drained by AfterCommitQueue: `ok`, `failed` (threw) or `skipped`
 * (the writer's transaction never became visible). Failed and skipped tasks
 * are lost — usually a badge, quest or wallet update the user never gets.
 */
export const afterCommitTasksTotal = getOrCreateCounter({
  name: 'after_commit_tasks_total',
  help: 'Total number of after-commit tasks processed, by outcome',
  labelNames: ['outcome'] as const,
});

/**
 * Scheduled tasks not yet drained on this replica. Tasks run serially, so a
 * value that keeps growing means derived work is falling behind writes.
 */
export const afterCommitQueuePending = getOrCreateGauge({
  name: 'after_commit_queue_pending_tasks',
  help: 'Number of scheduled after-commit tasks waiting to run',
});
