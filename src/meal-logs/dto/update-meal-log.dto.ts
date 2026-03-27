import { PartialType } from '@nestjs/swagger';
import { CreateMealLogDto } from './create-meal-log.dto';

export class UpdateMealLogDto extends PartialType(CreateMealLogDto) {}
