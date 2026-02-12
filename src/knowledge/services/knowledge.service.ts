import { Injectable, Logger } from '@nestjs/common';
import { KnowledgeRepository } from '../repositories/knowledge.repository';
import { KnowledgeProgressRepository } from '../repositories/knowledge-progress.repository';
import { CreateKnowledgeDto } from '../dto/create-knowledge.dto';
import { UpdateKnowledgeDto } from '../dto/update-knowledge.dto';
import {
  KnowledgeResponseDto,
  MultipleKnowledgeResponseDto,
} from '../dto/knowledge-response.dto';
import { QueryKnowledgeDto } from '../dto/query-knowledge.dto';
import { Prisma } from '@prisma/client';
import { getOwnedEntityOrThrow } from '../../common/services/ownership-helpers';
import { handlePrismaError } from '../../common/utils/error.utils';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);

  constructor(
    private readonly knowledgeRepository: KnowledgeRepository,
    private readonly progressRepository: KnowledgeProgressRepository,
  ) {}

  private getOwnedKnowledgeOrThrow(knowledgeId: string, userId: string) {
    return getOwnedEntityOrThrow(
      knowledgeId,
      userId,
      (id) => this.knowledgeRepository.findById(id),
      (k) => k.userId,
      'Knowledge not found',
    );
  }

  async create(
    createKnowledgeDto: CreateKnowledgeDto,
    userId: string,
  ): Promise<KnowledgeResponseDto> {
    this.logger.log(
      `Creating knowledge "${createKnowledgeDto.title}" for ${userId}`,
    );

    try {
      const knowledge = await this.knowledgeRepository.create({
        ...createKnowledgeDto,
        userId,
        content: createKnowledgeDto.content as unknown as Prisma.InputJsonValue,
      });
      return this.toResponse(knowledge);
    } catch (error) {
      throw handlePrismaError(error, 'create knowledge', 'Knowledge');
    }
  }

  async findAll(
    userId: string,
    query: QueryKnowledgeDto,
  ): Promise<MultipleKnowledgeResponseDto> {
    const { page = 1, limit = 10, available, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.KnowledgeWhereInput = {
      userId,
      ...(typeof available === 'boolean' ? { available } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    try {
      const result = await this.knowledgeRepository.findWithPagination({
        skip,
        take: limit,
        where,
        orderBy: { createdAt: 'desc' },
      });

      // Bulk load user progress for all knowledge items to avoid N+1 queries
      const knowledgeIds = result.data.map((k) => k.id);
      const progressList = await this.progressRepository.findManyByKnowledgeIds(
        userId,
        knowledgeIds,
      );
      const progressMap = new Map(progressList.map((p) => [p.knowledgeId, p]));

      const dataWithProgress = result.data.map((knowledge) => {
        const progress = progressMap.get(knowledge.id);
        return this.toResponse(knowledge, progress);
      });

      return plainToInstance(
        MultipleKnowledgeResponseDto,
        {
          data: dataWithProgress,
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
        { excludeExtraneousValues: true },
      );
    } catch (error) {
      throw handlePrismaError(error, 'find knowledge', 'Knowledge');
    }
  }

  async findOne(id: string, userId: string): Promise<KnowledgeResponseDto> {
    const ownedKnowledge = await this.getOwnedKnowledgeOrThrow(id, userId);
    const progress = await this.progressRepository.findByUserAndKnowledge(
      userId,
      id,
    );
    return this.toResponse(ownedKnowledge, progress);
  }

  async update(
    id: string,
    updateKnowledgeDto: UpdateKnowledgeDto,
    userId: string,
  ): Promise<KnowledgeResponseDto> {
    await this.getOwnedKnowledgeOrThrow(id, userId);

    try {
      const updated = await this.knowledgeRepository.update(id, {
        ...updateKnowledgeDto,
        content: updateKnowledgeDto.content
          ? (updateKnowledgeDto.content as unknown as Prisma.InputJsonValue)
          : undefined,
      });
      const progress = await this.progressRepository.findByUserAndKnowledge(
        userId,
        id,
      );
      return this.toResponse(updated, progress);
    } catch (error) {
      throw handlePrismaError(error, 'update knowledge', 'Knowledge');
    }
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.getOwnedKnowledgeOrThrow(id, userId);
    try {
      await this.knowledgeRepository.delete(id);
      this.logger.log(`Deleted knowledge ${id} for user ${userId}`);
    } catch (error) {
      throw handlePrismaError(error, 'delete knowledge', 'Knowledge');
    }
  }

  private toResponse(knowledge: any, userProgress?: any): KnowledgeResponseDto {
    const response = plainToInstance(
      KnowledgeResponseDto,
      {
        ...knowledge,
        userProgress: userProgress
          ? {
              completed: userProgress.completed,
              progress: userProgress.progress,
              lastAccessedAt: userProgress.lastAccessedAt,
            }
          : undefined,
      },
      { excludeExtraneousValues: true },
    );
    return response;
  }
}
