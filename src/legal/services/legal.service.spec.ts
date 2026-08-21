import { Test, TestingModule } from '@nestjs/testing';
import { LegalDocType } from '@prisma/client';
import { LegalService } from './legal.service';
import { LegalRepository } from '../repositories/legal.repository';
import { SUPPORTED_LOCALES } from '../../i18n/constants';

describe('LegalService', () => {
  let service: LegalService;

  const mockLegalRepository = {
    findUserConsentsByDocTypes: jest.fn().mockResolvedValue([]),
    findLatestConsentsByDocTypes: jest.fn().mockResolvedValue(new Map()),
    acceptDocument: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LegalService,
        {
          provide: LegalRepository,
          useValue: mockLegalRepository,
        },
      ],
    }).compile();

    service = module.get<LegalService>(LegalService);
    await service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('loads required documents (Terms and Privacy) for all supported locales', async () => {
    for (const locale of SUPPORTED_LOCALES) {
      const required = await service.getRequiredDocuments(locale);
      expect(required).toHaveLength(2);

      const terms = required.find((d) => d.docType === LegalDocType.TERMS_OF_SERVICE);
      const privacy = required.find((d) => d.docType === LegalDocType.PRIVACY_POLICY);

      expect(terms).toBeDefined();
      expect(terms?.locale).toBe(locale);
      expect(terms?.content.length).toBeGreaterThan(100);

      expect(privacy).toBeDefined();
      expect(privacy?.locale).toBe(locale);
      expect(privacy?.content.length).toBeGreaterThan(100);
    }
  });

  it('returns localized Terms of Service for each supported locale', async () => {
    for (const locale of SUPPORTED_LOCALES) {
      const doc = await service.getLatestDocument(LegalDocType.TERMS_OF_SERVICE, locale);
      expect(doc).toBeDefined();
      expect(doc.locale).toBe(locale);
      expect(doc.version).toBe('1.0');
      expect(doc.content).toContain('1.');
    }
  });

  it('returns localized Privacy Policy for each supported locale', async () => {
    for (const locale of SUPPORTED_LOCALES) {
      const doc = await service.getLatestDocument(LegalDocType.PRIVACY_POLICY, locale);
      expect(doc).toBeDefined();
      expect(doc.locale).toBe(locale);
      expect(doc.version).toBe('1.0');
      expect(doc.content).toContain('1.');
    }
  });

  describe('getConsentStatus', () => {
    it('recognizes acceptance of version 1.0 in German when querying with English locale', async () => {
      mockLegalRepository.findUserConsentsByDocTypes.mockResolvedValueOnce([
        {
          userId: 'user-1',
          docType: LegalDocType.TERMS_OF_SERVICE,
          version: '1.0',
          locale: 'de',
          acceptedAt: new Date('2026-08-20'),
        },
        {
          userId: 'user-1',
          docType: LegalDocType.PRIVACY_POLICY,
          version: '1.0',
          locale: 'de',
          acceptedAt: new Date('2026-08-20'),
        },
      ]);
      mockLegalRepository.findLatestConsentsByDocTypes.mockResolvedValueOnce(
        new Map([
          [
            LegalDocType.TERMS_OF_SERVICE,
            {
              userId: 'user-1',
              docType: LegalDocType.TERMS_OF_SERVICE,
              version: '1.0',
              locale: 'de',
              acceptedAt: new Date('2026-08-20'),
            },
          ],
          [
            LegalDocType.PRIVACY_POLICY,
            {
              userId: 'user-1',
              docType: LegalDocType.PRIVACY_POLICY,
              version: '1.0',
              locale: 'de',
              acceptedAt: new Date('2026-08-20'),
            },
          ],
        ]),
      );

      const status = await service.getConsentStatus('user-1', 'en');
      expect(status.mustAccept).toBe(false);
      expect(status.documents.every((d) => d.accepted)).toBe(true);
    });

    it('requires acceptance if user only accepted an older version', async () => {
      mockLegalRepository.findUserConsentsByDocTypes.mockResolvedValueOnce([
        {
          userId: 'user-1',
          docType: LegalDocType.TERMS_OF_SERVICE,
          version: '0.9',
          locale: 'en',
          acceptedAt: new Date('2026-01-01'),
        },
      ]);
      mockLegalRepository.findLatestConsentsByDocTypes.mockResolvedValueOnce(
        new Map([
          [
            LegalDocType.TERMS_OF_SERVICE,
            {
              userId: 'user-1',
              docType: LegalDocType.TERMS_OF_SERVICE,
              version: '0.9',
              locale: 'en',
              acceptedAt: new Date('2026-01-01'),
            },
          ],
        ]),
      );

      const status = await service.getConsentStatus('user-1', 'en');
      expect(status.mustAccept).toBe(true);
    });
  });
});
