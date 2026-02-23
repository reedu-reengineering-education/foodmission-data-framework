import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UpdateMissionProgressDto } from '../dto/update-missionProgress.dto';

@Injectable()
export class MissionProgressRepository {
  constructor(private readonly prisma: PrismaService) {}

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

  async update(
    userId: string,
    missionId: string,
    updateDto: UpdateMissionProgressDto,
  ) {
    return this.prisma.missionProgress.update({
      where: { userId_missionId: { userId, missionId } },
      data: { ...updateDto },
      include: { mission: true },
    });
  }
}