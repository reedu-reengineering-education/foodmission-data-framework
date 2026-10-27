import {
  IsEmail,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  MinLength,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

@ValidatorConstraint({ name: 'PasswordNotUsernameOrEmail', async: false })
class PasswordNotUsernameOrEmailConstraint implements ValidatorConstraintInterface {
  validate(password: unknown, args: ValidationArguments): boolean {
    if (typeof password !== 'string') return true;
    const { username, email } = args.object as RegisterDto;
    const lowered = password.toLowerCase();
    return (
      lowered !== username?.toLowerCase() && lowered !== email?.toLowerCase()
    );
  }

  defaultMessage(): string {
    return 'password must not be the same as the username or email';
  }
}

export class RegisterDto {
  @ApiProperty({ description: 'Desired username' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({
    description:
      'Password. At least 8 characters and not the same as the username or email (case-insensitive).',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @Validate(PasswordNotUsernameOrEmailConstraint)
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
