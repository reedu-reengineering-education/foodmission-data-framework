import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { TypeOfMeal } from '@prisma/client';

export class CreateMealLogDto {
  @ApiProperty({ description: 'Dish consumed', format: 'uuid' })
  @IsUUID()
  dishId: string;

  @ApiProperty({ description: 'Type of meal', enum: TypeOfMeal })
  @IsEnum(TypeOfMeal)
  typeOfMeal: TypeOfMeal;

  @ApiPropertyOptional({
    description: 'Timestamp of consumption (ISO string)',
  })
  @IsOptional()
  @IsDateString()
  timestamp?: string;

  @ApiPropertyOptional({ description: 'Whether meal came from pantry' })
  @IsOptional()
  @IsBoolean()
  mealFromPantry?: boolean;

  @ApiPropertyOptional({ description: 'Whether meal was eaten out' })
  @IsOptional()
  @IsBoolean()
  eatenOut?: boolean;
}
