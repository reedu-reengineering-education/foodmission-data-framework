import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { DishRepository } from '../repositories/dish.repository';
import { PantryItemRepository } from '../../pantryItem/repositories/pantryItem.repository';
import { CreateDishDto } from '../dto/create-dish.dto';
import { UpdateDishDto } from '../dto/update-dish.dto';
import {
  DishResponseDto,
  MultipleDishResponseDto,
} from '../dto/dish-response.dto';
import { QueryDishDto } from '../dto/query-dish.dto';
import { Prisma } from '@prisma/client';
import { getOwnedEntityOrThrow } from '../../common/services/ownership-helpers';

@Injectable()
export class DishService {
  private readonly logger = new Logger(DishService.name);

  constructor(
    private readonly dishRepository: DishRepository,
    private readonly pantryItemRepository: PantryItemRepository,
  ) {}

  private getOwnedDishOrThrow(dishId: string, userId: string) {
    return getOwnedEntityOrThrow(
      dishId,
      userId,
      (id) => this.dishRepository.findById(id),
      (d) => d.userId,
      'Dish not found',
    );
  }

  async create(
    createDishDto: CreateDishDto,
    userId: string,
  ): Promise<DishResponseDto> {
    this.logger.log(`Creating dish ${createDishDto.name} for user ${userId}`);

    if (createDishDto.barcode) {
      const existing = await this.dishRepository.findByBarcode(
        createDishDto.barcode,
      );
      if (existing) {
        throw new ConflictException('Dish with this barcode already exists');
      }
    }

    if (createDishDto.pantryItemId) {
      const pantryItem = await this.pantryItemRepository.findById(
        createDishDto.pantryItemId,
      );
      if (!pantryItem) {
        throw new NotFoundException('Linked pantry item not found');
      }
      if (pantryItem.pantry.userId !== userId) {
        throw new ForbiddenException('No permission to use this pantry item');
      }
    }

    const dish = await this.dishRepository.create({
      ...createDishDto,
      userId,
    });

    return this.toResponseDto(dish);
  }

  async findAll(
    userId: string,
    query: QueryDishDto,
  ): Promise<MultipleDishResponseDto> {
    const { page = 1, limit = 10, mealType, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.DishWhereInput = {
      userId,
      ...(mealType ? { mealType } : {}),
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    };

    const result = await this.dishRepository.findWithPagination({
      skip,
      take: limit,
      where,
      orderBy: { createdAt: 'desc' },
    });

    return plainToInstance(
      MultipleDishResponseDto,
      {
        data: result.data.map((d) => this.toResponseDto(d)),
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
      { excludeExtraneousValues: true },
    );
  }

  async findOne(id: string, userId: string): Promise<DishResponseDto> {
    const dish = await this.dishRepository.findById(id);
    if (!dish) {
      throw new NotFoundException('Dish not found');
    }
    await this.getOwnedDishOrThrow(id, userId);
    return this.toResponseDto(dish);
  }

  async update(
    id: string,
    updateDishDto: UpdateDishDto,
    userId: string,
  ): Promise<DishResponseDto> {
    const dish = await this.dishRepository.findById(id);
    await this.getOwnedDishOrThrow(id, userId);

    if (
      updateDishDto.barcode &&
      updateDishDto.barcode !== dish.barcode &&
      (await this.dishRepository.findByBarcode(updateDishDto.barcode))
    ) {
      throw new ConflictException('Dish with this barcode already exists');
    }

    if (updateDishDto.pantryItemId) {
      const pantryItem = await this.pantryItemRepository.findById(
        updateDishDto.pantryItemId,
      );
      if (!pantryItem) {
        throw new NotFoundException('Linked pantry item not found');
      }
      this.ensureOwnership(pantryItem.pantry.userId, userId);
    }

    const updated = await this.dishRepository.update(id, updateDishDto);
    return this.toResponseDto(updated);
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.getOwnedDishOrThrow(id, userId);
    await this.dishRepository.delete(id);
  }

  private toResponseDto(dish: any): DishResponseDto {
    return plainToInstance(DishResponseDto, dish, {
      excludeExtraneousValues: true,
    });
  }
}
