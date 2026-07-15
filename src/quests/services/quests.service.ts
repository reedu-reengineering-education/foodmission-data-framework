import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import {
  handlePrismaError,
  handleServiceError,
} from '../../common/utils/error.utils';
import { GamificationI18nService } from '../../i18n/gamification-i18n.service';
import { CreateQuestDto } from '../dto/create-quest.dto';
import {
  QuestChallengeResponseDto,
  QuestResponseDto,
} from '../dto/response-quest.dto';
import { UpdateQuestDto } from '../dto/update-quest.dto';
import { QuestsRepository } from '../repositories/quests.repository';

@Injectable()
export class QuestsService {
  private readonly logger = new Logger(QuestsService.name);

  constructor(
    private readonly questsRepository: QuestsRepository,
    private readonly gamificationI18n: GamificationI18nService,
  ) {}

  async create(createQuestDto: CreateQuestDto): Promise<QuestResponseDto> {
    try {
      const copy = this.gamificationI18n.getQuestCopyOrThrow(createQuestDto.slug);
      const quest = await this.questsRepository.create({
        slug: createQuestDto.slug,
        missionId: createQuestDto.missionId,
        title: copy.title,
        description: copy.description,
        topicSlug: createQuestDto.topicSlug,
        sortOrder: createQuestDto.sortOrder,
        available: createQuestDto.available,
        streakEnabled: createQuestDto.streakEnabled,
        progressTrackingType: createQuestDto.progressTrackingType,
      });
      return this.transformToResponseDto(quest);
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      if (error instanceof PrismaClientKnownRequestError) {
        throw handlePrismaError(error, 'create', 'quest');
      }

      handleServiceError(error, 'Failed to create quest');
    }
  }

  async getQuestById(questId: string): Promise<QuestResponseDto> {
    this.logger.log(`Getting quest ${questId}`);

    const quest = await this.questsRepository.findById(questId);

    if (!quest) {
      throw new NotFoundException('Quest not found');
    }

    return this.transformToResponseDto(quest);
  }

  async getQuests(missionId?: string): Promise<QuestResponseDto[]> {
    this.logger.log(
      missionId ? `Getting quests for mission ${missionId}` : 'Getting all quests',
    );

    const quests = missionId
      ? await this.questsRepository.findByMissionId(missionId)
      : await this.questsRepository.findAll();

    return quests.map((quest) => this.transformToResponseDto(quest));
  }

  async update(
    questId: string,
    updateQuestDto: UpdateQuestDto,
  ): Promise<QuestResponseDto> {
    try {
      const quest = await this.questsRepository.findById(questId);

      if (!quest) {
        throw new NotFoundException('Quest not found');
      }

      const updatedQuest = await this.questsRepository.update(
        questId,
        updateQuestDto,
      );
      return this.transformToResponseDto(updatedQuest);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      if (error instanceof PrismaClientKnownRequestError) {
        throw handlePrismaError(error, 'update', 'quest');
      }

      handleServiceError(error, 'Failed to update quest');
    }
  }

  async remove(questId: string): Promise<void> {
    try {
      const quest = await this.questsRepository.findById(questId);

      if (!quest) {
        throw new NotFoundException('Quest not found');
      }

      await this.questsRepository.delete(questId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      handleServiceError(error, 'Failed to delete quest');
    }
  }

  transformToResponseDto(quest: any, lang?: string): QuestResponseDto {
    const copy = this.gamificationI18n.getQuestCopy(
      quest.slug,
      {
        title: quest.title,
        description: quest.description,
      },
      lang,
    );

    return {
      id: quest.id,
      slug: quest.slug,
      missionId: quest.missionId,
      title: copy.title,
      description: copy.description,
      topicSlug: quest.topicSlug,
      sortOrder: quest.sortOrder,
      available: quest.available,
      streakEnabled: quest.streakEnabled,
      progressTrackingType: quest.progressTrackingType,
      challenges: quest.challenges?.map((challenge: any) =>
        this.transformChallengeToResponseDto(challenge, lang),
      ),
    };
  }

  private transformChallengeToResponseDto(
    challenge: any,
    lang?: string,
  ): QuestChallengeResponseDto {
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
      challengeScope: challenge.challengeScope,
      startDate: challenge.startDate,
      endDate: challenge.endDate,
    };
  }
}
