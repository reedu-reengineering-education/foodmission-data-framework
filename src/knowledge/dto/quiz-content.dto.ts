import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsString,
  ValidateNested,
  ArrayMinSize,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { Type } from 'class-transformer';

@ValidatorConstraint({ name: 'IsAnswerInOptions', async: false })
export class IsAnswerInOptions implements ValidatorConstraintInterface {
  validate(correctAnswer: string, args: ValidationArguments): boolean {
    const obj = args.object as QuizQuestionDto;
    if (!obj.options || !Array.isArray(obj.options)) {
      return false;
    }
    return obj.options.includes(correctAnswer);
  }

  defaultMessage(): string {
    return 'correctAnswer must be one of the provided options';
  }
}

export class QuizQuestionDto {
  @ApiProperty({
    description: 'The question text',
    example: 'What is the capital of France?',
  })
  @IsString()
  @IsNotEmpty()
  question: string;

  @ApiProperty({
    description: 'Array of possible answers',
    type: [String],
    example: ['Paris', 'London', 'Berlin', 'Madrid'],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(2)
  options: string[];

  @ApiProperty({
    description: 'The correct answer from the options',
    example: 'Paris',
  })
  @IsString()
  @IsNotEmpty()
  @Validate(IsAnswerInOptions)
  correctAnswer: string;
}

export class QuizContentDto {
  @ApiProperty({
    description: 'Array of quiz questions',
    type: [QuizQuestionDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizQuestionDto)
  @ArrayMinSize(1)
  questions: QuizQuestionDto[];
}
