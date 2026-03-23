import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DatabaseModule } from '../database/database.module';

import { CommonModule } from '../common/common.module';
import { UserRepository } from '../user/repositories/user.repository';
import { MissionsController } from './controllers/missions.controller';
import { MissionsService } from './services/missions.service';
import { MissionsRepository } from './repositories/missions.repository';
import { MissionProgressController } from './controllers/mission-progress.controller';
import { MissionProgressService } from './services/mission-progress.service';
import { MissionProgressRepository } from './repositories/mission-progress.repository';

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
  exports: [
    MissionsService,
    MissionsRepository,
    MissionProgressService,
    MissionProgressRepository,
  ],
})
export class MissionsModule {}
