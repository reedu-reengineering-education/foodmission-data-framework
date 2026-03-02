import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateUserGroupDto } from '../dto/create-userGroup.dto';
import { UpdateUserGroupDto } from '../dto/update-userGroup.dto';
import { GroupRole, Prisma } from '@prisma/client';
import { GroupNotFoundException } from '../../common/exceptions/business.exception';

export type UserGroupWithRelations = NonNullable<
  Awaited<ReturnType<PrismaService['userGroup']['findUnique']>>
>;

@Injectable()
export class UserGroupRepository {
  constructor(private prisma: PrismaService) {}

  private readonly includeRelations: Prisma.UserGroupInclude = {
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
  };

  async create(
    data: CreateUserGroupDto & { createdBy: string },
  ): Promise<UserGroupWithRelations> {
    return this.prisma.userGroup.create({
      data: {
        name: data.name,
        description: data.description,
        createdBy: data.createdBy,
        memberships: {
          create: {
            userId: data.createdBy,
            role: GroupRole.ADMIN,
          },
        },
      },
      include: this.includeRelations,
    });
  }

  async findById(id: string): Promise<UserGroupWithRelations | null> {
    return this.prisma.userGroup.findUnique({
      where: { id },
      include: this.includeRelations,
    });
  }

  async findByInviteCode(
    inviteCode: string,
  ): Promise<UserGroupWithRelations | null> {
    return this.prisma.userGroup.findUnique({
      where: { inviteCode },
      include: this.includeRelations,
    });
  }

  async findAllByUserId(userId: string): Promise<UserGroupWithRelations[]> {
    return this.prisma.userGroup.findMany({
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
    try {
      return await this.prisma.userGroup.update({
        where: { id },
        data,
        include: this.includeRelations,
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
          inviteCode: crypto.randomUUID(),
        },
        include: this.includeRelations,
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
