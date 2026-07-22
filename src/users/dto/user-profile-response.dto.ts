import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserPreferencesDto } from './user-preferences.dto';
import { UserSettingsDto } from './user-settings.dto';

export class UserProfileResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty()
  keycloakId!: string;

  @ApiPropertyOptional({ type: UserPreferencesDto })
  preferences?: UserPreferencesDto;

  @ApiPropertyOptional({ type: UserSettingsDto })
  settings?: UserSettingsDto;

  @ApiPropertyOptional()
  username?: string;

  @ApiPropertyOptional()
  yearOfBirth?: number;

  @ApiPropertyOptional()
  country?: string;

  @ApiPropertyOptional()
  region?: string;

  @ApiPropertyOptional()
  zip?: string;

  @ApiPropertyOptional()
  language?: string;

  @ApiPropertyOptional({ nullable: true })
  segment?: string | null;

  @ApiPropertyOptional({ nullable: true })
  currentQuestId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  lastLoginAt?: Date | null;
}
