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
import { CreateChallengeDto } from '../dto/create-challenge.dto';
import { UpdateChallengeDto } from '../dto/update-challenge.dto';
import { ListChallengesQueryDto } from '../dto/list-challenges-query.dto';
import { ChallengesRepository } from '../repositories/challenges.repository';
import { TranslationService } from '../../translations/services/translation.service';
import { DEFAULT_LOCALE } from '../../i18n/constants';

function tagsFromFlags(challenge: {
  health?: boolean;
  foodChoice?: boolean;
  foodWaste?: boolean;
}): string[] {
  const tags: string[] = [];
  if (challenge.health) tags.push('HEALTH');
  if (challenge.foodChoice) tags.push('FOOD_CHOICE');
  if (challenge.foodWaste) tags.push('FOOD_AND_WASTE');
  return tags;
}

@Injectable()
export class ChallengesService {
  private readonly logger = new Logger(ChallengesService.name);

  constructor(
    private readonly challengesRepository: ChallengesRepository,
    private readonly translationService: TranslationService,
  ) {}

  async create(
    createChallengeDto: CreateChallengeDto,
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

  async getChallengeById(
    codeOrId: string,
    lang?: string,
  ): Promise<ChallengeResponseDto> {
    this.logger.log(`Getting challenge ${codeOrId}`);

    const challenge = await this.challengesRepository.findByCodeOrId(codeOrId);

    if (!challenge) {
      throw new NotFoundException('Challenge not found');
    }

    const [mapped] = await this.overlayTranslations([challenge], lang);
    return mapped;
  }

  async getAll(
    query: ListChallengesQueryDto = {},
    options: { isAdmin?: boolean; userId?: string } = {},
  ): Promise<ChallengeResponseDto[]> {
    const { isAdmin = false, userId } = options;
    this.logger.log('Getting all challenges');

    const available =
      isAdmin && query.available !== undefined ? query.available : true;

    const challenges = await this.challengesRepository.findAll({
      dimensionCode: query.dimensionCode,
      level: query.level,
      available,
      progressUserId: isAdmin ? undefined : userId,
    });

    return this.overlayTranslations(challenges, query.lang, {
      includeProgress: !isAdmin,
    });
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

  private async overlayTranslations(
    challenges: any[],
    lang?: string,
    options?: { includeProgress?: boolean },
  ): Promise<ChallengeResponseDto[]> {
    const locale = this.translationService.resolveLocale(lang);
    if (locale === DEFAULT_LOCALE || challenges.length === 0) {
      return challenges.map((c) => this.transformToResponseDto(c, options));
    }

    const overlay = await this.translationService.resolveMany(
      'Challenge',
      challenges.map((c) => c.id),
      locale,
      ['title', 'task', 'whyItMatters'],
      Object.fromEntries(
        challenges.map((c) => [
          c.id,
          {
            title: c.title,
            task: c.task,
            whyItMatters: c.whyItMatters,
          },
        ]),
      ),
    );

    return challenges.map((c) =>
      this.transformToResponseDto(
        {
          ...c,
          title: overlay[c.id]?.title ?? c.title,
          task: overlay[c.id]?.task ?? c.task,
          whyItMatters: overlay[c.id]?.whyItMatters ?? c.whyItMatters,
        },
        options,
      ),
    );
  }

  private transformToResponseDto(
    challenge: {
      id: string;
      code: string;
      dimensionId: string;
      topicId?: string | null;
      level: string;
      title: string;
      task: string;
      whyItMatters: string;
      health?: boolean;
      foodChoice?: boolean;
      foodWaste?: boolean;
      available: boolean;
      challengeProgresses?: Array<{ progress?: number }>;
    },
    options?: { includeProgress?: boolean },
  ): ChallengeResponseDto {
    const dto: ChallengeResponseDto = {
      id: challenge.id,
      code: challenge.code,
      dimensionId: challenge.dimensionId,
      topicId: challenge.topicId,
      level: challenge.level as ChallengeResponseDto['level'],
      title: challenge.title,
      task: challenge.task,
      whyItMatters: challenge.whyItMatters,
      tags: tagsFromFlags(challenge),
      health: challenge.health ?? false,
      foodChoice: challenge.foodChoice ?? false,
      foodWaste: challenge.foodWaste ?? false,
      available: challenge.available,
    };

    if (options?.includeProgress) {
      const row = challenge.challengeProgresses?.[0];
      dto.progress = row?.progress ?? 0;
    }

    return dto;
  }
}
