import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class RefreshDto {
  @ApiProperty({ description: 'Refresh token to exchange for new tokens' })
  @IsString()
  token: string;

  @ApiProperty({ description: 'Optional token type hint', required: false })
  @IsOptional()
  @IsString()
  tokenTypeHint?: 'refresh_token' | 'access_token';
}
