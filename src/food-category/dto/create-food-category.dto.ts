import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsOptional,
  IsNumber,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateFoodCategoryDto {
  @ApiProperty({ description: 'NEVO version', example: 'NEVO-Online 2025 9.0' })
  @IsString()
  @MaxLength(100)
  nevoVersion: string;

  @ApiProperty({
    description: 'Food group',
    example: 'Potatoes and tubers',
  })
  @IsString()
  @MaxLength(200)
  foodGroup: string;

  @ApiProperty({ description: 'NEVO food code', example: 100 })
  @IsInt()
  @Min(0)
  nevoCode: number;

  @ApiProperty({ description: 'Food name', example: 'Potato, raw' })
  @IsString()
  @MaxLength(300)
  foodName: string;

  @ApiPropertyOptional({ description: 'Synonym' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  synonym?: string;

  @ApiPropertyOptional({ description: 'Quantity', example: 'per 100g' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  quantity?: string;

  @ApiPropertyOptional({ description: 'Contains traces of allergens' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  containsTracesOf?: string;

  @ApiPropertyOptional({ description: 'Fortification info' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  isFortifiedWith?: string;

  @ApiPropertyOptional({ description: 'Energy in kJ' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  energyKj?: number;

  @ApiPropertyOptional({ description: 'Energy in kcal' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  energyKcal?: number;

  @ApiPropertyOptional({ description: 'Water content (g)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  water?: number;

  @ApiPropertyOptional({ description: 'Total protein (g)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  proteins?: number;

  @ApiPropertyOptional({ description: 'Plant protein (g)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  proteinsPlant?: number;

  @ApiPropertyOptional({ description: 'Animal protein (g)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  proteinsAnimal?: number;

  @ApiPropertyOptional({ description: 'Total fat (g)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fat?: number;

  @ApiPropertyOptional({ description: 'Total carbohydrates (g)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  carbohydrates?: number;

  @ApiPropertyOptional({ description: 'Sugars (g)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sugars?: number;

  @ApiPropertyOptional({ description: 'Added sugars (g)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  addedSugars?: number;

  @ApiPropertyOptional({ description: 'Starch (g)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  starch?: number;

  @ApiPropertyOptional({ description: 'Dietary fiber (g)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fiber?: number;

  @ApiPropertyOptional({ description: 'Saturated fat (g)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  saturatedFat?: number;

  @ApiPropertyOptional({ description: 'Mono-unsaturated fat (g)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  monoUnsaturatedFat?: number;

  @ApiPropertyOptional({ description: 'Poly-unsaturated fat (g)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  polyUnsaturatedFat?: number;

  @ApiPropertyOptional({ description: 'Omega-3 fatty acids (g)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  omega3Fat?: number;

  @ApiPropertyOptional({ description: 'Omega-6 fatty acids (g)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  omega6Fat?: number;

  @ApiPropertyOptional({ description: 'Trans fat (g)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  transFat?: number;

  @ApiPropertyOptional({ description: 'Sodium (mg)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sodium?: number;

  @ApiPropertyOptional({ description: 'Potassium (mg)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  potassium?: number;

  @ApiPropertyOptional({ description: 'Calcium (mg)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  calcium?: number;

  @ApiPropertyOptional({ description: 'Phosphorus (mg)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  phosphorus?: number;

  @ApiPropertyOptional({ description: 'Magnesium (mg)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  magnesium?: number;

  @ApiPropertyOptional({ description: 'Iron (mg)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  iron?: number;

  @ApiPropertyOptional({ description: 'Zinc (mg)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  zinc?: number;

  @ApiPropertyOptional({ description: 'Vitamin A (µg)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  vitaminARae?: number;

  @ApiPropertyOptional({ description: 'Vitamin D (µg)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  vitaminD?: number;

  @ApiPropertyOptional({ description: 'Vitamin E (mg)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  vitaminE?: number;

  @ApiPropertyOptional({ description: 'Vitamin K (µg)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  vitaminK?: number;

  @ApiPropertyOptional({ description: 'Vitamin C (mg)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  vitaminC?: number;

  @ApiPropertyOptional({ description: 'Thiamin / B1 (mg)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  thiamin?: number;

  @ApiPropertyOptional({ description: 'Riboflavin / B2 (mg)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  riboflavin?: number;

  @ApiPropertyOptional({ description: 'Vitamin B6 (mg)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  vitaminB6?: number;

  @ApiPropertyOptional({ description: 'Vitamin B12 (µg)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  vitaminB12?: number;

  @ApiPropertyOptional({ description: 'Folate total (µg)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  folateTotal?: number;
}
