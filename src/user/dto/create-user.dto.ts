import { IsEmail, IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ description: 'Keycloak user ID' })
  @IsString()
  @IsNotEmpty()
  keycloakId: string;

  @ApiProperty({ description: 'User email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'User first name' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ description: 'User last name' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ description: 'User preferences', required: false })
  @IsOptional()
  @IsObject()
  preferences?: Record<string, any>;

  @ApiProperty({ description: 'User settings', required: false })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}