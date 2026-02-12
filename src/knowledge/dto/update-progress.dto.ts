import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsObject } from 'class-validator';

export class UpdateProgressDto {
  @ApiPropertyOptional({
    description: 'Mark as completed',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  completed?: boolean;

  @ApiPropertyOptional({
    description: 'Progress data (currentQuestionIndex, answers, score)',
    example: {
      currentQuestionIndex: 2,
      answers: ['Paris', 'Berlin'],
      score: 1,
    },
  })
  @IsOptional()
  @IsObject()
  progress?: Record<string, any>;
}

export class ProgressResponseDto {
  @ApiProperty({ description: 'Progress id', format: 'uuid' })
  id: string;

  @ApiProperty({ description: 'User id', format: 'uuid' })
  userId: string;

  @ApiProperty({ description: 'Knowledge id', format: 'uuid' })
  knowledgeId: string;

  @ApiProperty({ description: 'Is completed' })
  completed: boolean;

  @ApiProperty({ description: 'Progress data' })
  progress: any;

  @ApiProperty({ description: 'Last accessed at' })
  lastAccessedAt: Date;

  @ApiProperty({ description: 'Created at' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at' })
  updatedAt: Date;
}
