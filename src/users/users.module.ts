import { Module } from '@nestjs/common';
import { UsersRepository } from './repositories/users.repository';
import { UsersController } from './controllers/users.controller';
import { DatabaseModule } from '../database/database.module';
import { UserProfilesController } from './controllers/user-profiles.controller';
import { UserProfilesService } from './services/user-profiles.service';
import { KeycloakAdminModule } from '../keycloak-admin/keycloak-admin.module';

@Module({
  imports: [DatabaseModule, KeycloakAdminModule],
  controllers: [UserProfilesController, UsersController],
  providers: [UsersRepository, UserProfilesService],
  exports: [UsersRepository, UserProfilesService],
})
export class UsersModule {}
