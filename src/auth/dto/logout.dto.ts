import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class LogoutDto {
  @ApiProperty({ description: 'Token to revoke (refresh or access token)' })
  @IsString()
  token: string;

  @ApiProperty({ description: 'Optional token type hint', required: false })
  @IsOptional()
  @IsString()
  tokenTypeHint?: 'refresh_token' | 'access_token';
}
