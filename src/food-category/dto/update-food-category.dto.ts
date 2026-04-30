import { PartialType } from '@nestjs/swagger';
import { CreateFoodCategoryDto } from './create-food-category.dto';

export class UpdateFoodCategoryDto extends PartialType(CreateFoodCategoryDto) {}
