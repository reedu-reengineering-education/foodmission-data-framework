import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GenericFoodResponseDto } from './generic-food-response.dto';

/** Provenance of the nutritional values: the canonical NEVO record. */
export class Foodex2SourceDto {
  @ApiProperty({ description: 'Canonical NEVO food code', example: 1 })
  nevoCode: number;

  @ApiProperty({
    description:
      'GenericFood id of the canonical NEVO record. Same value as the ' +
      'top-level `id`, exposed here so the provenance block is self-contained.',
  })
  genericFoodId: string;

  @ApiProperty({
    description:
      'NEVO food name. The user-facing label is the FoodEx2 name in ' +
      '`foodName`; this is the underlying record it came from.',
    example: 'Potatoes raw',
  })
  foodName: string;

  @ApiProperty({
    description:
      'FoodEx2 code published on the NEVO record, before hierarchy roll-up',
    example: 'A00ZX',
  })
  sourceFoodex2Code: string;

  @ApiProperty({
    description: 'Hierarchy steps from the NEVO term up to this concept',
    example: 2,
  })
  hierarchyDepth: number;
}

/**
 * A user-facing food: a FoodEx2 concept resolved to one canonical NEVO item.
 *
 * Deliberately a **superset of `GenericFoodResponseDto`** so a client can move
 * from `GET /generic-foods` to `GET /generic-foods/search` without changing how
 * it reads a result. Two guarantees make that safe:
 *
 * - `id` is the canonical **GenericFood** id, not the FoodEx2 term id, so it
 *   remains valid as `genericFoodId` when creating pantry or shopping items.
 *   The FoodEx2 term id is exposed separately as `foodex2Id`.
 * - `foodName` is the FoodEx2 name (localized when `lang` is set), so the UI
 *   shows "Potatoes and similar-" rather than "Potatoes raw". The NEVO name
 *   stays available under `source`.
 *
 * Nutrients are inherited flat from `GenericFoodResponseDto` and are the
 * canonical record's values verbatim — never averaged across NEVO variants.
 */
export class Foodex2FoodResponseDto extends GenericFoodResponseDto {
  @ApiProperty({ description: 'FoodEx2 term code', example: 'A0DPP' })
  foodex2Code: string;

  @ApiProperty({
    description:
      'FoodEx2 term id. Stable identity of the concept — prefer ' +
      '`foodex2Code` for caching, since `id` follows the canonical NEVO record.',
  })
  foodex2Id: string;

  @ApiProperty({
    description:
      'Canonical English FoodEx2 name. Always present, so a client can fall ' +
      'back on it for a concept that is not translated yet.',
    example: 'Potatoes and similar-',
  })
  nameEn: string;

  @ApiPropertyOptional({ description: 'FoodEx2 short name, when published' })
  shortName?: string | null;

  @ApiProperty({
    description: 'True when the term is on the FoodEx2 core list',
  })
  isCore: boolean;

  @ApiPropertyOptional({
    description: 'Parent FoodEx2 code in the MTX hierarchy',
  })
  parentCode?: string | null;

  @ApiProperty({
    description: 'How many NEVO records this FoodEx2 food covers',
    example: 12,
  })
  variantCount: number;

  @ApiProperty({ type: Foodex2SourceDto })
  source: Foodex2SourceDto;
}
