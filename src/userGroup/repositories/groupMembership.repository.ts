import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  GroupRole,
  Gender,
  ActivityLevel,
  AnnualIncomeLevel,
  Prisma,
  GroupMembership,
} from '@prisma/client';

export type GroupMembershipWithUser = GroupMembership & {
  user?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
};

export interface CreateVirtualMemberData {
  groupId: string;
  createdBy: string;
  nickname: string;
  age?: number;
  gender?: Gender;
  activityLevel?: ActivityLevel;
  annualIncome?: AnnualIncomeLevel;
  preferences?: object;
}

export interface UpdateVirtualMemberData {
  nickname?: string;
  age?: number;
  gender?: Gender;
  activityLevel?: ActivityLevel;
  annualIncome?: AnnualIncomeLevel;
  preferences?: object;
}

@Injectable()
export class GroupMembershipRepository {
  constructor(private prisma: PrismaService) {}

  private readonly includeUser = {
    user: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    },
  };

  isVirtual(membership: GroupMembershipWithUser): boolean {
    return membership.userId === null;
  }

  async create(data: {
    userId: string;
    groupId: string;
    role?: GroupRole;
  }): Promise<GroupMembershipWithUser> {
    return await this.prisma.groupMembership.create({
      data: {
        userId: data.userId,
        groupId: data.groupId,
        role: data.role || GroupRole.MEMBER,
      },
      include: this.includeUser,
    });
  }

  async createVirtualMember(
    data: CreateVirtualMemberData,
  ): Promise<GroupMembershipWithUser> {
    return await this.prisma.groupMembership.create({
      data: {
        groupId: data.groupId,
        userId: null,
        nickname: data.nickname,
        age: data.age,
        gender: data.gender,
        activityLevel: data.activityLevel,
        annualIncome: data.annualIncome,
        preferences: (data.preferences as Prisma.InputJsonValue) || {},
        createdBy: data.createdBy,
        role: GroupRole.MEMBER,
      },
      include: this.includeUser,
    });
  }

  async findByUserAndGroup(
    userId: string,
    groupId: string,
  ): Promise<GroupMembershipWithUser | null> {
    return await this.prisma.groupMembership.findFirst({
      where: {
        userId,
        groupId,
      },
      include: this.includeUser,
    });
  }

  async findById(id: string): Promise<GroupMembershipWithUser | null> {
    return await this.prisma.groupMembership.findUnique({
      where: { id },
      include: this.includeUser,
    });
  }

  async findAllByGroupId(groupId: string): Promise<GroupMembershipWithUser[]> {
    return await this.prisma.groupMembership.findMany({
      where: { groupId },
      include: this.includeUser,
      orderBy: { joinedAt: 'asc' },
    });
  }

  async findRegisteredByGroupId(
    groupId: string,
  ): Promise<GroupMembershipWithUser[]> {
    return await this.prisma.groupMembership.findMany({
      where: {
        groupId,
        userId: { not: null },
      },
      include: this.includeUser,
      orderBy: { joinedAt: 'asc' },
    });
  }

  async findVirtualByGroupId(
    groupId: string,
  ): Promise<GroupMembershipWithUser[]> {
    return await this.prisma.groupMembership.findMany({
      where: {
        groupId,
        userId: null,
      },
      include: this.includeUser,
      orderBy: { joinedAt: 'asc' },
    });
  }

  async updateRole(
    userId: string,
    groupId: string,
    role: GroupRole,
  ): Promise<GroupMembershipWithUser> {
    const membership = await this.findByUserAndGroup(userId, groupId);
    if (!membership) {
      throw new Error('Membership not found');
    }
    return await this.prisma.groupMembership.update({
      where: { id: membership.id },
      data: { role },
      include: this.includeUser,
    });
  }

  async updateVirtualMember(
    id: string,
    data: UpdateVirtualMemberData,
  ): Promise<GroupMembershipWithUser> {
    return await this.prisma.groupMembership.update({
      where: { id },
      data: {
        nickname: data.nickname,
        age: data.age,
        gender: data.gender,
        activityLevel: data.activityLevel,
        annualIncome: data.annualIncome,
        preferences: data.preferences as Prisma.InputJsonValue,
      },
      include: this.includeUser,
    });
  }

  async delete(userId: string, groupId: string): Promise<void> {
    const membership = await this.findByUserAndGroup(userId, groupId);
    if (membership) {
      await this.prisma.groupMembership.delete({
        where: { id: membership.id },
      });
    }
  }

  async deleteById(id: string): Promise<void> {
    await this.prisma.groupMembership.delete({
      where: { id },
    });
  }

  async countAdmins(groupId: string): Promise<number> {
    return await this.prisma.groupMembership.count({
      where: {
        groupId,
        role: GroupRole.ADMIN,
        userId: { not: null }, // Only registered users can be admins
      },
    });
  }

  async countMembers(groupId: string): Promise<number> {
    return await this.prisma.groupMembership.count({
      where: { groupId },
    });
  }

  async countRegisteredMembers(groupId: string): Promise<number> {
    return await this.prisma.groupMembership.count({
      where: {
        groupId,
        userId: { not: null },
      },
    });
  }

  async countVirtualMembers(groupId: string): Promise<number> {
    return await this.prisma.groupMembership.count({
      where: {
        groupId,
        userId: null,
      },
    });
  }

  async updateRoleById(
    membershipId: string,
    role: GroupRole,
  ): Promise<GroupMembershipWithUser> {
    return await this.prisma.groupMembership.update({
      where: { id: membershipId },
      data: { role },
      include: this.includeUser,
    });
  }
}
