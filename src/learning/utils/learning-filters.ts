import { Prisma } from '@prisma/client';
import { LearningContentFiltersDto } from '../dto/learning-list-query.dto';

export function buildFoodFactWhere(
  filters: LearningContentFiltersDto,
): Prisma.FoodFactWhereInput {
  const where: Prisma.FoodFactWhereInput = { available: true };

  if (filters.level !== undefined) where.level = filters.level;
  if (filters.health !== undefined) where.health = filters.health;
  if (filters.foodChoice !== undefined) where.foodChoice = filters.foodChoice;
  if (filters.foodWaste !== undefined) where.foodWaste = filters.foodWaste;
  if (filters.search) {
    where.body = { contains: filters.search, mode: 'insensitive' };
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
): Prisma.QuizWhereInput {
  const where: Prisma.QuizWhereInput = { available: true };

  if (filters.level !== undefined) where.level = filters.level;
  if (filters.health !== undefined) where.health = filters.health;
  if (filters.foodChoice !== undefined) where.foodChoice = filters.foodChoice;
  if (filters.foodWaste !== undefined) where.foodWaste = filters.foodWaste;
  if (filters.search) {
    where.question = { contains: filters.search, mode: 'insensitive' };
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
      OR: [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { body: { contains: filters.search, mode: 'insensitive' } },
      ],
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
