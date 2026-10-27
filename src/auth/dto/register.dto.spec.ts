import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { RegisterDto } from './register.dto';

describe('RegisterDto', () => {
  const validDto = {
    username: 'janedoe',
    email: 'jane@example.com',
    password: 'correct-horse',
  };

  const passwordErrors = async (overrides: Partial<typeof validDto>) => {
    const dto = plainToInstance(RegisterDto, { ...validDto, ...overrides });
    const errors = await validate(dto);
    return errors.find((e) => e.property === 'password')?.constraints ?? {};
  };

  it('should validate a valid dto', async () => {
    const dto = plainToInstance(RegisterDto, validDto);
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail when password is shorter than 8 characters', async () => {
    const constraints = await passwordErrors({ password: 'short' });
    expect(constraints).toHaveProperty('minLength');
  });

  it('should accept a password of exactly 8 characters', async () => {
    const constraints = await passwordErrors({ password: '12345678' });
    expect(constraints).toEqual({});
  });

  it('should fail when password equals the username', async () => {
    const constraints = await passwordErrors({
      username: 'janedoe123',
      password: 'janedoe123',
    });
    expect(constraints).toHaveProperty('PasswordNotUsernameOrEmail');
  });

  it('should fail when password equals the email', async () => {
    const constraints = await passwordErrors({ password: 'jane@example.com' });
    expect(constraints).toHaveProperty('PasswordNotUsernameOrEmail');
  });

  it('should compare username and email case-insensitively', async () => {
    const constraints = await passwordErrors({
      username: 'JaneDoe123',
      password: 'janedoe123',
    });
    expect(constraints).toHaveProperty('PasswordNotUsernameOrEmail');
    const emailConstraints = await passwordErrors({
      password: 'JANE@EXAMPLE.COM',
    });
    expect(emailConstraints).toHaveProperty('PasswordNotUsernameOrEmail');
  });

  it('should accept a password that only contains the username', async () => {
    const constraints = await passwordErrors({ password: 'janedoe-secret' });
    expect(constraints).toEqual({});
  });
});
