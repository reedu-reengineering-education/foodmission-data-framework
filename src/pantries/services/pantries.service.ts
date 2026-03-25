import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PantryResponseDto } from '../dto/response-pantry.dto';
import { plainToClass } from 'class-transformer';
import { PantryRepository } from '../repositories/pantries.repository';

@Injectable()
export class PantryService {
  private readonly logger = new Logger(PantryService.name);

  constructor(private readonly pantryRepository: PantryRepository) {}

  async getOrCreatePantry(userId: string): Promise<PantryResponseDto> {
    this.logger.log(`Getting or creating pantry for user: ${userId}`);
    const pantry = await this.pantryRepository.getOrCreate(userId);
    return this.transformToResponseDto(pantry);
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

    // Auto-create pantry if it doesn't exist
    const pantry = await this.pantryRepository.getOrCreate(userId);
    return pantry.id;
  }

  private transformToResponseDto(pantry: any): PantryResponseDto {
    return plainToClass(PantryResponseDto, {
      id: pantry.id,
      userId: pantry.userId,
      createdAt: pantry.createdAt,
      updatedAt: pantry.updatedAt,
      items: pantry.items,
    });
  }
}
