import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UpdateQuestProgressDto } from '../dto/update-quest-progress.dto';

@Injectable()
export class QuestProgressRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserIdAndQuestId(userId: string, questId: string) {
    return this.prisma.questProgress.findUnique({
      where: { userId_questId: { userId, questId } },
      include: { quest: true },
    });
  }

  async findAllByUserId(userId: string) {
    return this.prisma.questProgress.findMany({
      where: { userId },
      include: { quest: true },
    });
  }

  async update(userId: string, questId: string, updateDto: UpdateQuestProgressDto) {
    return this.prisma.questProgress.update({
      where: { userId_questId: { userId, questId } },
      data: {
        ...updateDto,
        lastActionAt: new Date(),
      },
      include: { quest: true },
    });
  }
}
