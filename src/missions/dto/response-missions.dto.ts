import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { MissionProgress } from '@prisma/client';
import { QuestResponseDto } from '../../quests/dto/response-quest.dto';

export class MissionsResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the mission',
    example: 'uuid-mission-id',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'Stable mission slug used for i18n lookup',
    example: 'plastic-free-month',
  })
  @Expose()
  slug: string;

  @ApiProperty({
    description: 'The mission title',
    example: 'Plastic-Free Month',
  })
  @Expose()
  title: string;

  @ApiProperty({
    description: 'The mission description',
    example: 'Avoid using plastic bags for a month',
  })
  @Expose()
  description: string;

  @ApiProperty({
    description: 'Indicates if the mission is currently available',
    example: true,
  })
  @Expose()
  available: boolean;

  @ApiProperty({
    description: 'The mission progress',
    example: '50%',
    required: false,
  })
  @Expose()
  progress?: MissionProgress;

  @ApiProperty({
    description: 'The mission start date',
    example: '2026-06-01',
  })
  @Expose()
  startDate: Date;

  @ApiProperty({
    description: 'The mission end date',
    example: '2026-12-31',
  })
  @Expose()
  endDate: Date;

  @ApiPropertyOptional({
    description: 'Nested quests with optional one-time challenges',
    type: [QuestResponseDto],
  })
  @Expose()
  @Type(() => QuestResponseDto)
  quests?: QuestResponseDto[];
}
