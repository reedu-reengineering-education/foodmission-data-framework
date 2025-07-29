import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  keycloakId: string;
  preferences?: any; // App-specific user preferences
  settings?: any; // App-specific user settings
}

@Injectable()
export class UserProfileService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get or create user profile based on Keycloak token
   * This is called automatically when a user accesses protected endpoints
   */
  async getOrCreateProfile(keycloakUser: {
    sub: string;
    email: string;
    given_name?: string;
    family_name?: string;
  }): Promise<UserProfile> {
    // Try to find existing user by Keycloak ID
    let user = await this.prisma.user.findUnique({
      where: { keycloakId: keycloakUser.sub },
    });

    // If not found, create new user record
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          keycloakId: keycloakUser.sub,
          email: keycloakUser.email,
          firstName: keycloakUser.given_name || '',
          lastName: keycloakUser.family_name || '',
          preferences: {}, // Initialize empty preferences
        },
      });
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      keycloakId: user.keycloakId,
    };
  }

  /**
   * Update user preferences (app-specific data)
   */
  async updatePreferences(
    keycloakId: string,
    preferences: any,
  ): Promise<UserProfile> {
    const user = await this.prisma.user.update({
      where: { keycloakId },
      data: { preferences },
    });

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      keycloakId: user.keycloakId,
      preferences: user.preferences as any,
      settings: user.settings as any,
    };
  }

  /**
   * Update user settings (app-specific data)
   */
  async updateSettings(
    keycloakId: string,
    settings: any,
  ): Promise<UserProfile> {
    const user = await this.prisma.user.update({
      where: { keycloakId },
      data: { settings },
    });

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      keycloakId: user.keycloakId,
      preferences: user.preferences as any,
      settings: user.settings as any,
    };
  }
}
