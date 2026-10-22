import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateChallengeDto } from './update-challenge.dto';

describe('UpdateChallengeDto', () => {
  const validate_ = (payload: Record<string, unknown>) =>
    validate(plainToInstance(UpdateChallengeDto, payload), {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

  it('accepts an omitted available', async () => {
    expect(await validate_({})).toHaveLength(0);
  });

  it.each([true, false])('accepts available: %p', async (available) => {
    expect(await validate_({ available })).toHaveLength(0);
  });

  it.each([null, 'false', 'true', 'yes', 0, 1])(
    'rejects available: %p',
    async (available) => {
      const errors = await validate_({ available });

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('available');
      expect(errors[0].constraints).toHaveProperty('isBoolean');
    },
  );
});
