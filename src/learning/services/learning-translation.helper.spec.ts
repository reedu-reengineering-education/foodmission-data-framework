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

  it('looks up the content type search fields in the request locale', async () => {
    await expect(
      helper.findSearchMatches('Quiz', { search: 'carne', lang: 'it' }),
    ).resolves.toEqual(['q1']);
    expect(translationService.findEntityIdsByValue).toHaveBeenCalledWith(
      'Quiz',
      'it',
      ['title', 'question'],
      'carne',
    );
  });

  it('skips the lookup without a search term', async () => {
    await expect(
      helper.findSearchMatches('Quiz', { lang: 'it' }),
    ).resolves.toEqual([]);
    expect(translationService.findEntityIdsByValue).not.toHaveBeenCalled();
  });
});
