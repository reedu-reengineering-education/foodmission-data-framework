import { IsOptional, IsString } from 'class-validator';

export class ShoppingListQueryDto {
  @IsOptional()
  @IsString()
  title?: string;
}
