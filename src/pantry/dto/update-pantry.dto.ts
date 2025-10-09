import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class UpdatePantryDto {
  @ApiProperty({
    description: 'The name of the pantry',
    example: 'Refrigerator',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;
}
