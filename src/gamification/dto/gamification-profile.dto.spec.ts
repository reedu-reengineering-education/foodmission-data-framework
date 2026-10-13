import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { GamificationProfileQueryDto } from './gamification-profile.dto';

describe('GamificationProfileQueryDto eventTypes', () => {
  // Same options as the route's pipe.
  const pipe = new ValidationPipe({
    whitelist: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  });
  const parse = (query: Record<string, unknown>) =>
    pipe.transform(query, {
      type: 'query',
      metatype: GamificationProfileQueryDto,
    }) as Promise<GamificationProfileQueryDto>;

  it('accepts a comma-separated list', async () => {
    const dto = await parse({ eventTypes: 'MISSION_COMPLETED, BADGE_EARNED' });
    expect(dto.eventTypes).toEqual(['MISSION_COMPLETED', 'BADGE_EARNED']);
  });

  it('accepts a repeated parameter', async () => {
    const dto = await parse({
      eventTypes: ['MISSION_COMPLETED', 'BADGE_EARNED'],
    });
    expect(dto.eventTypes).toEqual(['MISSION_COMPLETED', 'BADGE_EARNED']);
  });

  it('accepts a single value', async () => {
    const dto = await parse({ eventTypes: 'QUIZ_ANSWERED' });
    expect(dto.eventTypes).toEqual(['QUIZ_ANSWERED']);
  });

  it('is optional', async () => {
    const dto = await parse({});
    expect(dto.eventTypes).toBeUndefined();
  });

  it('rejects unknown event types', async () => {
    await expect(
      parse({ eventTypes: 'MISSION_COMPLETED,NOT_AN_EVENT' }),
    ).rejects.toThrow(BadRequestException);
  });
});
