import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PantryResponseDto } from '../dto/response-pantry.dto';
import { plainToClass } from 'class-transformer';
import { PantryRepository } from '../repositories/pantry.repository';
import { CreatePantryDto } from '../dto/create-pantry.dto';
import { UpdatePantryDto } from '../dto/update-pantry.dto';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PantryService {
  private readonly logger = new Logger(PantryService.name);

  constructor(
    private readonly pantryRepository: PantryRepository,
    private readonly prisma: PrismaService,
  ) {}

  async getPantryByUserId(userId: string): Promise<PantryResponseDto | null> {
    this.logger.log(`Getting pantry for user: ${userId}`);

    const pantry = await this.pantryRepository.findByUserId(userId);

    if (!pantry) {
      this.logger.log(`No pantry found for user ${userId}`);
      return null;
    }

    return this.transformToResponseDto(pantry);
  }

  async create(
    createPantryDto: CreatePantryDto,
    userId: string,
  ): Promise<PantryResponseDto> {
    try {
      // Check if user already has a pantry
      const existingPantry = await this.pantryRepository.findByUserId(userId);
      if (existingPantry) {
        throw new ConflictException(
          'User already has a pantry. Each user can only have one pantry. Use PATCH to update it instead.',
        );
      }

      const pantry = await this.pantryRepository.create({
        ...createPantryDto,
        userId,
      });
      return this.transformToResponseDto(pantry);
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error('Failed to create pantry:', error);
      throw new BadRequestException('Failed to create pantry');
    }
  }

  async update(
    id: string,
    updatePantryDto: UpdatePantryDto,
    userId?: string,
  ): Promise<PantryResponseDto> {
    try {
      const existingList = await this.pantryRepository.findById(id);
      if (!existingList) {
        throw new NotFoundException('Pantry not found');
      }
      if (existingList.userId !== userId) {
        throw new ForbiddenException('No premission');
      }

      const pantry = await this.pantryRepository.update(id, updatePantryDto);
      return this.transformToResponseDto(pantry);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to update pantry');
    }
  }

  async remove(id: string, userId?: string): Promise<void> {
    try {
      const existingList = await this.pantryRepository.findById(id);
      if (!existingList) {
        throw new NotFoundException('pantry not found');
      }
      if (existingList.userId !== userId) {
        throw new ForbiddenException('No premission');
      }
      await this.pantryRepository.delete(id);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to delete pantry');
    }
  }

  async validatePantryExists(userId: string): Promise<string> {
    let pantry = await this.pantryRepository.findByUserId(userId);

    if (!pantry) {
      this.logger.log(`No pantry found for user ${userId}, creating one...`);
      pantry = await this.create({ title: 'My Pantry' }, userId);

      pantry = await this.pantryRepository.findByUserId(userId);
      if (!pantry) {
        throw new BadRequestException('Failed to create pantry');
      }
    }
    return pantry.id;
  }

  private transformToResponseDto(pantry: any): PantryResponseDto {
    return plainToClass(PantryResponseDto, {
      id: pantry.id,
      title: pantry.title,
      userId: pantry.userId,
      createdAt: pantry.createdAt,
      updatedAt: pantry.updatedAt,
      items: pantry.items,
    });
  }
}
