import { foodFactReadsWhere } from './content-completion';

describe('foodFactReadsWhere', () => {
  it('matches the given user progress rows for the given food fact codes', () => {
    expect(foodFactReadsWhere('u1', ['FF.1', 'FF.2'])).toEqual({
      userId: 'u1',
      foodFact: { code: { in: ['FF.1', 'FF.2'] } },
    });
  });
});
