import { Injectable } from '@nestjs/common';
import { Pantry, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreatePantryDto } from '../dto/create-pantry.dto';
import { UpdatePantryDto } from '../dto/query-pantry.dto';

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

  async create(data: CreatePantryDto): Promise<Pantry> {
    try {
      return await this.prisma.pantry.create({
        data,
      });
    } catch (error) {
      throw new Error('failed to create pantry');
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

  async count(where?: any): Promise<number> {
    try {
      return await this.prisma.pantry.count({ where });
    } catch (error) {
      console.error('Error counting pantrys:', error);
      throw new Error('Failed to count pantrys');
    }
  }
}
