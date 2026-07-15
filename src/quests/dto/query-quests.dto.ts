import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class QueryQuestsDto {
  @ApiPropertyOptional({
    description: 'Filter quests by mission id',
    example: 'uuid-mission-id',
  })
  @IsOptional()
  @IsUUID()
  missionId?: string;
}
