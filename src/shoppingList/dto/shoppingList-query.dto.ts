import { IsOptional, IsString, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class ShoppingListQueryDto {

  @IsOptional()
  @IsString()
  title?: string;


}