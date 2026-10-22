import { Injectable } from '@nestjs/common';
import { ContentLevel, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { codeOrIdWhere } from '../../learning/utils/code-or-id';

export interface CreateMissionData {
  code: string;
  dimensionId: string;
  topicId?: string;
  level: ContentLevel;
  title: string;
  duration: string;
  goal: string;
  whyItMatters: string;
  health?: boolean;
  foodChoice?: boolean;
  foodWaste?: boolean;
  available: boolean;
}

export interface UpdateMissionData {
  code?: string;
  dimensionId?: string;
  topicId?: string | null;
  level?: ContentLevel;
  title?: string;
  duration?: string;
  goal?: string;
  whyItMatters?: string;
  health?: boolean;
  foodChoice?: boolean;
  foodWaste?: boolean;
  available?: boolean;
}

export interface MissionListFilters {
  dimensionCode?: string;
  level?: ContentLevel;
  available?: boolean;
  /** When set, only this user's progress rows are included on each mission. */
  progressUserId?: string;
}

@Injectable()
export class MissionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateMissionData) {
    return this.prisma.mission.create({
      data: {
        code: data.code,
        dimensionId: data.dimensionId,
        topicId: data.topicId,
        level: data.level,
        title: data.title,
        duration: data.duration,
        goal: data.goal,
        whyItMatters: data.whyItMatters,
        health: data.health ?? false,
        foodChoice: data.foodChoice ?? false,
        foodWaste: data.foodWaste ?? false,
        available: data.available,
      },
    });
  }

  async findById(id: string) {
    return this.prisma.mission.findUnique({
      where: { id },
    });
  }

  async findByCodeOrId(codeOrId: string) {
    return this.prisma.mission.findFirst({
      where: codeOrIdWhere(codeOrId),
    });
  }

  async findAll(filters: MissionListFilters = {}) {
    const where: Prisma.MissionWhereInput = {};
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
          missionProgresses: {
            where: { userId: filters.progressUserId },
          },
        }
      : {};

    return this.prisma.mission.findMany({
      where,
      include: progressInclude,
      orderBy: { code: 'asc' },
    });
  }

  async update(id: string, data: UpdateMissionData) {
    return this.prisma.mission.update({
      where: { id },
      data: {
        code: data.code,
        dimensionId: data.dimensionId,
        topicId: data.topicId,
        level: data.level,
        title: data.title,
        duration: data.duration,
        goal: data.goal,
        whyItMatters: data.whyItMatters,
        health: data.health,
        foodChoice: data.foodChoice,
        foodWaste: data.foodWaste,
        available: data.available,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.mission.delete({
      where: { id },
    });
  }
}
