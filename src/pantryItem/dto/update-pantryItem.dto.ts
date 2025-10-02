import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  Min,
  IsOptional,
  IsString,
  IsNotEmpty,
  MaxLength,
  IsDate,
} from 'class-validator';

export class UpdatePantryItemDto {
  @ApiPropertyOptional({
    description: 'The quantity of the item',
    example: 3,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  quantity?: number;

  @ApiPropertyOptional({
    description: 'The unit of measurement',
    example: 'pieces',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @IsOptional()
  unit?: string;

  @ApiPropertyOptional({
    description: 'Additional notes for the item',
    example: 'Buy organic if available',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({
    description: 'when the food will expires',
    example: '02-02-2027',
    maxLength: 500,
  })
  @IsDate()
  @IsOptional()
  @MaxLength(500)
  expiryDate?: Date;

  @ApiPropertyOptional({
    description: 'The ID of the food item',
    example: 'uuid-food-id',
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  foodId?: string;
}
