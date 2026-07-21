import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class UpdateUserGroupDto {
  @ApiProperty({
    description: 'The name of the group',
    example: 'Smith Family',
    maxLength: 255,
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @ApiProperty({
    description: 'Optional description of the group',
    example: 'Our family shopping and meal planning group',
    required: false,
    maxLength: 1000,
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({
    description:
      'Opaque current quest id (string until Quest catalog exists with UUID PKs). ' +
      'Pass null to clear. Will become UUID + FK when Quest model lands.',
    required: false,
    nullable: true,
    example: 'seed-quest-family',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(255)
  currentQuestId?: string | null;
}
