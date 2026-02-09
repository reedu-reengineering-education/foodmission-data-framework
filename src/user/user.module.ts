import { Module } from '@nestjs/common';
import { UserRepository } from './repositories/user.repository';
import { UserController } from './controllers/user.controller';
import { DatabaseModule } from '../database/database.module';
import { UserProfileController } from './controllers/user-profile.controller';
import { UserProfileService } from './services/user-profile.service';

@Module({
  imports: [DatabaseModule],
  controllers: [UserController, UserProfileController],
  providers: [UserRepository, UserProfileService],
  exports: [UserRepository, UserProfileService],
})
export class UserModule {}
