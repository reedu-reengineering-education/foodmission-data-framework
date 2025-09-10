import {
  IsString,
  IsOptional,
  IsNotEmpty,
  MaxLength,
  IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateShoppingListDto {
  
  @ApiProperty({
    description: 'UUID of the user who created this shopping list',
    example: '550e8400-e29b-41d4-a716-446655440001',
    format: 'uuid',
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
   userId: string;
  

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
