import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContentLevel } from '@prisma/client';
import { Expose } from 'class-transformer';

export class MissionsResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the mission',
    example: 'uuid-mission-id',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'Unique mission code',
    example: 'M.B1.1',
  })
  @Expose()
  code: string;

  @ApiProperty({
    description: 'Dimension id',
    example: 'uuid-dimension-id',
  })
  @Expose()
  dimensionId: string;

  @ApiPropertyOptional({
    description: 'Optional topic id',
    example: 'uuid-topic-id',
  })
  @Expose()
  topicId?: string | null;

  @ApiProperty({
    description: 'Content difficulty level',
    enum: ContentLevel,
    example: ContentLevel.BEGINNER,
  })
  @Expose()
  level: ContentLevel;

  @ApiProperty({
    description: 'The mission title',
    example: 'Plastic-Free Week',
  })
  @Expose()
  title: string;

  @ApiProperty({
    description: 'Expected duration',
    example: '1 week',
  })
  @Expose()
  duration: string;

  @ApiProperty({
    description: 'The mission goal',
    example: 'Avoid single-use plastics for one week',
  })
  @Expose()
  goal: string;

  @ApiProperty({
    description: 'Why this mission matters',
    example: 'Reducing plastic waste protects oceans and wildlife',
  })
  @Expose()
  whyItMatters: string;

  @ApiProperty({
    description: 'Whether the mission relates to health',
    example: false,
  })
  @Expose()
  health: boolean;

  @ApiProperty({
    description: 'Whether the mission relates to food choice',
    example: true,
  })
  @Expose()
  foodChoice: boolean;

  @ApiProperty({
    description: 'Whether the mission relates to food waste',
    example: false,
  })
  @Expose()
  foodWaste: boolean;

  @ApiProperty({
    description: 'Indicates if the mission is currently available',
    example: true,
  })
  @Expose()
  available: boolean;

  @ApiPropertyOptional({
    description:
      'Current user mission progress on a 0–100 scale. Omitted on admin mission list.',
    example: 50,
  })
  @Expose()
  progress?: number;
}