import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { MissionProgressRepository } from '../repositories/mission-progress.repository';
import { UpdateMissionProgressDto } from '../dto/update-mission-progress.dto';
import { MissionProgressResponseDto } from '../dto/response-mission-progress.dto';

@Injectable()
export class MissionProgressService {
  private readonly logger = new Logger(MissionProgressService.name);

  constructor(
    private readonly missionProgressRepository: MissionProgressRepository,
  ) {}

  async getMissionById(
    missionId: string,
    userId: string,
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
      return {
        missionId: mission.id,
        userId,
        completed: false,
        progress: 0,
        missionTitle: mission.title,
      };
    }

    return this.transformToResponseDto(progress);
  }

  async getAllMissionsByUserId(
    userId: string,
  ): Promise<MissionProgressResponseDto[]> {
    this.logger.log(`Getting all missions for user: ${userId}`);

    const progresses =
      await this.missionProgressRepository.findAllByUserId(userId);

    return progresses.map((p) => this.transformToResponseDto(p));
  }

  async update(
    missionId: string,
    updateDto: UpdateMissionProgressDto,
    userId: string,
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

    return this.transformToResponseDto(updated);
  }

  private transformToResponseDto(progress: {
    missionId: string;
    userId: string;
    completed: boolean;
    progress: number;
    mission?: { title?: string } | null;
  }): MissionProgressResponseDto {
    return {
      missionId: progress.missionId,
      userId: progress.userId,
      completed: progress.completed,
      progress: progress.progress,
      missionTitle: progress.mission?.title ?? '',
    };
  }
}
