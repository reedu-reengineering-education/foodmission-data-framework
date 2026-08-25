import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { DatabaseModule } from '../database/database.module';
import { UsersRepository } from '../users/repositories/users.repository';
import { LegalController } from './controllers/legal.controller';
import { LegalRepository } from './repositories/legal.repository';
import { LegalService } from './services/legal.service';
import { LegalConsentGuard } from './guards/legal-consent.guard';

@Module({
  imports: [DatabaseModule, CommonModule],
  controllers: [LegalController],
  providers: [
    LegalRepository,
    LegalService,
    LegalConsentGuard,
    UsersRepository,
  ],
  exports: [LegalService, LegalConsentGuard],
})
export class LegalModule {}
