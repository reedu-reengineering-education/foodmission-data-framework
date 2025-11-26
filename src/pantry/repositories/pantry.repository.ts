import { Injectable } from '@nestjs/common';
import { Pantry, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreatePantryDto } from '../dto/create-pantry.dto';
import { UpdatePantryDto } from '../dto/update-pantry.dto';

export type PantryWithRelations = Prisma.PantryGetPayload<{
  include: {
    items: {
      include: {
        food: true;
      };
    };
  };
}>;

@Injectable()
export class PantryRepository {
  constructor(private prisma: PrismaService) {}

  async findByUserId(userId: string): Promise<any> {
    return this.prisma.pantry.findUnique({
      where: { userId },
      include: { items: { include: { food: true } } },
    });
  }

  async create(data: CreatePantryDto & { userId: string }): Promise<Pantry> {
    try {
      return await this.prisma.pantry.create({
        data,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          // Unique constraint violation
          const target = error.meta?.target as string[] | undefined;
          if (target?.includes('userId')) {
            throw new Error('User already has a pantry. Each user can only have one pantry.');
          }
          // Note: userId is unique, so duplicate titles for same user are not possible
        }
      }

      throw new Error('Failed to create pantry');
    }
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
    try {
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
    } catch (error: unknown) {
      console.error('Error updating pantry:', error);
      throw new Error('Failed to update pantry.');
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.pantry.delete({
        where: { id },
      });
    } catch (error) {
      console.error('Error deleting pantry:', error);
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new Error('Pantry not found');
        }
      }
      throw new Error('Failed to delete pantry');
    }
  }
}
