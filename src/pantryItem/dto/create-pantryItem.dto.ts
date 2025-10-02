import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  IsDateString,
  Min,
  MaxLength,
} from 'class-validator';

export class CreatePantryItemDto {
  @ApiProperty({
    description: 'The ID of the food item to add',
    example: 'uuid-food-id',
  })
  @IsNotEmpty()
  @IsUUID()
  foodId: string;

  @ApiProperty({
    description: 'The quantity of the item',
    example: 2,
    minimum: 0.01,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  quantity: number;

  @ApiProperty({
    description: 'The unit of measurement',
    example: 'kg',
    maxLength: 50,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  unit: string;

  @ApiPropertyOptional({
    description: 'Additional notes for the item',
    example: 'Store in cool place',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({
    description: 'When the food will expire (ISO date string)',
    example: '2027-02-02',
  })
  @IsOptional()
  @IsDateString()
  expiryDate?: Date;
}
