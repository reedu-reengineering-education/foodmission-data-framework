import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateMissionsDto } from './update-missions.dto';

const invalidProperties = async (body: Record<string, unknown>) =>
  (
    await validate(plainToInstance(UpdateMissionsDto, body), {
      whitelist: true,
      forbidNonWhitelisted: true,
    })
  ).map((error) => error.property);

describe('UpdateMissionsDto', () => {
  it.each([true, false])('accepts available %p', async (available) => {
    expect(await invalidProperties({ available })).toEqual([]);
  });

  it.each([null, 'false', 'true', 'yes', 0, 1])(
    'rejects available %p',
    async (available) => {
      expect(await invalidProperties({ available })).toEqual(['available']);
    },
  );

  it.each(['code', 'title', 'dimensionId'])(
    'rejects %s because only availability is editable',
    async (field) => {
      expect(await invalidProperties({ [field]: 'x' })).toEqual([field]);
    },
  );
});
