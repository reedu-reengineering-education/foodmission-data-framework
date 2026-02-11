import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { GroupRole } from '@prisma/client';
import { UserGroupRepository } from '../repositories/userGroup.repository';
import { GroupMembershipRepository } from '../repositories/groupMembership.repository';
import { VirtualMemberRepository } from '../repositories/virtualMember.repository';
import { CreateUserGroupDto } from '../dto/create-userGroup.dto';
import { UpdateUserGroupDto } from '../dto/update-userGroup.dto';
import { CreateVirtualMemberDto } from '../dto/create-virtualMember.dto';
import { UpdateVirtualMemberDto } from '../dto/update-virtualMember.dto';
import { UserGroupResponseDto } from '../dto/response-userGroup.dto';
import { GroupMemberResponseDto } from '../dto/response-groupMember.dto';
import { VirtualMemberResponseDto } from '../dto/response-virtualMember.dto';

@Injectable()
export class UserGroupService {
  private readonly logger = new Logger(UserGroupService.name);

  constructor(
    private readonly userGroupRepository: UserGroupRepository,
    private readonly membershipRepository: GroupMembershipRepository,
    private readonly virtualMemberRepository: VirtualMemberRepository,
  ) {}

  // ========== Group CRUD ==========

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

    const group = await this.userGroupRepository.findById(groupId);
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    // Check if user is a member
    const membership = await this.membershipRepository.findByUserAndGroup(
      userId,
      groupId,
    );
    if (!membership) {
      throw new ForbiddenException('You are not a member of this group');
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

  // ========== Invite Code & Join ==========

  async joinByInviteCode(
    inviteCode: string,
    userId: string,
  ): Promise<UserGroupResponseDto> {
    this.logger.log(`User ${userId} joining group with invite code`);

    const group = await this.userGroupRepository.findByInviteCode(inviteCode);
    if (!group) {
      throw new NotFoundException('Invalid invite code');
    }

    // Check if already a member
    const existingMembership =
      await this.membershipRepository.findByUserAndGroup(userId, group.id);
    if (existingMembership) {
      throw new ConflictException('You are already a member of this group');
    }

    await this.membershipRepository.create({
      userId,
      groupId: group.id,
      role: GroupRole.MEMBER,
    });

    // Refetch group with updated memberships
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
      throw new NotFoundException('You are not a member of this group');
    }

    const memberCount = await this.membershipRepository.countMembers(groupId);

    // If last member, delete the group entirely
    if (memberCount <= 1) {
      this.logger.log(`Last member leaving group ${groupId}, deleting group`);
      await this.userGroupRepository.delete(groupId);
      return;
    }

    // If admin but not last member, check if other admins exist
    if (membership.role === GroupRole.ADMIN) {
      const adminCount = await this.membershipRepository.countAdmins(groupId);
      if (adminCount <= 1) {
        throw new BadRequestException(
          'Cannot leave: you are the last admin. Transfer admin rights to another member first.',
        );
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

    const group = await this.userGroupRepository.findById(groupId);
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    return { inviteCode: group.inviteCode };
  }

  // ========== Member Management ==========

  async getMembers(
    groupId: string,
    userId: string,
  ): Promise<{ members: GroupMemberResponseDto[]; virtualMembers: VirtualMemberResponseDto[] }> {
    this.logger.log(`Getting members for group ${groupId}`);

    await this.requireMember(userId, groupId);

    const memberships =
      await this.membershipRepository.findAllByGroupId(groupId);
    const virtualMembers =
      await this.virtualMemberRepository.findAllByGroupId(groupId);

    return {
      members: memberships.map((m) => this.transformToMemberDto(m)),
      virtualMembers: virtualMembers.map((vm) =>
        this.transformToVirtualMemberDto(vm),
      ),
    };
  }

  async removeMember(
    groupId: string,
    membershipId: string,
    userId: string,
  ): Promise<void> {
    this.logger.log(
      `Removing member ${membershipId} from group ${groupId} by user ${userId}`,
    );

    await this.requireAdmin(userId, groupId);

    const membership = await this.membershipRepository.findById(membershipId);
    if (!membership || membership.groupId !== groupId) {
      throw new NotFoundException('Membership not found');
    }

    // Cannot remove yourself via this endpoint
    if (membership.userId === userId) {
      throw new BadRequestException('Use leave endpoint to leave the group');
    }

    await this.membershipRepository.deleteById(membershipId);
  }

  async transferAdmin(
    groupId: string,
    targetMembershipId: string,
    userId: string,
  ): Promise<GroupMemberResponseDto> {
    this.logger.log(
      `Transferring admin to ${targetMembershipId} in group ${groupId} by ${userId}`,
    );

    await this.requireAdmin(userId, groupId);

    const targetMembership =
      await this.membershipRepository.findById(targetMembershipId);
    if (!targetMembership || targetMembership.groupId !== groupId) {
      throw new NotFoundException('Target member not found in this group');
    }

    if (targetMembership.role === GroupRole.ADMIN) {
      throw new BadRequestException('Target is already an admin');
    }

    const updated = await this.membershipRepository.updateRoleById(
      targetMembershipId,
      GroupRole.ADMIN,
    );

    return this.transformToMemberDto(updated);
  }

  // ========== Virtual Members ==========

  async addVirtualMember(
    groupId: string,
    createDto: CreateVirtualMemberDto,
    userId: string,
  ): Promise<VirtualMemberResponseDto> {
    this.logger.log(`Adding virtual member to group ${groupId}`);

    await this.requireMember(userId, groupId);

    const virtualMember = await this.virtualMemberRepository.create(
      groupId,
      userId,
      createDto,
    );

    return this.transformToVirtualMemberDto(virtualMember);
  }

  async updateVirtualMember(
    groupId: string,
    virtualMemberId: string,
    updateDto: UpdateVirtualMemberDto,
    userId: string,
  ): Promise<VirtualMemberResponseDto> {
    this.logger.log(`Updating virtual member ${virtualMemberId}`);

    await this.requireMember(userId, groupId);

    const virtualMember =
      await this.virtualMemberRepository.findById(virtualMemberId);
    if (!virtualMember || virtualMember.groupId !== groupId) {
      throw new NotFoundException('Virtual member not found');
    }

    const updated = await this.virtualMemberRepository.update(
      virtualMemberId,
      updateDto,
    );
    return this.transformToVirtualMemberDto(updated);
  }

  async removeVirtualMember(
    groupId: string,
    virtualMemberId: string,
    userId: string,
  ): Promise<void> {
    this.logger.log(`Removing virtual member ${virtualMemberId}`);

    await this.requireMember(userId, groupId);

    const virtualMember =
      await this.virtualMemberRepository.findById(virtualMemberId);
    if (!virtualMember || virtualMember.groupId !== groupId) {
      throw new NotFoundException('Virtual member not found');
    }

    await this.virtualMemberRepository.delete(virtualMemberId);
  }

  // ========== Helpers ==========

  private async requireMember(userId: string, groupId: string): Promise<void> {
    const group = await this.userGroupRepository.findById(groupId);
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const membership = await this.membershipRepository.findByUserAndGroup(
      userId,
      groupId,
    );
    if (!membership) {
      throw new ForbiddenException('You are not a member of this group');
    }
  }

  private async requireAdmin(userId: string, groupId: string): Promise<void> {
    const group = await this.userGroupRepository.findById(groupId);
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const membership = await this.membershipRepository.findByUserAndGroup(
      userId,
      groupId,
    );
    if (!membership) {
      throw new ForbiddenException('You are not a member of this group');
    }

    if (membership.role !== GroupRole.ADMIN) {
      throw new ForbiddenException('Admin privileges required');
    }
  }

  private transformToGroupDto(group: any): UserGroupResponseDto {
    const dto = plainToClass(UserGroupResponseDto, group, {
      excludeExtraneousValues: true,
    });

    // Transform nested relations
    dto.members = (group.memberships || []).map((m: any) =>
      this.transformToMemberDto(m),
    );
    dto.virtualMembers = (group.virtualMembers || []).map((vm: any) =>
      this.transformToVirtualMemberDto(vm),
    );

    return dto;
  }

  private transformToMemberDto(membership: any): GroupMemberResponseDto {
    return plainToClass(
      GroupMemberResponseDto,
      {
        id: membership.id,
        userId: membership.userId,
        role: membership.role,
        joinedAt: membership.joinedAt,
        firstName: membership.user?.firstName,
        lastName: membership.user?.lastName,
        email: membership.user?.email,
      },
      { excludeExtraneousValues: true },
    );
  }

  private transformToVirtualMemberDto(vm: any): VirtualMemberResponseDto {
    return plainToClass(VirtualMemberResponseDto, vm, {
      excludeExtraneousValues: true,
    });
  }
}
