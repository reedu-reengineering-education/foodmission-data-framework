import { ApiProperty } from '@nestjs/swagger';
import { ChallengeProgress } from '@prisma/client';
import { Expose } from 'class-transformer';

export class ChallengeResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the challenge',
    example: 'uuid-challenge-id',
  })
  @Expose()
  id: string;

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
    description: 'Indicates if the challenge is currently available',
    example: true,
  })
  @Expose()
  available: boolean;

  @ApiProperty({
    description: 'The challenge progress',
    example: '50%',
  })
  @Expose()
  progress: ChallengeProgress;

  @ApiProperty({
    description: 'The challenge start date',
    example: '2026-06-01',
  })
  @Expose()
  startDate: Date;

  @ApiProperty({
    description: 'The challenge end date',
    example: '2026-12-31',
  })
  @Expose()
  endDate: Date;
}
