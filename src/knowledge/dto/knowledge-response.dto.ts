import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class QuizQuestionResponseDto {
  @ApiProperty({ description: 'Question text' })
  @Expose()
  question: string;

  @ApiProperty({ description: 'Answer options', type: [String] })
  @Expose()
  options: string[];

  @ApiProperty({ description: 'Correct answer' })
  @Expose()
  correctAnswer: string;
}

export class QuizContentResponseDto {
  @ApiProperty({
    description: 'Quiz questions',
    type: [QuizQuestionResponseDto],
  })
  @Expose()
  @Type(() => QuizQuestionResponseDto)
  questions: QuizQuestionResponseDto[];
}

export class UserProgressSummaryDto {
  @ApiProperty({ description: 'Is completed' })
  @Expose()
  completed: boolean;

  @ApiPropertyOptional({ description: 'Progress data' })
  @Expose()
  progress?: any;

  @ApiProperty({ description: 'Last accessed' })
  @Expose()
  lastAccessedAt: Date;
}

export class KnowledgeResponseDto {
  @ApiProperty({ description: 'Knowledge id', format: 'uuid' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Owner user id', format: 'uuid' })
  @Expose()
  userId: string;

  @ApiProperty({ description: 'Knowledge title' })
  @Expose()
  title: string;

  @ApiPropertyOptional({ description: 'Description' })
  @Expose()
  description?: string;

  @ApiProperty({ description: 'Is available' })
  @Expose()
  available: boolean;

  @ApiProperty({
    description: 'Quiz content',
    type: () => QuizContentResponseDto,
  })
  @Expose()
  @Type(() => QuizContentResponseDto)
  content: QuizContentResponseDto;

  @ApiProperty({ description: 'Created at' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ description: 'Updated at' })
  @Expose()
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'User progress data if available' })
  @Expose()
  @Type(() => UserProgressSummaryDto)
  userProgress?: UserProgressSummaryDto;
}

export class MultipleKnowledgeResponseDto {
  @ApiProperty({ type: [KnowledgeResponseDto] })
  @Expose()
  data: KnowledgeResponseDto[];

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
