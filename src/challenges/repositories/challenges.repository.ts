import { Injectable } from '@nestjs/common';
import { ContentLevel, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateChallengeDto } from '../dto/create-challenge.dto';
import { UpdateChallengeDto } from '../dto/update-challenge.dto';
import { codeOrIdWhere } from '../../learning/utils/code-or-id';

function resolveTagFlags(input: {
  tags?: string[];
  health?: boolean;
  foodChoice?: boolean;
  foodWaste?: boolean;
}): { health: boolean; foodChoice: boolean; foodWaste: boolean } {
  const tags = (input.tags ?? []).map((t) => t.toUpperCase());
  return {
    health: input.health ?? tags.includes('HEALTH'),
    foodChoice: input.foodChoice ?? tags.includes('FOOD_CHOICE'),
    foodWaste:
      input.foodWaste ??
      (tags.includes('FOOD_AND_WASTE') || tags.includes('FOOD_WASTE')),
  };
}

export interface CreateChallengeData {
  code: string;
  dimensionId: string;
  topicId?: string;
  level: ContentLevel;
  title: string;
  task: string;
  whyItMatters: string;
  tags?: string[];
  health?: boolean;
  foodChoice?: boolean;
  foodWaste?: boolean;
  available: boolean;
}

export interface ChallengeListFilters {
  dimensionCode?: string;
  level?: ContentLevel;
  available?: boolean;
  /** When set, only this user's progress rows are included on each challenge. */
  progressUserId?: string;
}

@Injectable()
export class ChallengesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(createChallengeDto: CreateChallengeDto | CreateChallengeData) {
    const flags = resolveTagFlags(createChallengeDto);

    return this.prisma.challenge.create({
      data: {
        code: createChallengeDto.code,
        dimensionId: createChallengeDto.dimensionId,
        topicId: createChallengeDto.topicId,
        level: createChallengeDto.level,
        title: createChallengeDto.title,
        task: createChallengeDto.task,
        whyItMatters: createChallengeDto.whyItMatters,
        ...flags,
        available: createChallengeDto.available,
      },
    });
  }

  async findAll(filters: ChallengeListFilters = {}) {
    const where: Prisma.ChallengeWhereInput = {};
    if (filters.available !== undefined) {
      where.available = filters.available;
    }
    if (filters.level !== undefined) {
      where.level = filters.level;
    }
    if (filters.dimensionCode) {
      where.dimension = { code: filters.dimensionCode };
    }

    const progressInclude = filters.progressUserId
      ? {
          challengeProgresses: {
            where: { userId: filters.progressUserId },
          },
        }
      : {};

    return this.prisma.challenge.findMany({
      where,
      include: progressInclude,
      orderBy: { code: 'asc' },
    });
  }

  async findById(id: string) {
    return this.prisma.challenge.findUnique({
      where: { id },
    });
  }

  async findByCodeOrId(codeOrId: string) {
    return this.prisma.challenge.findFirst({
      where: codeOrIdWhere(codeOrId),
    });
  }

  async update(id: string, updateChallengeDto: UpdateChallengeDto) {
    const { tags, ...rest } = updateChallengeDto as UpdateChallengeDto & {
      tags?: string[];
      health?: boolean;
      foodChoice?: boolean;
      foodWaste?: boolean;
      code?: string;
      dimensionId?: string;
      topicId?: string | null;
      level?: ContentLevel;
      title?: string;
      task?: string;
      whyItMatters?: string;
    };

    const data: Record<string, unknown> = { ...rest };
    if (
      tags !== undefined ||
      rest.health !== undefined ||
      rest.foodChoice !== undefined ||
      rest.foodWaste !== undefined
    ) {
      Object.assign(data, resolveTagFlags({ tags, ...rest }));
    }

    return this.prisma.challenge.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return this.prisma.challenge.delete({ where: { id } });
  }
}
