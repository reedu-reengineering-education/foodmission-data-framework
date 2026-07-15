import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsString, Matches } from 'class-validator';

export class CreateMissionsDto {
  @ApiProperty({
    description:
      'Stable mission slug matching gamification.missions.{slug} in src/i18n/en/gamification.json',
    example: 'plastic-free-month',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase kebab-case',
  })
  slug: string;

  @ApiProperty({
    description: 'Whether the mission is currently available',
    example: true,
  })
  @IsBoolean()
  @IsNotEmpty()
  available: boolean;

  @ApiProperty({
    description: 'The start date of the mission',
    example: '2024-04-01T00:00:00.000Z',
  })
  @IsNotEmpty()
  startDate: Date;

  @ApiProperty({
    description: 'The end date of the mission',
    example: '2024-04-30T23:59:59.000Z',
  })
  @IsNotEmpty()
  endDate: Date;
}
