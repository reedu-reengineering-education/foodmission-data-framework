import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';
import { IsOptionalNotNull } from '../../common/decorators/optional-not-null.decorator';

export class UpdateMissionsDto {
  @ApiPropertyOptional({
    description: 'Updated if the mission is available',
    example: true,
  })
  @IsOptionalNotNull()
  @IsBoolean()
  available?: boolean;
}
