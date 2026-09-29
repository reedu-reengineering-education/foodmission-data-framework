import { Module } from '@nestjs/common';
import { AfterCommitModule } from '../common/after-commit/after-commit.module';
import { DatabaseModule } from '../database/database.module';
import { EventsModule } from '../events/events.module';
import { GamificationModule } from '../gamification/gamification.module';
import { QuestProgressService } from './quest-progress.service';
import { QUEST_PROGRESS_RECOMPUTER } from './quest-progress.types';

/**
 * Depends on Events and Gamification, never the reverse: `UserEventService`
 * reaches this service through `QUEST_PROGRESS_RECOMPUTER` with a lazy
 * `ModuleRef` lookup, so there is no module cycle and `QuestProgressService`
 * itself gets plain constructor injection.
 */
@Module({
  imports: [
    DatabaseModule,
    EventsModule,
    GamificationModule,
    AfterCommitModule,
  ],
  providers: [
    QuestProgressService,
    { provide: QUEST_PROGRESS_RECOMPUTER, useExisting: QuestProgressService },
  ],
  exports: [QuestProgressService, QUEST_PROGRESS_RECOMPUTER],
})
export class QuestsModule {}
