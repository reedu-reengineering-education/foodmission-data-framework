import { toSurveySlug } from './survey-slug.util';

describe('toSurveySlug', () => {
  it('kebab-cases a simple title', () => {
    expect(toSurveySlug('third use')).toBe('third-use');
  });

  it('collapses non-alphanumeric runs and trims edges', () => {
    expect(toSurveySlug('after 1 m and at least 9th use')).toBe(
      'after-1-m-and-at-least-9th-use',
    );
  });

  it('lowercases and trims surrounding whitespace', () => {
    expect(toSurveySlug('  End  ')).toBe('end');
  });
});
