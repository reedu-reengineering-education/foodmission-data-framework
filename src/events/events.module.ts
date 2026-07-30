import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { EventsController } from './controllers/events.controller';
import { ClientEventService } from './services/client-event.service';
import { UserEventService } from './services/user-event.service';

@Module({
  imports: [DatabaseModule],
  controllers: [EventsController],
  providers: [UserEventService, ClientEventService],
  exports: [UserEventService],
})
export class EventsModule {}
