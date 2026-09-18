import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FoodyItemType } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateFoodyItemDto {
  @ApiProperty({
    description: 'Unique item code',
    example: 'GLASSES_3',
    maxLength: 64,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  code: string;

  @ApiProperty({ enum: FoodyItemType, example: FoodyItemType.GLASSES })
  @IsEnum(FoodyItemType)
  type: FoodyItemType;

  @ApiProperty({
    description:
      'Position within the category, unique per type. Drives ordering and the item code.',
    example: 3,
  })
  @IsInt()
  @Min(1)
  slot: number;

  @ApiPropertyOptional({
    description: 'Purchase cost in points. 0 makes the item free to claim.',
    example: 20,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  cost?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  available?: boolean;
}
