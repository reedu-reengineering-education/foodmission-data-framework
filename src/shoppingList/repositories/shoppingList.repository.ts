import { Injectable } from '@nestjs/common';
import { ShoppingList } from '@prisma/client';
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
  }

  async create(data: CreateShoppingListDto): Promise<ShoppingList> {
    return await this.prisma.shoppingList.create({
      data,
    });
  }

  async update(id: string, data: UpdateShoppingListDto): Promise<ShoppingList> {
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
  }

  async delete(id: string): Promise<void> {
    await this.prisma.shoppingList.delete({
      where: { id },
    });
  }

  async count(where?: any): Promise<number> {
    return await this.prisma.shoppingList.count({ where });
  }
}
