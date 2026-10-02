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
    const failed = updateDto.failed === true;
    const progress = updateDto.progress ?? 0;
    const completed = !failed && (updateDto.completed ?? false);
    const status = failed
      ? ProgressStatus.FAILED
      : completed
        ? ProgressStatus.COMPLETED
        : progress > 0
          ? ProgressStatus.IN_PROGRESS
          : ProgressStatus.NOT_STARTED;

    // Creating the progress row is starting the challenge, even at progress 0
    // (clients start it that way), so it always gets a start time.
    const now = new Date();
    const where = { userId_challengeId: { userId, challengeId } };
    const row = await this.prisma.challengeProgress.upsert({
      where,
      create: {
        userId,
        challengeId,
        progress,
        completed,
        status,
        state: { source: 'manual', mode: 'api' },
        startedAt: now,
      },
      update: {
        ...(updateDto.progress !== undefined
          ? { progress: updateDto.progress }
          : {}),
        ...(failed
          ? { completed: false }
          : updateDto.completed !== undefined
            ? { completed: updateDto.completed }
            : {}),
        status,
        state: { source: 'manual', mode: 'api' },
      },
      include: { challenge: true },
    });

    // Rows created before every start got a timestamp (started at progress 0)
    // get one on their next update.
    if (row.startedAt == null) {
      return this.prisma.challengeProgress.update({
        where,
        data: { startedAt: now },
        include: { challenge: true },
      });
    }
    return row;
  }

  /**
   * Resets a challenge's progress row for a new attempt: progress 0, not
   * completed, NOT_STARTED, a fresh start time and no rule state.
   */
  async restart(userId: string, challengeId: string) {
    return this.prisma.challengeProgress.update({
      where: { userId_challengeId: { userId, challengeId } },
      data: {
        progress: 0,
        completed: false,
        status: ProgressStatus.NOT_STARTED,
        startedAt: new Date(),
        state: { source: 'manual', mode: 'restart' },
        ruleHash: null,
        evaluatedAt: null,
      },
      include: { challenge: true },
    });
  }
}
