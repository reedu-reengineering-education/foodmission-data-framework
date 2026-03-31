import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { KnowledgeProgressRepository } from '../repositories/knowledge-progress.repository';
import { KnowledgeRepository } from '../repositories/knowledge.repository';
import {
  UpdateProgressDto,
  ProgressResponseDto,
} from '../dto/update-progress.dto';
import { QueryProgressDto } from '../dto/query-progress.dto';
import { MultipleProgressResponseDto } from '../dto/progress-list-response.dto';
import { handlePrismaError } from '../../common/utils/error.utils';
import { pageLimitToSkipTake } from '../../common/utils/pagination';

@Injectable()
export class KnowledgeProgressService {
  private readonly logger = new Logger(KnowledgeProgressService.name);

  constructor(
    private readonly progressRepository: KnowledgeProgressRepository,
    private readonly knowledgeRepository: KnowledgeRepository,
  ) {}

  private async getAccessibleKnowledgeOrThrow(
    userId: string,
    knowledgeId: string,
  ) {
    const knowledge = await this.knowledgeRepository.findById(knowledgeId);
    if (!knowledge) {
      throw new NotFoundException('Knowledge not found');
    }
    if (knowledge.userId !== userId && !knowledge.available) {
      throw new ForbiddenException('Knowledge not accessible');
    }
    return knowledge;
  }

  async updateProgress(
    userId: string,
    knowledgeId: string,
    updateProgressDto: UpdateProgressDto,
  ): Promise<ProgressResponseDto> {
    this.logger.log(
      `Updating progress for user ${userId} on knowledge ${knowledgeId}`,
    );

    await this.getAccessibleKnowledgeOrThrow(userId, knowledgeId);

    try {
      const progress = await this.progressRepository.upsert(
        userId,
        knowledgeId,
        {
          completed: updateProgressDto.completed,
          progress: updateProgressDto.progress,
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
    await this.getAccessibleKnowledgeOrThrow(userId, knowledgeId);

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

  async getUserProgressPaginated(
    userId: string,
    query: QueryProgressDto,
  ): Promise<MultipleProgressResponseDto> {
    const { skip, take } = pageLimitToSkipTake(query);

    const result = await this.progressRepository.findWithPagination({
      skip,
      take,
      where: { userId },
      orderBy: { lastAccessedAt: 'desc' },
    });

    return {
      data: result.data as unknown as ProgressResponseDto[],
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  async deleteProgress(userId: string, knowledgeId: string): Promise<void> {
    await this.getAccessibleKnowledgeOrThrow(userId, knowledgeId);

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
