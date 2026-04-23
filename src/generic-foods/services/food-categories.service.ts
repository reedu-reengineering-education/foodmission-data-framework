import { Injectable, NotFoundException } from '@nestjs/common';
import { GenericFoodRepository } from '../repositories/generic-foods.repository';
import { GenericFoodResponseDto } from '../dto/generic-food-response.dto';
import { CreateGenericFoodDto } from '../dto/create-generic-food.dto';
import { UpdateGenericFoodDto } from '../dto/update-generic-food.dto';
import { GenericFoodQueryDto } from '../dto/generic-food-query.dto';

@Injectable()
export class GenericFoodService {
  constructor(private readonly genericFoodRepository: GenericFoodRepository) {}

  async create(
    createDto: CreateGenericFoodDto,
  ): Promise<GenericFoodResponseDto> {
    const category = await this.genericFoodRepository.create(createDto);
    return category;
  }

  findAll(query: GenericFoodQueryDto) {
    return this.genericFoodRepository.findAll(query);
  }

  async findById(id: string): Promise<GenericFoodResponseDto> {
    const category = await this.genericFoodRepository.findById(id);

    if (!category) {
      throw new NotFoundException(`Generic food with ID '${id}' not found`);
    }

    return category;
  }

  async update(
    id: string,
    updateDto: UpdateGenericFoodDto,
  ): Promise<GenericFoodResponseDto> {
    // Check if exists
    await this.findById(id);

    const updated = await this.genericFoodRepository.update(id, updateDto);
    return updated;
  }

  async delete(id: string): Promise<void> {
    // Check if exists
    await this.findById(id);

    await this.genericFoodRepository.delete(id);
  }

  getAllFoodGroups(search?: string): Promise<string[]> {
    return this.genericFoodRepository.getAllFoodGroups(search);
  }
}
