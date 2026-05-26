import { PartialType } from '@nestjs/swagger';
import { CreateGenericFoodDto } from './create-generic-food.dto';

export class UpdateGenericFoodDto extends PartialType(CreateGenericFoodDto) {}
