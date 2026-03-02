import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class MissionContentDto {
  @ApiProperty({
    description: 'The title of the mission',
    example: 'Plastic-Free Month',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Detailed description of the mission',
    example: 'Reduce plastic usage by avoiding single-use plastics for a month.',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'Whether the mission is available to users',
    example: true,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  available?: boolean;

  @ApiProperty({
    description: 'The start date of the mission',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({
    description: 'The end date of the mission',
    example: '2024-12-31T23:59:59.000Z',
  })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;
}