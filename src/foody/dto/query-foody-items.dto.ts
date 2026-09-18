import { ApiPropertyOptional } from '@nestjs/swagger';
import { FoodyItemType } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { TransformBooleanString } from '../../common/decorators/transformers';

export class QueryFoodyItemsDto {
  @ApiPropertyOptional({
    description: 'Filter by item category',
    enum: FoodyItemType,
    example: FoodyItemType.GLASSES,
  })
  @IsOptional()
  @IsEnum(FoodyItemType)
  type?: FoodyItemType;

  @ApiPropertyOptional({
    description:
      'Return only the items the current user already owns. Defaults to false (full catalog).',
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  @TransformBooleanString()
  ownedOnly?: boolean;

  @ApiPropertyOptional({
    description:
      'Filter by availability. Non-admins always get available items only.',
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  @TransformBooleanString()
  available?: boolean;
}
