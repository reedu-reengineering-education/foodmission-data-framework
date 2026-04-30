import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { ProgressResponseDto } from './update-progress.dto';

export class MultipleProgressResponseDto {
  @ApiProperty({ type: [ProgressResponseDto] })
  @Expose()
  @Type(() => ProgressResponseDto)
  data: ProgressResponseDto[];

  @ApiProperty({ description: 'Total items' })
  @Expose()
  total: number;

  @ApiProperty({ description: 'Page number' })
  @Expose()
  page: number;

  @ApiProperty({ description: 'Items per page' })
  @Expose()
  limit: number;

  @ApiProperty({ description: 'Total pages' })
  @Expose()
  totalPages: number;
}
