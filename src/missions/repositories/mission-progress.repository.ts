import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ProgressStatus } from '../../common/progress-status';
import { PrismaService } from '../../database/prisma.service';
import { codeOrIdWhere } from '../../learning/utils/code-or-id';
import { UpdateMissionProgressDto } from '../dto/update-mission-progress.dto';
import { pageLimitToSkipTake } from '../../common/utils/pagination';
import { isInCurrentQuest } from '../../quests/current-quest-membership';

@Injectable()
export class MissionProgressRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMissionByCodeOrId(codeOrId: string) {
    return this.prisma.mission.findFirst({
      where: codeOrIdWhere(codeOrId),
      select: {
        id: true,
        code: true,
        title: true,
        reward: { select: { id: true, xp: true, points: true } },
      },
    });
  }

  async findByUserIdAndMissionId(userId: string, missionId: string) {
    return this.prisma.missionProgress.findUnique({
      where: { userId_missionId: { userId, missionId } },
      include: { mission: true },
    });
  }

  async findAllByUserId(userId: string) {
    return this.prisma.missionProgress.findMany({
      where: { userId },
      include: { mission: true },
    });
  }

  async findAllPaginated(page = 1, limit = 10) {
    const { skip, take } = pageLimitToSkipTake({ page, limit });
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.missionProgress.findMany({
        skip,
        take,
        include: { mission: true },
        orderBy: [{ userId: 'asc' }, { missionId: 'asc' }],
      }),
      this.prisma.missionProgress.count(),
    ]);
    return { rows, total, page, limit };
  }

  async upsert(
    userId: string,
    missionId: string,
    updateDto: UpdateMissionProgressDto,
  ) {
    const failed = updateDto.failed === true;
    const progress = updateDto.progress ?? 0;
    const completed = !failed && (updateDto.completed ?? false);
    // A mission with a progress row has been started, so it is IN_PROGRESS
    // until it resolves, even at progress 0.
    const status = failed
      ? ProgressStatus.FAILED
      : completed
        ? ProgressStatus.COMPLETED
        : ProgressStatus.IN_PROGRESS;

    // Creating the progress row is starting the mission, even at progress 0
    // (clients start it that way), so it always gets a start time.
    return this.prisma.missionProgress.upsert({
      where: { userId_missionId: { userId, missionId } },
      create: {
        userId,
        missionId,
        progress,
        completed,
        status,
        state: { source: 'manual', mode: 'api' },
        startedAt: new Date(),
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
      include: { mission: true },
    });
  }

  async isInCurrentQuest(userId: string, missionCode: string) {
    return isInCurrentQuest(this.prisma, userId, 'MISSION', missionCode);
  }

  /**
   * Starts the mission: creates its progress row at 0 with a start time,
   * which opens its rule window. Leaves an existing row untouched, so a
   * concurrent second start is a no-op. Returns the row and whether this call
   * created it. `inputs` are the numbers the user set (rule inputs).
   */
  async start(
    userId: string,
    missionId: string,
    inputs?: Record<string, number> | null,
  ) {
    const { count } = await this.prisma.missionProgress.createMany({
      data: [
        {
          userId,
          missionId,
          progress: 0,
          completed: false,
          status: ProgressStatus.IN_PROGRESS,
          state: { source: 'manual', mode: 'start' },
          startedAt: new Date(),
          inputs: inputs ?? Prisma.DbNull,
        },
      ],
      skipDuplicates: true,
    });
    const row = await this.prisma.missionProgress.findUniqueOrThrow({
      where: { userId_missionId: { userId, missionId } },
      include: { mission: true },
    });
    return { row, created: count > 0 };
  }

  /**
   * Resets a mission's progress row for a new attempt: progress 0, not
   * completed, IN_PROGRESS (the attempt has started), a fresh start time, no
   * rule state, and the attempt's own inputs (none unless given).
   */
  async restart(
    userId: string,
    missionId: string,
    inputs?: Record<string, number> | null,
  ) {
    return this.prisma.missionProgress.update({
      where: { userId_missionId: { userId, missionId } },
      data: {
        progress: 0,
        completed: false,
        status: ProgressStatus.IN_PROGRESS,
        startedAt: new Date(),
        state: { source: 'manual', mode: 'restart' },
        inputs: inputs ?? Prisma.DbNull,
        ruleHash: null,
        evaluatedAt: null,
      },
      include: { mission: true },
    });
  }
}
