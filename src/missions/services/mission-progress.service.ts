import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { RewardSourceType, WalletCurrency } from '@prisma/client';
import { PaginatedResponseDto } from '../../common/dto/api-response.dto';
import { PaginatedLangQueryDto } from '../../learning/dto/paginated-lang-query.dto';
import { overlayTitles } from '../../learning/utils/overlay-titles';
import { toPaginatedResponseDto } from '../../learning/utils/paginated';
import { TranslationService } from '../../translations/services/translation.service';
import { GamificationWalletService } from '../../gamification/services/gamification-wallet.service';
import { EventSource, EventType } from '../../events/event-types';
import {
  RecordUserEventInput,
  UserEventService,
} from '../../events/services/user-event.service';
import { MissionProgressRepository } from '../repositories/mission-progress.repository';
import { UpdateMissionProgressDto } from '../dto/update-mission-progress.dto';
import {
  MissionProgressResponseDto,
  MissionRewardDto,
} from '../dto/response-mission-progress.dto';

type MissionProgressRow = {
  missionId: string;
  userId: string;
  completed: boolean;
  progress: number;
  mission?: { title?: string } | null;
};

@Injectable()
export class MissionProgressService {
  private readonly logger = new Logger(MissionProgressService.name);

  constructor(
    private readonly missionProgressRepository: MissionProgressRepository,
    private readonly translationService: TranslationService,
    private readonly userEventService: UserEventService,
    private readonly walletService: GamificationWalletService,
  ) {}

  async getMissionById(
    codeOrId: string,
    userId: string,
    lang?: string,
  ): Promise<MissionProgressResponseDto> {
    this.logger.log(`Getting mission ${codeOrId} for user: ${userId}`);

    const mission = await this.requireMission(codeOrId);

    const progress =
      await this.missionProgressRepository.findByUserIdAndMissionId(
        userId,
        mission.id,
      );

    if (!progress) {
      const titles = await overlayTitles(
        this.translationService,
        'Mission',
        [{ id: mission.id, title: mission.title }],
        lang,
      );
      return {
        missionId: mission.id,
        userId,
        completed: false,
        progress: 0,
        missionTitle: titles[mission.id],
      };
    }

    return this.mapRowsToDtos([progress], lang).then((rows) => rows[0]);
  }

  async getAllMissionsByUserId(
    userId: string,
    lang?: string,
  ): Promise<MissionProgressResponseDto[]> {
    this.logger.log(`Getting all missions for user: ${userId}`);

    const progresses =
      await this.missionProgressRepository.findAllByUserId(userId);

    return this.mapRowsToDtos(progresses, lang);
  }

  async getAllPaginated(
    query: PaginatedLangQueryDto,
  ): Promise<PaginatedResponseDto<MissionProgressResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const { rows, total } =
      await this.missionProgressRepository.findAllPaginated(page, limit);
    const data = await this.mapRowsToDtos(rows, query.lang);
    return toPaginatedResponseDto(data, total, page, limit);
  }

  async update(
    codeOrId: string,
    updateDto: UpdateMissionProgressDto,
    userId: string,
    lang?: string,
  ): Promise<MissionProgressResponseDto> {
    this.logger.log(`Updating mission ${codeOrId} for user: ${userId}`);

    const mission = await this.requireMission(codeOrId);

    const previous =
      await this.missionProgressRepository.findByUserIdAndMissionId(
        userId,
        mission.id,
      );

    const updated = await this.missionProgressRepository.upsert(
      userId,
      mission.id,
      updateDto,
    );

    const wasIdle =
      previous == null || (previous.progress === 0 && !previous.completed);
    const isActive = updated.progress > 0 || updated.completed;
    const metadata = {
      missionId: mission.id,
      missionCode: mission.code,
      source: EventSource.API,
      body: {
        ...(updateDto.progress !== undefined
          ? { progress: updateDto.progress }
          : {}),
        ...(updateDto.completed !== undefined
          ? { completed: updateDto.completed }
          : {}),
      },
    };

    if (wasIdle && isActive) {
      await this.emitProgressEvent({
        userId,
        eventType: EventType.MISSION_STARTED,
        source: EventSource.MISSION,
        metadata,
        idempotencyKey: `mission-started:${userId}:${mission.id}`,
      });
    } else if (
      previous != null &&
      (previous.progress !== updated.progress ||
        previous.completed !== updated.completed)
    ) {
      await this.emitProgressEvent({
        userId,
        eventType: EventType.MISSION_UPDATED,
        source: EventSource.MISSION,
        metadata,
        idempotencyKey: `mission-updated:${userId}:${mission.id}:${updated.progress}:${updated.completed}`,
      });
    }

    if (updated.completed && !previous?.completed) {
      await this.emitProgressEvent({
        userId,
        eventType: EventType.MISSION_COMPLETED,
        source: EventSource.MISSION,
        metadata,
        idempotencyKey: `mission-completed:${userId}:${mission.id}`,
      });
    }

    const reward = await this.awardCompletionReward(
      userId,
      mission,
      updated.completed && !previous?.completed,
    );

    const dto = await this.mapRowsToDtos([updated], lang).then(
      (rows) => rows[0],
    );
    return plainToInstance(MissionProgressResponseDto, {
      ...dto,
      reward,
    });
  }

  /**
   * Credits the mission's reward to the user's gamification wallet the first
   * time the mission is completed. Best-effort: a wallet failure must not fail
   * the progress update, which is already persisted.
   */
  private async awardCompletionReward(
    userId: string,
    mission: {
      id: string;
      code: string;
      reward?: { id: string; xp: number | null; points: number | null } | null;
    },
    justCompleted: boolean,
  ): Promise<MissionRewardDto | null> {
    if (!justCompleted) {
      this.logger.debug(
        `Mission ${mission.code} reward not awarded: not first completion`,
      );
      return null;
    }
    if (!mission.reward) {
      this.logger.debug(`Mission ${mission.code} has no reward attached`);
      return null;
    }
    const { reward } = mission;
    const base = {
      userId,
      rewardId: reward.id,
      sourceType: RewardSourceType.MISSION,
      sourceId: mission.id,
      reason: `Mission ${mission.code} completed`,
    };
    try {
      if (reward.xp) {
        await this.walletService.award({
          ...base,
          currency: WalletCurrency.XP,
          amount: reward.xp,
        });
      }
      if (reward.points) {
        await this.walletService.award({
          ...base,
          currency: WalletCurrency.POINTS,
          amount: reward.points,
        });
      }
    } catch (error) {
      this.logger.error(
        `Failed to award mission ${mission.code} reward to user ${userId}`,
        error instanceof Error ? error.stack : error,
      );
      return null;
    }
    return { xp: reward.xp, points: reward.points };
  }

  /**
   * Best-effort progress event emission. Progress is already persisted by the
   * time this runs — a failure here must not surface as an update failure
   * (the caller would see an error for a write that actually succeeded).
   */
  private async emitProgressEvent(input: RecordUserEventInput): Promise<void> {
    try {
      await this.userEventService.record(input);
    } catch (error) {
      this.logger.error(
        `Failed to record ${input.eventType} for user ${input.userId}`,
        error instanceof Error ? error.stack : error,
      );
    }
  }

  private async requireMission(codeOrId: string) {
    const mission =
      await this.missionProgressRepository.findMissionByCodeOrId(codeOrId);
    if (!mission) {
      throw new NotFoundException('Mission not found');
    }
    return mission;
  }

  private async mapRowsToDtos(
    rows: MissionProgressRow[],
    lang?: string,
  ): Promise<MissionProgressResponseDto[]> {
    const titles = await overlayTitles(
      this.translationService,
      'Mission',
      rows.map((row) => ({
        id: row.missionId,
        title: row.mission?.title ?? '',
      })),
      lang,
    );

    return rows.map((row) => ({
      missionId: row.missionId,
      userId: row.userId,
      completed: row.completed,
      progress: row.progress,
      missionTitle: titles[row.missionId] ?? row.mission?.title ?? '',
    }));
  }
}
