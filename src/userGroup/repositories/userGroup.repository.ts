import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateUserGroupDto } from '../dto/create-userGroup.dto';
import { UpdateUserGroupDto } from '../dto/update-userGroup.dto';
import { GroupRole } from '@prisma/client';

export type UserGroupWithRelations = NonNullable<
  Awaited<ReturnType<PrismaService['userGroup']['findUnique']>>
>;

@Injectable()
export class UserGroupRepository {
  constructor(private prisma: PrismaService) {}

  private readonly includeRelations = {
    memberships: {
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    },
    virtualMembers: true,
  };

  async create(
    data: CreateUserGroupDto & { createdBy: string },
  ): Promise<UserGroupWithRelations> {
    return await this.prisma.$transaction(async (tx) => {
      // Create the group
      const group = await tx.userGroup.create({
        data: {
          name: data.name,
          description: data.description,
          createdBy: data.createdBy,
        },
        include: this.includeRelations,
      });

      // Add creator as ADMIN member
      await tx.groupMembership.create({
        data: {
          userId: data.createdBy,
          groupId: group.id,
          role: GroupRole.ADMIN,
        },
      });

      // Fetch the group again with the membership included
      const result = await tx.userGroup.findUnique({
        where: { id: group.id },
        include: this.includeRelations,
      });

      // This should never be null since we just created it
      if (!result) {
        throw new Error('Failed to fetch created group');
      }

      return result;
    });
  }

  async findById(id: string): Promise<UserGroupWithRelations | null> {
    return await this.prisma.userGroup.findUnique({
      where: { id },
      include: this.includeRelations,
    });
  }

  async findByInviteCode(inviteCode: string): Promise<UserGroupWithRelations | null> {
    return await this.prisma.userGroup.findUnique({
      where: { inviteCode },
      include: this.includeRelations,
    });
  }

  async findAllByUserId(userId: string): Promise<UserGroupWithRelations[]> {
    return await this.prisma.userGroup.findMany({
      where: {
        memberships: {
          some: {
            userId,
          },
        },
      },
      include: this.includeRelations,
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(
    id: string,
    data: UpdateUserGroupDto,
  ): Promise<UserGroupWithRelations> {
    return await this.prisma.userGroup.update({
      where: { id },
      data,
      include: this.includeRelations,
    });
  }

  async regenerateInviteCode(id: string): Promise<UserGroupWithRelations> {
    return await this.prisma.userGroup.update({
      where: { id },
      data: {
        inviteCode: crypto.randomUUID(),
      },
      include: this.includeRelations,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.userGroup.delete({
      where: { id },
    });
  }
}
