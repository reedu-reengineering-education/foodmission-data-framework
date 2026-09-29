import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { CommonModule } from '../common/common.module';
import { EventsModule } from '../events/events.module';
import { GamificationModule } from '../gamification/gamification.module';
import { UsersRepository } from '../users/repositories/users.repository';
import { FoodyController } from './controllers/foody.controller';
import { FoodyRepository } from './repositories/foody.repository';
import { FoodyService } from './services/foody.service';

@Module({
  imports: [DatabaseModule, CommonModule, EventsModule, GamificationModule],
  controllers: [FoodyController],
  providers: [FoodyService, FoodyRepository, UsersRepository],
  exports: [FoodyService, FoodyRepository],
})
export class FoodyModule {}
