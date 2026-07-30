import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { DatabaseModule } from '../database/database.module';
import { UsersRepository } from '../users/repositories/users.repository';
import { EventsController } from './controllers/events.controller';
import { EventsModule } from './events.module';
import { ClientEventService } from './services/client-event.service';

/** Authenticated client event HTTP API (`POST /events`). */
@Module({
  imports: [DatabaseModule, CommonModule, EventsModule],
  controllers: [EventsController],
  providers: [ClientEventService, UsersRepository],
})
export class EventsApiModule {}
