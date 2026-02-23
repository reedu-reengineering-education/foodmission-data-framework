import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UpdateChallengeProgressDto } from '../dto/update-challengeProgress.dto';

@Injectable()
export class ChallengeProgressRepository {
  constructor(private readonly prisma: PrismaService) {}

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

  async update(
    userId: string,
    challengeId: string,
    updateDto: UpdateChallengeProgressDto,
  ) {
    return this.prisma.challengeProgress.update({
      where: { userId_challengeId: { userId, challengeId } },
      data: { ...updateDto },
      include: { challenge: true },
    });
  }
}