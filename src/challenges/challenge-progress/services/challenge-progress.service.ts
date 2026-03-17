import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
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

    const progress = await this.challengeProgressRepository.findByUserIdAndChallengeId(
      userId,
      challengeId,
    );

    if (!progress) {
      throw new NotFoundException('Challenge not found');
    }

    // Sicherheit: userId aus dem Token muss übereinstimmen
    if (progress.userId !== userId) {
      throw new ForbiddenException('No permission');
    }

    return this.transformToResponseDto(progress);
  }

  async getAllChallengesByUserId(
    userId: string,
  ): Promise<ChallengeProgressResponseDto[]> {
    this.logger.log(`Getting all challenges for user: ${userId}`);

    const progresses = await this.challengeProgressRepository.findAllByUserId(userId);

    return progresses.map((p) => this.transformToResponseDto(p));
  }

  async update(
    challengeId: string,
    updateDto: UpdateChallengeProgressDto,
    userId: string,
  ): Promise<ChallengeProgressResponseDto> {
    this.logger.log(`Updating challenge ${challengeId} for user: ${userId}`);

    const existing = await this.challengeProgressRepository.findByUserIdAndChallengeId(
      userId,
      challengeId,
    );

    if (!existing) {
      throw new NotFoundException('Challenge not found');
    }

    if (existing.userId !== userId) {
      throw new ForbiddenException('No permission');
    }

    const updated = await this.challengeProgressRepository.update(
      userId,
      challengeId,
      updateDto,
    );

    return this.transformToResponseDto(updated);
  }

  private transformToResponseDto(progress: any): ChallengeProgressResponseDto {
    return {
      challengeId: progress.challengeId,
      userId: progress.userId,
      completed: progress.completed,
      progress: progress.progress,
      challengeTitle: progress.challenge?.title ?? '',
    };
  }
}