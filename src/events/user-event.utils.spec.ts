import { buildEventMetadata } from './user-event.utils';

describe('buildEventMetadata', () => {
  it('merges subject into metadata', () => {
    expect(
      buildEventMetadata({ segment: 'BEGINNER' }, { type: 'USER', id: 'u1' }),
    ).toEqual({
      segment: 'BEGINNER',
      subject: { type: 'USER', id: 'u1' },
    });
  });

  it('returns metadata unchanged when subject is omitted', () => {
    expect(buildEventMetadata({ foo: 'bar' })).toEqual({ foo: 'bar' });
  });
});
