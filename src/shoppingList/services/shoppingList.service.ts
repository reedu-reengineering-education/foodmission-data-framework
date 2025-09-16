import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ShoppingListRepository } from '../repositories/shoppingList.repository';
import { CreateShoppingListDto } from '../dto/create-shoppingList.dto';
import { PaginatedShoppingListResponseDto, ShoppingListResponseDto } from '../dto/shoppingList-response.dto';
import { plainToClass } from 'class-transformer';
import { ShoppingListQueryDto } from '../dto/shoppingList-query.dto';
import { UpdateShoppingListDto } from '../dto/update.shoppingList.dto';


@Injectable()
export class ShoppingListService {
  private readonly logger = new Logger(ShoppingListService.name);

  constructor(
    private readonly shoppingListRepository: ShoppingListRepository,
  ) {}


  async create(createShoppingListDto: CreateShoppingListDto): Promise<ShoppingListResponseDto> {
    this.logger.log(`Creating a shopping list: ${createShoppingListDto.title}`);

    try {
    const shoppingList = await this.shoppingListRepository.create(createShoppingListDto);
    return this.transformToResponseDto(shoppingList)
    } catch (error : any) {
      if(error.code === 'P2002'){
         throw new BadRequestException(
                'Shopping list with this title already exists',
              );
      }
      throw error;
    }
  }


  async findAll(query : ShoppingListQueryDto): Promise<PaginatedShoppingListResponseDto> {
    this.logger.log(`Finding shopping list with query`);

        const {
      page = 1,
      limit = 10,
      search,
      title,
      sortBy = 'title',
      sortOrder = 'desc',
    } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if(search) {
      where.title = {
        contains:search,
        mode: 'insensitive',
      };
    }

    if(title) {
      where.title = title;
    }

       const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    const result = await this.shoppingListRepository.findWithPagination({
      skip, 
      take : limit, 
      where,
      orderBy,
    });

 const transformedData = await Promise.all(
      result.data.map(async (shoppingList) => {
        const responseDto = this.transformToResponseDto(shoppingList);

        return responseDto;
      }),
    );

   return plainToClass(PaginatedShoppingListResponseDto, {
      data: transformedData,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    });
  }

  async findById(id: string, userId?: string): Promise<ShoppingListResponseDto> {

   const shoppingList = await this.shoppingListRepository.findById(id);

   if(!shoppingList){
    throw new NotFoundException('Shopping list dosent exist');
   }

   if(shoppingList.userId !== userId) {
    throw new ForbiddenException('No premission');
  }
  return this.transformToResponseDto(shoppingList);
  }

  async update(id: string, updateShoppingListDto: UpdateShoppingListDto, userId?: string): Promise<ShoppingListResponseDto> {
    try {
      const existingList = await this.shoppingListRepository.findById(id);
      if(!existingList){
        throw new NotFoundException('Shopping list not found');
   }
   if(existingList.userId !== userId) {
    throw new ForbiddenException('No premission');
    } 

   const shoppingList = await this.shoppingListRepository.update(id, updateShoppingListDto);
   return this.transformToResponseDto(shoppingList);
 
  } catch (error) {
       if (error instanceof NotFoundException || error instanceof ForbiddenException) {
      throw error;
  }
  throw new BadRequestException('Failed to update shopping list')
  }    
}

    private transformToResponseDto(shoppingList: any): ShoppingListResponseDto {
      return plainToClass(ShoppingListResponseDto, {
        id: shoppingList.id,
        title: shoppingList.title,
        createdBy: shoppingList.createdAt
      });
    }


}
