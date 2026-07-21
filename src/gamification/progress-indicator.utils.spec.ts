import { BadRequestException } from '@nestjs/common';
import { assertProgressIndicatorOwner } from './progress-indicator.utils';

describe('assertProgressIndicatorOwner', () => {
  it('accepts user-owned indicator', () => {
    expect(assertProgressIndicatorOwner({ userId: 'u1' })).toEqual({
      userId: 'u1',
      groupId: null,
    });
  });

  it('accepts group-owned indicator', () => {
    expect(assertProgressIndicatorOwner({ groupId: 'g1' })).toEqual({
      groupId: 'g1',
      userId: null,
    });
  });

  it('rejects both owners', () => {
    expect(() =>
      assertProgressIndicatorOwner({ userId: 'u1', groupId: 'g1' }),
    ).toThrow(BadRequestException);
  });

  it('rejects neither owner', () => {
    expect(() => assertProgressIndicatorOwner({})).toThrow(BadRequestException);
  });
});
