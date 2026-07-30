import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { TranslationsModule } from '../translations/translations.module';
import { UsersModule } from '../users/users.module';
import { ConsentsController } from './controllers/consents.controller';
import { ConsentsService } from './services/consents.service';
import { ConsentsRepository } from './repositories/consents.repository';

@Module({
  imports: [
    DatabaseModule,
    TranslationsModule,
    forwardRef(() => UsersModule),
  ],
  controllers: [ConsentsController],
  providers: [ConsentsService, ConsentsRepository],
  exports: [ConsentsService],
})
export class ConsentsModule {}
