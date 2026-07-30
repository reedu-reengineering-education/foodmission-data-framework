import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { UserEventService } from './services/user-event.service';

/**
 * Shared ledger writer only — safe to import from Auth/Gamification without
 * mounting HTTP controllers (avoids pulling ThrottlerGuard into lean e2e apps).
 */
@Module({
  imports: [DatabaseModule],
  providers: [UserEventService],
  exports: [UserEventService],
})
export class EventsModule {}
