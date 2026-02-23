import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateMissionDto {
  @ApiProperty({
    description: 'The name of the mission',
    example: 'Plastic-Free Month',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({
    description: 'The description of the mission',
    example: 'Avoid using single-use plastics for the entire month',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  description: string;

  @ApiProperty({
    description: 'Whether the mission is currently available',
    example: true,
  })
  available: boolean;

  @ApiProperty({
    description: 'The start date of the mission',
    example: '2024-04-01T00:00:00.000Z',
  })
  startDate: Date;

  @ApiProperty({
    description: 'The end date of the mission',
    example: '2024-04-30T23:59:59.000Z',
  })
  endDate: Date;  
}
