import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContentLevel } from '@prisma/client';
import { Expose, Type } from 'class-transformer';

/** Public quiz option — never includes isCorrect. */
export class QuizOptionPublicDto {
  @ApiProperty({ example: 'uuid-option-id' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'A', enum: ['A', 'B', 'C', 'D'] })
  @Expose()
  label: string;

  @ApiProperty({ example: 'Reuse a container' })
  @Expose()
  text: string;

  @ApiProperty({ example: 0 })
  @Expose()
  sortOrder: number;
}

export class QuizResponseDto {
  @ApiProperty({ example: 'uuid-quiz-id' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'Q1.1.1' })
  @Expose()
  code: string;

  @ApiProperty({ example: 'uuid-topic-id' })
  @Expose()
  topicId: string;

  @ApiProperty({
    example:
      'You want to reduce the environmental impact of your dinners. Which change is likely to have the biggest effect?',
  })
  @Expose()
  question: string;

  @ApiProperty({
    example:
      'Reducing beef consumption generally has a much larger impact than switching between similar foods because livestock production contributes heavily to land use, water use, and greenhouse-gas emissions.',
  })
  @Expose()
  explanation: string;

  @ApiPropertyOptional({ example: 'EU Food Waste Report' })
  @Expose()
  source?: string | null;

  @ApiProperty({ enum: ContentLevel, example: ContentLevel.BEGINNER })
  @Expose()
  level: ContentLevel;

  @ApiProperty({ example: false })
  @Expose()
  health: boolean;

  @ApiProperty({ example: true })
  @Expose()
  foodChoice: boolean;

  @ApiProperty({ example: true })
  @Expose()
  foodWaste: boolean;

  @ApiProperty({ example: true })
  @Expose()
  available: boolean;

  @ApiProperty({ type: [QuizOptionPublicDto] })
  @Expose()
  @Type(() => QuizOptionPublicDto)
  options: QuizOptionPublicDto[];
}
