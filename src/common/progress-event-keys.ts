/**
 * Idempotency keys for MISSION_* / CHALLENGE_* progress events.
 *
 * Both the progress API (`mission-/challenge-progress.service.ts`) and the
 * rules engine (`rules.service.ts`) record these, and must build the same key
 * for the same transition so the ledger keeps one row, not two.
 *
 * A failed item can be restarted, which begins a new attempt with a new
 * `startedAt`. Started / updated / failed / restarted keys therefore end in
 * the attempt's start time: without it, the second attempt's events would hit
 * the first attempt's keys and be dropped as replays. Completed keys don't:
 * an item completes (and pays its reward) at most once. Rows without a start
 * time keep the original unsuffixed keys.
 */
export type ProgressKind = 'mission' | 'challenge';

export type ProgressTransition =
  'started' | 'updated' | 'completed' | 'failed' | 'restarted';

export function progressEventKey(input: {
  kind: ProgressKind;
  transition: ProgressTransition;
  userId: string;
  id: string;
  startedAt?: Date | null;
  /** Only for `updated`, which is keyed by the values it moved to. */
  progress?: number;
  completed?: boolean;
}): string {
  const base = `${input.kind}-${input.transition}:${input.userId}:${input.id}`;
  const values =
    input.transition === 'updated'
      ? `:${input.progress}:${input.completed}`
      : '';
  const attempt =
    input.transition !== 'completed' && input.startedAt
      ? `:${input.startedAt.getTime()}`
      : '';
  return `${base}${values}${attempt}`;
}
