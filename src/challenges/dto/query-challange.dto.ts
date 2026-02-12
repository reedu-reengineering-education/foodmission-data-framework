import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsUUID,
} from 'class-validator';

export class QueryChallengeDto {
  @ApiProperty({
    description: 'The ID of the challenge to get the challenge details',
    example: 'uuid-challenge-id',
  })
  @IsNotEmpty()
  @IsUUID()
  challengeId: string;

  @ApiProperty({
    description: 'Check if the challenge is available for the user',
    example: true,
  })
  @IsNotEmpty()
  available: boolean;

    @ApiProperty({
    description: 'Check if the challenge is completed by the user',
    example: true,
  })
  @IsNotEmpty()
  completed: boolean;


  @ApiProperty({
    description: 'The progress made in the challenge',
    example: 50,
  })
  @IsNotEmpty()
  progress: number;
}
