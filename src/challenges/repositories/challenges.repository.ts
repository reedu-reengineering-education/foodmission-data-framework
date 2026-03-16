import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateChallengesDto } from '../dto/create-challenges.dto';
import { UpdateChallengesDto } from '../dto/update-challenges.dto';

@Injectable()
export class ChallengesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(createChallengeDto: CreateChallengesDto) {
    const allUsers = await this.prisma.user.findMany({ select: { id: true } });

    return this.prisma.challenge.create({
      data: {
        ...createChallengeDto,
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
    return this.prisma.challenge.findMany({ include: { challengeProgresses: true } });
  }

  async findById(id: string) {
    return this.prisma.challenge.findUnique({
      where: { id },
      include: { challengeProgresses: true },
    });
  }

  async update(id: string, updateChallengeDto: UpdateChallengesDto) {
    return this.prisma.challenge.update({
      where: { id },
      data: { ...updateChallengeDto },
    });
  }

  async delete(id: string) {
    return this.prisma.challenge.delete({ where: { id } });
  }
}