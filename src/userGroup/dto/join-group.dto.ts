import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Length, Matches } from 'class-validator';

export class JoinGroupDto {
  @ApiProperty({
    description: 'The invite code to join the group (7-character alphanumeric)',
    example: 'AXY1278',
    minLength: 7,
    maxLength: 7,
    pattern: '^[A-Z0-9]{7}$',
  })
  @IsString()
  @IsNotEmpty()
  @Length(7, 7, { message: 'Invite code must be exactly 7 characters' })
  @Matches(/^[A-Z0-9]{7}$/, {
    message: 'Invite code must be 7 uppercase alphanumeric characters',
  })
  inviteCode: string;
}
