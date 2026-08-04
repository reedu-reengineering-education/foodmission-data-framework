import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  handlePrismaError,
  handleServiceError,
} from '../../common/utils/error.utils';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { MissionsResponseDto } from '../dto/response-missions.dto';
import { MissionsRepository } from '../repositories/missions.repository';
import { CreateMissionsDto } from '../dto/create-missions.dto';
import { UpdateMissionsDto } from '../dto/update-missions.dto';
import { ListMissionsQueryDto } from '../dto/list-missions-query.dto';
import { PrismaService } from '../../database/prisma.service';
import { TranslationService } from '../../translations/services/translation.service';
import { DEFAULT_LOCALE } from '../../i18n/constants';

@Injectable()
export class MissionsService {
  private readonly logger = new Logger(MissionsService.name);

  constructor(
    private readonly missionRepository: MissionsRepository,
    private readonly prisma: PrismaService,
    private readonly translationService: TranslationService,
  ) {}

  async create(
    createMissionDto: CreateMissionsDto,
  ): Promise<MissionsResponseDto> {
    try {
      const mission = await this.missionRepository.create({
        ...createMissionDto,
      });
      return this.transformToResponseDto(mission);
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      if (error instanceof PrismaClientKnownRequestError) {
        const businessException = handlePrismaError(error, 'create', 'mission');
        throw businessException;
      }

      handleServiceError(error, 'Failed to create mission');
    }
  }

  async getMissionById(
    codeOrId: string,
    lang?: string,
  ): Promise<MissionsResponseDto> {
    this.logger.log(`Getting mission ${codeOrId}`);

    const mission = await this.missionRepository.findByCodeOrId(codeOrId);

    if (!mission) {
      throw new NotFoundException('Mission not found');
    }
    const [mapped] = await this.overlayTranslations([mission], lang);
    return mapped;
  }

  async getAllMissions(
    query: ListMissionsQueryDto = {},
    isAdmin = false,
  ): Promise<MissionsResponseDto[]> {
    this.logger.log(`Getting All missions`);

    const available =
      isAdmin && query.available !== undefined ? query.available : true;

    const missions = await this.missionRepository.findAll({
      dimensionCode: query.dimensionCode,
      level: query.level,
      available,
    });

    if (!missions || missions.length === 0) {
      throw new NotFoundException('No missions found');
    }
    return this.overlayTranslations(missions, query.lang);
  }

  async update(
    missionId: string,
    updateMissionDto: UpdateMissionsDto,
  ): Promise<MissionsResponseDto> {
    try {
      const updatedMission = await this.missionRepository.update(
        missionId,
        updateMissionDto,
      );
      return this.transformToResponseDto(updatedMission);
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      if (error instanceof PrismaClientKnownRequestError) {
        const businessException = handlePrismaError(error, 'update', 'mission');
        throw businessException;
      }
      handleServiceError(error, 'Failed to update mission');
    }
  }

  async remove(missionId: string): Promise<void> {
    try {
      await this.missionRepository.delete(missionId);
    } catch (error) {
      handleServiceError(error, 'Failed to delete Mission');
    }
  }

  private async overlayTranslations(
    missions: any[],
    lang?: string,
  ): Promise<MissionsResponseDto[]> {
    const locale = this.translationService.resolveLocale(lang);
    if (locale === DEFAULT_LOCALE || missions.length === 0) {
      return missions.map((m) => this.transformToResponseDto(m));
    }

    const overlay = await this.translationService.resolveMany(
      'Mission',
      missions.map((m) => m.id),
      locale,
      ['title', 'goal', 'whyItMatters'],
      Object.fromEntries(
        missions.map((m) => [
          m.id,
          {
            title: m.title,
            goal: m.goal,
            whyItMatters: m.whyItMatters,
          },
        ]),
      ),
    );

    return missions.map((m) =>
      this.transformToResponseDto({
        ...m,
        title: overlay[m.id]?.title ?? m.title,
        goal: overlay[m.id]?.goal ?? m.goal,
        whyItMatters: overlay[m.id]?.whyItMatters ?? m.whyItMatters,
      }),
    );
  }

  private transformToResponseDto(mission: any): MissionsResponseDto {
    return {
      id: mission.id,
      code: mission.code,
      dimensionId: mission.dimensionId,
      topicId: mission.topicId,
      level: mission.level,
      title: mission.title,
      duration: mission.duration,
      goal: mission.goal,
      whyItMatters: mission.whyItMatters,
      health: mission.health,
      foodChoice: mission.foodChoice,
      foodWaste: mission.foodWaste,
      progress:
        mission.missionProgresses?.reduce((acc, cp) => acc + cp.progress, 0) ||
        0,
      available: mission.available,
    };
  }
}
