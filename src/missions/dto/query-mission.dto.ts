import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsUUID,
} from 'class-validator';

export class QueryMissionDto {
  @ApiProperty({
    description: 'The ID of the mission to get the mission details',
    example: 'uuid-mission-id',
  })
  @IsNotEmpty()
  @IsUUID()
  missionId: string;

  @ApiProperty({
    description: 'Check if the mission is available for the user',
    example: true,
  })
  @IsNotEmpty()
  available: boolean;

    @ApiProperty({
    description: 'Check if the mission is completed by the user',
    example: true,
  })
  @IsNotEmpty()
  completed: boolean;


  @ApiProperty({
    description: 'The progress made in the mission',
    example: 50,
  })
  @IsNotEmpty()
  progress: number;
}
