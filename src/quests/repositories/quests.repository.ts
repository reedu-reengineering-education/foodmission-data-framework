import { Injectable } from '@nestjs/common';
import { ChallengeScope, Prisma, ProgressTrackingType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

export interface CreateQuestData {
  slug: string;
  missionId: string;
  title: string;
  description: string;
  topicSlug?: string;
  sortOrder: number;
  available: boolean;
  streakEnabled: boolean;
  progressTrackingType: ProgressTrackingType;
}

const questInclude = {
  challenges: {
    where: { challengeScope: ChallengeScope.QUEST_ONE_TIME },
    orderBy: { startDate: 'asc' as const },
  },
} satisfies Prisma.QuestInclude;

@Injectable()
export class QuestsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateQuestData) {
    const allUsers = await this.prisma.user.findMany({ select: { id: true } });

    return this.prisma.quest.create({
      data: {
        slug: data.slug,
        missionId: data.missionId,
        title: data.title,
        description: data.description,
        topicSlug: data.topicSlug,
        sortOrder: data.sortOrder,
        available: data.available,
        streakEnabled: data.streakEnabled,
        progressTrackingType: data.progressTrackingType,
        questProgresses: {
          create: allUsers.map((user) => ({
            userId: user.id,
            progress: 0,
            completed: false,
            currentStreak: 0,
            longestStreak: 0,
          })),
        },
      },
      include: questInclude,
    });
  }

  async findById(id: string) {
    return this.prisma.quest.findUnique({
      where: { id },
      include: questInclude,
    });
  }

  async findByMissionId(missionId: string) {
    return this.prisma.quest.findMany({
      where: { missionId },
      orderBy: { sortOrder: 'asc' },
      include: questInclude,
    });
  }

  async findAll() {
    return this.prisma.quest.findMany({
      orderBy: [{ missionId: 'asc' }, { sortOrder: 'asc' }],
      include: questInclude,
    });
  }

  async update(id: string, data: { available?: boolean }) {
    return this.prisma.quest.update({
      where: { id },
      data,
      include: questInclude,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.quest.delete({ where: { id } });
  }
}
