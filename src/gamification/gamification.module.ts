import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { GamificationWalletService } from './services/gamification-wallet.service';
import { GamificationOnboardingService } from './services/gamification-onboarding.service';

@Module({
  imports: [DatabaseModule],
  providers: [GamificationWalletService, GamificationOnboardingService],
  exports: [GamificationWalletService, GamificationOnboardingService],
})
export class GamificationModule {}
