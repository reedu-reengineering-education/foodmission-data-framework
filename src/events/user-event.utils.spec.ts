import { buildEventMetadata, asObjectMetadata } from './user-event.utils';

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

describe('asObjectMetadata', () => {
  it('returns objects as-is', () => {
    expect(asObjectMetadata({ a: 1 })).toEqual({ a: 1 });
  });

  it('returns {} for non-objects', () => {
    expect(asObjectMetadata(null)).toEqual({});
    expect(asObjectMetadata('x')).toEqual({});
    expect(asObjectMetadata([1])).toEqual({});
  });
});
