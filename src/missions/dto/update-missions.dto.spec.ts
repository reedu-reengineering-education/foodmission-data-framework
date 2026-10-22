import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ContentLevel } from '@prisma/client';
import { UpdateMissionsDto } from './update-missions.dto';

const validateBody = (body: Record<string, unknown>) =>
  validate(plainToInstance(UpdateMissionsDto, body), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });

const invalidProperties = async (body: Record<string, unknown>) =>
  (await validateBody(body)).map((error) => error.property);

describe('UpdateMissionsDto', () => {
  it('accepts a full set of editable fields', async () => {
    const errors = await validateBody({
      dimensionId: '550e8400-e29b-41d4-a716-446655440000',
      topicId: '550e8400-e29b-41d4-a716-446655440001',
      level: ContentLevel.ADVANCED,
      title: 'Plastic-Free Week',
      duration: '1 week',
      goal: 'Avoid single-use plastics',
      whyItMatters: 'Protects oceans',
      health: true,
      foodChoice: false,
      foodWaste: true,
      available: false,
    });

    expect(errors).toHaveLength(0);
  });

  it('accepts a partial update', async () => {
    expect(await validateBody({ title: 'New title' })).toHaveLength(0);
  });

  it('accepts null topicId to clear the topic', async () => {
    expect(await validateBody({ topicId: null })).toHaveLength(0);
  });

  it('rejects code because it is immutable', async () => {
    expect(await invalidProperties({ code: 'M.A1.2' })).toEqual(['code']);
  });

  it.each([
    'dimensionId',
    'level',
    'title',
    'duration',
    'goal',
    'whyItMatters',
    'health',
    'foodChoice',
    'foodWaste',
    'available',
  ])('rejects null %s', async (field) => {
    expect(await invalidProperties({ [field]: null })).toEqual([field]);
  });

  it.each(['false', 'true', 'yes', 0, 1])(
    'rejects non-boolean available %p',
    async (value) => {
      expect(await invalidProperties({ available: value })).toEqual([
        'available',
      ]);
    },
  );

  it.each([
    ['dimensionId', 'not-a-uuid'],
    ['topicId', 'not-a-uuid'],
    ['level', 'EXPERT'],
    ['title', ''],
    ['title', 'x'.repeat(256)],
    ['duration', 'x'.repeat(65)],
    ['goal', ''],
    ['whyItMatters', ''],
  ])('rejects invalid %s %p', async (field, value) => {
    expect(await invalidProperties({ [field]: value })).toEqual([field]);
  });
});
