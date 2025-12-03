import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreatePantryDto } from '../dto/create-pantry.dto';
import { UpdatePantryDto } from '../dto/query-pantry.dto';

type Pantry = Awaited<ReturnType<PrismaService['pantry']['create']>>;

export type PantryWithRelations = NonNullable<
  Awaited<ReturnType<PrismaService['pantry']['findUnique']>>
>;

@Injectable()
export class PantryRepository {
  constructor(private prisma: PrismaService) {}

  async findByUserId(userId: string): Promise<PantryWithRelations | null> {
    return this.prisma.pantry.findFirst({
      where: { userId },
      include: { items: { include: { food: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: CreatePantryDto): Promise<Pantry> {
    return await this.prisma.pantry.create({
      data,
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

  async update(
    id: string,
    data: UpdatePantryDto,
  ): Promise<PantryWithRelations> {
    return await this.prisma.pantry.update({
      where: { id },
      data,
      include: {
        items: {
          include: {
            food: true,
          },
        },
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.pantry.delete({
      where: { id },
    });
  }

  async count(where?: any): Promise<number> {
    return await this.prisma.pantry.count({ where });
  }
}
