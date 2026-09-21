import Joi from 'joi';
import { EventType } from '../events/event-types';
import { RULE_SHAPES, RuleShape } from '../rules/rule-schema';
import { RuleDefinition } from '../rules/rule-evaluator';

/**
 * Schema for prisma/seeds/data/rules/badges.rules.yml.
 *
 * Deliberately a separate document from the mission/challenge draft, not a
 * third top-level key in it:
 *
 * - badge windows are `lifetime`, which that schema rejects on purpose (its
 *   evaluator bounds one event query by the widest window it finds);
 * - badge codes are names, not the `M.A1.1` grid;
 * - badges are account-wide, so they are evaluated on events the quest-scoped
 *   evaluator ignores outright (MISSION_COMPLETED, QUEST_COMPLETED).
 *
 * The *rule body* is the same dialect, read by the same evaluator.
 */

export interface BadgeRuleEntry {
  /** Matches `Badge.ruleCode`. */
  code: string;
  shape: RuleShape;
  rule: RuleDefinition;
}

export interface BadgeRulesDoc {
  schemaVersion: number;
  status: 'draft' | 'ready';
  purpose: string;
  badges: BadgeRuleEntry[];
}

const EVENT_TYPE_VALUES = Object.values(EventType);

/** Badge rules may also use `lifetime`, which needs no `days`. */
const windowSchema = Joi.alternatives()
  .try(
    Joi.object({
      type: Joi.string().valid('lifetime').required(),
    }),
    Joi.object({
      type: Joi.string().valid('since_start', 'rolling_lookback').required(),
      days: Joi.number().integer().positive().required(),
      offsetDays: Joi.number().integer().min(0),
    }),
  )
  .required();

const counterSchema = Joi.object({
  event: Joi.string().valid(...EVENT_TYPE_VALUES),
  anyOf: Joi.array()
    .items(Joi.string().valid(...EVENT_TYPE_VALUES))
    .min(1),
  distinctBy: Joi.string().min(1).max(128),
  where: Joi.object()
    .pattern(
      Joi.string().min(1).max(128),
      Joi.alternatives().try(
        Joi.string().min(1).max(256),
        Joi.number(),
        Joi.boolean(),
      ),
    )
    .min(1),
  window: windowSchema.optional(),
})
  .xor('event', 'anyOf')
  .required();

const ruleSchema = Joi.object({
  window: windowSchema,
  counters: Joi.object()
    .pattern(Joi.string().min(1), counterSchema)
    .min(1)
    .required(),
  target: Joi.string().min(1).required(),
  progress: Joi.string().min(1).required(),
  notes: Joi.array().items(Joi.string().min(1)).default([]),
}).required();

const badgeEntrySchema = Joi.object({
  // SCREAMING_SNAKE, the same spelling as the seeded Badge.code.
  code: Joi.string()
    .pattern(/^[A-Z][A-Z0-9_]{2,63}$/)
    .required(),
  shape: Joi.string()
    .valid(...RULE_SHAPES)
    // A badge with no rule is simply left out of this file, so unlike the
    // mission draft there is no `undecided` placeholder to allow.
    .invalid('undecided')
    .required(),
  rule: ruleSchema,
}).required();

export const badgeRulesSchema = Joi.object({
  schemaVersion: Joi.number().valid(1).required(),
  status: Joi.string().valid('draft', 'ready').required(),
  purpose: Joi.string().min(1).required(),
  badges: Joi.array().items(badgeEntrySchema).min(1).required(),
}).required();
