import { Injectable, Logger } from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { GroupRole } from '@prisma/client';
import { UserGroupRepository } from '../repositories/userGroup.repository';
import {
  GroupMembershipRepository,
  GroupMembershipWithUser,
} from '../repositories/groupMembership.repository';
import { CreateUserGroupDto } from '../dto/create-userGroup.dto';
import { UpdateUserGroupDto } from '../dto/update-userGroup.dto';
import { CreateMemberDto } from '../dto/create-member.dto';
import { UpdateMemberDto } from '../dto/update-member.dto';
import { UserGroupResponseDto } from '../dto/response-userGroup.dto';
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
import { UserGroupWithRelations } from '../repositories/userGroup.repository';

@Injectable()
export class UserGroupService {
  private readonly logger = new Logger(UserGroupService.name);

  constructor(
    private readonly userGroupRepository: UserGroupRepository,
    private readonly membershipRepository: GroupMembershipRepository,
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

    const group = await this.userGroupRepository.update(groupId, updateDto);
    return this.transformToGroupDto(group);
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

    await this.membershipRepository.create({
      userId,
      groupId: group.id,
      role: GroupRole.MEMBER,
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
      return;
    }

    if (membership.role === GroupRole.ADMIN) {
      const adminCount = await this.membershipRepository.countAdmins(groupId);
      if (adminCount <= 1) {
        throw new LastAdminCannotLeaveException(groupId);
      }
    }

    await this.membershipRepository.delete(userId, groupId);
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

    await this.membershipRepository.deleteById(membershipId);
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
