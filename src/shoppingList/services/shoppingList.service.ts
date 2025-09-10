import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ShoppingListRepository } from '../repositories/shoppingList.repository';
import { CreateShoppingListDto } from '../dto/create-shoppingList.dto';
import { ShoppingListResponseDto } from '../dto/shoppingList-response.dto';
import { plainToClass } from 'class-transformer';


@Injectable()
export class ShoppingListService {
  private readonly logger = new Logger(ShoppingListService.name);

  constructor(
    private readonly shoppingListRepository: ShoppingListRepository,
  ) {}


  async create(createShoppingListDto: CreateShoppingListDto): Promise<ShoppingListResponseDto> {
    this.logger.log(`Creating a shopping list: ${createShoppingListDto.title}`);


    if(createShoppingListDto.title) {
      const existingShoppingList = await this.shoppingListRepository.findAll()
    if(existingShoppingList) {
        throw new BadRequestException(
                'Shopping list with this title already exists',
              );
            }
    }

    const shoppingList = await this.shoppingListRepository.create(createShoppingListDto);
    return this.transformToResponseDto(shoppingList)
  }
  

    private transformToResponseDto(shoppingList: any): ShoppingListResponseDto {
      return plainToClass(ShoppingListResponseDto, {
        id: shoppingList.id,
        title: shoppingList.title,
        createdBy: shoppingList.createdAt
      });
    }
}
