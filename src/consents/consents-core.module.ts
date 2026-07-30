import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { TranslationsModule } from '../translations/translations.module';
import { ConsentsService } from './services/consents.service';
import { ConsentsRepository } from './repositories/consents.repository';

@Module({
  imports: [DatabaseModule, TranslationsModule],
  providers: [ConsentsService, ConsentsRepository],
  exports: [ConsentsService],
})
export class ConsentsCoreModule {}
