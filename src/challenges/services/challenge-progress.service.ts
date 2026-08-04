import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ChallengeProgressRepository } from '../repositories/challenge-progress.repository';
import { UpdateChallengeProgressDto } from '../dto/update-challenge-progress.dto';
import { ChallengeProgressResponseDto } from '../dto/response-challenge-progress.dto';

@Injectable()
export class ChallengeProgressService {
  private readonly logger = new Logger(ChallengeProgressService.name);

  constructor(
    private readonly challengeProgressRepository: ChallengeProgressRepository,
  ) {}

  async getChallengeById(
    challengeId: string,
    userId: string,
  ): Promise<ChallengeProgressResponseDto> {
    this.logger.log(`Getting challenge ${challengeId} for user: ${userId}`);

    const challenge =
      await this.challengeProgressRepository.findChallengeById(challengeId);
    if (!challenge) {
      throw new NotFoundException('Challenge not found');
    }

    const progress =
      await this.challengeProgressRepository.findByUserIdAndChallengeId(
        userId,
        challengeId,
      );

    if (!progress) {
      return {
        challengeId: challenge.id,
        userId,
        completed: false,
        progress: 0,
        challengeTitle: challenge.title,
      };
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

    const challenge =
      await this.challengeProgressRepository.findChallengeById(challengeId);
    if (!challenge) {
      throw new NotFoundException('Challenge not found');
    }

    const updated = await this.challengeProgressRepository.upsert(
      userId,
      challengeId,
      updateDto,
    );

    return this.transformToResponseDto(updated);
  }

  private transformToResponseDto(progress: {
    challengeId: string;
    userId: string;
    completed: boolean;
    progress: number;
    challenge?: { title?: string } | null;
  }): ChallengeProgressResponseDto {
    return {
      challengeId: progress.challengeId,
      userId: progress.userId,
      completed: progress.completed,
      progress: progress.progress,
      challengeTitle: progress.challenge?.title ?? '',
    };
  }
}
