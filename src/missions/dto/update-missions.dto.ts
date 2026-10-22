import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateMissionsDto } from './create-missions.dto';

export class UpdateMissionsDto extends PartialType(
  OmitType(CreateMissionsDto, ['code'] as const),
  { skipNullProperties: false },
) {}
