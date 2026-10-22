import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';
import { IsOptionalNotNull } from '../../common/decorators/optional-not-null.decorator';

export class UpdateChallengeDto {
  @ApiPropertyOptional({
    description: 'Updated if the challenge is available',
    example: true,
  })
  @IsOptionalNotNull()
  @IsBoolean()
  available?: boolean;
}
