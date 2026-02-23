import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DatabaseModule } from '../database/database.module';

import { CommonModule } from '../common/common.module';
import { UserRepository } from '../user/repositories/user.repository';
import { MissionController } from './controllers/mission.controller';
import { MissionService } from './services/mission.service';
import { MissionRepository } from './repositories/mission.repository';

@Module({
  imports: [DatabaseModule, HttpModule, CommonModule, MissionModule],
  controllers: [MissionController],
  providers: [MissionService, MissionRepository, UserRepository],
  exports: [MissionService, MissionRepository],
})
export class MissionModule {}
