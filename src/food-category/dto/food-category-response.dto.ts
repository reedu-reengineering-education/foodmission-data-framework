import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FoodCategoryResponseDto {
  @ApiProperty({ description: 'Unique identifier' })
  id: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;

  @ApiProperty({ description: 'NEVO version', example: 'NEVO-Online 2025 9.0' })
  nevoVersion: string;

  @ApiProperty({
    description: 'Food group',
    example: 'Potatoes and tubers',
  })
  foodGroup: string;

  @ApiProperty({ description: 'NEVO food code', example: 100 })
  nevoCode: number;

  @ApiProperty({ description: 'Food name', example: 'Potato, raw' })
  foodName: string;

  @ApiPropertyOptional({ description: 'Synonym' })
  synonym?: string | null;

  @ApiPropertyOptional({ description: 'Quantity', example: 'per 100g' })
  quantity?: string | null;

  @ApiPropertyOptional({ description: 'Contains traces of allergens' })
  containsTracesOf?: string | null;

  @ApiPropertyOptional({ description: 'Fortification info' })
  isFortifiedWith?: string | null;

  @ApiPropertyOptional({ description: 'Energy in kJ' })
  energyKj?: number | null;

  @ApiPropertyOptional({ description: 'Energy in kcal' })
  energyKcal?: number | null;

  @ApiPropertyOptional({ description: 'Water content (g)' })
  water?: number | null;

  @ApiPropertyOptional({ description: 'Total protein (g)' })
  proteins?: number | null;

  @ApiPropertyOptional({ description: 'Plant protein (g)' })
  proteinsPlant?: number | null;

  @ApiPropertyOptional({ description: 'Animal protein (g)' })
  proteinsAnimal?: number | null;

  @ApiPropertyOptional({ description: 'Total fat (g)' })
  fat?: number | null;

  @ApiPropertyOptional({ description: 'Total carbohydrates (g)' })
  carbohydrates?: number | null;

  @ApiPropertyOptional({ description: 'Sugars (g)' })
  sugars?: number | null;

  @ApiPropertyOptional({ description: 'Added sugars (g)' })
  addedSugars?: number | null;

  @ApiPropertyOptional({ description: 'Starch (g)' })
  starch?: number | null;

  @ApiPropertyOptional({ description: 'Dietary fiber (g)' })
  fiber?: number | null;

  @ApiPropertyOptional({ description: 'Saturated fat (g)' })
  saturatedFat?: number | null;

  @ApiPropertyOptional({ description: 'Mono-unsaturated fat (g)' })
  monoUnsaturatedFat?: number | null;

  @ApiPropertyOptional({ description: 'Poly-unsaturated fat (g)' })
  polyUnsaturatedFat?: number | null;

  @ApiPropertyOptional({ description: 'Omega-3 fatty acids (g)' })
  omega3Fat?: number | null;

  @ApiPropertyOptional({ description: 'Omega-6 fatty acids (g)' })
  omega6Fat?: number | null;

  @ApiPropertyOptional({ description: 'Trans fat (g)' })
  transFat?: number | null;

  @ApiPropertyOptional({ description: 'Sodium (mg)' })
  sodium?: number | null;

  @ApiPropertyOptional({ description: 'Potassium (mg)' })
  potassium?: number | null;

  @ApiPropertyOptional({ description: 'Calcium (mg)' })
  calcium?: number | null;

  @ApiPropertyOptional({ description: 'Phosphorus (mg)' })
  phosphorus?: number | null;

  @ApiPropertyOptional({ description: 'Magnesium (mg)' })
  magnesium?: number | null;

  @ApiPropertyOptional({ description: 'Iron (mg)' })
  iron?: number | null;

  @ApiPropertyOptional({ description: 'Zinc (mg)' })
  zinc?: number | null;

  @ApiPropertyOptional({ description: 'Vitamin A (µg)' })
  vitaminARae?: number | null;

  @ApiPropertyOptional({ description: 'Vitamin D (µg)' })
  vitaminD?: number | null;

  @ApiPropertyOptional({ description: 'Vitamin E (mg)' })
  vitaminE?: number | null;

  @ApiPropertyOptional({ description: 'Vitamin K (µg)' })
  vitaminK?: number | null;

  @ApiPropertyOptional({ description: 'Vitamin C (mg)' })
  vitaminC?: number | null;

  @ApiPropertyOptional({ description: 'Thiamin / B1 (mg)' })
  thiamin?: number | null;

  @ApiPropertyOptional({ description: 'Riboflavin / B2 (mg)' })
  riboflavin?: number | null;

  @ApiPropertyOptional({ description: 'Vitamin B6 (mg)' })
  vitaminB6?: number | null;

  @ApiPropertyOptional({ description: 'Vitamin B12 (µg)' })
  vitaminB12?: number | null;

  @ApiPropertyOptional({ description: 'Folate total (µg)' })
  folateTotal?: number | null;
}
