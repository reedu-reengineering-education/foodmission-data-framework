import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export type PantryWithRelations = NonNullable<
  Awaited<ReturnType<PrismaService['pantry']['findUnique']>>
>;

@Injectable()
export class PantryRepository {
  constructor(private prisma: PrismaService) {}

  async findByUserId(userId: string): Promise<PantryWithRelations | null> {
    return this.prisma.pantry.findUnique({
      where: { userId },
      include: { items: { include: { food: true, foodCategory: true } } },
    });
  }

  async getOrCreate(userId: string): Promise<PantryWithRelations> {
    return this.prisma.pantry.upsert({
      where: { userId },
      create: { userId },
      update: {},
      include: {
        items: {
          include: {
            food: true,
            foodCategory: true,
          },
        },
      },
    });
  }

  async findById(id: string): Promise<PantryWithRelations | null> {
    return await this.prisma.pantry.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            food: true,
            foodCategory: true,
          },
        },
      },
    });
  }
}
