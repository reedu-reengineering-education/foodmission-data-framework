import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PaginatedResponseDto } from '../../common/dto/api-response.dto';
import { PaginatedLangQueryDto } from '../../learning/dto/paginated-lang-query.dto';
import { overlayTitles } from '../../learning/utils/overlay-titles';
import { toPaginatedResponseDto } from '../../learning/utils/paginated';
import { TranslationService } from '../../translations/services/translation.service';
import { EventSource, EventType } from '../../events/event-types';
import { UserEventService } from '../../events/services/user-event.service';
import { MissionProgressRepository } from '../repositories/mission-progress.repository';
import { UpdateMissionProgressDto } from '../dto/update-mission-progress.dto';
import { MissionProgressResponseDto } from '../dto/response-mission-progress.dto';

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
      await this.userEventService.record({
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
      await this.userEventService.record({
        userId,
        eventType: EventType.MISSION_UPDATED,
        source: EventSource.MISSION,
        metadata,
        idempotencyKey: `mission-updated:${userId}:${mission.id}:${updated.progress}:${updated.completed}`,
      });
    }

    if (updated.completed && !previous?.completed) {
      await this.userEventService.record({
        userId,
        eventType: EventType.MISSION_COMPLETED,
        source: EventSource.MISSION,
        metadata,
        idempotencyKey: `mission-completed:${userId}:${mission.id}`,
      });
    }

    return this.mapRowsToDtos([updated], lang).then((rows) => rows[0]);
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
