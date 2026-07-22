import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { EventsModule } from '../events/events.module';
import { GamificationWalletService } from './services/gamification-wallet.service';
import { GamificationOnboardingService } from './services/gamification-onboarding.service';
import { GamificationProfileService } from './services/gamification-profile.service';

@Module({
  imports: [DatabaseModule, EventsModule],
  providers: [
    GamificationWalletService,
    GamificationOnboardingService,
    GamificationProfileService,
  ],
  exports: [
    GamificationWalletService,
    GamificationOnboardingService,
    GamificationProfileService,
  ],
})
export class GamificationModule {}
