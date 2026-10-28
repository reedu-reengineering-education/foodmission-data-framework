import { Prisma } from '@prisma/client';
import {
  LearningContentFiltersDto,
  UserFoodFactListQueryDto,
} from '../dto/learning-list-query.dto';
import { textSearchConditions } from '../../common/utils/text-search.util';

/** Text fields searched per content type, in English and in translation. */
export const LEARNING_SEARCH_FIELDS = {
  FoodFact: ['title', 'body'],
  Quiz: ['title', 'question'],
  MicroLearning: ['title', 'body'],
} as const;

export function buildUserFoodFactWhere(
  filters: UserFoodFactListQueryDto,
  userId: string,
  translatedIds: string[] = [],
): Prisma.FoodFactWhereInput {
  const where = buildFoodFactWhere(filters, translatedIds);
  if (filters.completed !== undefined) {
    where.progress = filters.completed
      ? { some: { userId } }
      : { none: { userId } };
  }
  return where;
}

export function buildFoodFactWhere(
  filters: LearningContentFiltersDto,
  translatedIds: string[] = [],
): Prisma.FoodFactWhereInput {
  const where: Prisma.FoodFactWhereInput = { available: true };

  if (filters.level !== undefined) where.level = filters.level;
  if (filters.health !== undefined) where.health = filters.health;
  if (filters.foodChoice !== undefined) where.foodChoice = filters.foodChoice;
  if (filters.foodWaste !== undefined) where.foodWaste = filters.foodWaste;
  if (filters.search) {
    where.OR = textSearchConditions<Prisma.FoodFactWhereInput>(
      filters.search,
      LEARNING_SEARCH_FIELDS.FoodFact,
      translatedIds,
    );
  }

  if (filters.topicCode || filters.dimensionCode) {
    where.topic = {
      ...(filters.topicCode ? { code: filters.topicCode } : {}),
      ...(filters.dimensionCode
        ? { dimension: { code: filters.dimensionCode } }
        : {}),
    };
  }

  return where;
}

export function buildQuizWhere(
  filters: LearningContentFiltersDto,
  translatedIds: string[] = [],
): Prisma.QuizWhereInput {
  const where: Prisma.QuizWhereInput = { available: true };

  if (filters.level !== undefined) where.level = filters.level;
  if (filters.health !== undefined) where.health = filters.health;
  if (filters.foodChoice !== undefined) where.foodChoice = filters.foodChoice;
  if (filters.foodWaste !== undefined) where.foodWaste = filters.foodWaste;
  if (filters.search) {
    where.OR = textSearchConditions<Prisma.QuizWhereInput>(
      filters.search,
      LEARNING_SEARCH_FIELDS.Quiz,
      translatedIds,
    );
  }

  if (filters.topicCode || filters.dimensionCode) {
    where.topic = {
      ...(filters.topicCode ? { code: filters.topicCode } : {}),
      ...(filters.dimensionCode
        ? { dimension: { code: filters.dimensionCode } }
        : {}),
    };
  }

  return where;
}

export function buildMicroLearningWhere(
  filters: LearningContentFiltersDto,
  translatedIds: string[] = [],
): Prisma.MicroLearningWhereInput {
  const and: Prisma.MicroLearningWhereInput[] = [{ available: true }];

  if (filters.level !== undefined) and.push({ level: filters.level });
  if (filters.health !== undefined) and.push({ health: filters.health });
  if (filters.foodChoice !== undefined) {
    and.push({ foodChoice: filters.foodChoice });
  }
  if (filters.foodWaste !== undefined) {
    and.push({ foodWaste: filters.foodWaste });
  }
  if (filters.search) {
    and.push({
      OR: textSearchConditions<Prisma.MicroLearningWhereInput>(
        filters.search,
        LEARNING_SEARCH_FIELDS.MicroLearning,
        translatedIds,
      ),
    });
  }
  if (filters.topicCode) {
    and.push({ topic: { code: filters.topicCode } });
  }
  if (filters.dimensionCode) {
    and.push({
      OR: [
        { dimension: { code: filters.dimensionCode } },
        { topic: { dimension: { code: filters.dimensionCode } } },
      ],
    });
  }

  return { AND: and };
}
