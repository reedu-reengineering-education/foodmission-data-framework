import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  PantryItemRepository,
  PantryItemWithRelations,
} from '../repositories/pantryItem.repository';
import { plainToClass, plainToInstance } from 'class-transformer';
import { PrismaService } from '../../database/prisma.service';
import {
  MultiplePantryItemResponseDto,
  PantryItemResponseDto,
} from '../dto/response-pantryItem.dto';
import { QueryPantryItemDto } from '../dto/query-pantryItem.dto';
import { UpdatePantryItemDto } from '../dto/update-pantryItem.dto';
import { PantryService } from '../../pantry/services/pantry.service';
import { CreateShoppingListItemDto } from '../../shoppingListItem/dto/create-soppingListItem.dto';
import { CreatePantryItemDto } from '../dto/create-pantryItem.dto';

@Injectable()
export class PantryItemService {
  private readonly logger = new Logger(PantryItemService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pantryItemRepository: PantryItemRepository,
    private readonly pantryService: PantryService,
  ) {}

  async createFromShoppingList(
    createShoppingListItemDto: CreateShoppingListItemDto,
    userId: string,
    pantryId: string,
  ): Promise<PantryItemResponseDto> {
    if (!pantryId) {
      throw new BadRequestException('pantryId is required to create pantry item from shopping list');
    }

    const createPantryItemDto = new CreatePantryItemDto(
      pantryId,
      createShoppingListItemDto.foodId,
      createShoppingListItemDto.quantity,
      createShoppingListItemDto.unit,
    );

    return this.create(createPantryItemDto, userId);
  }

  async create(
    createDto: CreatePantryItemDto,
    userId: string,
  ): Promise<PantryItemResponseDto> {
    try {
      // Validate that the pantry exists and belongs to the user
      await this.pantryService.validatePantryExists(userId, createDto.pantryId);

      await this.validateFoodExists(createDto.foodId);
      const existingItem = await this.pantryItemRepository.findFoodInPantry(
        createDto.pantryId,
        createDto.foodId,
      );

      if (existingItem) {
        throw new ConflictException('This food item is already in your pantry');
      }

      // Transform expiryDate to proper Date object if provided
      let expiryDate: Date | undefined;
      if (createDto.expiryDate) {
        // If it's already a Date object, use it; otherwise parse the string
        expiryDate =
          createDto.expiryDate instanceof Date
            ? createDto.expiryDate
            : new Date(createDto.expiryDate);
      }

      const item = await this.prisma.pantryItem.create({
        data: {
          quantity: createDto.quantity,
          unit: createDto.unit,
          notes: createDto.notes,
          expiryDate: expiryDate,
          pantryId: createDto.pantryId,
          foodId: createDto.foodId,
        },
        include: {
          pantry: true,
          food: true,
        },
      });

      return this.transformToResponseDto(item);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      // Log the actual error for debugging
      this.logger.error('Failed to create pantry item:', error);

      // Handle Prisma errors
      if (error && typeof error === 'object' && 'code' in error) {
        const prismaError = error as any;
        if (prismaError.code === 'P2002') {
          throw new ConflictException('This food item is already in your pantry');
        }
        if (prismaError.code === 'P2003') {
          throw new BadRequestException('Invalid reference: food or pantry does not exist');
        }
      }

      throw new BadRequestException(
        error instanceof Error ? error.message : 'Failed to create pantry item',
      );
    }
  }

  async findAll(
    query: QueryPantryItemDto,
    userId: string,
  ): Promise<MultiplePantryItemResponseDto> {
    const { pantryId, foodId, unit } = query;

    // Validate that the pantry exists and belongs to the user
    await this.pantryService.validatePantryExists(userId, pantryId);

    if (foodId) {
      await this.validateFoodExists(foodId);
    }

    const filter: any = {
      pantryId,
    };
    
    if (foodId) {
      filter.foodId = foodId;
    }
    
    if (unit) {
      filter.unit = unit;
    }

    const items = await this.pantryItemRepository.findMany(filter);

    const transformedData = plainToInstance(PantryItemResponseDto, items, {
      excludeExtraneousValues: true,
    });

    return { data: transformedData };
  }

  private async validateFoodExists(foodId: string): Promise<void> {
    const food = await this.prisma.food.findUnique({
      where: { id: foodId },
    });

    if (!food) {
      throw new NotFoundException('Food item not found');
    }
  }

  async findById(id: string, userId: string): Promise<PantryItemResponseDto> {
    const item = await this.pantryItemRepository.findById(id);

    if (!item) {
      throw new NotFoundException('Pantry item not found');
    }

    if (item.pantry.userId !== userId) {
      throw new ForbiddenException(
        'You do not have access to this pantry item',
      );
    }

    return this.transformToResponseDto(item);
  }

  async update(
    id: string,
    updateDto: UpdatePantryItemDto,
    userId: string,
  ): Promise<PantryItemResponseDto> {
    await this.findById(id, userId);

    if (updateDto.foodId) {
      await this.validateFoodExists(updateDto.foodId);
    }

    try {
      // Transform expiryDate to proper Date object if provided
      let expiryDate: Date | undefined;
      if (updateDto.expiryDate !== undefined) {
        expiryDate =
          updateDto.expiryDate instanceof Date
            ? updateDto.expiryDate
            : updateDto.expiryDate
              ? new Date(updateDto.expiryDate)
              : undefined;
      }

      const updatedItem = await this.pantryItemRepository.update(id, {
        ...(updateDto.quantity !== undefined && {
          quantity: updateDto.quantity,
        }),
        ...(updateDto.unit !== undefined && { unit: updateDto.unit }),
        ...(updateDto.notes !== undefined && { notes: updateDto.notes }),
        ...(expiryDate !== undefined && {
          expiryDate: expiryDate,
        }),
        ...(updateDto.foodId !== undefined && { foodId: updateDto.foodId }),
      });

      return this.transformToResponseDto(updatedItem);
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('This food item is already in your pantry');
      }
      throw new BadRequestException('Failed to update pantry item');
    }
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.findById(id, userId);
    await this.pantryItemRepository.delete(id);
  }

  private transformToResponseDto(
    item: PantryItemWithRelations,
  ): PantryItemResponseDto {
    return plainToClass(
      PantryItemResponseDto,
      {
        id: item.id,
        quantity: item.quantity,
        unit: item.unit,
        notes: item.notes,
        expiryDate: item.expiryDate,
        pantryId: item.pantryId,
        foodId: item.foodId,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        food: item.food,
      },
      { excludeExtraneousValues: true },
    );
  }
}
