import { TranslationService } from '../../translations/services/translation.service';
import { overlayTitles } from './overlay-titles';

describe('overlayTitles', () => {
  const translationService = {
    resolveLocale: jest.fn((lang?: string) => lang ?? 'en'),
    resolveMany: jest.fn(),
  } as unknown as TranslationService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns English titles without calling resolveMany', async () => {
    const result = await overlayTitles(
      translationService,
      'Mission',
      [{ id: 'm1', title: 'English title' }],
      'en',
    );
    expect(result).toEqual({ m1: 'English title' });
    expect(translationService.resolveMany).not.toHaveBeenCalled();
  });

  it('overlays translated titles for non-default locale', async () => {
    (translationService.resolveMany as jest.Mock).mockResolvedValue({
      m1: { title: 'Deutscher Titel' },
    });

    const result = await overlayTitles(
      translationService,
      'Mission',
      [{ id: 'm1', title: 'English title' }],
      'de',
    );

    expect(result).toEqual({ m1: 'Deutscher Titel' });
    expect(translationService.resolveMany).toHaveBeenCalled();
  });
});
