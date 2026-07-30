import { Module } from '@nestjs/common';
import { EventsController } from './controllers/events.controller';
import { EventsModule } from './events.module';
import { ClientEventService } from './services/client-event.service';

/** Authenticated client event HTTP API (`POST /events`). */
@Module({
  imports: [EventsModule],
  controllers: [EventsController],
  providers: [ClientEventService],
})
export class EventsApiModule {}
