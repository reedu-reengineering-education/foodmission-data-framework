import { IsString, IsOptional, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFoodProductDto {
  @ApiProperty({
    description: 'ID of the user who created the product',
    example: 'user-123',
  })
  @IsString()
  @IsNotEmpty()
  createdBy!: string;
  @ApiProperty({
    description: 'The name of the food item',
    example: 'Organic Whole Milk',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

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
    description: 'Raw nutriments data',
    required: false,
    type: Object,
    example: { energy: 100, fat: 2 },
  })
  @IsOptional()
  nutrimentsRaw?: import('@prisma/client').Prisma.InputJsonValue;

  @ApiProperty({
    description: 'Nutrient levels',
    required: false,
    type: Object,
    example: { fat: 'low', sugar: 'high' },
  })
  @IsOptional()
  nutrientLevels?: import('@prisma/client').Prisma.InputJsonValue;
}
