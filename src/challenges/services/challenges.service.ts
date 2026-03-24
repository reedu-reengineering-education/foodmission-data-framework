import {
  ConflictException,
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { handlePrismaError } from '../../common/utils/error.utils';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { ChallengeResponseDto } from '../dto/response-challange.dto';
import { CreateChallengesDto } from '../dto/create-challenges.dto';
import { UpdateChallengesDto } from '../dto/update-challenges.dto';
import { ChallengesRepository } from '../repositories/challenges.repository';

@Injectable()
export class ChallengesService {
  private readonly logger = new Logger(ChallengesService.name);

  constructor(private readonly challengesRepository: ChallengesRepository) {}

  async create(
    createChallengeDto: CreateChallengesDto,
  ): Promise<ChallengeResponseDto> {
    try {
      const challenge =
        await this.challengesRepository.create(createChallengeDto);
      return this.transformToResponseDto(challenge);
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      if (error instanceof PrismaClientKnownRequestError) {
        throw handlePrismaError(error, 'create', 'challenge');
      }

      this.logger.error('Unexpected error while creating challenge', error);
      throw new InternalServerErrorException('Failed to create challenge');
    }
  }

  async getChallengeById(challengeId: string): Promise<ChallengeResponseDto> {
    this.logger.log(`Getting challenge ${challengeId}`);

    const challenge = await this.challengesRepository.findById(challengeId);

    if (!challenge) {
      throw new NotFoundException('Challenge not found');
    }

    return this.transformToResponseDto(challenge);
  }

  async getAll(): Promise<ChallengeResponseDto[]> {
    this.logger.log('Getting all challenges');

    const challenges = await this.challengesRepository.findAll();

    return challenges.map((challenge) =>
      this.transformToResponseDto(challenge),
    );
  }

  async update(
    challengeId: string,
    updateChallengeDto: UpdateChallengesDto,
  ): Promise<ChallengeResponseDto> {
    this.logger.log(`Updating challenge ${challengeId}`);

    const challenge = await this.challengesRepository.findById(challengeId);

    if (!challenge) {
      throw new NotFoundException('Challenge not found');
    }

    const updatedChallenge = await this.challengesRepository.update(
      challengeId,
      updateChallengeDto,
    );

    return this.transformToResponseDto(updatedChallenge);
  }

  async delete(challengeId: string): Promise<void> {
    this.logger.log(`Deleting challenge ${challengeId}`);

    const challenge = await this.challengesRepository.findById(challengeId);

    if (!challenge) {
      throw new NotFoundException('Challenge not found');
    }

    await this.challengesRepository.delete(challengeId);
  }

  private transformToResponseDto(challenge: any): ChallengeResponseDto {
    return {
      id: challenge.id,
      title: challenge.title,
      description: challenge.description,
      available: challenge.available,
      progress:
        challenge.challengeProgresses?.find(
          (cp) => cp.userId === challenge.userId,
        )?.progress || 0,
      startDate: challenge.startDate,
      endDate: challenge.endDate,
    };
  }
}
