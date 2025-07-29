import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  KeycloakConnectModule,
  ResourceGuard,
  RoleGuard,
  AuthGuard,
  RoleMerge,
} from 'nest-keycloak-connect';
import { AuthController } from './auth.controller';
import { UserProfileService } from './user-profile.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [
    DatabaseModule,
    ConfigModule,
    KeycloakConnectModule.register({
      authServerUrl: process.env.KEYCLOAK_AUTH_SERVER_URL || 'http://localhost:8080',
      realm: process.env.KEYCLOAK_REALM || 'foodmission',
      clientId: process.env.KEYCLOAK_CLIENT_ID || 'foodmission-api',
      secret: process.env.KEYCLOAK_CLIENT_SECRET || '',
      // Stateless configuration - bearer tokens only, no sessions
      bearerOnly: true,
      verifyTokenAudience: false
    }),
  ],
  controllers: [AuthController],
  providers: [
    UserProfileService,
    // Global guards for automatic JWT validation
    {
      provide: 'APP_GUARD',
      useClass: AuthGuard,
    },
    {
      provide: 'APP_GUARD',
      useClass: ResourceGuard,
    },
    {
      provide: 'APP_GUARD',
      useClass: RoleGuard,
    },
  ],
  exports: [UserProfileService],
})
export class AuthModule { }