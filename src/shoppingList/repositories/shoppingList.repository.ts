import { Injectable } from '@nestjs/common';
import { ShoppingList, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  BaseRepository,
  FindAllOptions,
  PaginatedResult,
} from '../../common/interfaces/base-repository.interface';

export interface CreateShoppingListDto {
  userId: string;
  title: string;
}

export interface UpdateShoppingListDto {
  title: string;
}


@Injectable()
export class ShoppingListRepository
  implements BaseRepository<ShoppingList, CreateShoppingListDto, UpdateShoppingListDto>
{

    constructor(private readonly prisma: PrismaService) {}


  findAll(options?: FindAllOptions): Promise<{ id: string; userId: string; title: string; }[]> {
    throw new Error('Method not implemented.');
  }


  findById(id: string): Promise<{ id: string; userId: string; title: string; } | null> {
    throw new Error('Method not implemented.');
  }


   async create(data: CreateShoppingListDto): Promise<ShoppingList> {
     try {
       return await this.prisma.shoppingList.create({
        data ,
       });
     } catch (error) {
       console.error('Error creating shopping list:', error);
       if (error instanceof Prisma.PrismaClientKnownRequestError) {
       }
       throw new Error('Failed to create shopping list');
     }
   }


  update(id: string, data: UpdateShoppingListDto): Promise<{ id: string; userId: string; title: string; }> {
    throw new Error('Method not implemented.');
  }


  delete(id: string): Promise<void> {
    throw new Error('Method not implemented.');
  }


  count(where?: any): Promise<number> {
    throw new Error('Method not implemented.');
  }

}
