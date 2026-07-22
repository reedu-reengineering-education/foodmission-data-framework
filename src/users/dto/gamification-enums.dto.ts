/**
 * Re-export Prisma enums for DTO validation and OpenAPI.
 * Source of truth: prisma/models/users.prisma and gamification.prisma
 */
export {
  WeeklyMeatRange,
  WeeklyBeefFrequency,
  WeeklyFoodWasteRange,
  WeeklyUpfRange,
  WeeklyReusableRange,
  UserSegment,
  Motivation,
  ProgressIndicatorKind,
  ProgressPrecision,
} from '@prisma/client';
