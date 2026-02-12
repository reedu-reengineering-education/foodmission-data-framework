import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class missionResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the mission',
    example: 'uuid-mission-id',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'The user ID who owns this mission',
    example: 'uuid-user-id',
  })
  @Expose()
  userId: string;

  @ApiProperty({
    description: 'The mission title',
    example: 'Plastic-Free Month',
  })
  @Expose()
  title: string;

  @ApiProperty({
    description: 'The mission description',
    example: 'Avoid using plastic bags for a month',
  })
  @Expose()
  description: string;

  @ApiProperty({
    description: 'The mission progress',
    example: '50%',
  })
  @Expose()
  progress: number;
}
