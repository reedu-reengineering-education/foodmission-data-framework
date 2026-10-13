import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { RewardSourceType } from '@prisma/client';
import { PaginatedResponseDto } from '../../common/dto/api-response.dto';
import { PaginatedLangQueryDto } from '../../learning/dto/paginated-lang-query.dto';
import { overlayTitles } from '../../learning/utils/overlay-titles';
import { toPaginatedResponseDto } from '../../learning/utils/paginated';
import { TranslationService } from '../../translations/services/translation.service';
import { CompletionRewardService } from '../../gamification/services/completion-reward.service';
import { EventSource, EventType } from '../../events/event-types';
import { ProgressStatus } from '../../common/progress-status';
import { progressEventKey } from '../../common/progress-event-keys';
import {
  RecordUserEventInput,
  UserEventService,
} from '../../events/services/user-event.service';
import { MissionProgressRepository } from '../repositories/mission-progress.repository';
import { UpdateMissionProgressDto } from '../dto/update-mission-progress.dto';
import { MissionProgressResponseDto } from '../dto/response-mission-progress.dto';

type MissionProgressRow = {
  missionId: string;
  userId: string;
  completed: boolean;
  progress: number;
  status?: string;
  startedAt?: Date | null;
  mission?: { title?: string } | null;
};

@Injectable()
export class MissionProgressService {
  private readonly logger = new Logger(MissionProgressService.name);

  constructor(
    private readonly missionProgressRepository: MissionProgressRepository,
    private readonly translationService: TranslationService,
    private readonly userEventService: UserEventService,
    private readonly completionRewardService: CompletionRewardService,
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
        status: ProgressStatus.NOT_STARTED,
        missionTitle: titles[mission.id],
        startedAt: null,
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

    if (updateDto.failed && updateDto.completed) {
      throw new BadRequestException(
        'A mission cannot be failed and completed at once',
      );
    }
    if (previous?.status === ProgressStatus.FAILED) {
      throw new BadRequestException(
        'This mission has failed; restart it to try again',
      );
    }
    if (updateDto.failed && previous?.completed) {
      throw new BadRequestException('A completed mission cannot be failed');
    }

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
        ...(updateDto.failed !== undefined ? { failed: updateDto.failed } : {}),
      },
    };

    if (wasIdle && isActive) {
      await this.emitProgressEvent({
        userId,
        eventType: EventType.MISSION_STARTED,
        source: EventSource.MISSION,
        metadata,
        idempotencyKey: progressEventKey({
          kind: 'mission',
          transition: 'started',
          userId,
          id: mission.id,
          startedAt: updated.startedAt,
        }),
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
        idempotencyKey: progressEventKey({
          kind: 'mission',
          transition: 'updated',
          userId,
          id: mission.id,
          startedAt: updated.startedAt,
          progress: updated.progress,
          completed: updated.completed,
        }),
      });
    }

    if (updated.status === ProgressStatus.FAILED) {
      // Same key as the rules engine, so a manual and a rule-based failure
      // record one event.
      await this.emitProgressEvent({
        userId,
        eventType: EventType.MISSION_FAILED,
        source: EventSource.MISSION,
        metadata,
        idempotencyKey: progressEventKey({
          kind: 'mission',
          transition: 'failed',
          userId,
          id: mission.id,
          startedAt: updated.startedAt,
        }),
      });
    }

    const justCompleted = updated.completed && !previous?.completed;

    if (justCompleted) {
      await this.emitProgressEvent({
        userId,
        eventType: EventType.MISSION_COMPLETED,
        source: EventSource.MISSION,
        metadata,
        idempotencyKey: progressEventKey({
          kind: 'mission',
          transition: 'completed',
          userId,
          id: mission.id,
        }),
      });
    }

    const reward = justCompleted
      ? await this.completionRewardService.awardCompletion({
          userId,
          sourceType: RewardSourceType.MISSION,
          sourceId: mission.id,
          code: mission.code,
          reward: mission.reward,
        })
      : null;

    const dto = await this.mapRowsToDtos([updated], lang).then(
      (rows) => rows[0],
    );
    return plainToInstance(MissionProgressResponseDto, {
      ...dto,
      reward,
    });
  }

  /**
   * Restarts a FAILED mission as a new attempt: progress 0, status NOT_STARTED
   * and `startedAt` now, so its rule window starts over and events from the
   * failed attempt no longer count. Only failed missions can be restarted.
   */
  async restart(
    codeOrId: string,
    userId: string,
    lang?: string,
  ): Promise<MissionProgressResponseDto> {
    this.logger.log(`Restarting mission ${codeOrId} for user: ${userId}`);

    const mission = await this.requireMission(codeOrId);
    const previous =
      await this.missionProgressRepository.findByUserIdAndMissionId(
        userId,
        mission.id,
      );
    if (previous?.status !== ProgressStatus.FAILED) {
      throw new BadRequestException('Only a failed mission can be restarted');
    }

    const restarted = await this.missionProgressRepository.restart(
      userId,
      mission.id,
    );

    await this.emitProgressEvent({
      userId,
      eventType: EventType.MISSION_RESTARTED,
      source: EventSource.MISSION,
      metadata: {
        missionId: mission.id,
        missionCode: mission.code,
        source: EventSource.API,
        previousStartedAt: previous.startedAt?.toISOString() ?? null,
      },
      idempotencyKey: progressEventKey({
        kind: 'mission',
        transition: 'restarted',
        userId,
        id: mission.id,
        startedAt: restarted.startedAt,
      }),
    });

    return this.mapRowsToDtos([restarted], lang).then((rows) => rows[0]);
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
      status: row.status ?? ProgressStatus.NOT_STARTED,
      missionTitle: titles[row.missionId] ?? row.mission?.title ?? '',
      startedAt: row.startedAt ?? null,
    }));
  }
}
