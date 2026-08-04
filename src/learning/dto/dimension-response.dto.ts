import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class TopicResponseDto {
  @ApiProperty({ example: 'uuid-topic-id' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'B1' })
  @Expose()
  code: string;

  @ApiProperty({ example: 'Plastic packaging' })
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

  @ApiProperty({ example: 'B' })
  @Expose()
  code: string;

  @ApiProperty({ example: 'Food Packaging' })
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
