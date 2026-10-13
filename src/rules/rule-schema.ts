import Joi from 'joi';
import { EventType } from '../events/event-types';

// The rule vocabulary and its evaluator live in rule-evaluator.ts, shared with
// badge rules. This file is only the schema for the mission/challenge draft.
import {
  findUnknownIdentifiers,
  type RuleCounter,
  type RuleDefinition,
  type RuleWindow,
  type WindowType,
} from './rule-evaluator';

export type { RuleCounter, RuleDefinition, RuleWindow, WindowType };

export const RULE_SHAPES = [
  'undecided',
  'count_at_least',
  'one_shot_event',
  'bounded_max_with_fail',
  'ratio_majority',
  'composite_threshold',
] as const;

/**
 * `lifetime` is deliberately absent: RulesService bounds its event query by the
 * widest window in this document, so an unbounded rule here would make every
 * evaluation scan the user's whole ledger. Badge rules, which are evaluated
 * separately and account-wide, do allow it.
 */
export const WINDOW_TYPES = ['since_start', 'rolling_lookback'] as const;
/**
 * Counters may also look at the week before the item started (`before_start`),
 * e.g. "one fewer meat meal than your previous week". Not a rule window: a
 * rule's own window is what it is scored and deadlined over.
 */
export const COUNTER_WINDOW_TYPES = [...WINDOW_TYPES, 'before_start'] as const;
export const RESOLVE_AT = ['immediate', 'window_end'] as const;

export type RuleShape = (typeof RULE_SHAPES)[number];

export interface RuleEntry {
  code: string;
  shape: RuleShape;
  rule?: RuleDefinition;
}

export interface RulesCoverageDoc {
  schemaVersion: number;
  status: 'draft' | 'ready';
  purpose: string;
  ruleTemplate: RuleDefinition;
  missions: RuleEntry[];
  challenges: RuleEntry[];
}

const EVENT_TYPE_VALUES = Object.values(EventType);

/** Joi `custom` hook: a formula may only name its own counters and builtins. */
export function rejectUnknownIdentifiers(rule: RuleDefinition): RuleDefinition {
  const unknown = findUnknownIdentifiers(rule);
  if (unknown.length > 0) {
    throw new Error(`expression names unknown counters: ${unknown.join(', ')}`);
  }
  return rule;
}

const whereValueSchema = Joi.alternatives().try(
  Joi.string().min(1).max(256),
  Joi.number(),
  Joi.boolean(),
);

/** Metadata constraints; an array value means "any of these". */
export const whereSchema = Joi.object()
  .pattern(
    Joi.string().min(1).max(128),
    Joi.alternatives().try(
      whereValueSchema,
      Joi.array().items(whereValueSchema).min(1),
    ),
  )
  .min(1);

/** See RuleGroupBy in rule-evaluator.ts. */
export const groupBySchema = Joi.object({
  key: Joi.string().min(1).max(128).required(),
  minDistinct: Joi.number().integer().min(1).required(),
  of: Joi.string().min(1).max(128),
  values: Joi.array().items(Joi.string().min(1).max(64)).min(1),
  require: Joi.array()
    .items(Joi.string().valid(...EVENT_TYPE_VALUES))
    .min(1),
})
  // `require` names event types; `of` counts metadata values instead.
  .oxor('of', 'require')
  // An allow-list only filters metadata values.
  .with('values', 'of');

/**
 * Joi `custom` hook for a counter: `groupBy.require` may only name event
 * types the counter matches, or no bucket could ever qualify.
 */
export function rejectUnmatchedRequire(counter: RuleCounter): RuleCounter {
  const matched = new Set(counter.event ? [counter.event] : counter.anyOf);
  const unmatched = (counter.groupBy?.require ?? []).filter(
    (type) => !matched.has(type),
  );
  if (unmatched.length > 0) {
    throw new Error(
      `groupBy.require names events the counter does not match: ${unmatched.join(', ')}`,
    );
  }
  return counter;
}

const counterSchema = Joi.object({
  event: Joi.string().valid(...EVENT_TYPE_VALUES),
  anyOf: Joi.array()
    .items(Joi.string().valid(...EVENT_TYPE_VALUES))
    .min(1),
  distinctBy: Joi.string().min(1).max(128),
  groupBy: groupBySchema,
  where: whereSchema,
  window: Joi.object({
    type: Joi.string()
      .valid(...COUNTER_WINDOW_TYPES)
      .required(),
    days: Joi.number().integer().positive().required(),
    offsetDays: Joi.number().integer().min(0),
  }),
})
  .xor('event', 'anyOf')
  .oxor('distinctBy', 'groupBy')
  .custom(rejectUnmatchedRequire)
  .required();

const ruleSchema = Joi.object({
  window: Joi.object({
    type: Joi.string()
      .valid(...WINDOW_TYPES)
      .required(),
    days: Joi.number().integer().positive().required(),
  }).required(),
  counters: Joi.object().pattern(Joi.string().min(1), counterSchema).required(),
  target: Joi.string().min(1).required(),
  progress: Joi.string().min(1).required(),
  fail: Joi.string().min(1),
  resolveAt: Joi.string().valid(...RESOLVE_AT),
  notes: Joi.array().items(Joi.string().min(1)).default([]),
})
  .custom(rejectUnknownIdentifiers)
  .required();

const missionEntrySchema = Joi.object({
  code: Joi.string()
    .pattern(/^M\.[A-Z][1-6]\.[1-5]$/)
    .required(),
  shape: Joi.string()
    .valid(...RULE_SHAPES)
    .required(),
  rule: ruleSchema.optional(),
})
  .custom((value, helpers) => {
    if (value.shape !== 'undecided' && !value.rule) {
      return helpers.error('any.custom', {
        message: 'rule is required when shape is not undecided',
      });
    }
    return value;
  })
  .required();

const challengeEntrySchema = Joi.object({
  code: Joi.string()
    .pattern(/^CH\.[A-Z][1-6]\.[1-5]$/)
    .required(),
  shape: Joi.string()
    .valid(...RULE_SHAPES)
    .required(),
  rule: ruleSchema.optional(),
})
  .custom((value, helpers) => {
    if (value.shape !== 'undecided' && !value.rule) {
      return helpers.error('any.custom', {
        message: 'rule is required when shape is not undecided',
      });
    }
    return value;
  })
  .required();

export const rulesCoverageSchema = Joi.object({
  schemaVersion: Joi.number().valid(1).required(),
  status: Joi.string().valid('draft', 'ready').required(),
  purpose: Joi.string().min(1).required(),
  ruleTemplate: Joi.object({
    window: Joi.object({
      type: Joi.string()
        .valid(...WINDOW_TYPES)
        .required(),
      days: Joi.number().integer().positive().required(),
    }).required(),
    counters: Joi.object().required(),
    target: Joi.string().min(1).required(),
    progress: Joi.string().min(1).required(),
    notes: Joi.array().items(Joi.string().min(1)).required(),
  }).required(),
  missions: Joi.array().items(missionEntrySchema).min(1).required(),
  challenges: Joi.array().items(challengeEntrySchema).min(1).required(),
}).required();
