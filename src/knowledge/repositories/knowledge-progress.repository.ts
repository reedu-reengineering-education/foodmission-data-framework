import { Injectable } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { normalizePagination } from '../../common/utils/pagination';
import {
  FindAllOptions,
  PaginatedResult,
} from '../../common/interfaces/base-repository.interface';

type FindManyArgs = NonNullable<
  Parameters<PrismaClient['userKnowledgeProgress']['findMany']>[0]
>;
type CreateArgs = NonNullable<
  Parameters<PrismaClient['userKnowledgeProgress']['create']>[0]
>;
type UpsertArgs = NonNullable<
  Parameters<PrismaClient['userKnowledgeProgress']['upsert']>[0]
>;
type UpdateArgs = NonNullable<
  Parameters<PrismaClient['userKnowledgeProgress']['update']>[0]
>;

type OptionalProp<T, K extends PropertyKey> = T extends { [P in K]?: infer V }
  ? V
  : never;
type WhereInput = OptionalProp<FindManyArgs, 'where'>;
type OrderByInput = OptionalProp<FindManyArgs, 'orderBy'>;

type FindUniqueResult = Awaited<
  ReturnType<PrismaClient['userKnowledgeProgress']['findUnique']>
>;
type FindManyResult = Awaited<
  ReturnType<PrismaClient['userKnowledgeProgress']['findMany']>
>;
type Entity = FindManyResult extends Array<infer T> ? T : never;
type CreateData = OptionalProp<CreateArgs, 'data'>;
type UpsertCreateData = OptionalProp<UpsertArgs, 'create'>;
type UpsertUpdateData = OptionalProp<UpsertArgs, 'update'>;
type UpdateData = OptionalProp<UpdateArgs, 'data'>;

export interface CreateProgressData {
  userId: string;
  knowledgeId: string;
  completed?: boolean;
  progress?: unknown;
}

export interface UpdateProgressData {
  completed?: boolean;
  progress?: unknown;
}

@Injectable()
export class KnowledgeProgressRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserAndKnowledge(
    userId: string,
    knowledgeId: string,
  ): Promise<FindUniqueResult> {
    return await this.prisma.userKnowledgeProgress.findUnique({
      where: {
        userId_knowledgeId: {
          userId,
          knowledgeId,
        },
      },
    });
  }

  async findByUserId(userId: string): Promise<FindManyResult> {
    return await this.prisma.userKnowledgeProgress.findMany({
      where: { userId },
      orderBy: { lastAccessedAt: 'desc' },
    });
  }

  async findWithPagination(
    options: FindAllOptions<WhereInput, OrderByInput> = {},
  ): Promise<PaginatedResult<Entity>> {
    const { skip = 0, take = 10, where, orderBy } = options;
    const { skip: safeSkip, take: safeTake } = normalizePagination(skip, take);

    const [data, total] = await Promise.all([
      this.prisma.userKnowledgeProgress.findMany({
        skip: safeSkip,
        take: safeTake,
        where,
        orderBy: orderBy || { lastAccessedAt: 'desc' },
      }),
      this.count(where),
    ]);

    const page = Math.floor(safeSkip / safeTake) + 1;
    const totalPages = Math.ceil(total / safeTake);

    return {
      data,
      total,
      page,
      limit: safeTake,
      totalPages,
    };
  }

  async count(where?: WhereInput): Promise<number> {
    return this.prisma.userKnowledgeProgress.count({ where });
  }

  async findManyByKnowledgeIds(
    userId: string,
    knowledgeIds: string[],
  ): Promise<FindManyResult> {
    return await this.prisma.userKnowledgeProgress.findMany({
      where: {
        userId,
        knowledgeId: { in: knowledgeIds },
      },
    });
  }

  async findByKnowledgeId(knowledgeId: string): Promise<FindManyResult> {
    return await this.prisma.userKnowledgeProgress.findMany({
      where: { knowledgeId },
    });
  }

  async create(data: CreateProgressData): Promise<Entity> {
    return await this.prisma.userKnowledgeProgress.create({
      data: data as unknown as CreateData,
    });
  }

  async upsert(
    userId: string,
    knowledgeId: string,
    data: UpdateProgressData,
  ): Promise<Entity> {
    const now = new Date();
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
        lastAccessedAt: now,
      } as unknown as UpsertCreateData,
      update: {
        ...data,
        lastAccessedAt: now,
      } as unknown as UpsertUpdateData,
    });
  }

  async update(id: string, data: UpdateProgressData): Promise<Entity> {
    const now = new Date();
    return await this.prisma.userKnowledgeProgress.update({
      where: { id },
      data: {
        ...data,
        lastAccessedAt: now,
      } as unknown as UpdateData,
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
