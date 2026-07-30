import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { TranslationsModule } from '../translations/translations.module';
import { ConsentsController } from './controllers/consents.controller';
import { ConsentsService } from './services/consents.service';
import { ConsentsRepository } from './repositories/consents.repository';

@Module({
  imports: [DatabaseModule, TranslationsModule],
  controllers: [ConsentsController],
  providers: [ConsentsService, ConsentsRepository],
  exports: [ConsentsService],
})
export class ConsentsModule {}
