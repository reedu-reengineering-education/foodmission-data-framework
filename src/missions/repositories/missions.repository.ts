import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface CreateMissionData {
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

@Injectable()
export class MissionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateMissionData) {
    const allUsers = await this.prisma.user.findMany({ select: { id: true } });

    return this.prisma.missions.create({
      data: {
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
    return this.prisma.missions.findUnique({
      where: { id },
      include: { missionProgresses: true },
    });
  }

  async findAll() {
    return this.prisma.missions.findMany({
      include: { missionProgresses: true },
    });
  }

  async update(id: string, data: UpdateMissionData) {
    return this.prisma.missions.update({
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
    await this.prisma.missions.delete({
      where: { id },
    });
  }
}
