import {
  IsEmail,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ description: 'Desired username' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({
    description:
      'Password. The Keycloak realm password policy is the only check; a rejected password is returned with the Keycloak message.',
  })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ description: 'Email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'First name' })
  @IsOptional()
  @IsString()
  firstName: string;

  @ApiProperty({ description: 'Last name' })
  @IsOptional()
  @IsString()
  lastName: string;

  @ApiProperty({ description: 'Year of birth', required: false })
  @IsOptional()
  @IsInt()
  yearOfBirth?: number;

  @ApiProperty({ description: 'Country', required: false })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ description: 'Region/state', required: false })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiProperty({ description: 'Postal code', required: false })
  @IsOptional()
  @IsString()
  zip?: string;
}
