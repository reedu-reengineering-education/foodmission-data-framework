import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { codeOrIdWhere } from '../../learning/utils/code-or-id';
import { UpdateMissionProgressDto } from '../dto/update-mission-progress.dto';
import { pageLimitToSkipTake } from '../../common/utils/pagination';

@Injectable()
export class MissionProgressRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMissionByCodeOrId(codeOrId: string) {
    return this.prisma.mission.findFirst({
      where: codeOrIdWhere(codeOrId),
      select: { id: true, code: true, title: true },
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
    const progress = updateDto.progress ?? 0;
    const completed = updateDto.completed ?? false;

    return this.prisma.missionProgress.upsert({
      where: { userId_missionId: { userId, missionId } },
      create: {
        userId,
        missionId,
        progress,
        completed,
      },
      update: {
        ...(updateDto.progress !== undefined
          ? { progress: updateDto.progress }
          : {}),
        ...(updateDto.completed !== undefined
          ? { completed: updateDto.completed }
          : {}),
      },
      include: { mission: true },
    });
  }
}
