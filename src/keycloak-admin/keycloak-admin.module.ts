import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { KeycloakAdminService } from './keycloak-admin.service';

/**
 * Separate module for Keycloak Admin operations to avoid circular dependencies.
 * This module can be imported by both AuthModule and UserModule.
 */
@Module({
  imports: [HttpModule],
  providers: [KeycloakAdminService],
  exports: [KeycloakAdminService],
})
export class KeycloakAdminModule {}
