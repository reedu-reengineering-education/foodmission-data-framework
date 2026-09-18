import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { EventsModule } from '../events/events.module';
import { GamificationWalletService } from './services/gamification-wallet.service';
import { CompletionRewardService } from './services/completion-reward.service';
import { COMPLETION_REWARD_AWARDER } from './completion-reward.types';
import { GamificationOnboardingService } from './services/gamification-onboarding.service';
import { GamificationProfileService } from './services/gamification-profile.service';
import { BadgeService } from './services/badge.service';
import { RewardService } from './services/reward.service';

@Module({
  imports: [DatabaseModule, EventsModule],
  providers: [
    GamificationWalletService,
    CompletionRewardService,
    // Token alias, so RulesService can depend on the contract without importing
    // this file. See completion-reward.types.ts.
    {
      provide: COMPLETION_REWARD_AWARDER,
      useExisting: CompletionRewardService,
    },
    GamificationOnboardingService,
    GamificationProfileService,
    BadgeService,
    RewardService,
  ],
  exports: [
    GamificationWalletService,
    CompletionRewardService,
    COMPLETION_REWARD_AWARDER,
    GamificationOnboardingService,
    GamificationProfileService,
    BadgeService,
    RewardService,
  ],
})
export class GamificationModule {}
