import { Module } from '@nestjs/common';
import { UserRepository } from './repositories/user.repository';
import { UserController } from './controllers/user.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [UserController],
  providers: [UserRepository],
  exports: [UserRepository],
})
export class UserModule {}
