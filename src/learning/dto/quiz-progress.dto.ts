import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { Expose } from 'class-transformer';

export class UpdateQuizProgressDto {
  @ApiProperty({
    description: 'Selected option label',
    enum: ['A', 'B', 'C', 'D'],
    example: 'A',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['A', 'B', 'C', 'D'])
  selectedLabel: 'A' | 'B' | 'C' | 'D';
}

export class QuizProgressResponseDto {
  @ApiPropertyOptional({ example: 'uuid-progress-id' })
  @Expose()
  id?: string;

  @ApiProperty({ example: 'uuid-user-id' })
  @Expose()
  userId: string;

  @ApiProperty({ example: 'uuid-quiz-id' })
  @Expose()
  quizId: string;

  @ApiProperty({ example: 'Q1.1.1' })
  @Expose()
  quizCode: string;

  @ApiPropertyOptional({
    example:
      'You want to reduce the environmental impact of your dinners. Which change is likely to have the biggest effect?',
  })
  @Expose()
  question?: string;

  @ApiPropertyOptional({ example: 'uuid-option-id' })
  @Expose()
  selectedOptionId?: string | null;

  @ApiPropertyOptional({ example: true })
  @Expose()
  isCorrect?: boolean | null;

  @ApiProperty({ example: true })
  @Expose()
  completed: boolean;

  @ApiPropertyOptional({ example: '2026-08-04T12:00:00.000Z' })
  @Expose()
  answeredAt?: Date | null;
}
