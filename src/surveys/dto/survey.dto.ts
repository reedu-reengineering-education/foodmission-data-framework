import { IsString, IsOptional, IsArray, ValidateNested, MinLength, Min, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

export class AnswerOptionDto {
  id: string;
  text: string;
  order: number;
}

export class QuestionDto {
  id: string;
  text: string;
  type: string;
  order: number;
  answerOptions: AnswerOptionDto[];
}

export class SurveyDto {
  id: string;
  title: string;
  description?: string;
  questions: QuestionDto[];
  createdAt: Date;
  updatedAt: Date;
}

export class CreateSurveyDto {
  @IsString()
  @MinLength(1, { message: 'Survey title cannot be empty' })
  title: string;

  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Description cannot be empty' })
  description?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Survey must have at least one question' })
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  questions: CreateQuestionDto[];
}

export class CreateQuestionDto {
  @IsString()
  @MinLength(1, { message: 'Question text cannot be empty' })
  text: string;

  @IsString()
  @MinLength(1, { message: 'Question type cannot be empty' })
  type: string; // e.g., "likert"

  @IsArray()
  @ArrayMinSize(1, { message: 'Question must have at least one answer option' })
  @ValidateNested({ each: true })
  @Type(() => CreateAnswerOptionDto)
  answerOptions: CreateAnswerOptionDto[];
}

export class CreateAnswerOptionDto {
  @IsString()
  @MinLength(1, { message: 'Answer option text cannot be empty' })
  text: string;
}

export class UpdateSurveyDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class SubmitSurveyResponseDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Must provide at least one response' })
  @ValidateNested({ each: true })
  @Type(() => SubmitQuestionResponseDto)
  responses: SubmitQuestionResponseDto[];
}

export class SubmitQuestionResponseDto {
  @IsString()
  @MinLength(1, { message: 'Question ID cannot be empty' })
  questionId: string;

  @IsString()
  @MinLength(1, { message: 'Answer ID cannot be empty' })
  selectedAnswerId: string;
}

export class SurveyResponseDto {
  id: string;
  userId: string;
  surveyId: string;
  responses: QuestionResponseDto[];
  createdAt: Date;
  updatedAt: Date;
}

export class QuestionResponseDto {
  id: string;
  questionId: string;
  selectedAnswerId: string;
  question?: QuestionDto;
  selectedAnswer?: AnswerOptionDto;
}
