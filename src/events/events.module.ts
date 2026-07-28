import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { UserEventService } from './services/user-event.service';

@Module({
  imports: [DatabaseModule],
  providers: [UserEventService],
  exports: [UserEventService],
})
export class EventsModule {}
