import { IsBoolean, IsOptional, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UserSettingsDto {
  @ApiProperty({
    description: 'Whether push/email notifications are enabled',
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  notificationsEnabled?: boolean;

  @ApiProperty({
    description: 'Preferred local notification time (HH:mm, 24h)',
    required: false,
    default: '10:00',
    example: '10:00',
  })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'notificationPreferredTime must be HH:mm (24h)',
  })
  notificationPreferredTime?: string;
}
