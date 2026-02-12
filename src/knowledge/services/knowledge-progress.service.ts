import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { KnowledgeProgressRepository } from '../repositories/knowledge-progress.repository';
import { KnowledgeRepository } from '../repositories/knowledge.repository';
import {
  UpdateProgressDto,
  ProgressResponseDto,
} from '../dto/update-progress.dto';
import { handlePrismaError } from '../../common/utils/error.utils';
import { Prisma } from '@prisma/client';

@Injectable()
export class KnowledgeProgressService {
  private readonly logger = new Logger(KnowledgeProgressService.name);

  constructor(
    private readonly progressRepository: KnowledgeProgressRepository,
    private readonly knowledgeRepository: KnowledgeRepository,
  ) {}

  async updateProgress(
    userId: string,
    knowledgeId: string,
    updateProgressDto: UpdateProgressDto,
  ): Promise<ProgressResponseDto> {
    this.logger.log(
      `Updating progress for user ${userId} on knowledge ${knowledgeId}`,
    );

    // Verify knowledge exists
    const knowledge = await this.knowledgeRepository.findById(knowledgeId);
    if (!knowledge) {
      throw new NotFoundException('Knowledge not found');
    }

    try {
      const progress = await this.progressRepository.upsert(
        userId,
        knowledgeId,
        {
          completed: updateProgressDto.completed,
          progress: updateProgressDto.progress as Prisma.InputJsonValue,
          lastAccessedAt: new Date(),
        },
      );

      return progress as ProgressResponseDto;
    } catch (error) {
      throw handlePrismaError(
        error,
        'update progress',
        'UserKnowledgeProgress',
      );
    }
  }

  async getProgress(
    userId: string,
    knowledgeId: string,
  ): Promise<ProgressResponseDto | null> {
    const progress = await this.progressRepository.findByUserAndKnowledge(
      userId,
      knowledgeId,
    );
    return progress as ProgressResponseDto | null;
  }

  async getAllUserProgress(userId: string): Promise<ProgressResponseDto[]> {
    const progress = await this.progressRepository.findByUserId(userId);
    return progress as ProgressResponseDto[];
  }

  async deleteProgress(userId: string, knowledgeId: string): Promise<void> {
    try {
      await this.progressRepository.deleteByUserAndKnowledge(
        userId,
        knowledgeId,
      );
      this.logger.log(
        `Deleted progress for user ${userId} on knowledge ${knowledgeId}`,
      );
    } catch (error) {
      throw handlePrismaError(
        error,
        'delete progress',
        'UserKnowledgeProgress',
      );
    }
  }
}
