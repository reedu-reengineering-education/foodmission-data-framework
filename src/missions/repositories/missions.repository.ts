import { Injectable } from '@nestjs/common';
import { ContentLevel } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

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
      include: { missionProgresses: true },
    });
  }

  async findAll() {
    return this.prisma.mission.findMany({
      include: { missionProgresses: true },
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
      include: { missionProgresses: true },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.mission.delete({
      where: { id },
    });
  }
}
