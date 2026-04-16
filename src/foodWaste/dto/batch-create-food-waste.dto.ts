import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ExpiredItemToWasteDto {
  @ApiProperty({
    description: 'The ID of the expired pantry item',
    example: 'abc-123-def-456',
  })
  @IsNotEmpty()
  @IsUUID()
  pantryItemId: string;

  @ApiPropertyOptional({
    description: 'Optional cost estimate for this specific item',
    example: 3.99,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  costEstimate?: number;

  @ApiPropertyOptional({
    description: 'Optional notes for this specific item',
    example: 'Found moldy in the back',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class BatchCreateFoodWasteDto {
  @ApiProperty({
    description: 'Array of expired pantry items to create waste entries for',
    type: [ExpiredItemToWasteDto],
    example: [
      {
        pantryItemId: 'abc-123-def-456',
        costEstimate: 3.99,
        notes: 'Expired yogurt',
      },
      {
        pantryItemId: 'def-456-ghi-789',
        costEstimate: 2.50,
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExpiredItemToWasteDto)
  items: ExpiredItemToWasteDto[];
}
