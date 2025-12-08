import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { handlePrismaError } from '../../common/utils/error.utils';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { ResourceAlreadyExistsException } from '../../common/exceptions/business.exception';
import { ShoppingListRepository } from '../repositories/shoppingList.repository';
import { CreateShoppingListDto } from '../dto/create-shoppingList.dto';
import {
  MultipleShoppingListResponseDto,
  ShoppingListResponseDto,
} from '../dto/shoppingList-response.dto';
import { plainToClass, plainToInstance } from 'class-transformer';
import { UpdateShoppingListDto } from '../dto/update.shoppingList.dto';
import { ShoppingListItemRepository } from '../../shoppingListItem/repositories/shoppingListItem.repository';
import { MultipleShoppingListItemResponseDto } from '../../shoppingListItem/dto/response-soppingListItem.dto';
import { QueryShoppingListItemDto } from '../../shoppingListItem/dto/query-shoppingListItem.dto';
import { ShoppingListItemResponseDto } from '../../shoppingListItem/dto/response-soppingListItem.dto';
import { sanitizeShoppingListItemFilters } from '../utils/filter-sanitizer';

@Injectable()
export class ShoppingListService {
  private readonly logger = new Logger(ShoppingListService.name);

  constructor(
    private readonly shoppingListRepository: ShoppingListRepository,
    private readonly shoppingListItemRepository: ShoppingListItemRepository,
  ) {}

  async create(
    createShoppingListDto: CreateShoppingListDto,
    userId: string,
  ): Promise<ShoppingListResponseDto> {
    this.logger.log(`Creating a shopping list: ${createShoppingListDto.title}`);

    try {
      const shoppingList = await this.shoppingListRepository.create({
        ...createShoppingListDto,
        userId,
      });
      return this.transformToResponseDto(shoppingList);
    } catch (error: any) {
      if (error instanceof PrismaClientKnownRequestError) {
        const businessException = handlePrismaError(
          error,
          'create',
          'shopping_list',
        );

        if (businessException instanceof ResourceAlreadyExistsException) {
          throw new ConflictException(
            'Shopping list with this title already exists',
          );
        }

        throw businessException;
      }

      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      throw error;
    }
  }

  async findAll(): Promise<MultipleShoppingListResponseDto> {
    this.logger.log(`Finding all shopping list `);

    const shoppingList = await this.shoppingListRepository.findAll();

    const transformedData = plainToInstance(
      ShoppingListResponseDto,
      shoppingList,
      { excludeExtraneousValues: true },
    );

    return {
      data: transformedData,
    };
  }

  async findById(
    id: string,
    userId?: string,
  ): Promise<ShoppingListResponseDto> {
    this.logger.log(`Finding shopping list with the id:` + id);

    const shoppingList = await this.shoppingListRepository.findById(id);

    if (!shoppingList) {
      throw new NotFoundException('Shopping list dosent exist');
    }

    if (shoppingList.userId !== userId) {
      throw new ForbiddenException('No permission');
    }
    return this.transformToResponseDto(shoppingList);
  }

  async findItems(
    id: string,
    userId: string,
    query?: QueryShoppingListItemDto,
  ): Promise<MultipleShoppingListItemResponseDto> {
    const shoppingList = await this.shoppingListRepository.findById(id);

    if (!shoppingList) {
      throw new NotFoundException('Shopping list not found');
    }

    if (shoppingList.userId !== userId) {
      throw new ForbiddenException('No permission');
    }

    const { foodId, checked, unit } = sanitizeShoppingListItemFilters(query);

    const items = await this.shoppingListItemRepository.findByShoppingListId(
      id,
      userId,
      { foodId, checked, unit },
    );

    const transformedData = plainToInstance(
      ShoppingListItemResponseDto,
      items,
      { excludeExtraneousValues: true },
    );

    return { data: transformedData };
  }

  async update(
    id: string,
    updateShoppingListDto: UpdateShoppingListDto,
    userId?: string,
  ): Promise<ShoppingListResponseDto> {
    try {
      const existingList = await this.shoppingListRepository.findById(id);
      if (!existingList) {
        throw new NotFoundException('Shopping list not found');
      }
      if (existingList.userId !== userId) {
        throw new ForbiddenException('No permission');
      }

      const shoppingList = await this.shoppingListRepository.update(
        id,
        updateShoppingListDto,
      );
      return this.transformToResponseDto(shoppingList);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to update shopping list');
    }
  }

  async remove(id: string, userId: string): Promise<void> {
    try {
      const existingList = await this.shoppingListRepository.findById(id);
      if (!existingList) {
        throw new NotFoundException('Shopping list not found');
      }
      if (existingList.userId !== userId) {
        throw new ForbiddenException('No permission');
      }
      await this.shoppingListRepository.delete(id);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to delete shopping list');
    }
  }

  private transformToResponseDto(shoppingList: any): ShoppingListResponseDto {
    return plainToClass(ShoppingListResponseDto, {
      id: shoppingList.id,
      title: shoppingList.title,
      createdAt: shoppingList.createdAt,
      updatedAt: shoppingList.updatedAt,
    });
  }
}
