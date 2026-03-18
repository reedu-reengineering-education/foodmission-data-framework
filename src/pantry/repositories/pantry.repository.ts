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
      include: { items: { include: { food: true } } },
    });
  }

  async getOrCreate(userId: string): Promise<PantryWithRelations> {
    // Try to find existing pantry
    const existing = await this.findByUserId(userId);
    if (existing) {
      return existing;
    }

    // Create new pantry if doesn't exist
    return this.prisma.pantry.create({
      data: { userId },
      include: {
        items: {
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
        items: {
          include: {
            food: true,
          },
        },
      },
    });
  }
}
