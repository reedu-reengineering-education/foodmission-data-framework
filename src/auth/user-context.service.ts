import { Injectable } from '@nestjs/common';
import { UserProfileService } from '../user/services/user-profile.service';

/**
 * Service to handle user context resolution between Keycloak IDs and internal user IDs
 * This service provides a clean abstraction for the common pattern of:
 * 1. Getting keycloakId from JWT token
 * 2. Resolving to internal userId when needed for database operations
 */
@Injectable()
export class UserContextService {
  constructor(private readonly userProfileService: UserProfileService) {}

  /**
   * Extract keycloak ID from request object
   * This is the standard way to get user identity from JWT tokens
   */
  getKeycloakIdFromRequest(req: any): string {
    const keycloakId = req.user?.sub;
    if (!keycloakId) {
      throw new Error('User not authenticated - no keycloak ID found');
    }
    return keycloakId;
  }

  /**
   * Get internal user ID from request (via keycloak ID lookup)
   * Use this when you need the database primary key for operations
   */
  async getUserIdFromRequest(req: any): Promise<string> {
    const keycloakId = this.getKeycloakIdFromRequest(req);
    return this.userProfileService.getUserIdFromKeycloakId(keycloakId);
  }

  /**
   * Get full user profile from request
   * Use this when you need complete user information
   */
  async getUserProfileFromRequest(req: any) {
    const keycloakId = this.getKeycloakIdFromRequest(req);
    return this.userProfileService.getOrCreateProfile({
      sub: keycloakId,
      email: req.user?.email || '',
      given_name: req.user?.given_name,
      family_name: req.user?.family_name,
    });
  }
}
