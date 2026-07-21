import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { GamificationWalletService } from './services/gamification-wallet.service';

@Module({
  imports: [DatabaseModule],
  providers: [GamificationWalletService],
  exports: [GamificationWalletService],
})
export class GamificationModule {}
