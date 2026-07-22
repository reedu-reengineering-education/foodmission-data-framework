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
import { GamificationOnboardingService } from '../../gamification/services/gamification-onboarding.service';
import {
  buildUserPreferences,
  deriveUserSegment,
  extractOnboardingSurvey,
  ONBOARDING_BASELINE_FIELDS,
} from '../../gamification/onboarding.utils';
import type { User } from '@prisma/client';

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

  segment?: string | null;
  currentQuestId?: string | null;
  lastLoginAt?: Date | null;
}

@Injectable()
export class UserProfilesService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly prisma: PrismaService,
    private readonly keycloakAdminService: KeycloakAdminService,
    private readonly gamificationOnboardingService: GamificationOnboardingService,
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

    for (const field of ONBOARDING_BASELINE_FIELDS) {
      if (payload[field] !== undefined) {
        throw new BadRequestException(
          `Use preferences.onboardingSurvey.${field} instead of top-level ${field}`,
        );
      }
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
      'currentQuestId',
    ];

    for (const f of extendedFields) {
      if (payload[f] === undefined) continue;

      // Gender is validated at the DTO level; pass through other extended fields directly.
      updateData[f] = payload[f];
    }

    if (payload.settings !== undefined) {
      const stored = (user.settings as Record<string, unknown>) ?? {};
      updateData.settings = {
        ...stored,
        ...(payload.settings as Record<string, unknown>),
      };
    }

    if (payload.preferences !== undefined) {
      const stored = (user.preferences as Record<string, unknown>) ?? {};
      const prefs = {
        ...stored,
        ...(payload.preferences as Record<string, unknown>),
      };
      if (prefs.onboardingSurvey !== undefined) {
        try {
          const surveyUpdates = extractOnboardingSurvey(prefs.onboardingSurvey);
          for (const [field, value] of Object.entries(surveyUpdates)) {
            updateData[field] = value;
          }
        } catch (err) {
          throw new BadRequestException(
            err instanceof Error ? err.message : 'Invalid onboardingSurvey',
          );
        }
        delete prefs.onboardingSurvey;
      }
      updateData.preferences = prefs;
    }

    if (Object.keys(updateData).length === 0) {
      return this.formatUserProfile(user);
    }

    let updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    updatedUser = await this.applyGamificationOnboardingIfReady(
      updatedUser,
      payload,
    );

    return this.formatUserProfile(updatedUser);
  }

  /**
   * When all five habit baselines are present and onboarding fields were touched,
   * derive/persist segment, then apply first-time gamification side effects
   * (wallet + soft indicators + ONBOARDING_COMPLETED). Side effects are skipped
   * if onboarding was already completed.
   */
  private async applyGamificationOnboardingIfReady(
    user: User,
    payload: Record<string, unknown>,
  ): Promise<User> {
    const surveyTouched =
      (payload.preferences as { onboardingSurvey?: unknown } | undefined)
        ?.onboardingSurvey !== undefined;
    if (!surveyTouched) {
      return user;
    }

    const hasAllBaselines = ONBOARDING_BASELINE_FIELDS.every(
      (field) => user[field] != null,
    );
    if (!hasAllBaselines) {
      return user;
    }

    const segment =
      user.segment ??
      deriveUserSegment({
        weeklyMeatConsumption: user.weeklyMeatConsumption!,
        weeklyBeefConsumption: user.weeklyBeefConsumption!,
        weeklyFoodWaste: user.weeklyFoodWaste!,
        weeklyUpfConsumption: user.weeklyUpfConsumption!,
        weeklyReusableOrRefill: user.weeklyReusableOrRefill!,
      });

    const nextUser =
      user.segment === segment
        ? user
        : await this.prisma.user.update({
            where: { id: user.id },
            data: { segment },
          });

    await this.gamificationOnboardingService.applyOnboardingSideEffects(
      nextUser,
      segment,
    );

    return nextUser;
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

    const preferences = buildUserPreferences(user.preferences, user);

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      keycloakId: user.keycloakId,
      preferences,
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
      segment: user.segment,
      currentQuestId: user.currentQuestId,
      lastLoginAt: user.lastLoginAt,
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

  /**
   * Delete a user by Keycloak ID. Used by webhooks when user is already deleted from Keycloak.
   * Always cascades to delete all related data.
   * Does NOT call Keycloak delete (user is already deleted there).
   */
  async deleteUserByKeycloakId(keycloakId: string): Promise<void> {
    const user = await this.usersRepository.findByKeycloakId(keycloakId);
    if (!user) {
      // User not found locally - may have already been deleted or never created
      throw new NotFoundException(
        'User not found for Keycloak ID: ' + keycloakId,
      );
    }

    const userId = user.id;

    // Delete related entities first (order matters for FK constraints)
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

    // Delete user from local database
    await this.usersRepository.remove(userId);
  }
}
