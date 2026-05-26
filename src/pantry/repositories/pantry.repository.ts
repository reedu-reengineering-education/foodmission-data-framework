import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  PantryWithRelations,
  PANTRY_WITH_RELATIONS_INCLUDE,
} from '../../common/types/prisma-relations';

@Injectable()
export class PantryRepository {
  constructor(private prisma: PrismaService) {}

  async findByUserId(userId: string): Promise<PantryWithRelations | null> {
    return this.prisma.pantry.findUnique({
      where: { userId },
      include: PANTRY_WITH_RELATIONS_INCLUDE,
    });
  }

  async getOrCreate(userId: string): Promise<PantryWithRelations> {
    return this.prisma.pantry.upsert({
      where: { userId },
      create: { userId },
      update: {},
      include: PANTRY_WITH_RELATIONS_INCLUDE,
    });
  }

  async findById(id: string): Promise<PantryWithRelations | null> {
    return await this.prisma.pantry.findUnique({
      where: { id },
      include: PANTRY_WITH_RELATIONS_INCLUDE,
    });
  }
}
