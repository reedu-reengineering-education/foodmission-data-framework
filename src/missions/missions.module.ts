import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DatabaseModule } from '../database/database.module';

import { CommonModule } from '../common/common.module';
import { UserRepository } from '../user/repositories/user.repository';
import { MissionsController } from './controllers/missions.controller';
import { MissionsService } from './services/missions.service';
import { MissionsRepository } from './repositories/missions.repository';
import { MissionProgressController } from './mission-progress/controllers/mission-progress.controller';
import { MissionProgressService } from './mission-progress/services/mission-progress.service';
import { MissionProgressRepository } from './mission-progress/repositories/mission-progress.repository';

@Module({
  imports: [DatabaseModule, HttpModule, CommonModule],
  controllers: [MissionsController, MissionProgressController],
  providers: [
    MissionsService,
    MissionsRepository,
    MissionProgressService,
    MissionProgressRepository,
    UserRepository,
  ],
  exports: [MissionsService, MissionsRepository, MissionProgressService, MissionProgressRepository],
})
export class MissionsModule {}
