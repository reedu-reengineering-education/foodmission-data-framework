import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';

export type PantryWithRelations = Prisma.PantryGetPayload<{
  include: {
    PantryItem: {
      include: {
        food: true;
      };
    };
  };
}>;

@Injectable()
export class PantryRepository {
  constructor(private prisma: PrismaService) {}

  async findByUserId(userId: string): Promise<PantryWithRelations | null> {
    return await this.prisma.pantry.findUnique({
      where: { userId },
      include: {
        PantryItem: {
          include: {
            food: true,
          },
        },
      },
    });
  }

  async create(userId: string): Promise<PantryWithRelations> {
    return await this.prisma.pantry.create({
      data: {
        userId,
      },
      include: {
        PantryItem: {
          include: {
            food: true,
          },
        },
      },
    });
  }

  async findById(id: string): Promise<PantryWithRelations | null> {
    return await this.prisma.pantry.findUnique({
      where: { id },
      include: {
        PantryItem: {
          include: {
            food: true,
          },
        },
      },
    });
  }
}
