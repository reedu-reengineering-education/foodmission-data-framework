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
import { MissionResponseDto } from '../dto/response-mission.dto';
import { MissionRepository } from '../repositories/mission.repository';
import { CreateMissionDto } from '../dto/create-mission.dto';
import { UpdateMissionDto } from '../dto/update-mission.dto';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class MissionService {
  private readonly logger = new Logger(MissionService.name);

  constructor(
    private readonly missionRepository: MissionRepository,
    private readonly prisma: PrismaService,
  ) {}

  async create(
    createMissionDto: CreateMissionDto,
    userId: string,
  ): Promise<MissionResponseDto> {
    try {
      const mission = await this.missionRepository.create({
        ...createMissionDto,
        userId,
      });
      return this.transformToResponseDto(mission, userId);
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
    missionId: string,
  ): Promise<MissionResponseDto> {
    this.logger.log(`Getting mission ${missionId}`);

    const mission = await this.missionRepository.findById(missionId);

    if (!mission) {
      throw new NotFoundException('Mission not found');
    }
    return this.transformToResponseDto(mission);
  }

    async getAllMissions(): Promise<MissionResponseDto[]> {
    this.logger.log(`Getting All missions`);

    const missions = await this.missionRepository.findAll();

    if (!missions || missions.length === 0) {
      throw new NotFoundException('No missions found');
    }
    return missions.map((mission) => this.transformToResponseDto(mission));
  }

  async update(
    missionId: string,
    updateMissionDto: UpdateMissionDto,
  ): Promise<MissionResponseDto> {
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
  
  private transformToResponseDto(mission: any, userId?: string): MissionResponseDto {
    return {
      id: mission.id,
      title: mission.title,
      description: mission.description,
      startDate: mission.startDate,
      endDate: mission.endDate,
      progress: mission.missionProgresses?.find((mp) => mp.userId === userId),
      available: mission.available,
    };
  }
}   

