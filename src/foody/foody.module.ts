import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { EventsModule } from '../events/events.module';
import { GamificationModule } from '../gamification/gamification.module';
import { FoodyController } from './controllers/foody.controller';
import { FoodyRepository } from './repositories/foody.repository';
import { FoodyService } from './services/foody.service';

@Module({
  imports: [DatabaseModule, EventsModule, GamificationModule],
  controllers: [FoodyController],
  providers: [FoodyService, FoodyRepository],
  exports: [FoodyService, FoodyRepository],
})
export class FoodyModule {}
