import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateShoppingListDto {
  @ApiProperty({
    description: 'The name of the shopping list',
    example: 'Family-Shopping-List',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;
}
