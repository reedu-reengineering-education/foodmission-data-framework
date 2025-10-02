import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreatePantryDto {
  @ApiProperty({
    description: 'The user id',
    example: 'uuid-user-id',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  userId: string;

  @ApiProperty({
    description: 'The name of the pantry',
    example: 'Home or Work',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;
}
