import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { UserRepository } from '../repositories/user.repository';
import {
  ActivityLevel,
  AnnualIncomeLevel,
  EducationLevel,
} from '../dto/create-user.dto';

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  keycloakId: string;
  preferences?: Record<string, unknown>;
  settings?: Record<string, unknown>;
  username?: string;
  yearOfBirth?: number;
  country?: string;
  region?: string;
  zip?: string;
  language?: string;

  gender?: string | null;
  annualIncome?: AnnualIncomeLevel | null;
  educationLevel?: EducationLevel | null;
  weightKg?: number;
  heightCm?: number;
  activityLevel?: ActivityLevel | null;
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

  async updateProfile(keycloakId: string, payload: any): Promise<UserProfile> {
    const user = await this.userRepository.findByKeycloakId(keycloakId);
    if (!user) throw new NotFoundException('User not found');

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
    if (badKeys.length > 0) {
      throw new BadRequestException(
        `Attempted to update protected fields: ${badKeys.join(', ')}`,
      );
    }

    if (payload.country !== undefined) updateData.country = payload.country;
    if (payload.region !== undefined) updateData.region = payload.region;
    if (payload.zip !== undefined) updateData.zip = payload.zip;
    if (payload.language !== undefined) updateData.language = payload.language;

    // Accept yearOfBirth (preferred). Persist to DB as dateOfBirth = Jan 1 of year.
    if (payload.yearOfBirth !== undefined && payload.yearOfBirth !== null) {
      const y = Number(payload.yearOfBirth);
      if (!Number.isFinite(y) || y < 1900 || y > new Date().getUTCFullYear()) {
        throw new BadRequestException('Invalid yearOfBirth');
      }
      // Persist the numeric year into the DB field `yearOfBirth` (Int). Migration to apply by user.
      updateData.yearOfBirth = Math.trunc(y);
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
      if (payload[f] === undefined) continue;

      // Gender is validated at the DTO level; pass through other extended fields directly.
      updateData[f] = payload[f];
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
        (user as any).yearOfBirth !== undefined &&
        (user as any).yearOfBirth !== null &&
        (user as any).country &&
        (user as any).region &&
        (user as any).zip &&
        (user as any).language,
    );
  }

  private formatUserProfile(user: any): UserProfile {
    // After migration the DB stores the year of birth as an integer in `yearOfBirth`.
    const yearOfBirth = user.yearOfBirth ?? undefined;

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      keycloakId: user.keycloakId,
      preferences: user.preferences as Record<string, unknown>,
      settings: user.settings as Record<string, unknown>,
      username: user.username,
      yearOfBirth,
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
      throw new NotFoundException('User not found');
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
