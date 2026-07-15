import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsNotEmpty, IsString, Matches } from 'class-validator';

export class CreateChallengeDto {
  @ApiProperty({
    description:
      'Stable challenge slug matching gamification.challenges.{slug} in src/i18n/en/gamification.json',
    example: 'bring-your-own-bag',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase kebab-case',
  })
  slug: string;

  @ApiProperty({
    description: 'Whether the challenge is currently available',
    example: true,
  })
  @IsBoolean()
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
