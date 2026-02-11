import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateVirtualMemberDto } from '../dto/create-virtualMember.dto';
import { UpdateVirtualMemberDto } from '../dto/update-virtualMember.dto';

export type VirtualMemberEntity = NonNullable<
  Awaited<ReturnType<PrismaService['virtualMember']['findUnique']>>
>;

@Injectable()
export class VirtualMemberRepository {
  constructor(private prisma: PrismaService) {}

  async create(
    groupId: string,
    createdBy: string,
    data: CreateVirtualMemberDto,
  ): Promise<VirtualMemberEntity> {
    return await this.prisma.virtualMember.create({
      data: {
        groupId,
        createdBy,
        nickname: data.nickname,
        age: data.age,
        gender: data.gender,
        activityLevel: data.activityLevel,
        annualIncome: data.annualIncome,
        preferences: data.preferences as Prisma.InputJsonValue,
      },
    });
  }

  async findById(id: string): Promise<VirtualMemberEntity | null> {
    return await this.prisma.virtualMember.findUnique({
      where: { id },
    });
  }

  async findAllByGroupId(groupId: string): Promise<VirtualMemberEntity[]> {
    return await this.prisma.virtualMember.findMany({
      where: { groupId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async update(
    id: string,
    data: UpdateVirtualMemberDto,
  ): Promise<VirtualMemberEntity> {
    return await this.prisma.virtualMember.update({
      where: { id },
      data: {
        nickname: data.nickname,
        age: data.age,
        gender: data.gender,
        activityLevel: data.activityLevel,
        annualIncome: data.annualIncome,
        preferences: data.preferences as Prisma.InputJsonValue,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.virtualMember.delete({
      where: { id },
    });
  }
}
