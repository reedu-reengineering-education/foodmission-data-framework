import { ApiPropertyOptional, IntersectionType } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { LangQueryDto } from '../../i18n/dto/lang-query.dto';

class QueryQuestsFilterDto {
  @ApiPropertyOptional({
    description: 'Filter quests by mission id',
    example: 'uuid-mission-id',
  })
  @IsOptional()
  @IsUUID()
  missionId?: string;
}

export class QueryQuestsDto extends IntersectionType(
  LangQueryDto,
  QueryQuestsFilterDto,
) {}
