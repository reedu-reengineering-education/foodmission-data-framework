import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ConsentsService } from './consents.service';
import { ConsentsRepository } from '../repositories/consents.repository';
import { TranslationService } from '../../translations/services/translation.service';

describe('ConsentsService', () => {
  let service: ConsentsService;
  let repository: jest.Mocked<ConsentsRepository>;
  let translationService: jest.Mocked<TranslationService>;

  const form = {
    id: 'form-1',
    key: 'privacy_notice',
    name: 'Privacy Notice',
    title: 'Privacy Notice',
    body: 'EN body',
    required: true,
    active: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsentsService,
        {
          provide: ConsentsRepository,
          useValue: {
            findAllActive: jest.fn(),
            findAll: jest.fn(),
            findByKey: jest.fn(),
            createForm: jest.fn(),
            updateForm: jest.fn(),
            findUserSettings: jest.fn(),
            updateUserSettings: jest.fn(),
          },
        },
        {
          provide: TranslationService,
          useValue: {
            resolveLocale: jest.fn((lang?: string) => lang ?? 'en'),
            resolveMany: jest.fn().mockResolvedValue({
              'form-1': { title: 'Privacy Notice', body: 'EN body' },
            }),
          },
        },
      ],
    }).compile();

    service = module.get(ConsentsService);
    repository = module.get(ConsentsRepository);
    translationService = module.get(TranslationService);
  });

  it('creates a form when key is free', async () => {
    repository.findByKey.mockResolvedValue(null);
    repository.createForm.mockResolvedValue(form as any);

    const result = await service.createForm({
      key: 'privacy_notice',
      name: 'Privacy Notice',
      title: 'Privacy Notice',
      body: 'EN body',
    });

    expect(result.key).toBe('privacy_notice');
    expect(result.title).toBe('Privacy Notice');
  });

  it('rejects duplicate form keys', async () => {
    repository.findByKey.mockResolvedValue(form as any);
    await expect(
      service.createForm({
        key: 'privacy_notice',
        name: 'Privacy Notice',
        title: 'Privacy Notice',
        body: 'EN body',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('accepts a form into user settings.consents', async () => {
    repository.findByKey.mockResolvedValue(form as any);
    repository.findUserSettings.mockResolvedValue({
      id: 'user-1',
      settings: { notificationsEnabled: true },
    } as any);
    repository.updateUserSettings.mockResolvedValue({
      id: 'user-1',
      settings: {},
    } as any);

    const result = await service.acceptConsent(
      'user-1',
      { formKey: 'privacy_notice' },
      'de',
    );

    expect(translationService.resolveLocale).toHaveBeenCalledWith('de');
    expect(repository.updateUserSettings).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        notificationsEnabled: true,
        consents: {
          privacy_notice: expect.objectContaining({ locale: 'de' }),
        },
      }),
    );
    expect(result).toMatchObject({
      formKey: 'privacy_notice',
      locale: 'de',
    });
  });

  it('derives acceptance status from settings.consents', async () => {
    repository.findAllActive.mockResolvedValue([form] as any);
    repository.findUserSettings.mockResolvedValue({
      id: 'user-1',
      settings: {
        consents: {
          privacy_notice: {
            acceptedAt: '2026-01-02T00:00:00.000Z',
            locale: 'en',
          },
        },
      },
    } as any);

    const status = await service.getUserConsentStatus('user-1');
    expect(status).toEqual([
      expect.objectContaining({
        formKey: 'privacy_notice',
        required: true,
        accepted: true,
        locale: 'en',
      }),
    ]);
  });

  it('throws when form key is missing', async () => {
    repository.findByKey.mockResolvedValue(null);
    await expect(service.getFormByKey('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
