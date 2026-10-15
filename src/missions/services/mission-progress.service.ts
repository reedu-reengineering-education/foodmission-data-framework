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
import { RulesService } from '../../rules/rules.service';
import { isValidInputValue } from '../../rules/rule-evaluator';
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
  inputs?: unknown;
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
    private readonly rulesService: RulesService,
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
   * Starts a mission of the user's current quest. Selecting a quest starts
   * nothing; the user starts each mission, which opens its rule window from
   * now. Starting an already started mission returns it unchanged (use
   * restart for a failed one). `inputs` are the numbers the mission's rule
   * asks for (e.g. last week's meat meals); they only apply to a new start.
   */
  async start(
    codeOrId: string,
    userId: string,
    lang?: string,
    inputs?: Record<string, number>,
  ): Promise<MissionProgressResponseDto> {
    this.logger.log(`Starting mission ${codeOrId} for user: ${userId}`);

    const mission = await this.requireMission(codeOrId);
    if (
      !(await this.missionProgressRepository.isInCurrentQuest(
        userId,
        mission.code,
      ))
    ) {
      throw new BadRequestException(
        'This mission is not part of your current quest',
      );
    }
    const validInputs = this.validateInputs(mission.code, inputs);

    const { row, created } = await this.missionProgressRepository.start(
      userId,
      mission.id,
      validInputs,
    );

    if (created) {
      await this.emitProgressEvent({
        userId,
        eventType: EventType.MISSION_STARTED,
        source: EventSource.MISSION,
        metadata: {
          missionId: mission.id,
          missionCode: mission.code,
          source: EventSource.API,
        },
        idempotencyKey: progressEventKey({
          kind: 'mission',
          transition: 'started',
          userId,
          id: mission.id,
          startedAt: row.startedAt,
        }),
      });
    }

    return this.mapRowsToDtos([row], lang).then((rows) => rows[0]);
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
    inputs?: Record<string, number>,
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
    const validInputs = this.validateInputs(mission.code, inputs);

    const restarted = await this.missionProgressRepository.restart(
      userId,
      mission.id,
      validInputs,
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

  /**
   * Checks the numbers sent on start against the inputs the mission's rule
   * declares: known names, integers within bounds, and every input without a
   * fallback present. Returns what to store, or null for none.
   */
  private validateInputs(
    missionCode: string,
    inputs: Record<string, number> | undefined,
  ): Record<string, number> | null {
    const definitions = this.rulesService.getMissionRuleInputs(missionCode);
    const given = Object.entries(inputs ?? {});

    if (given.length > 0 && !definitions) {
      throw new BadRequestException('This mission takes no inputs');
    }
    for (const [name, value] of given) {
      const definition = definitions?.[name];
      if (!definition) {
        throw new BadRequestException(
          `Unknown input for this mission: ${name}`,
        );
      }
      if (!isValidInputValue(definition, value)) {
        throw new BadRequestException(
          `Input ${name} must be a whole number` +
            (definition.min != null || definition.max != null
              ? ` from ${definition.min ?? '-∞'} to ${definition.max ?? '∞'}`
              : ''),
        );
      }
    }
    const missing = Object.entries(definitions ?? {})
      .filter(
        ([name, definition]) =>
          !definition.fallback && !(name in (inputs ?? {})),
      )
      .map(([name]) => name);
    if (missing.length > 0) {
      throw new BadRequestException(
        `This mission needs inputs: ${missing.join(', ')}`,
      );
    }
    return given.length > 0 ? Object.fromEntries(given) : null;
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
      inputs: isNumberRecord(row.inputs) ? row.inputs : null,
    }));
  }
}

function isNumberRecord(value: unknown): value is Record<string, number> {
  return (
    value != null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.values(value).every((v) => typeof v === 'number')
  );
}
