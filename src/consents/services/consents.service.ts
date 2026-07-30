import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConsentsRepository } from '../repositories/consents.repository';
import { TranslationService } from '../../translations/services/translation.service';
import { DEFAULT_LOCALE } from '../../i18n/constants';
import {
  AcceptConsentDto,
  ConsentFormDto,
  CreateConsentFormDto,
  StoredUserConsent,
  UpdateConsentFormDto,
  UserConsentDto,
  UserConsentStatusDto,
} from '../dto/consent.dto';

type ConsentFormRow = Awaited<ReturnType<ConsentsRepository['findByKey']>>;

function readConsentsMap(
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

  async listForms(
    lang?: string,
    options: { includeInactive?: boolean } = {},
  ): Promise<ConsentFormDto[]> {
    const forms = options.includeInactive
      ? await this.consentsRepository.findAll()
      : await this.consentsRepository.findAllActive();
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

  async createForm(data: CreateConsentFormDto): Promise<ConsentFormDto> {
    const existing = await this.consentsRepository.findByKey(data.key);
    if (existing) {
      throw new ConflictException(
        `Consent form with key "${data.key}" already exists`,
      );
    }

    const form = await this.consentsRepository.createForm(data);
    const [dto] = await this.mapForms([form], DEFAULT_LOCALE);
    return dto;
  }

  async updateForm(
    key: string,
    data: UpdateConsentFormDto,
  ): Promise<ConsentFormDto> {
    const form = await this.requireForm(key);
    if (
      data.name === undefined &&
      data.required === undefined &&
      data.active === undefined &&
      data.title === undefined &&
      data.body === undefined
    ) {
      throw new BadRequestException('No fields to update');
    }

    const updated = await this.consentsRepository.updateForm(form.id, data);
    const [dto] = await this.mapForms([updated], DEFAULT_LOCALE);
    return dto;
  }

  async acceptConsent(
    userId: string,
    data: AcceptConsentDto,
    lang?: string,
  ): Promise<UserConsentDto> {
    const form = await this.consentsRepository.findByKey(data.formKey);
    if (!form || !form.active) {
      throw new NotFoundException(`Consent form "${data.formKey}" not found`);
    }

    const user = await this.consentsRepository.findUserSettings(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const locale = this.translationService.resolveLocale(lang);
    const acceptedAt = new Date().toISOString();
    const settings =
      user.settings &&
      typeof user.settings === 'object' &&
      !Array.isArray(user.settings)
        ? { ...(user.settings as Record<string, unknown>) }
        : {};
    const consents = readConsentsMap(settings);
    consents[data.formKey] = { acceptedAt, locale };
    settings.consents = consents;

    await this.consentsRepository.updateUserSettings(userId, settings);

    return { formKey: data.formKey, locale, acceptedAt };
  }

  async getUserConsentStatus(userId: string): Promise<UserConsentStatusDto[]> {
    const [forms, user] = await Promise.all([
      this.consentsRepository.findAllActive(),
      this.consentsRepository.findUserSettings(userId),
    ]);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const consents = readConsentsMap(user.settings);
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

  private async requireForm(key: string) {
    const form = await this.consentsRepository.findByKey(key);
    if (!form) {
      throw new NotFoundException(`Consent form "${key}" not found`);
    }
    return form;
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
        name: form.name,
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
