import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GenericFoodResponseDto } from './generic-food-response.dto';

/**
 * One row of `GET /generic-foods`.
 *
 * Always a real NEVO record: `id` is its GenericFood id (valid as
 * `genericFoodId` for pantry and shopping items) and every nutrient is that
 * record's value. The fields below are set on search results (`search` or
 * `foodex2Code` given) and absent from the plain catalogue listing.
 */
export class GenericFoodListItemDto extends GenericFoodResponseDto {
  @ApiPropertyOptional({
    description:
      'True when the row stands for a FoodEx2 food the query named — e.g. ' +
      '"Kartoffeln und ähnliche" for "Kartoffeln". `foodName` is then the ' +
      "FoodEx2 name and the values are the food's canonical NEVO record " +
      '(`nevoFoodName`).',
  })
  isConcept?: boolean;

  @ApiPropertyOptional({
    description:
      'FoodEx2 code the row collapses. Pass it as `?foodex2Code=` to list ' +
      'every NEVO record filed under it. Null for a single, uncollapsed ' +
      'record.',
    example: 'A0DPP',
    nullable: true,
  })
  foodex2Code?: string | null;

  @ApiPropertyOptional({
    description:
      'NEVO records `?foodex2Code=` lists for this row; 1 when the row is a ' +
      'single record.',
    example: 12,
  })
  variantCount?: number;

  @ApiPropertyOptional({
    description:
      'Name of the NEVO record whose values the row carries (localized). ' +
      'Differs from `foodName` only on concept rows.',
    example: 'Kartoffeln, roh',
  })
  nevoFoodName?: string;
}

export class PaginatedGenericFoodListResponseDto {
  @ApiProperty({ type: [GenericFoodListItemDto] })
  items: GenericFoodListItemDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}
