import { Injectable, BadRequestException } from '@nestjs/common';
import { UserRepository } from '../repositories/user.repository';

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  keycloakId: string;
  preferences?: Record<string, unknown>;
  settings?: Record<string, unknown>;
  username?: string;
  dateOfBirth?: string;
  country?: string;
  region?: string;
  zip?: string;
  language?: string;

  gender?: string | null;
  annualIncome?: number;
  educationLevel?: string;
  weightKg?: number;
  heightCm?: number;
  activityLevel?: string;
  healthGoals?: Record<string, unknown>;
  nutritionTargets?: Record<string, unknown>;
}

@Injectable()
export class UserProfileService {
  constructor(private readonly userRepository: UserRepository) {}

  async getOrCreateProfile(keycloakUser: {
    sub: string;
    email: string;
    given_name?: string;
    family_name?: string;
  }): Promise<UserProfile> {
    let user = await this.userRepository.findByKeycloakId(keycloakUser.sub);

    if (!user) {
      user = await this.userRepository.create({
        keycloakId: keycloakUser.sub,
        email: keycloakUser.email,
        firstName: keycloakUser.given_name || '',
        lastName: keycloakUser.family_name || '',
        preferences: {},
      });
    }

    return this.formatUserProfile(user);
  }

  async updatePreferences(
    keycloakId: string,
    preferences: Record<string, unknown>,
  ): Promise<UserProfile> {
    const user = await this.userRepository.findByKeycloakId(keycloakId);
    if (!user) {
      throw new Error('User not found');
    }

    const updatedUser = await this.userRepository.update(user.id, {
      preferences,
    });

    return this.formatUserProfile(updatedUser);
  }

  async updateSettings(
    keycloakId: string,
    settings: Record<string, unknown>,
  ): Promise<UserProfile> {
    const user = await this.userRepository.findByKeycloakId(keycloakId);
    if (!user) {
      throw new Error('User not found');
    }

    const updatedUser = await this.userRepository.update(user.id, { settings });

    return this.formatUserProfile(updatedUser);
  }

  async updateProfile(keycloakId: string, payload: any): Promise<UserProfile> {
    const user = await this.userRepository.findByKeycloakId(keycloakId);
    if (!user) throw new Error('User not found');

    const updateData: any = {};

    const forbidden = [
      'id',
      'keycloakId',
      'email',
      'username',
      'createdAt',
      'updatedAt',
      'preferences',
      'settings',
      'shoppingList',
      'pantry',
    ];

    const badKeys = Object.keys(payload || {}).filter((k) =>
      forbidden.includes(k),
    );
    console.log(payload);
    console.log(badKeys);
    if (badKeys.length > 0) {
      throw new BadRequestException(
        `Attempted to update protected fields: ${badKeys.join(', ')}`,
      );
    }

    if (payload.country !== undefined) updateData.country = payload.country;
    if (payload.region !== undefined) updateData.region = payload.region;
    if (payload.zip !== undefined) updateData.zip = payload.zip;
    if (payload.language !== undefined) updateData.language = payload.language;

    if (payload.dateOfBirth) {
      updateData.dateOfBirth = new Date(payload.dateOfBirth);
    } else if (payload.age !== undefined && payload.age !== null) {
      const now = new Date();
      const dob = new Date(now);
      dob.setUTCFullYear(dob.getUTCFullYear() - Number(payload.age));
      updateData.dateOfBirth = dob;
    }

    const extendedFields = [
      'gender',
      'annualIncome',
      'educationLevel',
      'weightKg',
      'heightCm',
      'activityLevel',
      'healthGoals',
      'nutritionTargets',
    ];

    for (const f of extendedFields) {
      if (payload[f] !== undefined) updateData[f] = payload[f];
    }

    if (Object.keys(updateData).length === 0) {
      return this.formatUserProfile(user);
    }

    const updatedUser = await this.userRepository.update(user.id, updateData);
    return this.formatUserProfile(updatedUser);
  }

  async isBasicProfileComplete(keycloakId: string): Promise<boolean> {
    const user = await this.userRepository.findByKeycloakId(keycloakId);
    if (!user) return false;
    return Boolean(
      (user as any).username &&
        (user as any).dateOfBirth &&
        (user as any).country &&
        (user as any).region &&
        (user as any).zip &&
        (user as any).language,
    );
  }

  private formatUserProfile(user: any): UserProfile {
    const dobIso = user.dateOfBirth
      ? new Date(user.dateOfBirth).toISOString()
      : undefined;

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      keycloakId: user.keycloakId,
      preferences: user.preferences as Record<string, unknown>,
      settings: user.settings as Record<string, unknown>,
      username: user.username,
      dateOfBirth: dobIso,
      country: user.country,
      region: user.region,
      zip: user.zip,
      language: user.language,

      gender: user.gender,
      annualIncome: user.annualIncome,
      educationLevel: user.educationLevel,
      weightKg: user.weightKg,
      heightCm: user.heightCm,
      activityLevel: user.activityLevel,
      healthGoals: user.healthGoals,
      nutritionTargets: user.nutritionTargets,
    };
  }

  async getUserIdFromKeycloakId(keycloakId: string): Promise<string> {
    const user = await this.userRepository.findByKeycloakId(keycloakId);
    if (!user) {
      throw new Error('User not found');
    }
    return user.id;
  }

  async getProfileByUserId(userId: string): Promise<UserProfile | null> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      keycloakId: user.keycloakId,
      preferences: user.preferences as Record<string, unknown>,
      settings: user.settings as Record<string, unknown>,
    };
  }
}
