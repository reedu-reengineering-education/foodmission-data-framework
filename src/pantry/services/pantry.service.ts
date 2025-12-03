import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { handleServiceError } from '../../common/utils/error.utils';
import { PantryResponseDto } from '../dto/response-pantry.dto';
import { plainToClass } from 'class-transformer';
import { PantryRepository } from '../repositories/pantry.repository';
import { CreatePantryDto } from '../dto/create-pantry.dto';
import { UpdatePantryDto } from '../dto/query-pantry.dto';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PantryService {
  private readonly logger = new Logger(PantryService.name);

  constructor(
    private readonly pantryRepository: PantryRepository,
    private readonly prisma: PrismaService,
  ) {}

  async getPantryByUserId(userId: string): Promise<PantryResponseDto> {
    this.logger.log(`Getting pantry for user: ${userId}`);

    let pantry = await this.pantryRepository.findByUserId(userId);

    if (!pantry) {
      this.logger.log(`No pantry found for user ${userId}, creating one...`);
      pantry = await this.create({ userId, title: 'My Pantry' });
    }

    return this.transformToResponseDto(pantry);
  }

  async create(createPantryDto: CreatePantryDto): Promise<PantryResponseDto> {
    try {
      const pantry = await this.pantryRepository.create({
        ...createPantryDto,
      });
      return this.transformToResponseDto(pantry);
    } catch {
      throw new Error('Failed to create pantry');
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
      handleServiceError(error, 'Failed to update pantry');
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
      handleServiceError(error, 'Failed to delete pantry');
    }
  }

  async validatePantryExists(userId: string): Promise<string> {
    let pantry = await this.pantryRepository.findByUserId(userId);

    if (!pantry) {
      this.logger.log(`No pantry found for user ${userId}, creating one...`);
      pantry = await this.create({ userId, title: 'My Pantry' });

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
