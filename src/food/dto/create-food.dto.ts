import {
  IsString,
  IsOptional,
  IsNotEmpty,
  MaxLength,
  IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFoodDto {
  @ApiProperty({
    description: 'The name of the food item',
    example: 'Organic Whole Milk',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'Detailed description of the food item',
    example: 'Fresh organic whole milk from grass-fed cows',
    maxLength: 1000,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({
    description: 'Product barcode (EAN, UPC, etc.)',
    example: '3017620422003',
    maxLength: 50,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  barcode?: string;

  @ApiProperty({
    description: 'OpenFoodFacts product identifier',
    example: '3017620422003',
    maxLength: 100,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  openFoodFactsId?: string;

  @ApiProperty({
    description: 'UUID of the user who created this food item',
    example: '550e8400-e29b-41d4-a716-446655440001',
    format: 'uuid',
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  createdBy: string;
}
