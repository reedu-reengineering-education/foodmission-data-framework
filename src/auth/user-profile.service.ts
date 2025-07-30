import { Injectable } from '@nestjs/common';
import { UserRepository } from '../user/repositories/user.repository';

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
  constructor(
    private readonly userRepository: UserRepository,
  ) {}

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
    let user = await this.userRepository.findByKeycloakId(keycloakUser.sub);

    // If not found, create new user record
    if (!user) {
      user = await this.userRepository.create({
        keycloakId: keycloakUser.sub,
        email: keycloakUser.email,
        firstName: keycloakUser.given_name || '',
        lastName: keycloakUser.family_name || '',
        preferences: {}, // Initialize empty preferences
      });
    }

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
   * Update user preferences (app-specific data)
   */
  async updatePreferences(
    keycloakId: string,
    preferences: any,
  ): Promise<UserProfile> {
    const user = await this.userRepository.findByKeycloakId(keycloakId);
    if (!user) {
      throw new Error('User not found');
    }

    const updatedUser = await this.userRepository.update(user.id, { preferences });

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      keycloakId: updatedUser.keycloakId,
      preferences: updatedUser.preferences as any,
      settings: updatedUser.settings as any,
    };
  }

  /**
   * Update user settings (app-specific data)
   */
  async updateSettings(
    keycloakId: string,
    settings: any,
  ): Promise<UserProfile> {
    const user = await this.userRepository.findByKeycloakId(keycloakId);
    if (!user) {
      throw new Error('User not found');
    }

    const updatedUser = await this.userRepository.update(user.id, { settings });

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      keycloakId: updatedUser.keycloakId,
      preferences: updatedUser.preferences as any,
      settings: updatedUser.settings as any,
    };
  }
}
