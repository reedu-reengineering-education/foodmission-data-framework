import { BadRequestException, Injectable } from '@nestjs/common';
import { I18nContext, I18nService } from 'nestjs-i18n';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from './constants';

export type GamificationCopy = {
  title: string;
  description: string;
};

@Injectable()
export class GamificationI18nService {
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

  getMissionCopy(
    slug: string,
    fallbacks: GamificationCopy,
    langOverride?: string,
  ): GamificationCopy {
    return {
      title: this.translateField(
        `missions.${slug}.title`,
        fallbacks.title,
        langOverride,
      ),
      description: this.translateField(
        `missions.${slug}.description`,
        fallbacks.description,
        langOverride,
      ),
    };
  }

  getChallengeCopy(
    slug: string,
    fallbacks: GamificationCopy,
    langOverride?: string,
  ): GamificationCopy {
    return {
      title: this.translateField(
        `challenges.${slug}.title`,
        fallbacks.title,
        langOverride,
      ),
      description: this.translateField(
        `challenges.${slug}.description`,
        fallbacks.description,
        langOverride,
      ),
    };
  }

  getQuestCopy(
    slug: string,
    fallbacks: GamificationCopy,
    langOverride?: string,
  ): GamificationCopy {
    return {
      title: this.translateField(
        `quests.${slug}.title`,
        fallbacks.title,
        langOverride,
      ),
      description: this.translateField(
        `quests.${slug}.description`,
        fallbacks.description,
        langOverride,
      ),
    };
  }

  getMissionCopyOrThrow(slug: string): GamificationCopy {
    const copy = this.getMissionCopy(slug, { title: '', description: '' }, 'en');

    if (!copy.title.trim() || !copy.description.trim()) {
      throw new BadRequestException(
        `Missing English gamification copy for mission slug "${slug}". Add gamification.missions.${slug} to src/i18n/en/gamification.json.`,
      );
    }

    return copy;
  }

  getChallengeCopyOrThrow(slug: string): GamificationCopy {
    const copy = this.getChallengeCopy(
      slug,
      { title: '', description: '' },
      'en',
    );

    if (!copy.title.trim() || !copy.description.trim()) {
      throw new BadRequestException(
        `Missing English gamification copy for challenge slug "${slug}". Add gamification.challenges.${slug} to src/i18n/en/gamification.json.`,
      );
    }

    return copy;
  }

  getQuestCopyOrThrow(slug: string): GamificationCopy {
    const copy = this.getQuestCopy(slug, { title: '', description: '' }, 'en');

    if (!copy.title.trim() || !copy.description.trim()) {
      throw new BadRequestException(
        `Missing English gamification copy for quest slug "${slug}". Add gamification.quests.${slug} to src/i18n/en/gamification.json.`,
      );
    }

    return copy;
  }

  private translateField(
    path: string,
    fallback: string,
    langOverride?: string,
  ): string {
    const translated = this.i18n.translate(`gamification.${path}`, {
      lang: this.resolveLanguage(langOverride),
      defaultValue: fallback,
    });

    return typeof translated === 'string' ? translated : fallback;
  }
}
