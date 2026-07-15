import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UpdateChallengeDto } from '../dto/update-challenge.dto';

export interface CreateChallengeData {
  slug: string;
  title: string;
  description: string;
  available: boolean;
  startDate: Date;
  endDate: Date;
}

@Injectable()
export class ChallengesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateChallengeData) {
    const allUsers = await this.prisma.user.findMany({ select: { id: true } });

    return this.prisma.challenge.create({
      data: {
        slug: data.slug,
        title: data.title,
        description: data.description,
        available: data.available,
        startDate: data.startDate,
        endDate: data.endDate,
        challengeProgresses: {
          create: allUsers.map((user) => ({
            userId: user.id,
            progress: 0,
            completed: false,
          })),
        },
      },
      include: { challengeProgresses: true },
    });
  }

  async findAll() {
    return this.prisma.challenge.findMany({
      include: { challengeProgresses: true },
    });
  }

  async findById(id: string) {
    return this.prisma.challenge.findUnique({
      where: { id },
      include: { challengeProgresses: true },
    });
  }

  async update(id: string, updateChallengeDto: UpdateChallengeDto) {
    return this.prisma.challenge.update({
      where: { id },
      data: { ...updateChallengeDto },
    });
  }

  async delete(id: string) {
    return this.prisma.challenge.delete({ where: { id } });
  }
}
