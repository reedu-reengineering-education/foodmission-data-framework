import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FoodyItemType } from '@prisma/client';
import { Expose, Type } from 'class-transformer';

/**
 * A catalog item resolved for one user: `locked`/`owned`/`equipped` are the
 * user's view of the shared catalog row.
 */
export class FoodyItemResponseDto {
  @ApiProperty({ example: 'uuid-foody-item-id' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'GLASSES_3' })
  @Expose()
  code: string;

  @ApiProperty({ enum: FoodyItemType, example: FoodyItemType.GLASSES })
  @Expose()
  type: FoodyItemType;

  @ApiProperty({ description: 'Position within the category', example: 3 })
  @Expose()
  slot: number;

  @ApiProperty({ description: 'Purchase cost in points', example: 20 })
  @Expose()
  cost: number;

  @ApiProperty({
    description: 'True while the user does not own the item',
    example: true,
  })
  @Expose()
  locked: boolean;

  @ApiProperty({
    description: 'Whether the current user owns it',
    example: false,
  })
  @Expose()
  owned: boolean;

  @ApiProperty({
    description: 'Whether the current user is currently wearing it',
    example: false,
  })
  @Expose()
  equipped: boolean;

  @ApiProperty({ example: true })
  @Expose()
  available: boolean;
}

export class FoodyPurchaseResponseDto {
  @ApiProperty({ type: FoodyItemResponseDto })
  @Expose()
  @Type(() => FoodyItemResponseDto)
  item: FoodyItemResponseDto;

  @ApiProperty({
    description: 'Points charged for this purchase',
    example: 150,
  })
  @Expose()
  pricePaid: number;

  @ApiProperty({
    description: 'Points balance after the purchase',
    example: 320,
  })
  @Expose()
  pointsBalance: number;
}

/** The items the user currently wears, at most one per category. */
export class FoodyLoadoutResponseDto {
  @ApiPropertyOptional({ type: FoodyItemResponseDto, nullable: true })
  @Expose()
  @Type(() => FoodyItemResponseDto)
  antennas: FoodyItemResponseDto | null;

  @ApiPropertyOptional({ type: FoodyItemResponseDto, nullable: true })
  @Expose()
  @Type(() => FoodyItemResponseDto)
  ears: FoodyItemResponseDto | null;

  @ApiPropertyOptional({ type: FoodyItemResponseDto, nullable: true })
  @Expose()
  @Type(() => FoodyItemResponseDto)
  glasses: FoodyItemResponseDto | null;
}
