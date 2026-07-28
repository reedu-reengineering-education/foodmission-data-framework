import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { EventsModule } from '../events/events.module';
import { GamificationWalletService } from './services/gamification-wallet.service';
import { GamificationOnboardingService } from './services/gamification-onboarding.service';
import { GamificationProfileService } from './services/gamification-profile.service';
import { BadgeService } from './services/badge.service';

@Module({
  imports: [DatabaseModule, EventsModule],
  providers: [
    GamificationWalletService,
    GamificationOnboardingService,
    GamificationProfileService,
    BadgeService,
  ],
  exports: [
    GamificationWalletService,
    GamificationOnboardingService,
    GamificationProfileService,
    BadgeService,
  ],
})
export class GamificationModule {}
