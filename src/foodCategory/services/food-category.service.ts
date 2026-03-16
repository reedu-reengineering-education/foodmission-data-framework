import { Injectable, NotFoundException } from '@nestjs/common';
import { FoodCategoryRepository } from '../repositories/food-category.repository';
import { CreateFoodCategoryDto } from '../dto/create-food-category.dto';
import { UpdateFoodCategoryDto } from '../dto/update-food-category.dto';
import { FoodCategoryQueryDto } from '../dto/food-category-query.dto';
import { FoodCategoryResponseDto } from '../dto/food-category-response.dto';

@Injectable()
export class FoodCategoryService {
  constructor(
    private readonly foodCategoryRepository: FoodCategoryRepository,
  ) {}

  async create(
    createDto: CreateFoodCategoryDto,
  ): Promise<FoodCategoryResponseDto> {
    const category = await this.foodCategoryRepository.create(createDto);
    return category;
  }

  async findAll(query: FoodCategoryQueryDto) {
    return this.foodCategoryRepository.findAll(query);
  }

  async findById(id: string): Promise<FoodCategoryResponseDto> {
    const category = await this.foodCategoryRepository.findById(id);

    if (!category) {
      throw new NotFoundException(`Food category with ID '${id}' not found`);
    }

    return category;
  }

  async update(
    id: string,
    updateDto: UpdateFoodCategoryDto,
  ): Promise<FoodCategoryResponseDto> {
    // Check if exists
    await this.findById(id);

    const updated = await this.foodCategoryRepository.update(id, updateDto);
    return updated;
  }

  async delete(id: string): Promise<void> {
    // Check if exists
    await this.findById(id);

    await this.foodCategoryRepository.delete(id);
  }

  async getAllFoodGroups(search?: string): Promise<string[]> {
    return this.foodCategoryRepository.getAllFoodGroups(search);
  }
}
