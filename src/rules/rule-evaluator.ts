import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import { Prisma } from '@prisma/client';

/**
 * The rule vocabulary and its evaluator, with no Nest or Prisma client in
 * sight: everything here is a pure function over a list of ledger rows.
 *
 * Two features load YAML in this dialect — mission/challenge rules
 * (`rules.service.ts`, quest-scoped, short windows) and badge rules
 * (`badges/badge-rules.service.ts`, account-wide, lifetime windows). They
 * differ in *which* rows they fetch and what they write, not in how a rule is
 * read, so the reading lives here and neither service owns it.
 */

export const WINDOW_TYPES = [
  'since_start',
  'rolling_lookback',
  'lifetime',
] as const;

export type WindowType = (typeof WINDOW_TYPES)[number];

export interface RuleWindow {
  type: WindowType;
  /** Required for every type but `lifetime`, which has no lower bound. */
  days?: number;
  offsetDays?: number;
}

export interface RuleCounter {
  event?: string;
  anyOf?: string[];
  distinctBy?: string;
  where?: Record<string, string | number | boolean>;
  window?: RuleWindow;
}

export interface RuleDefinition {
  window: RuleWindow;
  counters: Record<string, RuleCounter>;
  target: string;
  progress: string;
  fail?: string;
  resolveAt?: 'immediate' | 'window_end';
  notes: string[];
}

/** The slice of a `UserEvent` row a rule can see. */
export type UserEventRow = {
  eventType: string;
  createdAt: Date;
  metadata: Prisma.JsonValue;
};

export interface RuleOutcome {
  /** 0–100, and exactly 100 once `target` holds. */
  progress: number;
  completed: boolean;
  /** Counter values behind the verdict, for the progress row's `state`. */
  counters: Record<string, number>;
}

/** Every event type any counter in these rules can match. */
export function collectEventTypes(
  rules: Iterable<RuleDefinition>,
): Set<string> {
  const types = new Set<string>();
  for (const rule of rules) {
    for (const counter of Object.values(rule.counters)) {
      if (counter.event) {
        types.add(counter.event);
      }
      for (const type of counter.anyOf ?? []) {
        types.add(type);
      }
    }
  }
  return types;
}

/**
 * The widest lookback any counter in these rules needs, in days, or `null`
 * when at least one window is `lifetime` — meaning the caller must not put a
 * lower bound on its event query at all.
 */
export function maxWindowDays(
  rules: Iterable<RuleDefinition>,
  floorDays = 7,
): number | null {
  let max = floorDays;
  for (const rule of rules) {
    if (rule.window.type === 'lifetime') {
      return null;
    }
    max = Math.max(max, rule.window.days ?? floorDays);

    for (const counter of Object.values(rule.counters)) {
      const window = counter.window ?? rule.window;
      if (window.type === 'lifetime') {
        return null;
      }
      max = Math.max(
        max,
        (window.days ?? floorDays) + (window.offsetDays ?? 0),
      );
    }
  }
  return max;
}

export function evaluateRule(
  rule: RuleDefinition,
  events: UserEventRow[],
  evaluationAt: Date = new Date(),
): RuleOutcome {
  const counters = evaluateCounters(
    rule.counters,
    events,
    rule.window,
    evaluationAt,
  );
  const completed = asBoolean(evaluateExpression(rule.target, counters));
  const progress = completed
    ? 100
    : normalizeProgress(evaluateExpression(rule.progress, counters));

  return { progress, completed, counters };
}

/** Stable fingerprint of a rule body, so a row records which version scored it. */
export function hashRule(rule: RuleDefinition | undefined): string {
  return createHash('sha256')
    .update(JSON.stringify(rule ?? {}))
    .digest('hex');
}

export function evaluateCounters(
  counters: Record<string, RuleCounter>,
  events: UserEventRow[],
  ruleWindow: RuleWindow,
  evaluationAt: Date,
): Record<string, number> {
  const values: Record<string, number> = {};
  for (const [name, counter] of Object.entries(counters)) {
    values[name] = filterEvents(
      counter,
      events,
      ruleWindow,
      evaluationAt,
    ).length;
  }
  return values;
}

export function filterEvents(
  counter: RuleCounter,
  events: UserEventRow[],
  ruleWindow: RuleWindow = { type: 'since_start', days: 7 },
  evaluationAt: Date = new Date(),
): UserEventRow[] {
  const matched = events.filter((event) => {
    if (counter.event) {
      if (event.eventType !== counter.event) {
        return false;
      }
    } else if (!(counter.anyOf?.includes(event.eventType) ?? false)) {
      return false;
    }

    if (!counter.where) {
      return true;
    }

    return Object.entries(counter.where).every(([path, expected]) => {
      const value = getPathValue(event.metadata, path);
      return value === expected;
    });
  });

  const window = counter.window ?? ruleWindow;
  const windowed = matched.filter((event) =>
    isWithinWindow(event.createdAt, evaluationAt, window),
  );

  if (!counter.distinctBy) {
    return windowed;
  }

  const seen = new Set<string>();
  const deduped: UserEventRow[] = [];
  for (const event of windowed) {
    const distinctValue = getPathValue(event.metadata, counter.distinctBy);
    if (distinctValue == null) {
      deduped.push(event);
      continue;
    }
    if (
      typeof distinctValue !== 'string' &&
      typeof distinctValue !== 'number' &&
      typeof distinctValue !== 'boolean'
    ) {
      deduped.push(event);
      continue;
    }
    const key = String(distinctValue);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(event);
  }
  return deduped;
}

export function isWithinWindow(
  createdAt: Date,
  evaluationAt: Date,
  window?: RuleWindow,
): boolean {
  if (!window || window.type === 'lifetime') {
    return true;
  }
  const offsetDays = window.offsetDays ?? 0;
  const windowEnd = new Date(evaluationAt);
  windowEnd.setDate(windowEnd.getDate() - offsetDays);
  const windowStart = new Date(windowEnd);
  windowStart.setDate(windowStart.getDate() - (window.days ?? 7));
  return createdAt >= windowStart && createdAt <= windowEnd;
}

export function getPathValue(value: Prisma.JsonValue, path: string): unknown {
  const normalizedPath = path.startsWith('metadata.')
    ? path.slice('metadata.'.length)
    : path;
  const parts = normalizedPath.split('.');
  let current: unknown = value;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

export function evaluateExpression(
  expression: string,
  context: Record<string, number>,
): unknown {
  assertSafeExpression(expression);
  const scope = {
    ...context,
    min: Math.min,
    max: Math.max,
    clamp: (value: number, lower: number, upper: number): number =>
      Math.min(Math.max(value, lower), upper),
  } as const;
  return runInNewContext(
    `'use strict'; (${expression});`,
    { ...scope },
    { timeout: 50 },
  );
}

export function assertSafeExpression(expression: string): void {
  if (!/^[0-9A-Za-z_\s().,+\-*/%<>=!&|?:]+$/.test(expression)) {
    throw new Error(`Unsafe rule expression rejected: ${expression}`);
  }
}

export function normalizeProgress(value: unknown): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  const scaled = numeric <= 1 ? numeric * 100 : numeric;
  return Math.max(0, Math.min(100, scaled));
}

export function asBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value > 0;
  }
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }
  return Boolean(value);
}
