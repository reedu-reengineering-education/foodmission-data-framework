import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Unit } from '@prisma/client';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  IsDateString,
  Min,
  MaxLength,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePantryItemDto {
  @ApiProperty({
    description: 'The ID of the pantry to add the item to',
    example: 'uuid-pantry-id',
  })
  @IsNotEmpty()
  @IsUUID()
  pantryId: string;

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
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  quantity: number;

  @ApiPropertyOptional({
    description: 'The unit of measurement (defaults to PIECES if not provided)',
    example: 'KG',
    enum: Unit,
    default: Unit.PIECES,
  })
  @IsOptional()
  @IsEnum(Unit)
  unit?: Unit;

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

  constructor(
    pantryId: string,
    foodId: string,
    quantity: number,
    unit: Unit = Unit.PIECES,
    notes?: string,
    expiryDate?: Date,
  ) {
    this.pantryId = pantryId;
    this.foodId = foodId;
    this.quantity = quantity;
    this.unit = unit;
    this.notes = notes;
    this.expiryDate = expiryDate;
  }
}
