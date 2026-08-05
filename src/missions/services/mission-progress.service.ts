import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PaginatedResponseDto } from '../../common/dto/api-response.dto';
import { PaginatedLangQueryDto } from '../../learning/dto/paginated-lang-query.dto';
import { overlayTitles } from '../../learning/utils/overlay-titles';
import { toPaginatedResponseDto } from '../../learning/utils/paginated';
import { TranslationService } from '../../translations/services/translation.service';
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
  ) {}

  async getMissionById(
    missionId: string,
    userId: string,
    lang?: string,
  ): Promise<MissionProgressResponseDto> {
    this.logger.log(`Getting mission ${missionId} for user: ${userId}`);

    const mission =
      await this.missionProgressRepository.findMissionById(missionId);
    if (!mission) {
      throw new NotFoundException('Mission not found');
    }

    const progress =
      await this.missionProgressRepository.findByUserIdAndMissionId(
        userId,
        missionId,
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
    missionId: string,
    updateDto: UpdateMissionProgressDto,
    userId: string,
    lang?: string,
  ): Promise<MissionProgressResponseDto> {
    this.logger.log(`Updating mission ${missionId} for user: ${userId}`);

    const mission =
      await this.missionProgressRepository.findMissionById(missionId);
    if (!mission) {
      throw new NotFoundException('Mission not found');
    }

    const updated = await this.missionProgressRepository.upsert(
      userId,
      missionId,
      updateDto,
    );

    return this.mapRowsToDtos([updated], lang).then((rows) => rows[0]);
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
