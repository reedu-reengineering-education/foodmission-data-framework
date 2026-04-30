import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { QuizContentDto } from './quiz-content.dto';

export class CreateKnowledgeDto {
  @ApiProperty({
    description: 'Knowledge title',
    example: 'Nutrition Basics Quiz',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({
    description: 'Knowledge description',
    example: 'Test your knowledge about basic nutrition concepts',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Is this knowledge available to users',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  available?: boolean;

  @ApiProperty({
    description: 'Quiz content with questions and answers',
    type: QuizContentDto,
  })
  @ValidateNested()
  @Type(() => QuizContentDto)
  content: QuizContentDto;
}
