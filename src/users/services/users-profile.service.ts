import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { UsersRepository } from '../repositories/users.repository';
import { PrismaService } from '../../database/prisma.service';
import {
  ActivityLevel,
  AnnualIncomeLevel,
  EducationLevel,
} from '../dto/create-user.dto';
import { KeycloakAdminService } from '../../keycloak-admin/keycloak-admin.service';

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
export class UsersProfileService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly prisma: PrismaService,
    private readonly keycloakAdminService: KeycloakAdminService,
  ) {}

  async getOrCreateProfile(keycloakUser: {
    sub: string;
    email: string;
    given_name?: string;
    family_name?: string;
  }): Promise<UserProfile> {
    // 1) Try to find by keycloakId (sub claim)
    let user = await this.usersRepository.findByKeycloakId(keycloakUser.sub);

    // 2) Fallback: try by email, and if found, align keycloakId
    if (!user && keycloakUser.email) {
      const byEmail = await this.usersRepository.findByEmail(
        keycloakUser.email,
      );
      if (byEmail) {
        user = await this.usersRepository.update(byEmail.id, {
          keycloakId: keycloakUser.sub,
        });
      }
    }

    // 3) If still not found, create a new user
    if (!user) {
      user = await this.usersRepository.create({
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
    const user = await this.usersRepository.findByKeycloakId(keycloakId);
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

    const updatedUser = await this.usersRepository.update(user.id, updateData);
    return this.formatUserProfile(updatedUser);
  }

  async isBasicProfileComplete(keycloakId: string): Promise<boolean> {
    const user = await this.usersRepository.findByKeycloakId(keycloakId);
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
    const user = await this.usersRepository.findByKeycloakId(keycloakId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user.id;
  }

  async getProfileByUserId(userId: string): Promise<UserProfile | null> {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      return null;
    }

    return this.formatUserProfile(user);
  }

  /**
   * Delete a user by internal userId. If cascade=true, delete all related data (pantry, shoppingList, recipes, meals, mealLogs, etc).
   * If cascade=false, only delete the user record (FKs must be nullable or ON DELETE SET NULL/RESTRICT).
   * Also deletes the user from Keycloak.
   */
  async deleteUserById(userId: string, cascade = false): Promise<void> {
    // First, get the user to retrieve keycloakId
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (cascade) {
      // Delete related entities first (order matters for FK constraints)
      // Adjust as needed for your schema
      await this.prisma.mealLog.deleteMany({ where: { userId } });
      await this.prisma.meal.deleteMany({ where: { userId } });
      await this.prisma.recipe.deleteMany({ where: { userId } });
      await this.prisma.pantryItem.deleteMany({
        where: { pantry: { userId } },
      });
      await this.prisma.pantry.deleteMany({ where: { userId } });
      await this.prisma.shoppingListItem.deleteMany({
        where: { shoppingList: { userId } },
      });
      await this.prisma.shoppingList.deleteMany({ where: { userId } });
      // Add more as needed
    }

    // Delete from local database
    await this.usersRepository.remove(userId);

    // Delete from Keycloak
    await this.keycloakAdminService.deleteUser(user.keycloakId);
  }
}
