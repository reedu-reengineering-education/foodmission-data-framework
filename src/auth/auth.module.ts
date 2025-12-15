import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  KeycloakConnectModule,
  ResourceGuard,
  RoleGuard,
  AuthGuard,
} from 'nest-keycloak-connect';
import { AuthController } from './auth.controller';
import { UserProfileService } from './user-profile.service';
import { UserContextService } from './user-context.service';
import { DatabaseModule } from '../database/database.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    DatabaseModule,
    UserModule,
    ConfigModule,
    KeycloakConnectModule.register({
      authServerUrl: process.env.KEYCLOAK_BASE_URL!,
      realm: process.env.KEYCLOAK_REALM!,
      clientId: process.env.KEYCLOAK_CLIENT_ID!,
      secret: process.env.KEYCLOAK_CLIENT_SECRET!,
      // Stateless configuration - bearer tokens only, no sessions
      bearerOnly: true,
      verifyTokenAudience: false,
    }),
  ],
  controllers: [AuthController],
  providers: [
    UserProfileService,
    UserContextService,
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
  exports: [UserProfileService, UserContextService],
})
export class AuthModule {}
