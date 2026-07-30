import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { UsersRepository } from '../users/repositories/users.repository';
import { ConsentsCoreModule } from './consents-core.module';
import { ConsentsController } from './controllers/consents.controller';

@Module({
  imports: [ConsentsCoreModule, DatabaseModule],
  controllers: [ConsentsController],
  providers: [UsersRepository],
  exports: [ConsentsCoreModule],
})
export class ConsentsModule {}
