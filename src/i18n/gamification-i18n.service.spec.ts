import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { I18nJsonLoader, I18nModule } from 'nestjs-i18n';
import { join } from 'path';
import { DEFAULT_LOCALE } from './constants';
import { GamificationI18nService } from './gamification-i18n.service';

describe('GamificationI18nService', () => {
  let service: GamificationI18nService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        I18nModule.forRoot({
          fallbackLanguage: DEFAULT_LOCALE,
          loader: I18nJsonLoader,
          loaderOptions: {
            path: join(__dirname),
          },
        }),
      ],
      providers: [GamificationI18nService],
    }).compile();

    await module.init();
    service = module.get(GamificationI18nService);
  });

  describe('getQuestCopy', () => {
    it('returns German translation when lang=de', () => {
      const copy = service.getQuestCopy(
        'avoid-single-use-plastic',
        {
          title: 'Avoid single-use plastic',
          description: 'Skip disposable plastic items in your daily routine',
        },
        'de',
      );

      expect(copy.title).toBe('Einwegplastik vermeiden');
      expect(copy.description).toBe(
        'Verzichten Sie im Alltag auf Wegwerfplastik',
      );
    });
  });

  describe('getQuestCopyOrThrow', () => {
    it('returns English copy for a known slug', () => {
      const copy = service.getQuestCopyOrThrow('avoid-single-use-plastic');

      expect(copy.title).toBe('Avoid single-use plastic');
    });

    it('throws when English copy is missing', () => {
      expect(() => service.getQuestCopyOrThrow('unknown-quest')).toThrow(
        BadRequestException,
      );
    });
  });

  describe('getMissionCopy', () => {
    it('returns German translation when lang=de', () => {
      const copy = service.getMissionCopy(
        'plastic-free-month',
        {
          title: 'Plastic-Free Month',
          description: 'Eliminate single-use plastics from your life for 30 days',
        },
        'de',
      );

      expect(copy.title).toBe('Plastikfreier Monat');
      expect(copy.description).toBe(
        'Verzichten Sie 30 Tage lang auf Einwegplastik',
      );
    });

    it('falls back to English DB copy when translation is missing', () => {
      const copy = service.getMissionCopy(
        'sustainable-home-makeover',
        {
          title: 'Sustainable Home Makeover',
          description: 'Replace 10 household items with eco-friendly alternatives',
        },
        'de',
      );

      expect(copy.title).toBe('Sustainable Home Makeover');
      expect(copy.description).toBe(
        'Replace 10 household items with eco-friendly alternatives',
      );
    });
  });

  describe('getChallengeCopy', () => {
    it('falls back to English DB copy when German translation is missing', () => {
      const copy = service.getChallengeCopy(
        'bring-your-own-bag',
        {
          title: 'Bring Your Own Bag',
          description: 'Use a reusable shopping bag for your groceries today',
        },
        'de',
      );

      expect(copy.title).toBe('Bring Your Own Bag');
      expect(copy.description).toBe(
        'Use a reusable shopping bag for your groceries today',
      );
    });
  });

  describe('getMissionCopyOrThrow', () => {
    it('returns English copy for a known slug', () => {
      const copy = service.getMissionCopyOrThrow('plastic-free-month');

      expect(copy.title).toBe('Plastic-Free Month');
      expect(copy.description).toBe(
        'Eliminate single-use plastics from your life for 30 days',
      );
    });

    it('throws when English copy is missing', () => {
      expect(() => service.getMissionCopyOrThrow('unknown-mission')).toThrow(
        BadRequestException,
      );
    });
  });

  describe('getChallengeCopyOrThrow', () => {
    it('returns English copy for a known slug', () => {
      const copy = service.getChallengeCopyOrThrow('bring-your-own-bag');

      expect(copy.title).toBe('Bring Your Own Bag');
      expect(copy.description).toBe(
        'Use a reusable shopping bag for your groceries today',
      );
    });

    it('throws when English copy is missing', () => {
      expect(() => service.getChallengeCopyOrThrow('unknown-challenge')).toThrow(
        BadRequestException,
      );
    });
  });
});
