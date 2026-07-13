import { IsDateString, IsOptional } from 'class-validator';

export class RecipeAnalyticsQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
