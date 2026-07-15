import { BadRequestException, Injectable } from '@nestjs/common';
import { I18nContext, I18nService } from 'nestjs-i18n';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from './constants';

export type KnowledgeCopy = {
  title: string;
  description: string;
};

export type KnowledgeQuizQuestion = {
  question: string;
  options: string[];
  correctAnswer: string;
};

export type KnowledgeQuizContent = {
  questions: KnowledgeQuizQuestion[];
};

@Injectable()
export class KnowledgeI18nService {
  constructor(private readonly i18n: I18nService) {}

  resolveLanguage(langOverride?: string): string {
    const candidate = (
      langOverride ??
      I18nContext.current()?.lang ??
      DEFAULT_LOCALE
    )
      .trim()
      .toLowerCase();

    if ((SUPPORTED_LOCALES as readonly string[]).includes(candidate)) {
      return candidate;
    }

    return DEFAULT_LOCALE;
  }

  getKnowledgeCopy(
    slug: string,
    fallbacks: KnowledgeCopy,
    langOverride?: string,
  ): KnowledgeCopy {
    return {
      title: this.translateField(
        `items.${slug}.title`,
        fallbacks.title,
        langOverride,
      ),
      description: this.translateField(
        `items.${slug}.description`,
        fallbacks.description ?? '',
        langOverride,
      ),
    };
  }

  getKnowledgeQuizContent(
    slug: string,
    fallbackContent: KnowledgeQuizContent,
    langOverride?: string,
  ): KnowledgeQuizContent {
    return {
      questions: fallbackContent.questions.map((question, questionIndex) => ({
        question: this.translateField(
          `items.${slug}.questions.${questionIndex}.question`,
          question.question,
          langOverride,
        ),
        options: question.options.map((option, optionIndex) =>
          this.translateField(
            `items.${slug}.questions.${questionIndex}.options.${optionIndex}`,
            option,
            langOverride,
          ),
        ),
        correctAnswer: this.translateField(
          `items.${slug}.questions.${questionIndex}.correctAnswer`,
          question.correctAnswer,
          langOverride,
        ),
      })),
    };
  }

  getKnowledgeCopyOrThrow(slug: string): KnowledgeCopy {
    const copy = this.getKnowledgeCopy(slug, { title: '', description: '' }, 'en');

    if (!copy.title.trim()) {
      throw new BadRequestException(
        `Missing English knowledge copy for slug "${slug}". Add knowledge.items.${slug} to src/i18n/en/knowledge.json.`,
      );
    }

    const firstQuestion = this.translateField(
      `items.${slug}.questions.0.question`,
      '',
      'en',
    );

    if (!firstQuestion.trim()) {
      throw new BadRequestException(
        `Missing English knowledge quiz content for slug "${slug}". Add knowledge.items.${slug}.questions to src/i18n/en/knowledge.json.`,
      );
    }

    return copy;
  }

  private translateField(
    path: string,
    fallback: string,
    langOverride?: string,
  ): string {
    const translated = this.i18n.translate(`knowledge.${path}`, {
      lang: this.resolveLanguage(langOverride),
      defaultValue: fallback,
    });

    return typeof translated === 'string' ? translated : fallback;
  }
}
