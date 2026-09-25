import Joi from 'joi';
import { EventType } from '../../src/events/event-types';

const RULE_SHAPES = [
  'undecided',
  'count_at_least',
  'one_shot_event',
  'bounded_max_with_fail',
  'ratio_majority',
  'composite_threshold',
] as const;

const WINDOW_TYPES = ['since_start', 'rolling_lookback'] as const;
const RESOLVE_AT = ['immediate', 'window_end'] as const;

const EVENT_TYPE_VALUES = Object.values(EventType);

const counterSchema = Joi.object({
  event: Joi.string().valid(...EVENT_TYPE_VALUES),
  anyOf: Joi.array()
    .items(Joi.string().valid(...EVENT_TYPE_VALUES))
    .min(1),
  distinctBy: Joi.string().min(1).max(128),
})
  .xor('event', 'anyOf')
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
}).required();

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

export type RuleShape = (typeof RULE_SHAPES)[number];
