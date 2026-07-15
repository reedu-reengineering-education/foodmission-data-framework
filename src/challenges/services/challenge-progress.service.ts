import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ProgressStatus } from '@prisma/client';
import { GamificationI18nService } from '../../i18n/gamification-i18n.service';
import { ChallengeProgressRepository } from '../repositories/challenge-progress.repository';
import { UpdateChallengeProgressDto } from '../dto/update-challenge-progress.dto';
import { ChallengeProgressResponseDto } from '../dto/response-challenge-progress.dto';

@Injectable()
export class ChallengeProgressService {
  private readonly logger = new Logger(ChallengeProgressService.name);

  constructor(
    private readonly challengeProgressRepository: ChallengeProgressRepository,
    private readonly gamificationI18n: GamificationI18nService,
  ) {}

  async getChallengeById(
    challengeId: string,
    userId: string,
  ): Promise<ChallengeProgressResponseDto> {
    this.logger.log(`Getting challenge ${challengeId} for user: ${userId}`);

    const progress =
      await this.challengeProgressRepository.findByUserIdAndChallengeId(
        userId,
        challengeId,
      );

    if (!progress) {
      throw new NotFoundException('Challenge not found');
    }

    if (progress.userId !== userId) {
      throw new ForbiddenException('No permission');
    }

    return this.transformToResponseDto(progress);
  }

  async getAllChallengesByUserId(
    userId: string,
  ): Promise<ChallengeProgressResponseDto[]> {
    this.logger.log(`Getting all challenges for user: ${userId}`);

    const progresses =
      await this.challengeProgressRepository.findAllByUserId(userId);

    return progresses.map((p) => this.transformToResponseDto(p));
  }

  async update(
    challengeId: string,
    updateDto: UpdateChallengeProgressDto,
    userId: string,
  ): Promise<ChallengeProgressResponseDto> {
    this.logger.log(`Updating challenge ${challengeId} for user: ${userId}`);

    const existing =
      await this.challengeProgressRepository.findByUserIdAndChallengeId(
        userId,
        challengeId,
      );

    if (!existing) {
      throw new NotFoundException('Challenge not found');
    }

    if (existing.userId !== userId) {
      throw new ForbiddenException('No permission');
    }

    const payload: UpdateChallengeProgressDto = { ...updateDto };
    if (updateDto.completed === true && updateDto.status === undefined) {
      payload.status = ProgressStatus.ACHIEVED;
    } else if (updateDto.completed === false && updateDto.status === undefined) {
      payload.status = ProgressStatus.ACTIVE;
    }

    const updated = await this.challengeProgressRepository.update(
      userId,
      challengeId,
      payload,
    );

    return this.transformToResponseDto(updated);
  }

  private transformToResponseDto(progress: {
    challengeId: string;
    userId: string;
    completed: boolean;
    progress: number;
    status: import('@prisma/client').ProgressStatus;
    challenge?: { slug: string; title: string; description: string };
  }): ChallengeProgressResponseDto {
    const challenge = progress.challenge;
    const copy = challenge
      ? this.gamificationI18n.getChallengeCopy(challenge.slug, {
          title: challenge.title,
          description: challenge.description,
        })
      : { title: '', description: '' };

    return {
      challengeId: progress.challengeId,
      userId: progress.userId,
      completed: progress.completed,
      progress: progress.progress,
      challengeTitle: copy.title,
      status: progress.status,
    };
  }
}
