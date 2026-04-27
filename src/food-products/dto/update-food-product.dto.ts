import { PartialType } from '@nestjs/swagger';
import { CreateFoodProductDto } from './create-food-product.dto';
import { Prisma } from '@prisma/client';

export class UpdateFoodProductDto extends PartialType(CreateFoodProductDto) {
  nutrimentsRaw?: Prisma.InputJsonValue;
  nutrientLevels?: Prisma.InputJsonValue;
}
