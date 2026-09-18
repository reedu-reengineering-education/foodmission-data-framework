import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { UserEventService } from './services/user-event.service';
import { USER_EVENT_RECORDER } from './user-event-recorder.types';
import { RulesModule } from '../rules/rules.module';

/**
 * Shared ledger writer only — safe to import from Auth/Gamification without
 * mounting HTTP controllers (avoids pulling ThrottlerGuard into lean e2e apps).
 */
@Module({
  imports: [DatabaseModule, RulesModule],
  providers: [
    UserEventService,
    // Token alias, so RulesService can record events without importing this
    // module's implementation. See user-event-recorder.types.ts.
    { provide: USER_EVENT_RECORDER, useExisting: UserEventService },
  ],
  exports: [UserEventService, USER_EVENT_RECORDER],
})
export class EventsModule {}
