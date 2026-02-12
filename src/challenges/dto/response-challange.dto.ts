import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class challengeResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the challenge',
    example: 'uuid-challenge-id',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'The user ID who owns this challenge',
    example: 'uuid-user-id',
  })
  @Expose()
  userId: string;

  @ApiProperty({
    description: 'The challenge title',
    example: 'Bring Your Own Bag',
  })
  @Expose()
  title: string;

  @ApiProperty({
    description: 'The challenge description',
    example: 'Use a reusable shopping bag for your groceries today',
  })
  @Expose()
  description: string;

  @ApiProperty({
    description: 'The challenge progress',
    example: '50%',
  })
  @Expose()
  progress: number;
}
