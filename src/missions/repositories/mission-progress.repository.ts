import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UpdateMissionProgressDto } from '../dto/update-mission-progress.dto';

@Injectable()
export class MissionProgressRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMissionById(missionId: string) {
    return this.prisma.mission.findUnique({
      where: { id: missionId },
      select: { id: true, title: true },
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
