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
import {
  EventSource,
  EventSubjectType,
  EventType,
} from '../../events/event-types';
import { UserEventService } from '../../events/services/user-event.service';
import { userRegisteredIdempotencyKey } from '../../auth/auth.constants';
import { GamificationOnboardingService } from '../../gamification/services/gamification-onboarding.service';
import {
  buildUserPreferences,
  extractOnboardingSurvey,
  hasAllOnboardingBaselines,
} from '../../gamification/onboarding.utils';
import type { User } from '@prisma/client';
import { ProgressStatus } from '../../common/progress-status';

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
    private readonly userEventService: UserEventService,
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

      // Users who register in Keycloak directly never pass through
      // AuthService.register, so this is the only place their account creation
      // becomes a ledger fact. Shares that route's idempotency key, so a user
      // who took both paths is counted once. Best-effort: the account exists
      // regardless, and login must not fail on a ledger write.
      try {
        await this.userEventService.record({
          userId: user.id,
          eventType: EventType.USER_REGISTERED,
          source: EventSource.API,
          metadata: {},
          subject: { type: EventSubjectType.USER, id: user.id },
          idempotencyKey: userRegisteredIdempotencyKey(user.id),
        });
      } catch {
        // Swallowed on purpose — see above.
      }
    }

    return this.formatUserProfile(user);
  }

  async updateProfile(keycloakId: string, payload: any): Promise<UserProfile> {
    const user = await this.usersRepository.findByKeycloakId(keycloakId);
    if (!user) throw new NotFoundException('User not found');

    const updateData: any = {};

    if (payload.yearOfBirth !== undefined && payload.yearOfBirth !== null) {
      const y = Number(payload.yearOfBirth);
      if (!Number.isFinite(y) || y < 1900 || y > new Date().getUTCFullYear()) {
        throw new BadRequestException('Invalid yearOfBirth');
      }
      updateData.yearOfBirth = Math.trunc(y);
    }

    const passThroughFields = [
      'country',
      'region',
      'zip',
      'language',
      'gender',
      'annualIncome',
      'educationLevel',
      'weightKg',
      'heightCm',
      'activityLevel',
      'healthGoals',
      'nutritionTargets',
      'segment',
      'currentQuestId',
    ] as const;

    for (const f of passThroughFields) {
      if (payload[f] !== undefined) {
        updateData[f] = payload[f];
      }
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
          Object.assign(
            updateData,
            extractOnboardingSurvey(prefs.onboardingSurvey),
          );
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

    const currentQuestChanged =
      updateData.currentQuestId !== undefined &&
      updateData.currentQuestId !== user.currentQuestId;

    let updatedUser = currentQuestChanged
      ? await this.prisma.$transaction((tx) =>
          this.updateProfileWithQuestTransition(tx, user, updateData),
        )
      : await this.prisma.user.update({
          where: { id: user.id },
          data: updateData,
        });

    updatedUser = await this.applyGamificationOnboardingIfReady(
      updatedUser,
      payload,
    );

    return this.formatUserProfile(updatedUser);
  }

  private async updateProfileWithQuestTransition(
    tx: Pick<
      PrismaService,
      | 'user'
      | 'quest'
      | 'mission'
      | 'challenge'
      | 'missionProgress'
      | 'challengeProgress'
    >,
    user: User,
    updateData: Record<string, unknown>,
  ): Promise<User> {
    const nextQuestId = (updateData.currentQuestId as string | null) ?? null;
    const previousQuestId = user.currentQuestId;

    const oldQuestItems = previousQuestId
      ? await this.getQuestMissionChallengeItems(tx, previousQuestId)
      : [];
    const newQuestItems = nextQuestId
      ? await this.getQuestMissionChallengeItems(tx, nextQuestId, true)
      : [];

    const updatedUser = await tx.user.update({
      where: { id: user.id },
      data: updateData,
    });

    if (previousQuestId && previousQuestId !== nextQuestId) {
      await this.removeOldQuestProgressRows(tx, user.id, oldQuestItems);
    }

    if (nextQuestId) {
      await this.seedQuestProgressRows(tx, user.id, newQuestItems);
    }

    return updatedUser;
  }

  private async getQuestMissionChallengeItems(
    tx: Pick<PrismaService, 'quest'>,
    questId: string,
    requireAvailable = false,
  ): Promise<Array<{ contentType: string; contentCode: string }>> {
    const quest = await tx.quest.findUnique({
      where: { id: questId },
      select: {
        available: true,
        items: {
          where: {
            contentType: {
              in: ['MISSION', 'CHALLENGE'],
            },
          },
          select: {
            contentType: true,
            contentCode: true,
          },
        },
      },
    });

    if (!quest || (requireAvailable && !quest.available)) {
      throw new BadRequestException('Invalid currentQuestId');
    }

    return quest.items;
  }

  private async seedQuestProgressRows(
    tx: Pick<
      PrismaService,
      'mission' | 'challenge' | 'missionProgress' | 'challengeProgress'
    >,
    userId: string,
    questItems: Array<{ contentType: string; contentCode: string }>,
  ): Promise<void> {
    const missionCodes = questItems
      .filter((item) => item.contentType === 'MISSION')
      .map((item) => item.contentCode);
    const challengeCodes = questItems
      .filter((item) => item.contentType === 'CHALLENGE')
      .map((item) => item.contentCode);

    if (missionCodes.length > 0) {
      const missions = await tx.mission.findMany({
        where: { code: { in: missionCodes } },
        select: { id: true },
      });

      if (missions.length > 0) {
        await tx.missionProgress.createMany({
          data: missions.map((mission) => ({
            userId,
            missionId: mission.id,
            progress: 0,
            completed: false,
            status: ProgressStatus.NOT_STARTED,
            state: {},
          })),
          skipDuplicates: true,
        });
      }
    }

    if (challengeCodes.length > 0) {
      const challenges = await tx.challenge.findMany({
        where: { code: { in: challengeCodes } },
        select: { id: true },
      });

      if (challenges.length > 0) {
        await tx.challengeProgress.createMany({
          data: challenges.map((challenge) => ({
            userId,
            challengeId: challenge.id,
            progress: 0,
            completed: false,
            status: ProgressStatus.NOT_STARTED,
            state: {},
          })),
          skipDuplicates: true,
        });
      }
    }
  }

  private async removeOldQuestProgressRows(
    tx: Pick<
      PrismaService,
      'mission' | 'challenge' | 'missionProgress' | 'challengeProgress'
    >,
    userId: string,
    questItems: Array<{ contentType: string; contentCode: string }>,
  ): Promise<void> {
    const missionCodes = questItems
      .filter((item) => item.contentType === 'MISSION')
      .map((item) => item.contentCode);
    const challengeCodes = questItems
      .filter((item) => item.contentType === 'CHALLENGE')
      .map((item) => item.contentCode);

    if (missionCodes.length > 0) {
      const missions = await tx.mission.findMany({
        where: { code: { in: missionCodes } },
        select: { id: true },
      });
      if (missions.length > 0) {
        await tx.missionProgress.deleteMany({
          where: {
            userId,
            missionId: { in: missions.map((mission) => mission.id) },
            status: { not: ProgressStatus.COMPLETED },
          },
        });
      }
    }

    if (challengeCodes.length > 0) {
      const challenges = await tx.challenge.findMany({
        where: { code: { in: challengeCodes } },
        select: { id: true },
      });
      if (challenges.length > 0) {
        await tx.challengeProgress.deleteMany({
          where: {
            userId,
            challengeId: { in: challenges.map((challenge) => challenge.id) },
            status: { not: ProgressStatus.COMPLETED },
          },
        });
      }
    }
  }

  /**
   * When all five habit baselines are present, a client-chosen segment is set,
   * and onboarding was touched (survey and/or segment), apply first-time side effects.
   */
  private async applyGamificationOnboardingIfReady(
    user: User,
    payload: Record<string, unknown>,
  ): Promise<User> {
    const surveyTouched =
      (payload.preferences as { onboardingSurvey?: unknown } | undefined)
        ?.onboardingSurvey !== undefined;
    const segmentTouched = payload.segment !== undefined;
    if (
      (!surveyTouched && !segmentTouched) ||
      !hasAllOnboardingBaselines(user)
    ) {
      return user;
    }

    const segment =
      (payload.segment as User['segment'] | undefined) ?? user.segment;
    if (!segment) {
      return user;
    }

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
