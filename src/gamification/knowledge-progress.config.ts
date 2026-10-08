import { ProgressIndicatorKind } from '@prisma/client';
import { KnowledgeFlags } from './content-completion';

/**
 * The three knowledge bars and the content tag each one counts. A bar is
 * the share of tagged items finished across every available quest, all
 * dimensions and levels together. The total is the same for every user and
 * level, so a bar only grows as items get finished.
 */
export const KNOWLEDGE_KIND_FLAG = {
  [ProgressIndicatorKind.HEALTH]: 'health',
  [ProgressIndicatorKind.FOOD_CHOICES]: 'foodChoice',
  [ProgressIndicatorKind.FOOD_AND_WASTE]: 'foodWaste',
} as const satisfies Partial<
  Record<ProgressIndicatorKind, keyof KnowledgeFlags>
>;

export type KnowledgeKind = keyof typeof KNOWLEDGE_KIND_FLAG;

export const KNOWLEDGE_KINDS = Object.keys(
  KNOWLEDGE_KIND_FLAG,
) as KnowledgeKind[];
