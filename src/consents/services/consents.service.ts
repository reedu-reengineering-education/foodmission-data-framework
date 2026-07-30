import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConsentsRepository } from '../repositories/consents.repository';
import { TranslationService } from '../../translations/services/translation.service';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '../../i18n/constants';
import {
  ConsentFormDto,
  StoredUserConsent,
  UserConsentStatusDto,
} from '../dto/consent.dto';

type ConsentFormRow = Awaited<ReturnType<ConsentsRepository['findByKey']>>;

export function readConsentsMap(
  settings: unknown,
): Record<string, StoredUserConsent> {
  const root =
    settings && typeof settings === 'object' && !Array.isArray(settings)
      ? (settings as Record<string, unknown>)
      : {};
  const consents = root.consents;
  if (!consents || typeof consents !== 'object' || Array.isArray(consents)) {
    return {};
  }

  const out: Record<string, StoredUserConsent> = {};
  for (const [key, value] of Object.entries(consents)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    const entry = value as Record<string, unknown>;
    if (typeof entry.acceptedAt !== 'string') continue;
    out[key] = {
      acceptedAt: entry.acceptedAt,
      locale: typeof entry.locale === 'string' ? entry.locale : DEFAULT_LOCALE,
    };
  }
  return out;
}

@Injectable()
export class ConsentsService {
  constructor(
    private readonly consentsRepository: ConsentsRepository,
    private readonly translationService: TranslationService,
  ) {}

  async listForms(lang?: string): Promise<ConsentFormDto[]> {
    const forms = await this.consentsRepository.findAllActive();
    return this.mapForms(forms, lang);
  }

  async getFormByKey(key: string, lang?: string): Promise<ConsentFormDto> {
    const form = await this.consentsRepository.findByKey(key);
    if (!form || !form.active) {
      throw new NotFoundException(`Consent form "${key}" not found`);
    }
    const [dto] = await this.mapForms([form], lang);
    return dto;
  }

  async getUserConsentStatus(
    settings: unknown,
  ): Promise<UserConsentStatusDto[]> {
    const forms = await this.consentsRepository.findAllActive();
    const consents = readConsentsMap(settings);
    return forms.map((form) => {
      const accepted = consents[form.key];
      return {
        formKey: form.key,
        required: form.required,
        accepted: !!accepted,
        acceptedAt: accepted?.acceptedAt,
        locale: accepted?.locale,
      };
    });
  }

  /**
   * Validate and normalize a client-supplied settings.consents map.
   * - Keys must be active consent forms
   * - `null` removes an acceptance
   * - Existing acceptedAt is preserved when the key remains
   * - New acceptances get server-side acceptedAt
   */
  async normalizeConsentsInput(
    input: unknown,
    existingSettings: unknown,
    localeFallback?: string | null,
  ): Promise<Record<string, StoredUserConsent>> {
    if (input === undefined) {
      return readConsentsMap(existingSettings);
    }
    if (input === null || typeof input !== 'object' || Array.isArray(input)) {
      throw new BadRequestException(
        'settings.consents must be an object keyed by form key',
      );
    }

    const forms = await this.consentsRepository.findAllActive();
    const activeKeys = new Set(forms.map((f) => f.key));
    const existing = readConsentsMap(existingSettings);
    const localeDefault = this.translationService.resolveLocale(
      localeFallback ?? undefined,
    );
    const now = new Date().toISOString();
    const out: Record<string, StoredUserConsent> = {};

    for (const [formKey, value] of Object.entries(
      input as Record<string, unknown>,
    )) {
      if (value === null) {
        continue; // explicit revoke
      }
      if (!activeKeys.has(formKey)) {
        throw new BadRequestException(
          `Unknown or inactive consent form "${formKey}"`,
        );
      }

      let locale = existing[formKey]?.locale ?? localeDefault;
      if (value === true) {
        // keep locale as above
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        const entry = value as Record<string, unknown>;
        if (typeof entry.locale === 'string') {
          if (
            !(SUPPORTED_LOCALES as readonly string[]).includes(entry.locale)
          ) {
            throw new BadRequestException(
              `Invalid locale "${entry.locale}" for consent "${formKey}"`,
            );
          }
          locale = entry.locale;
        }
      } else {
        throw new BadRequestException(
          `settings.consents.${formKey} must be true, null, or { locale? }`,
        );
      }

      out[formKey] = {
        acceptedAt: existing[formKey]?.acceptedAt ?? now,
        locale,
      };
    }

    return out;
  }

  private async mapForms(
    forms: NonNullable<ConsentFormRow>[],
    lang?: string,
  ): Promise<ConsentFormDto[]> {
    const locale = this.translationService.resolveLocale(lang);
    const translated = await this.translationService.resolveMany(
      'ConsentForm',
      forms.map((f) => f.id),
      locale,
      ['title', 'body'],
      Object.fromEntries(
        forms.map((f) => [f.id, { title: f.title, body: f.body }]),
      ),
    );

    return forms.map((form) => {
      const fields = translated[form.id] ?? {};
      return {
        id: form.id,
        key: form.key,
        title: fields.title ?? form.title,
        body: fields.body ?? form.body,
        required: form.required,
        active: form.active,
        createdAt: form.createdAt,
        updatedAt: form.updatedAt,
      };
    });
  }
}
