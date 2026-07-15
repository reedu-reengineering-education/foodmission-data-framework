import {
  ConflictException,
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ChallengeScope } from '@prisma/client';
import { handlePrismaError } from '../../common/utils/error.utils';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { GamificationI18nService } from '../../i18n/gamification-i18n.service';
import { ChallengeResponseDto } from '../dto/response-challange.dto';
import { CreateChallengeDto } from '../dto/create-challenge.dto';
import { UpdateChallengeDto } from '../dto/update-challenge.dto';
import { ChallengesRepository } from '../repositories/challenges.repository';

@Injectable()
export class ChallengesService {
  private readonly logger = new Logger(ChallengesService.name);

  constructor(
    private readonly challengesRepository: ChallengesRepository,
    private readonly gamificationI18n: GamificationI18nService,
  ) {}

  async create(
    createChallengeDto: CreateChallengeDto,
  ): Promise<ChallengeResponseDto> {
    try {
      const challengeScope =
        createChallengeDto.challengeScope ??
        (createChallengeDto.questId
          ? ChallengeScope.QUEST_ONE_TIME
          : ChallengeScope.DAILY_STANDALONE);

      if (
        challengeScope === ChallengeScope.QUEST_ONE_TIME &&
        !createChallengeDto.questId
      ) {
        throw new BadRequestException(
          'questId is required for QUEST_ONE_TIME challenges',
        );
      }

      if (
        challengeScope === ChallengeScope.DAILY_STANDALONE &&
        createChallengeDto.questId
      ) {
        throw new BadRequestException(
          'questId must not be set for DAILY_STANDALONE challenges',
        );
      }

      const copy = this.gamificationI18n.getChallengeCopyOrThrow(
        createChallengeDto.slug,
      );
      const challenge = await this.challengesRepository.create({
        slug: createChallengeDto.slug,
        title: copy.title,
        description: copy.description,
        available: createChallengeDto.available,
        startDate: createChallengeDto.startDate,
        endDate: createChallengeDto.endDate,
        questId: createChallengeDto.questId,
        challengeScope,
      });
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

  async getChallengeById(
    challengeId: string,
    lang?: string,
  ): Promise<ChallengeResponseDto> {
    this.logger.log(`Getting challenge ${challengeId}`);

    const challenge = await this.challengesRepository.findById(challengeId);

    if (!challenge) {
      throw new NotFoundException('Challenge not found');
    }

    return this.transformToResponseDto(challenge, lang);
  }

  async getAll(lang?: string): Promise<ChallengeResponseDto[]> {
    this.logger.log('Getting daily standalone challenges');

    const challenges = await this.challengesRepository.findDailyStandalone();

    return challenges.map((challenge) =>
      this.transformToResponseDto(challenge, lang),
    );
  }

  async getAllForAdmin(lang?: string): Promise<ChallengeResponseDto[]> {
    this.logger.log('Getting all challenges');

    const challenges = await this.challengesRepository.findAll();

    return challenges.map((challenge) =>
      this.transformToResponseDto(challenge, lang),
    );
  }

  async update(
    challengeId: string,
    updateChallengeDto: UpdateChallengeDto,
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

  private transformToResponseDto(
    challenge: any,
    lang?: string,
  ): ChallengeResponseDto {
    const copy = this.gamificationI18n.getChallengeCopy(
      challenge.slug,
      {
        title: challenge.title,
        description: challenge.description,
      },
      lang,
    );

    return {
      id: challenge.id,
      slug: challenge.slug,
      title: copy.title,
      description: copy.description,
      available: challenge.available,
      questId: challenge.questId,
      challengeScope: challenge.challengeScope,
      progress:
        challenge.challengeProgresses?.find(
          (cp) => cp.userId === challenge.userId,
        )?.progress || 0,
      startDate: challenge.startDate,
      endDate: challenge.endDate,
    };
  }
}
