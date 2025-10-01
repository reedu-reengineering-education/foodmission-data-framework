import { Injectable, Logger } from '@nestjs/common';
import { PantryResponseDto } from '../dto/response-pantry.dto';
import { plainToClass } from 'class-transformer';

@Injectable()
export class PantryService {
  private readonly logger = new Logger(PantryService.name);

  constructor(private readonly pantryRepository: PantryRepository) {}

  async getPantryByUserId(userId: string): Promise<PantryResponseDto> {
    this.logger.log(`Getting pantry for user: ${userId}`);

    let pantry = await this.pantryRepository.findByUserId(userId);

    // Create pantry automatically if it doesn't exist
    if (!pantry) {
      this.logger.log(`Creating new pantry for user: ${userId}`);
      pantry = await this.pantryRepository.create(userId);
    }

    return this.transformToResponseDto(pantry);
  }

  async ensurePantryExists(userId: string): Promise<string> {
    let pantry = await this.pantryRepository.findByUserId(userId);

    if (!pantry) {
      pantry = await this.pantryRepository.create(userId);
    }

    return pantry.id;
  }

  private transformToResponseDto(
    pantry: PantryWithRelations,
  ): PantryResponseDto {
    return plainToClass(
      PantryResponseDto,
      {
        id: pantry.id,
        userId: pantry.userId,
        pantryItems: pantry.PantryItem.map((item) => ({
          id: item.id,
          quantity: item.quantity,
          unit: item.unit,
          notes: item.notes,
          location: item.location,
          expiryDate: item.expiryDate,
          pantryId: item.pantryId,
          foodId: item.foodId,
          food: item.food,
        })),
      },
      { excludeExtraneousValues: true },
    );
  }
}
