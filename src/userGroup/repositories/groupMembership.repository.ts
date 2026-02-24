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
import { GroupMemberNotFoundException } from '../../common/exceptions/business.exception';

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

  private toJsonInput(value?: object): Prisma.InputJsonValue | undefined {
    return value !== undefined ? (value as Prisma.InputJsonValue) : undefined;
  }

  isVirtual(membership: GroupMembershipWithUser): boolean {
    return membership.userId === null;
  }

  async create(data: {
    userId: string;
    groupId: string;
    role?: GroupRole;
  }): Promise<GroupMembershipWithUser> {
    return this.prisma.groupMembership.create({
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
    return this.prisma.groupMembership.create({
      data: {
        groupId: data.groupId,
        userId: null,
        nickname: data.nickname,
        age: data.age,
        gender: data.gender,
        activityLevel: data.activityLevel,
        annualIncome: data.annualIncome,
        preferences: this.toJsonInput(data.preferences) ?? {},
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
    return this.prisma.groupMembership.findFirst({
      where: {
        userId,
        groupId,
      },
      include: this.includeUser,
    });
  }

  async findById(id: string): Promise<GroupMembershipWithUser | null> {
    return this.prisma.groupMembership.findUnique({
      where: { id },
      include: this.includeUser,
    });
  }

  async findAllByGroupId(groupId: string): Promise<GroupMembershipWithUser[]> {
    return this.prisma.groupMembership.findMany({
      where: { groupId },
      include: this.includeUser,
      orderBy: { joinedAt: 'asc' },
    });
  }

  async findRegisteredByGroupId(
    groupId: string,
  ): Promise<GroupMembershipWithUser[]> {
    return this.prisma.groupMembership.findMany({
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
    return this.prisma.groupMembership.findMany({
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
      throw new GroupMemberNotFoundException(`${userId}/${groupId}`);
    }
    return this.updateRoleById(membership.id, role);
  }

  async updateVirtualMember(
    id: string,
    data: UpdateVirtualMemberData,
  ): Promise<GroupMembershipWithUser> {
    return this.prisma.groupMembership.update({
      where: {
        id,
        userId: null,
      },
      data: {
        nickname: data.nickname,
        age: data.age,
        gender: data.gender,
        activityLevel: data.activityLevel,
        annualIncome: data.annualIncome,
        preferences: this.toJsonInput(data.preferences),
      },
      include: this.includeUser,
    });
  }

  async delete(userId: string, groupId: string): Promise<void> {
    const membership = await this.findByUserAndGroup(userId, groupId);
    if (!membership) {
      throw new GroupMemberNotFoundException(`${userId}/${groupId}`);
    }
    await this.prisma.groupMembership.delete({
      where: { id: membership.id },
    });
  }

  async deleteById(id: string): Promise<void> {
    try {
      await this.prisma.groupMembership.delete({
        where: { id },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new GroupMemberNotFoundException(id);
      }
      throw error;
    }
  }

  async countAdmins(groupId: string): Promise<number> {
    return this.prisma.groupMembership.count({
      where: {
        groupId,
        role: GroupRole.ADMIN,
        userId: { not: null },
      },
    });
  }

  async countMembers(groupId: string): Promise<number> {
    return this.prisma.groupMembership.count({
      where: { groupId },
    });
  }

  async countRegisteredMembers(groupId: string): Promise<number> {
    return this.prisma.groupMembership.count({
      where: {
        groupId,
        userId: { not: null },
      },
    });
  }

  async countVirtualMembers(groupId: string): Promise<number> {
    return this.prisma.groupMembership.count({
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
    return this.prisma.groupMembership.update({
      where: { id: membershipId },
      data: { role },
      include: this.includeUser,
    });
  }
}
