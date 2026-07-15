import { Injectable } from '@nestjs/common';
import { ChallengeScope, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

export interface CreateMissionData {
  slug: string;
  title: string;
  description: string;
  available: boolean;
  startDate: Date;
  endDate: Date;
}

export interface UpdateMissionData {
  title?: string;
  description?: string;
  available?: boolean;
  startDate?: Date;
  endDate?: Date;
}

const missionDetailInclude = {
  missionProgresses: true,
  quests: {
    orderBy: { sortOrder: 'asc' as const },
    include: {
      challenges: {
        where: { challengeScope: ChallengeScope.QUEST_ONE_TIME },
        orderBy: { startDate: 'asc' as const },
      },
    },
  },
} satisfies Prisma.MissionInclude;

@Injectable()
export class MissionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateMissionData) {
    const allUsers = await this.prisma.user.findMany({ select: { id: true } });

    return this.prisma.mission.create({
      data: {
        slug: data.slug,
        title: data.title,
        description: data.description,
        available: data.available,
        startDate: data.startDate,
        endDate: data.endDate,
        missionProgresses: {
          create: allUsers.map((user) => ({
            userId: user.id,
            progress: 0,
            completed: false,
          })),
        },
      },
      include: { missionProgresses: true },
    });
  }

  async findById(id: string) {
    return this.prisma.mission.findUnique({
      where: { id },
      include: missionDetailInclude,
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
        title: data.title,
        description: data.description,
        available: data.available,
        startDate: data.startDate,
        endDate: data.endDate,
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
