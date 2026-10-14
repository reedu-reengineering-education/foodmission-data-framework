import { getOrCreateCounter } from '../common/metrics/prom-registry';

/*
 * User-event ledger metrics. Each API replica exposes its own counts; sum
 * across pods in Prometheus, e.g.
 * `sum(rate(user_events_recorded_total[$__rate_interval]))` for events/sec.
 */

/** Fresh ledger writes. */
export const userEventsRecordedTotal = getOrCreateCounter({
  name: 'user_events_recorded_total',
  help: 'Total number of user events written to the ledger (replays excluded)',
  labelNames: ['event_type', 'source'] as const,
});

/**
 * Idempotency-key hits: the event already existed and was returned as-is.
 * A spike points at client retries or double-submits.
 */
export const userEventsReplayedTotal = getOrCreateCounter({
  name: 'user_events_replayed_total',
  help: 'Total number of user event writes answered from an existing idempotency key',
  labelNames: ['event_type', 'source'] as const,
});

/**
 * Ledger writes that failed and were swallowed by `recordBestEffort`. The
 * event — and any badge/quest/progress it would have driven — is lost, so
 * anything above zero is worth an alert.
 */
export const userEventsRecordFailuresTotal = getOrCreateCounter({
  name: 'user_events_record_failures_total',
  help: 'Total number of best-effort user event writes that failed and were dropped',
  labelNames: ['event_type'] as const,
});

/**
 * Derived-progress (`rules`) or badge (`badges`) evaluations that threw after
 * the event was written. The event is kept but the user's progress lags until
 * a later event re-evaluates it.
 */
export const userEventEvaluationFailuresTotal = getOrCreateCounter({
  name: 'user_event_evaluation_failures_total',
  help: 'Total number of post-write rule or badge evaluations that failed',
  labelNames: ['stage', 'event_type'] as const,
});
