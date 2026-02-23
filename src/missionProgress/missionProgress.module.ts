import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DatabaseModule } from '../database/database.module';

import { CommonModule } from '../common/common.module';
import { UserRepository } from '../user/repositories/user.repository';
import { MissionRepository } from '../mission/repositories/mission.repository';
import { MissionProgressController } from './controllers/missionProgresscontroller';
import { MissionProgressService } from './services/missionProgress.service';
import { MissionProgressRepository } from './repositories/missionProgress.repository';


@Module({
  imports: [DatabaseModule, HttpModule, CommonModule, MissionProgressModule],
  controllers: [MissionProgressController],
  providers: [MissionProgressService, MissionProgressRepository, UserRepository, MissionRepository],
  exports: [MissionProgressService, MissionProgressRepository],
})
export class MissionProgressModule {}
