import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  handlePrismaError,
  handleServiceError,
} from '../../common/utils/error.utils';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { ResourceAlreadyExistsException } from '../../common/exceptions/business.exception';
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

  async create(
    createPantryDto: CreatePantryDto,
    userId: string,
  ): Promise<PantryResponseDto> {
    try {
      const existingPantry = await this.pantryRepository.findByUserId(userId);
      if (existingPantry) {
        throw new ConflictException('User already has a pantry.');
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

      if (error instanceof PrismaClientKnownRequestError) {
        const businessException = handlePrismaError(error, 'create', 'pantry');

        if (businessException instanceof ResourceAlreadyExistsException) {
          throw new ConflictException(
            'A pantry with this title already exists for this user.',
          );
        }

        throw businessException;
      }

      handleServiceError(error, 'Failed to create pantry');
    }
  }

  async getPantryByUserId(userId: string): Promise<PantryResponseDto> {
    this.logger.log(`Getting pantry for user: ${userId}`);

    const pantry = await this.pantryRepository.findByUserId(userId);

    if (!pantry) {
      throw new NotFoundException('Pantry not found');
    }

    return this.transformToResponseDto(pantry);
  }

  async updateUserPantry(
    updatePantryDto: UpdatePantryDto,
    userId: string,
  ): Promise<PantryResponseDto> {
    try {
      const existingPantry = await this.pantryRepository.findByUserId(userId);
      if (!existingPantry) {
        throw new NotFoundException('Pantry not found');
      }

      const pantry = await this.pantryRepository.update(
        existingPantry.id,
        updatePantryDto,
      );
      return this.transformToResponseDto(pantry);
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      if (error instanceof PrismaClientKnownRequestError) {
        const businessException = handlePrismaError(error, 'update', 'pantry');
        throw businessException;
      }

      handleServiceError(error, 'Failed to update pantry');
    }
  }

  async deleteUserPantry(userId: string): Promise<void> {
    const existingPantry = await this.pantryRepository.findByUserId(userId);
    if (!existingPantry) {
      throw new NotFoundException('Pantry not found');
    }

    await this.pantryRepository.delete(existingPantry.id);
  }

  async validatePantryExists(
    userId: string,
    pantryId?: string,
  ): Promise<string> {
    if (pantryId) {
      const pantry = await this.pantryRepository.findById(pantryId);
      if (!pantry) {
        throw new NotFoundException('Pantry not found');
      }
      if (pantry.userId !== userId) {
        throw new ForbiddenException(
          'No permission - user does not own this pantry',
        );
      }
      return pantryId;
    }

    const pantry = await this.pantryRepository.findByUserId(userId);
    if (!pantry) {
      throw new NotFoundException(
        'No pantry found. Please create a pantry first or specify a pantryId.',
      );
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
