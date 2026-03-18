import { Injectable } from '@nestjs/common';
import { Prisma, Knowledge } from '@prisma/client';
import {
  BaseRepository,
  FindAllOptions,
  PaginatedResult,
} from '../../common/interfaces/base-repository.interface';
import { PrismaService } from '../../database/prisma.service';
import { normalizePagination } from '../../common/utils/pagination';

export interface CreateKnowledgeData {
  userId: string;
  title: string;
  description?: string;
  available?: boolean;
  content: Prisma.InputJsonValue;
}

export type UpdateKnowledgeData = Partial<CreateKnowledgeData>;

@Injectable()
export class KnowledgeRepository
  implements
    BaseRepository<
      Knowledge,
      CreateKnowledgeData,
      UpdateKnowledgeData,
      Prisma.KnowledgeWhereInput
    >
{
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    options: FindAllOptions<
      Prisma.KnowledgeWhereInput,
      Prisma.KnowledgeOrderByWithRelationInput,
      Prisma.KnowledgeInclude
    > = {},
  ): Promise<Knowledge[]> {
    return await this.prisma.knowledge.findMany({
      skip: options.skip,
      take: options.take,
      where: options.where,
      orderBy: options.orderBy || { createdAt: 'desc' },
      include: options.include,
    });
  }

  async findWithPagination(
    options: FindAllOptions<
      Prisma.KnowledgeWhereInput,
      Prisma.KnowledgeOrderByWithRelationInput,
      Prisma.KnowledgeInclude
    > = {},
  ): Promise<PaginatedResult<Knowledge>> {
    const { skip = 0, take = 10, where, orderBy, include } = options;
    const { skip: safeSkip, take: safeTake } = normalizePagination(skip, take);

    const [data, total] = await Promise.all([
      this.prisma.knowledge.findMany({
        skip: safeSkip,
        take: safeTake,
        where,
        orderBy: orderBy || { createdAt: 'desc' },
        include,
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

  async findById(id: string): Promise<Knowledge | null> {
    return await this.prisma.knowledge.findUnique({
      where: { id },
    });
  }

  async create(data: CreateKnowledgeData): Promise<Knowledge> {
    return this.prisma.knowledge.create({
      data: data as Prisma.KnowledgeUncheckedCreateInput,
    });
  }

  async update(id: string, data: UpdateKnowledgeData): Promise<Knowledge> {
    return this.prisma.knowledge.update({
      where: { id },
      data: data as Prisma.KnowledgeUncheckedUpdateInput,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.knowledge.delete({ where: { id } });
  }

  async count(where?: Prisma.KnowledgeWhereInput): Promise<number> {
    return this.prisma.knowledge.count({ where });
  }
}
