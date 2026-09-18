import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsEnum, IsUUID } from 'class-validator';
import { TypeOfMeal } from '@prisma/client';
import { IsOptionalNotNull } from '../../common/decorators/optional-not-null.decorator';

/**
 * Spelled out rather than derived from `CreateMealLogDto` for two reasons.
 *
 * `flags` and `swaps` are missing on purpose: each one recorded a `MEAL_*` /
 * `SWAP_*` fact on create, and that ledger is append-only, so editing them here
 * would let a log and what was counted toward missions drift apart. A wrong
 * fact is corrected by deleting the log and logging it again.
 *
 * And `PartialType()` applies its own `@IsOptional()` to every inherited field,
 * which accepts an explicit `null` — see `IsOptionalNotNull`.
 */
export class UpdateMealLogDto {
  @ApiPropertyOptional({ description: 'Meal consumed', format: 'uuid' })
  @IsOptionalNotNull()
  @IsUUID()
  mealId?: string;

  @ApiPropertyOptional({ description: 'Type of meal', enum: TypeOfMeal })
  @IsOptionalNotNull()
  @IsEnum(TypeOfMeal)
  typeOfMeal?: TypeOfMeal;

  @ApiPropertyOptional({
    description: 'Timestamp of consumption (ISO string)',
  })
  @IsOptionalNotNull()
  @IsDateString()
  timestamp?: string;

  @ApiPropertyOptional({ description: 'Whether meal came from pantry' })
  @IsOptionalNotNull()
  @IsBoolean()
  mealFromPantry?: boolean;

  @ApiPropertyOptional({ description: 'Whether meal was eaten out' })
  @IsOptionalNotNull()
  @IsBoolean()
  eatenOut?: boolean;
}
