import { PartialType } from '@nestjs/swagger';
import { CreateMealDto } from './create-dish.dto';

export class UpdateMealDto extends PartialType(CreateMealDto) {}
