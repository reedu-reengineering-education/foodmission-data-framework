import { Injectable } from '@nestjs/common';
import { ProgressStatus } from '../../common/progress-status';
import { PrismaService } from '../../database/prisma.service';
import { codeOrIdWhere } from '../../learning/utils/code-or-id';
import { UpdateChallengeProgressDto } from '../dto/update-challenge-progress.dto';
import { pageLimitToSkipTake } from '../../common/utils/pagination';

@Injectable()
export class ChallengeProgressRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findChallengeByCodeOrId(codeOrId: string) {
    return this.prisma.challenge.findFirst({
      where: codeOrIdWhere(codeOrId),
      include: { reward: { select: { id: true, xp: true, points: true } } },
    });
  }

  async findByUserIdAndChallengeId(userId: string, challengeId: string) {
    return this.prisma.challengeProgress.findUnique({
      where: { userId_challengeId: { userId, challengeId } },
      include: { challenge: true },
    });
  }

  async findAllByUserId(userId: string) {
    return this.prisma.challengeProgress.findMany({
      where: { userId },
      include: { challenge: true },
    });
  }

  async findAllPaginated(page = 1, limit = 10) {
    const { skip, take } = pageLimitToSkipTake({ page, limit });
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.challengeProgress.findMany({
        skip,
        take,
        include: { challenge: true },
        orderBy: [{ userId: 'asc' }, { challengeId: 'asc' }],
      }),
      this.prisma.challengeProgress.count(),
    ]);
    return { rows, total, page, limit };
  }

  async upsert(
    userId: string,
    challengeId: string,
    updateDto: UpdateChallengeProgressDto,
  ) {
    const progress = updateDto.progress ?? 0;
    const completed = updateDto.completed ?? false;
    const status = completed
      ? ProgressStatus.COMPLETED
      : progress > 0
        ? ProgressStatus.IN_PROGRESS
        : ProgressStatus.NOT_STARTED;

    return this.prisma.challengeProgress.upsert({
      where: { userId_challengeId: { userId, challengeId } },
      create: {
        userId,
        challengeId,
        progress,
        completed,
        status,
        state: { source: 'manual', mode: 'api' },
        startedAt: status === ProgressStatus.NOT_STARTED ? null : new Date(),
      },
      update: {
        ...(updateDto.progress !== undefined
          ? { progress: updateDto.progress }
          : {}),
        ...(updateDto.completed !== undefined
          ? { completed: updateDto.completed }
          : {}),
        status,
        state: { source: 'manual', mode: 'api' },
      },
      include: { challenge: true },
    });
  }
}
