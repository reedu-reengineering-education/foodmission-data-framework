import { Injectable } from '@nestjs/common';
import { ShoppingList, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { BaseRepository } from '../../common/interfaces/base-repository.interface';

export interface CreateShoppingListDto {
  userId: string;
  title: string;
}

export interface UpdateShoppingListDto {
  title: string;
}

@Injectable()
export class ShoppingListRepository
  implements
    BaseRepository<ShoppingList, CreateShoppingListDto, UpdateShoppingListDto>
{
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<ShoppingList[]> {
    return await this.prisma.shoppingList.findMany();
  }

  async findById(id: string): Promise<ShoppingList | null> {
    try {
      return await this.prisma.shoppingList.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              food: true,
            },
          },
        },
      });
    } catch (error: unknown) {
      console.error('Error find shopping list:', error);
      throw new Error('Cloudnt find shopping list.');
    }
  }

  async create(data: CreateShoppingListDto): Promise<ShoppingList> {
    try {
      return await this.prisma.shoppingList.create({
        data,
      });
    } catch (error) {
      console.error('Error creating shopping list:', error);
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new Error('Failed to create shopping list.');
      }
      throw new Error('Failed to create shopping list.');
    }
  }

  async update(id: string, data: UpdateShoppingListDto): Promise<ShoppingList> {
    try {
      return await this.prisma.shoppingList.update({
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
      console.error('Error updating shopping list:', error);
      throw new Error('Failed to update shopping list.');
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.shoppingList.delete({
        where: { id },
      });
    } catch (error) {
      console.error('Error deleting shopping list:', error);
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new Error('Shopping list not found');
        }
      }
      throw new Error('Failed to delete shopping list');
    }
  }

  async count(where?: any): Promise<number> {
    try {
      return await this.prisma.shoppingList.count({ where });
    } catch (error) {
      console.error('Error counting shoppings lists:', error);
      throw new Error('Failed to count shoppings lists');
    }
  }
}
