import { IsEmail } from 'class-validator';

export class AdminResetPasswordDto {
  @IsEmail()
  email!: string;
}
