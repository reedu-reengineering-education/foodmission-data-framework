import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsUUID,
} from 'class-validator';
import { TypeOfMeal } from '@prisma/client';
import {
  EventType,
  MEAL_FLAG_EVENT_TYPES,
  MEAL_SWAP_EVENT_TYPES,
  MealFlagEventType,
  MealSwapEventType,
} from '../../events/event-types';
import { IsOptionalNotNull } from '../../common/decorators/optional-not-null.decorator';

export class CreateMealLogDto {
  @ApiPropertyOptional({
    description:
      'Meal consumed. Omit for a quick log — then `flags` describes the meal instead.',
    format: 'uuid',
  })
  @IsOptionalNotNull()
  @IsUUID()
  mealId?: string;

  @ApiProperty({ description: 'Type of meal', enum: TypeOfMeal })
  @IsEnum(TypeOfMeal)
  typeOfMeal: TypeOfMeal;

  @ApiPropertyOptional({
    description:
      'Diet facts about the meal, given as the event types they record. ' +
      'Required when `mealId` is omitted. MEAL_MEAT_CONSUMED cannot be combined ' +
      'with MEAL_MEAT_FREE or MEAL_VEGAN.',
    enum: [...MEAL_FLAG_EVENT_TYPES],
    isArray: true,
    example: [EventType.MEAL_VEGAN, EventType.MEAL_LEGUME_CONSUMED],
  })
  @IsOptionalNotNull()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(MEAL_FLAG_EVENT_TYPES.length)
  @IsIn([...MEAL_FLAG_EVENT_TYPES], { each: true })
  flags?: MealFlagEventType[];

  @ApiPropertyOptional({
    description:
      'Substitutions made for this meal, given as the event types they record.',
    enum: [...MEAL_SWAP_EVENT_TYPES],
    isArray: true,
    example: [EventType.SWAP_BEEF_TO_LEGUMES],
  })
  @IsOptionalNotNull()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(MEAL_SWAP_EVENT_TYPES.length)
  @IsIn([...MEAL_SWAP_EVENT_TYPES], { each: true })
  swaps?: MealSwapEventType[];

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
