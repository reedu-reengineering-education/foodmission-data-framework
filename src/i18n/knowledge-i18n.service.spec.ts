import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { I18nJsonLoader, I18nModule } from 'nestjs-i18n';
import { join } from 'path';
import { DEFAULT_LOCALE } from './constants';
import { KnowledgeI18nService } from './knowledge-i18n.service';

describe('KnowledgeI18nService', () => {
  let service: KnowledgeI18nService;

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
      providers: [KnowledgeI18nService],
    }).compile();

    await module.init();
    service = module.get(KnowledgeI18nService);
  });

  describe('getKnowledgeCopy', () => {
    it('returns German title and description when lang=de', () => {
      const copy = service.getKnowledgeCopy(
        'nutrition-basics',
        {
          title: 'Nutrition Basics',
          description: 'A short quiz about basic nutrition facts and macros.',
        },
        'de',
      );

      expect(copy.title).toBe('Ernährungsgrundlagen');
      expect(copy.description).toBe(
        'Ein kurzes Quiz über grundlegende Ernährungsfakten und Makronährstoffe.',
      );
    });

    it('falls back to English DB copy when translation is missing', () => {
      const copy = service.getKnowledgeCopy(
        'nutrition-basics',
        {
          title: 'Nutrition Basics',
          description: 'A short quiz about basic nutrition facts and macros.',
        },
        'sl',
      );

      expect(copy.title).toBe('Nutrition Basics');
    });
  });

  describe('getKnowledgeQuizContent', () => {
    it('returns localized questions when lang=de', () => {
      const content = service.getKnowledgeQuizContent(
        'nutrition-basics',
        {
          questions: [
            {
              question:
                'Which macronutrient is the primary source of energy?',
              options: ['Vitamins', 'Carbohydrates', 'Water', 'Minerals'],
              correctAnswer: 'Carbohydrates',
            },
          ],
        },
        'de',
      );

      expect(content.questions[0].question).toBe(
        'Welcher Makronährstoff ist die primäre Energiequelle?',
      );
      expect(content.questions[0].options).toEqual([
        'Vitamine',
        'Kohlenhydrate',
        'Wasser',
        'Mineralstoffe',
      ]);
      expect(content.questions[0].correctAnswer).toBe('Kohlenhydrate');
      expect(content.questions[0].options).toContain(
        content.questions[0].correctAnswer,
      );
    });
  });

  describe('getKnowledgeCopyOrThrow', () => {
    it('returns English copy for a known slug', () => {
      const copy = service.getKnowledgeCopyOrThrow('nutrition-basics');

      expect(copy.title).toBe('Nutrition Basics');
    });

    it('throws when English copy is missing', () => {
      expect(() => service.getKnowledgeCopyOrThrow('unknown-quiz')).toThrow(
        BadRequestException,
      );
    });
  });
});
