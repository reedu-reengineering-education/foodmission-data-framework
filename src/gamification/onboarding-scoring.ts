import { ContentLevel, UserSegment } from '@prisma/client';
import {
  DIMENSION_SCORING,
  inferDimensionLevel,
} from './dimension-levels.config';
import { OnboardingSurveyUser } from './onboarding.utils';

/** 0 = most sustainable tier, 2 = least sustainable tier. */
const LEVEL_RANK: Record<ContentLevel, number> = {
  [ContentLevel.ADVANCED]: 0,
  [ContentLevel.INTERMEDIATE]: 1,
  [ContentLevel.BEGINNER]: 2,
};
const RANK_SEGMENT: readonly UserSegment[] = [
  UserSegment.ADVANCED,
  UserSegment.INTERMEDIATE,
  UserSegment.BEGINNER,
];

/** Rounds the average rank to the nearest tier (ties round up to the middle/worse tier). */
export function rankToSegment(averageRank: number): UserSegment {
  const rounded = Math.min(2, Math.max(0, Math.round(averageRank)));
  return RANK_SEGMENT[rounded];
}

/**
 * Derives the profile/segment a user's onboarding survey answers point to:
 * the average of all dimension starting levels (see
 * dimension-levels.config.ts). Skipped questions score 0, so with no answer
 * at all the user is BEGINNER. Used both to persist the segment on
 * submitSurvey() and to keep seed data internally consistent (seeded users'
 * segment matches their answers).
 */
export function deriveUserSegment(answers: OnboardingSurveyUser): UserSegment {
  const ranks = Object.keys(DIMENSION_SCORING).map(
    (code) => LEVEL_RANK[inferDimensionLevel(code, answers)],
  );
  return rankToSegment(
    ranks.reduce((sum, rank) => sum + rank, 0) / ranks.length,
  );
}
