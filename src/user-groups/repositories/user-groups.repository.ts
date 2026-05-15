import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateUserGroupDto } from '../dto/create-user-group.dto';
import { UpdateUserGroupDto } from '../dto/update-user-group.dto';
import { GroupRole, Prisma } from '@prisma/client';
import { GroupNotFoundException } from '../../common/exceptions/business.exception';
import { generateInviteCode } from '../../common/utils/invite-code';
import {
  USER_GROUP_WITH_RELATIONS_INCLUDE,
  UserGroupWithRelations,
} from '../../common/types/prisma-relations';

@Injectable()
export class UserGroupRepository {
  constructor(private prisma: PrismaService) {}

  create(
    data: CreateUserGroupDto & { createdBy: string },
  ): Promise<UserGroupWithRelations> {
    return this.prisma.userGroup.create({
      data: {
        name: data.name,
        description: data.description,
        createdBy: data.createdBy,
        inviteCode: generateInviteCode(),
        memberships: {
          create: {
            userId: data.createdBy,
            role: GroupRole.ADMIN,
          },
        },
      },
      include: USER_GROUP_WITH_RELATIONS_INCLUDE,
    });
  }

  findById(id: string): Promise<UserGroupWithRelations | null> {
    return this.prisma.userGroup.findUnique({
      where: { id },
      include: USER_GROUP_WITH_RELATIONS_INCLUDE,
    });
  }

  findByInviteCode(inviteCode: string): Promise<UserGroupWithRelations | null> {
    return this.prisma.userGroup.findUnique({
      where: { inviteCode },
      include: USER_GROUP_WITH_RELATIONS_INCLUDE,
    });
  }

  findAllByUserId(userId: string): Promise<UserGroupWithRelations[]> {
    return this.prisma.userGroup.findMany({
      where: {
        memberships: {
          some: {
            userId,
          },
        },
      },
      include: USER_GROUP_WITH_RELATIONS_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(
    id: string,
    data: UpdateUserGroupDto,
  ): Promise<UserGroupWithRelations> {
    try {
      return await this.prisma.userGroup.update({
        where: { id },
        data,
        include: USER_GROUP_WITH_RELATIONS_INCLUDE,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new GroupNotFoundException(id);
      }
      throw error;
    }
  }

  async regenerateInviteCode(id: string): Promise<UserGroupWithRelations> {
    try {
      return await this.prisma.userGroup.update({
        where: { id },
        data: {
          inviteCode: generateInviteCode(),
        },
        include: USER_GROUP_WITH_RELATIONS_INCLUDE,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new GroupNotFoundException(id);
      }
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.userGroup.delete({
        where: { id },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new GroupNotFoundException(id);
      }
      throw error;
    }
  }
}
