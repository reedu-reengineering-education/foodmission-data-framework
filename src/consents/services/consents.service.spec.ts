import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConsentsService } from './consents.service';
import { ConsentsRepository } from '../repositories/consents.repository';
import { TranslationService } from '../../translations/services/translation.service';

describe('ConsentsService', () => {
  let service: ConsentsService;
  let repository: jest.Mocked<ConsentsRepository>;

  const form = {
    id: 'form-1',
    key: 'privacy_notice',
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
            findByKey: jest.fn(),
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
  });

  it('lists active forms with translations', async () => {
    repository.findAllActive.mockResolvedValue([form] as any);
    const result = await service.listForms('de');
    expect(result).toEqual([
      expect.objectContaining({
        key: 'privacy_notice',
        title: 'Privacy Notice',
      }),
    ]);
  });

  it('throws when form key is missing', async () => {
    repository.findByKey.mockResolvedValue(null);
    await expect(service.getFormByKey('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('derives acceptance status from settings.consents', async () => {
    repository.findAllActive.mockResolvedValue([form] as any);
    const status = await service.getUserConsentStatus({
      consents: {
        privacy_notice: {
          acceptedAt: '2026-01-02T00:00:00.000Z',
          locale: 'en',
        },
      },
    });
    expect(status).toEqual([
      expect.objectContaining({
        formKey: 'privacy_notice',
        required: true,
        accepted: true,
        locale: 'en',
      }),
    ]);
  });

  it('normalizes consents input and rejects unknown keys', async () => {
    repository.findAllActive.mockResolvedValue([form] as any);

    const normalized = await service.normalizeConsentsInput(
      { privacy_notice: { locale: 'de' } },
      {},
      'en',
    );
    expect(normalized.privacy_notice).toMatchObject({ locale: 'de' });
    expect(normalized.privacy_notice.acceptedAt).toBeTruthy();

    await expect(
      service.normalizeConsentsInput({ unknown_form: true }, {}, 'en'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('preserves acceptedAt and revokes with null', async () => {
    repository.findAllActive.mockResolvedValue([form] as any);
    const existing = {
      consents: {
        privacy_notice: {
          acceptedAt: '2026-01-01T00:00:00.000Z',
          locale: 'en',
        },
      },
    };

    const kept = await service.normalizeConsentsInput(
      { privacy_notice: true },
      existing,
      'de',
    );
    expect(kept.privacy_notice.acceptedAt).toBe('2026-01-01T00:00:00.000Z');

    const revoked = await service.normalizeConsentsInput(
      { privacy_notice: null },
      existing,
      'en',
    );
    expect(revoked).toEqual({});
  });
});
