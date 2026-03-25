import { Module } from '@nestjs/common';
import { UsersRepository } from './repositories/users.repository';
import { UsersController } from './controllers/users.controller';
import { DatabaseModule } from '../database/database.module';
import { UsersProfileController } from './controllers/users-profile.controller';
import { UsersProfileService } from './services/users-profile.service';
import { KeycloakAdminModule } from '../keycloak-admin/keycloak-admin.module';

@Module({
  imports: [DatabaseModule, KeycloakAdminModule],
  controllers: [UsersProfileController, UsersController],
  providers: [UsersRepository, UsersProfileService],
  exports: [UsersRepository, UsersProfileService],
})
export class UsersModule {}
