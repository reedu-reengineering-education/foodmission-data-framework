import { LearningTranslationHelper } from './learning-translation.helper';
import { TranslationService } from '../../translations/services/translation.service';

describe('LearningTranslationHelper.findSearchMatches', () => {
  const translationService = {
    resolveLocale: jest.fn((lang?: string) => lang ?? 'en'),
    findEntityIdsByValue: jest.fn().mockResolvedValue(['q1']),
  };
  const helper = new LearningTranslationHelper(
    translationService as unknown as TranslationService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('looks up each search word in the content type fields and locale', async () => {
    await expect(
      helper.findSearchMatches('Quiz', { search: 'Carne rossa', lang: 'it' }),
    ).resolves.toEqual([['q1'], ['q1']]);
    expect(translationService.findEntityIdsByValue).toHaveBeenNthCalledWith(
      1,
      'Quiz',
      'it',
      ['title', 'question'],
      'carne',
    );
    expect(translationService.findEntityIdsByValue).toHaveBeenNthCalledWith(
      2,
      'Quiz',
      'it',
      ['title', 'question'],
      'rossa',
    );
  });

  it('skips the lookup without a search term', async () => {
    await expect(
      helper.findSearchMatches('Quiz', { lang: 'it' }),
    ).resolves.toEqual([]);
    expect(translationService.findEntityIdsByValue).not.toHaveBeenCalled();
  });
});
