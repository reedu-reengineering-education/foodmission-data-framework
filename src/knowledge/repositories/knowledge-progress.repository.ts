import { Injectable } from '@nestjs/common';
import { Prisma, UserKnowledgeProgress } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

export interface CreateProgressData {
  userId: string;
  knowledgeId: string;
  completed?: boolean;
  progress?: Prisma.InputJsonValue;
}

export interface UpdateProgressData {
  completed?: boolean;
  progress?: Prisma.InputJsonValue;
  lastAccessedAt?: Date;
}

@Injectable()
export class KnowledgeProgressRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserAndKnowledge(
    userId: string,
    knowledgeId: string,
  ): Promise<UserKnowledgeProgress | null> {
    return await this.prisma.userKnowledgeProgress.findUnique({
      where: {
        userId_knowledgeId: {
          userId,
          knowledgeId,
        },
      },
    });
  }

  async findByUserId(userId: string): Promise<UserKnowledgeProgress[]> {
    return await this.prisma.userKnowledgeProgress.findMany({
      where: { userId },
      orderBy: { lastAccessedAt: 'desc' },
    });
  }

  async findManyByKnowledgeIds(
    userId: string,
    knowledgeIds: string[],
  ): Promise<UserKnowledgeProgress[]> {
    return await this.prisma.userKnowledgeProgress.findMany({
      where: {
        userId,
        knowledgeId: { in: knowledgeIds },
      },
    });
  }

  async findByKnowledgeId(
    knowledgeId: string,
  ): Promise<UserKnowledgeProgress[]> {
    return await this.prisma.userKnowledgeProgress.findMany({
      where: { knowledgeId },
    });
  }

  async create(data: CreateProgressData): Promise<UserKnowledgeProgress> {
    return await this.prisma.userKnowledgeProgress.create({
      data: data as Prisma.UserKnowledgeProgressUncheckedCreateInput,
    });
  }

  async upsert(
    userId: string,
    knowledgeId: string,
    data: UpdateProgressData,
  ): Promise<UserKnowledgeProgress> {
    return await this.prisma.userKnowledgeProgress.upsert({
      where: {
        userId_knowledgeId: {
          userId,
          knowledgeId,
        },
      },
      create: {
        userId,
        knowledgeId,
        ...data,
      } as Prisma.UserKnowledgeProgressUncheckedCreateInput,
      update: {
        ...data,
        lastAccessedAt: new Date(),
      } as Prisma.UserKnowledgeProgressUncheckedUpdateInput,
    });
  }

  async update(
    id: string,
    data: UpdateProgressData,
  ): Promise<UserKnowledgeProgress> {
    return await this.prisma.userKnowledgeProgress.update({
      where: { id },
      data: {
        ...data,
        lastAccessedAt: new Date(),
      } as Prisma.UserKnowledgeProgressUncheckedUpdateInput,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.userKnowledgeProgress.delete({ where: { id } });
  }

  async deleteByUserAndKnowledge(
    userId: string,
    knowledgeId: string,
  ): Promise<void> {
    await this.prisma.userKnowledgeProgress.delete({
      where: {
        userId_knowledgeId: {
          userId,
          knowledgeId,
        },
      },
    });
  }
}
