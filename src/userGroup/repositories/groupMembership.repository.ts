import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { GroupRole } from '@prisma/client';

export type GroupMembershipWithUser = NonNullable<
  Awaited<ReturnType<PrismaService['groupMembership']['findUnique']>>
>;

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

  async findByUserAndGroup(
    userId: string,
    groupId: string,
  ): Promise<GroupMembershipWithUser | null> {
    return await this.prisma.groupMembership.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId,
        },
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

  async updateRole(
    userId: string,
    groupId: string,
    role: GroupRole,
  ): Promise<GroupMembershipWithUser> {
    return await this.prisma.groupMembership.update({
      where: {
        userId_groupId: {
          userId,
          groupId,
        },
      },
      data: { role },
      include: this.includeUser,
    });
  }

  async delete(userId: string, groupId: string): Promise<void> {
    await this.prisma.groupMembership.delete({
      where: {
        userId_groupId: {
          userId,
          groupId,
        },
      },
    });
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
      },
    });
  }

  async countMembers(groupId: string): Promise<number> {
    return await this.prisma.groupMembership.count({
      where: { groupId },
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
