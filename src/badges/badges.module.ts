import { Module } from '@nestjs/common';
import { AfterCommitModule } from '../common/after-commit/after-commit.module';
import { DatabaseModule } from '../database/database.module';
import { EventsModule } from '../events/events.module';
import { GamificationModule } from '../gamification/gamification.module';
import { UsersRepository } from '../users/repositories/users.repository';
import { BadgesController } from './controllers/badges.controller';
import { BadgeRulesService } from './badge-rules.service';
import { BadgesService } from './services/badges.service';
import { BADGE_RULE_EVALUATOR } from './badge-rules.types';

/**
 * Depends on Events and Gamification, never the reverse: `UserEventService`
 * reaches the evaluator through `BADGE_RULE_EVALUATOR` with a lazy `ModuleRef`
 * lookup, so there is no module cycle and `BadgeRulesService` gets plain
 * constructor injection. Same arrangement as QuestsModule.
 */
@Module({
  imports: [
    DatabaseModule,
    EventsModule,
    GamificationModule,
    AfterCommitModule,
  ],
  controllers: [BadgesController],
  providers: [
    BadgesService,
    // DataBaseAuthGuard on the controller resolves the caller's local user
    // through this. Provided here rather than imported, the same way every
    // other guarded module does it.
    UsersRepository,
    BadgeRulesService,
    { provide: BADGE_RULE_EVALUATOR, useExisting: BadgeRulesService },
  ],
  exports: [BadgesService, BadgeRulesService, BADGE_RULE_EVALUATOR],
})
export class BadgesModule {}
