import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateRecipeDto {
  @ApiProperty({
    description: 'Dish identifier this recipe is based on',
    format: 'uuid',
  })
  @IsUUID()
  dishId: string;

  @ApiProperty({ description: 'Recipe title', example: 'Hearty veggie pasta' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Short description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Cooking instructions' })
  @IsOptional()
  @IsString()
  instructions?: string;

  @ApiPropertyOptional({ description: 'Prep time in minutes', example: 15 })
  @IsOptional()
  @IsInt()
  @Min(0)
  prepTime?: number;

  @ApiPropertyOptional({ description: 'Cook time in minutes', example: 30 })
  @IsOptional()
  @IsInt()
  @Min(0)
  cookTime?: number;

  @ApiPropertyOptional({ description: 'Servings', example: 4 })
  @IsOptional()
  @IsInt()
  @Min(1)
  servings?: number;

  @ApiPropertyOptional({ description: 'Difficulty label', example: 'easy' })
  @IsOptional()
  @IsString()
  difficulty?: string;

  @ApiPropertyOptional({
    description: 'Tags for filtering',
    type: [String],
    example: ['vegan', 'quick'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Structured nutritional info',
    example: { carbs: 50, fats: 10, fiber: 8 },
  })
  @IsOptional()
  @IsObject()
  nutritionalInfo?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Sustainability score',
    example: 0.65,
  })
  @IsOptional()
  @Min(0)
  sustainabilityScore?: number;

  @ApiPropertyOptional({
    description: 'Known allergens',
    type: [String],
    example: ['nuts', 'gluten'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergens?: string[];
}
