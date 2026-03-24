import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength, IsDateString } from 'class-validator';

export class CreateChallengesDto {
  @ApiProperty({
    description: 'The name of the challenge',
    example: 'Bring Your Own Bag',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({
    description: 'The description of the challenge',
    example: 'Use a reusable shopping bag for your groceries today',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  description: string;

  @ApiProperty({
    description: 'Whether the challenge is currently available',
    example: true,
  })
  @IsNotEmpty()
  available: boolean;

  @ApiProperty({
    description: 'The start date of the challenge',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsDateString()
  @IsNotEmpty()
  startDate: Date;

  @ApiProperty({
    description: 'The end date of the challenge',
    example: '2024-12-31T00:00:00.000Z',
  })
  @IsDateString()
  @IsNotEmpty()
  endDate: Date;
}
