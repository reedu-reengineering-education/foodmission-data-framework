import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateKnowledgeDto {
  @ApiPropertyOptional({
    description: 'Is this knowledge available to users',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  available?: boolean;
}
