import { PartialType } from '@nestjs/swagger';
import { CreateFoodyItemDto } from './create-foody-item.dto';

export class UpdateFoodyItemDto extends PartialType(CreateFoodyItemDto) {}
