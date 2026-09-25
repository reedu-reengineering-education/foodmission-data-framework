import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { GroupRole, Prisma } from '@prisma/client';
import { EventSource, EventType } from '../../events/event-types';
import { UserEventService } from '../../events/services/user-event.service';
import { PrismaService } from '../../database/prisma.service';
import { UserGroupRepository } from '../repositories/user-groups.repository';
import { GroupMembershipRepository } from '../repositories/group-memberships.repository';
import { CreateUserGroupDto } from '../dto/create-user-group.dto';
import { UpdateUserGroupDto } from '../dto/update-user-group.dto';
import { CreateMemberDto } from '../dto/create-member.dto';
import { UpdateMemberDto } from '../dto/update-member.dto';
import { UserGroupResponseDto } from '../dto/response-user-group.dto';
import { MemberResponseDto } from '../dto/response-member.dto';
import {
  GroupNotFoundException,
  GroupMemberNotFoundException,
  NotGroupMemberException,
  GroupAdminRequiredException,
  GroupAlreadyMemberException,
  InvalidInviteCodeException,
  LastAdminCannotLeaveException,
  CannotUpdateRegisteredUserException,
  UseSelfLeaveEndpointException,
  VirtualMemberCannotBeAdminException,
  AlreadyAdminException,
} from '../../common/exceptions/business.exception';
import {
  GroupMembershipWithUser,
  UserGroupWithRelations,
} from '../../common/types/prisma-relations';
import { ProgressStatus } from '../../common/progress-status';

type QuestContentScopeItem = {
  contentType: 'MISSION' | 'CHALLENGE';
  contentCode: string;
};

@Injectable()
export class UserGroupService {
  private readonly logger = new Logger(UserGroupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly userGroupRepository: UserGroupRepository,
    private readonly membershipRepository: GroupMembershipRepository,
    private readonly userEventService: UserEventService,
  ) {}

  async create(
    createDto: CreateUserGroupDto,
    userId: string,
  ): Promise<UserGroupResponseDto> {
    this.logger.log(`Creating group for user: ${userId}`);

    const group = await this.userGroupRepository.create({
      ...createDto,
      createdBy: userId,
    });

    const membership = group.memberships?.find((m) => m.userId === userId);
    await this.recordGroupMembershipEvent({
      eventType: EventType.USER_GROUP_JOINED,
      userId,
      groupId: group.id,
      membershipId: membership?.id,
      body: {
        name: createDto.name,
        ...(createDto.description !== undefined
          ? { description: createDto.description }
          : {}),
      },
    });

    return this.transformToGroupDto(group);
  }

  async findById(
    groupId: string,
    userId: string,
  ): Promise<UserGroupResponseDto> {
    this.logger.log(`Getting group ${groupId} for user: ${userId}`);

    const group = await this.getGroupOrThrow(groupId);

    const membership = await this.membershipRepository.findByUserAndGroup(
      userId,
      groupId,
    );
    if (!membership) {
      throw new NotGroupMemberException(groupId);
    }

    return this.transformToGroupDto(group);
  }

  async findAllByUserId(userId: string): Promise<UserGroupResponseDto[]> {
    this.logger.log(`Getting all groups for user: ${userId}`);

    const groups = await this.userGroupRepository.findAllByUserId(userId);
    return groups.map((group) => this.transformToGroupDto(group));
  }

  async update(
    groupId: string,
    updateDto: UpdateUserGroupDto,
    userId: string,
  ): Promise<UserGroupResponseDto> {
    this.logger.log(`Updating group ${groupId} by user: ${userId}`);

    await this.requireAdmin(userId, groupId);

    const currentGroup = await this.getGroupOrThrow(groupId);
    const currentQuestChanged =
      updateDto.currentQuestId !== undefined &&
      updateDto.currentQuestId !== currentGroup.currentQuestId;

    if (!currentQuestChanged) {
      const group = await this.userGroupRepository.update(groupId, updateDto);
      return this.transformToGroupDto(group);
    }

    await this.prisma.$transaction(async (tx) => {
      await this.updateGroupWithQuestTransition(tx, currentGroup, updateDto);
    });

    const refreshedGroup = await this.userGroupRepository.findById(groupId);
    return this.transformToGroupDto(refreshedGroup);
  }

  private async updateGroupWithQuestTransition(
    tx: Prisma.TransactionClient,
    currentGroup: UserGroupWithRelations,
    updateDto: UpdateUserGroupDto,
  ): Promise<void> {
    const previousQuestId = currentGroup.currentQuestId;
    const nextQuestId = updateDto.currentQuestId ?? null;

    const oldQuestItems = previousQuestId
      ? await this.getQuestMissionChallengeItems(tx, previousQuestId)
      : [];
    const newQuestItems = nextQuestId
      ? await this.getQuestMissionChallengeItems(tx, nextQuestId, true)
      : [];

    await tx.userGroup.update({
      where: { id: currentGroup.id },
      data: updateDto,
    });

    const memberRows = await tx.groupMembership.findMany({
      where: {
        groupId: currentGroup.id,
        userId: { not: null },
      },
      select: { userId: true },
    });
    const memberUserIds = memberRows
      .map((row) => row.userId)
      .filter((memberUserId): memberUserId is string => memberUserId !== null);

    if (memberUserIds.length === 0) {
      return;
    }

    if (previousQuestId && previousQuestId !== nextQuestId) {
      await this.removeQuestProgressRows(tx, memberUserIds, oldQuestItems);
    }

    if (nextQuestId) {
      await this.seedQuestProgressRows(tx, memberUserIds, newQuestItems);
    }
  }

  private async getQuestMissionChallengeItems(
    tx: Prisma.TransactionClient,
    questId: string,
    requireAvailable = false,
  ): Promise<QuestContentScopeItem[]> {
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

    return quest.items as QuestContentScopeItem[];
  }

  private async seedQuestProgressRows(
    tx: Prisma.TransactionClient,
    userIds: string[],
    questItems: QuestContentScopeItem[],
  ): Promise<void> {
    const missionCodes = [
      ...new Set(
        questItems
          .filter((item) => item.contentType === 'MISSION')
          .map((item) => item.contentCode),
      ),
    ];
    const challengeCodes = [
      ...new Set(
        questItems
          .filter((item) => item.contentType === 'CHALLENGE')
          .map((item) => item.contentCode),
      ),
    ];

    if (missionCodes.length > 0) {
      const missions = await tx.mission.findMany({
        where: { code: { in: missionCodes } },
        select: { id: true },
      });
      const missionRows = userIds.flatMap((memberUserId) =>
        missions.map((mission) => ({
          userId: memberUserId,
          missionId: mission.id,
          progress: 0,
          completed: false,
          status: ProgressStatus.NOT_STARTED,
          state: {},
        })),
      );
      if (missionRows.length > 0) {
        await tx.missionProgress.createMany({
          data: missionRows,
          skipDuplicates: true,
        });
      }
    }

    if (challengeCodes.length > 0) {
      const challenges = await tx.challenge.findMany({
        where: { code: { in: challengeCodes } },
        select: { id: true },
      });
      const challengeRows = userIds.flatMap((memberUserId) =>
        challenges.map((challenge) => ({
          userId: memberUserId,
          challengeId: challenge.id,
          progress: 0,
          completed: false,
          status: ProgressStatus.NOT_STARTED,
          state: {},
        })),
      );
      if (challengeRows.length > 0) {
        await tx.challengeProgress.createMany({
          data: challengeRows,
          skipDuplicates: true,
        });
      }
    }
  }

  private async removeQuestProgressRows(
    tx: Prisma.TransactionClient,
    userIds: string[],
    questItems: QuestContentScopeItem[],
  ): Promise<void> {
    const missionCodes = [
      ...new Set(
        questItems
          .filter((item) => item.contentType === 'MISSION')
          .map((item) => item.contentCode),
      ),
    ];
    const challengeCodes = [
      ...new Set(
        questItems
          .filter((item) => item.contentType === 'CHALLENGE')
          .map((item) => item.contentCode),
      ),
    ];

    if (missionCodes.length > 0) {
      const missions = await tx.mission.findMany({
        where: { code: { in: missionCodes } },
        select: { id: true },
      });
      if (missions.length > 0) {
        await tx.missionProgress.deleteMany({
          where: {
            userId: { in: userIds },
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
            userId: { in: userIds },
            challengeId: { in: challenges.map((challenge) => challenge.id) },
            status: { not: ProgressStatus.COMPLETED },
          },
        });
      }
    }
  }

  async remove(groupId: string, userId: string): Promise<void> {
    this.logger.log(`Deleting group ${groupId} by user: ${userId}`);

    await this.requireAdmin(userId, groupId);
    await this.userGroupRepository.delete(groupId);
  }

  async joinByInviteCode(
    inviteCode: string,
    userId: string,
  ): Promise<UserGroupResponseDto> {
    this.logger.log(`User ${userId} joining group with invite code`);

    const group = await this.userGroupRepository.findByInviteCode(inviteCode);
    if (!group) {
      throw new InvalidInviteCodeException(inviteCode);
    }

    const existingMembership =
      await this.membershipRepository.findByUserAndGroup(userId, group.id);
    if (existingMembership) {
      throw new GroupAlreadyMemberException(group.id, userId);
    }

    const membership = await this.membershipRepository.create({
      userId,
      groupId: group.id,
      role: GroupRole.MEMBER,
    });

    await this.recordGroupMembershipEvent({
      eventType: EventType.USER_GROUP_JOINED,
      userId,
      groupId: group.id,
      membershipId: membership.id,
      body: { inviteCode },
    });

    const updatedGroup = await this.userGroupRepository.findById(group.id);
    return this.transformToGroupDto(updatedGroup);
  }

  async leave(groupId: string, userId: string): Promise<void> {
    this.logger.log(`User ${userId} leaving group ${groupId}`);

    const membership = await this.membershipRepository.findByUserAndGroup(
      userId,
      groupId,
    );
    if (!membership) {
      throw new NotGroupMemberException(groupId);
    }

    const memberCount = await this.membershipRepository.countMembers(groupId);

    if (memberCount <= 1) {
      this.logger.log(`Last member leaving group ${groupId}, deleting group`);
      await this.userGroupRepository.delete(groupId);
      await this.recordGroupMembershipEvent({
        eventType: EventType.USER_GROUP_LEFT,
        userId,
        groupId,
        membershipId: membership.id,
        body: {},
      });
      return;
    }

    if (membership.role === GroupRole.ADMIN) {
      const adminCount = await this.membershipRepository.countAdmins(groupId);
      if (adminCount <= 1) {
        throw new LastAdminCannotLeaveException(groupId);
      }
    }

    await this.membershipRepository.delete(userId, groupId);
    await this.recordGroupMembershipEvent({
      eventType: EventType.USER_GROUP_LEFT,
      userId,
      groupId,
      membershipId: membership.id,
      body: {},
    });
  }

  async regenerateInviteCode(
    groupId: string,
    userId: string,
  ): Promise<{ inviteCode: string }> {
    this.logger.log(`Regenerating invite code for group ${groupId}`);

    await this.requireAdmin(userId, groupId);

    const group = await this.userGroupRepository.regenerateInviteCode(groupId);
    return { inviteCode: group.inviteCode };
  }

  async getInviteCode(
    groupId: string,
    userId: string,
  ): Promise<{ inviteCode: string }> {
    this.logger.log(`Getting invite code for group ${groupId}`);

    await this.requireAdmin(userId, groupId);

    const group = await this.getGroupOrThrow(groupId);

    return { inviteCode: group.inviteCode };
  }

  async getMembers(
    groupId: string,
    userId: string,
  ): Promise<MemberResponseDto[]> {
    this.logger.log(`Getting members for group ${groupId}`);

    await this.requireMember(userId, groupId);

    const memberships =
      await this.membershipRepository.findAllByGroupId(groupId);

    return memberships.map((m) => this.transformToMemberDto(m));
  }

  async addMember(
    groupId: string,
    createDto: CreateMemberDto,
    userId: string,
  ): Promise<MemberResponseDto> {
    this.logger.log(`Adding virtual member to group ${groupId}`);

    await this.requireMember(userId, groupId);

    const membership = await this.membershipRepository.createVirtualMember({
      groupId,
      createdBy: userId,
      ...createDto,
    });

    await this.recordGroupMembershipEvent({
      eventType: EventType.USER_GROUP_JOINED,
      userId,
      groupId,
      membershipId: membership.id,
      isVirtual: true,
      body: { ...createDto },
    });

    return this.transformToMemberDto(membership);
  }

  async updateMember(
    groupId: string,
    memberId: string,
    updateDto: UpdateMemberDto,
    userId: string,
  ): Promise<MemberResponseDto> {
    this.logger.log(`Updating member ${memberId}`);

    await this.requireMember(userId, groupId);

    const membership = await this.getMemberOrThrow(memberId, groupId);

    if (!this.membershipRepository.isVirtual(membership)) {
      throw new CannotUpdateRegisteredUserException(memberId);
    }

    const updated = await this.membershipRepository.updateVirtualMember(
      memberId,
      updateDto,
    );
    return this.transformToMemberDto(updated);
  }
  async removeMember(
    groupId: string,
    membershipId: string,
    userId: string,
  ): Promise<void> {
    this.logger.log(
      `Removing member ${membershipId} from group ${groupId} by user ${userId}`,
    );

    const membership = await this.getMemberOrThrow(membershipId, groupId);

    if (this.membershipRepository.isVirtual(membership)) {
      await this.requireMember(userId, groupId);
    } else {
      await this.requireAdmin(userId, groupId);

      if (membership.userId === userId) {
        throw new UseSelfLeaveEndpointException();
      }
    }

    const isVirtual = this.membershipRepository.isVirtual(membership);
    await this.membershipRepository.deleteById(membershipId);
    await this.recordGroupMembershipEvent({
      eventType: EventType.USER_GROUP_LEFT,
      userId: isVirtual || !membership.userId ? userId : membership.userId,
      groupId,
      membershipId: membership.id,
      isVirtual,
      body: {},
    });
  }

  async transferAdmin(
    groupId: string,
    targetMembershipId: string,
    userId: string,
  ): Promise<MemberResponseDto> {
    this.logger.log(
      `Transferring admin to ${targetMembershipId} in group ${groupId} by ${userId}`,
    );

    await this.requireAdmin(userId, groupId);

    const targetMembership = await this.getMemberOrThrow(
      targetMembershipId,
      groupId,
    );

    if (this.membershipRepository.isVirtual(targetMembership)) {
      throw new VirtualMemberCannotBeAdminException(targetMembershipId);
    }

    if (targetMembership.role === GroupRole.ADMIN) {
      throw new AlreadyAdminException(targetMembershipId);
    }

    const updated = await this.membershipRepository.updateRoleById(
      targetMembershipId,
      GroupRole.ADMIN,
    );

    return this.transformToMemberDto(updated);
  }

  private async recordGroupMembershipEvent(input: {
    eventType:
      typeof EventType.USER_GROUP_JOINED | typeof EventType.USER_GROUP_LEFT;
    userId: string;
    groupId: string;
    membershipId?: string;
    isVirtual?: boolean;
    body: Record<string, unknown>;
  }): Promise<void> {
    const action =
      input.eventType === EventType.USER_GROUP_JOINED ? 'joined' : 'left';
    await this.userEventService.record({
      userId: input.userId,
      eventType: input.eventType,
      source: EventSource.GROUP,
      groupId: input.groupId,
      metadata: {
        groupId: input.groupId,
        source: EventSource.API,
        isVirtual: input.isVirtual ?? false,
        body: input.body,
      },
      idempotencyKey: input.membershipId
        ? `user-group-${action}:${input.membershipId}`
        : `user-group-${action}:${input.userId}:${input.groupId}`,
    });
  }

  private async getGroupOrThrow(groupId: string) {
    const group = await this.userGroupRepository.findById(groupId);
    if (!group) {
      throw new GroupNotFoundException(groupId);
    }
    return group;
  }

  private async getMemberOrThrow(memberId: string, groupId: string) {
    const membership = await this.membershipRepository.findById(memberId);
    if (!membership || membership.groupId !== groupId) {
      throw new GroupMemberNotFoundException(memberId);
    }
    return membership;
  }

  private async getMembershipOrThrow(
    userId: string,
    groupId: string,
  ): Promise<GroupMembershipWithUser> {
    const membership = await this.membershipRepository.findByUserAndGroup(
      userId,
      groupId,
    );
    if (!membership) {
      const group = await this.userGroupRepository.findById(groupId);
      if (!group) {
        throw new GroupNotFoundException(groupId);
      }
      throw new NotGroupMemberException(groupId);
    }
    return membership;
  }

  private async requireMember(userId: string, groupId: string): Promise<void> {
    await this.getMembershipOrThrow(userId, groupId);
  }

  private async requireAdmin(userId: string, groupId: string): Promise<void> {
    const group = await this.userGroupRepository.findById(groupId);
    if (!group) {
      throw new GroupNotFoundException(groupId);
    }
    const membership = await this.membershipRepository.findByUserAndGroup(
      userId,
      groupId,
    );
    if (!membership) {
      throw new NotGroupMemberException(groupId);
    }
    if (membership.role !== GroupRole.ADMIN) {
      throw new GroupAdminRequiredException(groupId);
    }
  }

  private transformToGroupDto(
    group: UserGroupWithRelations | null,
  ): UserGroupResponseDto {
    if (!group) {
      return new UserGroupResponseDto();
    }
    const dto = plainToClass(UserGroupResponseDto, group, {
      excludeExtraneousValues: true,
    });
    const memberships =
      'memberships' in group && Array.isArray(group.memberships)
        ? group.memberships
        : [];
    dto.members = memberships.map((m) => this.transformToMemberDto(m));
    return dto;
  }

  private transformToMemberDto(
    membership: GroupMembershipWithUser,
  ): MemberResponseDto {
    const isVirtual = this.membershipRepository.isVirtual(membership);

    return plainToClass(
      MemberResponseDto,
      {
        id: membership.id,
        role: membership.role,
        joinedAt: membership.joinedAt,
        isVirtual,
        // Registered user fields
        userId: membership.userId,
        firstName: membership.user?.firstName,
        lastName: membership.user?.lastName,
        email: membership.user?.email,
        // Virtual member fields
        nickname: membership.nickname,
        age: membership.age,
        gender: membership.gender,
        activityLevel: membership.activityLevel,
        annualIncome: membership.annualIncome,
        preferences: membership.preferences,
        createdBy: membership.createdBy,
      },
      { excludeExtraneousValues: true },
    );
  }
}
