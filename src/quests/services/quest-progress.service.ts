import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { GamificationI18nService } from '../../i18n/gamification-i18n.service';
import { QuestProgressRepository } from '../repositories/quest-progress.repository';
import { QuestProgressResponseDto } from '../dto/response-quest-progress.dto';
import { UpdateQuestProgressDto } from '../dto/update-quest-progress.dto';

@Injectable()
export class QuestProgressService {
  private readonly logger = new Logger(QuestProgressService.name);

  constructor(
    private readonly questProgressRepository: QuestProgressRepository,
    private readonly gamificationI18n: GamificationI18nService,
  ) {}

  async getQuestById(
    questId: string,
    userId: string,
    lang?: string,
  ): Promise<QuestProgressResponseDto> {
    this.logger.log(`Getting quest progress ${questId} for user: ${userId}`);

    const progress = await this.questProgressRepository.findByUserIdAndQuestId(
      userId,
      questId,
    );

    if (!progress) {
      throw new NotFoundException('Quest not found');
    }

    if (progress.userId !== userId) {
      throw new ForbiddenException('No permission');
    }

    return this.transformToResponseDto(progress, lang);
  }

  async getAllQuestsByUserId(
    userId: string,
    lang?: string,
  ): Promise<QuestProgressResponseDto[]> {
    this.logger.log(`Getting all quest progress for user: ${userId}`);

    const progresses =
      await this.questProgressRepository.findAllByUserId(userId);

    return progresses.map((progress) =>
      this.transformToResponseDto(progress, lang),
    );
  }

  async update(
    questId: string,
    updateDto: UpdateQuestProgressDto,
    userId: string,
  ): Promise<QuestProgressResponseDto> {
    this.logger.log(`Updating quest progress ${questId} for user: ${userId}`);

    const existing = await this.questProgressRepository.findByUserIdAndQuestId(
      userId,
      questId,
    );

    if (!existing) {
      throw new NotFoundException('Quest not found');
    }

    if (existing.userId !== userId) {
      throw new ForbiddenException('No permission');
    }

    const updated = await this.questProgressRepository.update(
      userId,
      questId,
      updateDto,
    );

    return this.transformToResponseDto(updated);
  }

  private transformToResponseDto(
    progress: {
      questId: string;
      userId: string;
      completed: boolean;
      progress: number;
      currentStreak: number;
      longestStreak: number;
      quest?: { slug: string; title: string; description: string };
    },
    lang?: string,
  ): QuestProgressResponseDto {
    const quest = progress.quest;
    const copy = quest
      ? this.gamificationI18n.getQuestCopy(
          quest.slug,
          {
            title: quest.title,
            description: quest.description,
          },
          lang,
        )
      : { title: '', description: '' };

    return {
      questId: progress.questId,
      userId: progress.userId,
      completed: progress.completed,
      progress: progress.progress,
      currentStreak: progress.currentStreak,
      longestStreak: progress.longestStreak,
      questTitle: copy.title,
    };
  }
}
