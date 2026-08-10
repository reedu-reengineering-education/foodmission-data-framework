import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class TopicResponseDto {
  @ApiProperty({ example: 'uuid-topic-id' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'REDUCING_MEAT_CONSUMPTION' })
  @Expose()
  code: string;

  @ApiProperty({ example: 'Reducing meat consumption' })
  @Expose()
  name: string;

  @ApiProperty({ example: 'uuid-dimension-id' })
  @Expose()
  dimensionId: string;

  @ApiProperty({ example: 1 })
  @Expose()
  sortOrder: number;
}

export class DimensionResponseDto {
  @ApiProperty({ example: 'uuid-dimension-id' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'DIET_CHANGES' })
  @Expose()
  code: string;

  @ApiProperty({ example: 'Diet changes towards a more sustainable system' })
  @Expose()
  name: string;

  @ApiProperty({ example: 1 })
  @Expose()
  sortOrder: number;

  @ApiPropertyOptional({ type: [TopicResponseDto] })
  @Expose()
  @Type(() => TopicResponseDto)
  topics?: TopicResponseDto[];
}
