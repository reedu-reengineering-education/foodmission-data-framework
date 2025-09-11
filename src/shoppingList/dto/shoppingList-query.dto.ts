import { IsOptional, IsString, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class ShoppingListQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  title?: string;

   @IsOptional()
    @IsString()
    @IsIn(['title'])
    sortBy?: 'title' 
  
    @IsOptional()
    @IsString()
    @IsIn(['asc', 'desc'])
    sortOrder?: 'asc' | 'desc' = 'desc';
  
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;
  
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 10;
}