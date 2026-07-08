import { CatalogService } from './catalog.service';
import { I18nContext, I18nService } from 'nestjs-i18n';
import { DEFAULT_LOCALE } from '../../i18n/constants';

describe('CatalogService', () => {
  let service: CatalogService;
  let i18n: { translate: jest.Mock };

  beforeEach(() => {
    i18n = {
      translate: jest.fn((_: string, opts?: { defaultValue?: string }) => {
        return opts?.defaultValue ?? '';
      }),
    };
    service = new CatalogService(i18n as unknown as I18nService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('lists genders from Prisma enum', () => {
    const res = service.listGenders();
    const codes = res.data.map((x) => x.code);
    expect(codes).toContain('MALE');
    expect(codes).toContain('FEMALE');
  });

  it('startup bundles small lists', () => {
    const res = service.startup();
    expect(res.data.genders).toBeDefined();
    expect(res.data.activityLevels).toBeDefined();
  });

  it('paginates countries and supports search', () => {
    const page1 = service.listCountries({ page: 1, limit: 10 });
    expect(page1.data.length).toBeLessThanOrEqual(10);
    expect(page1.total).toBeGreaterThan(10);
    expect(page1.totalPages).toBeGreaterThan(1);

    const nl = service.listCountries({ page: 1, limit: 10, search: 'NL' });
    expect(nl.data.some((c) => c.code === 'NL')).toBe(true);
  });

  it('paginates countries consistently across pages', () => {
    const page1 = service.listCountries({ page: 1, limit: 10 });
    const page2 = service.listCountries({ page: 2, limit: 10 });
    expect(page1.data.map((c) => c.code)).not.toEqual(
      page2.data.map((c) => c.code),
    );
  });

  it('supports case-insensitive country search by code', () => {
    const nl = service.listCountries({ page: 1, limit: 10, search: 'nl' });
    expect(nl.data.some((c) => c.code === 'NL')).toBe(true);
  });

  it('supports canonical country search when labels are localized', () => {
    const res = service.listCountries({
      page: 1,
      limit: 20,
      search: 'germany',
      lang: 'de',
    });

    expect(res.data.some((c) => c.code === 'DE')).toBe(true);
  });

  it('filters regions by countryCode and paginates', () => {
    const nl = service.listRegions({ page: 1, limit: 10, countryCode: 'NL' });
    expect(nl.data.length).toBeGreaterThan(0);
    expect(nl.data.length).toBeLessThanOrEqual(10);
    for (const r of nl.data) {
      expect(r.meta?.countryCode).toBe('NL');
      expect(r.code.startsWith('NL-')).toBe(true);
    }
  });

  it('allows regions search without countryCode (paginated)', () => {
    const res = service.listRegions({ page: 1, limit: 10, search: 'york' });
    expect(res.data.length).toBeGreaterThan(0);
    expect(res.data.length).toBeLessThanOrEqual(10);
  });

  it('lists regions without filters (paginated)', () => {
    const res = service.listRegions({ page: 1, limit: 10 });
    expect(res.data.length).toBeGreaterThan(0);
    expect(res.data.length).toBeLessThanOrEqual(10);
    expect(res.total).toBeGreaterThan(10);
  });

  it('paginates languages and supports search', () => {
    const page1 = service.listLanguages({ page: 1, limit: 10 });
    expect(page1.data.length).toBeLessThanOrEqual(10);
    expect(page1.total).toBeGreaterThan(10);

    const eng = service.listLanguages({ page: 1, limit: 10, search: 'eng' });
    expect(eng.data.some((l) => l.label.toLowerCase().includes('eng'))).toBe(
      true,
    );
  });

  it('paginates languages consistently across pages', () => {
    const page1 = service.listLanguages({ page: 1, limit: 10 });
    const page2 = service.listLanguages({ page: 2, limit: 10 });
    expect(page1.data.map((l) => l.code)).not.toEqual(
      page2.data.map((l) => l.code),
    );
  });

  it('supports canonical language search when labels are localized', () => {
    const res = service.listLanguages({
      page: 1,
      limit: 20,
      search: 'german',
      lang: 'de',
    });

    expect(res.data.some((l) => l.code === 'de')).toBe(true);
  });

  it('lists dietary preferences from Prisma enum', () => {
    const res = service.listDietaryPreferences();
    const codes = res.data.map((x) => x.code);
    expect(codes).toContain('VEGAN');
    expect(codes).toContain('VEGETARIAN');
  });

  it('lists meal categories from Prisma enum', () => {
    const res = service.listMealCategories();
    const codes = res.data.map((x) => x.code);
    expect(codes).toContain('ANIMAL_PROTEIN');
    expect(codes).toContain('VEGGIES_FRUIT');
  });

  it('lists meal courses from Prisma enum', () => {
    const res = service.listMealCourses();
    const codes = res.data.map((x) => x.code);
    expect(codes).toContain('MAIN_DISH');
    expect(codes).toContain('SIDE_SNACK');
  });

  it('uses default locale when current i18n context has no language', () => {
    service.listGenders();

    expect(i18n.translate).toHaveBeenCalledWith(
      'catalog.genders.MALE',
      expect.objectContaining({
        lang: DEFAULT_LOCALE,
      }),
    );
  });

  it('uses locale from i18n context when available', () => {
    jest.spyOn(I18nContext, 'current').mockReturnValue({
      lang: 'de',
    } as unknown as I18nContext);

    service.listGenders();

    expect(i18n.translate).toHaveBeenCalledWith(
      'catalog.genders.MALE',
      expect.objectContaining({
        lang: 'de',
      }),
    );
  });

  it('returns translated label when i18n resolves localized value', () => {
    jest.spyOn(I18nContext, 'current').mockReturnValue({
      lang: 'de',
    } as unknown as I18nContext);

    i18n.translate.mockImplementation(
      (key: string, opts?: { defaultValue?: string; lang?: string }) => {
        if (key === 'catalog.genders.MALE' && opts?.lang === 'de') {
          return 'Mann';
        }

        return opts?.defaultValue ?? '';
      },
    );

    const res = service.listGenders();
    expect(res.data.find((x) => x.code === 'MALE')?.label).toBe('Mann');
  });

  it('falls back to default label when i18n returns non-string value', () => {
    i18n.translate.mockReturnValue({ unexpected: true });

    const res = service.listShoppingResponsibilities();
    expect(res.data.find((x) => x.code === 'MOSTLY_ME')?.label).toBe(
      'Mostly me',
    );
  });

  it('uses explicit lang override for region translations', () => {
    i18n.translate.mockImplementation(
      (_key: string, opts?: { defaultValue?: string; lang?: string }) => {
        return opts?.defaultValue ?? '';
      },
    );

    service.listRegions({ page: 1, limit: 5, countryCode: 'DE', lang: 'de' });

    expect(i18n.translate).toHaveBeenCalledWith(
      expect.stringMatching(/^catalog\.regions\./),
      expect.objectContaining({ lang: 'de' }),
    );
  });

  it('returns localized region label when translation key resolves', () => {
    i18n.translate.mockImplementation(
      (key: string, opts?: { defaultValue?: string; lang?: string }) => {
        if (key === 'catalog.regions.US-CA' && opts?.lang === 'de') {
          return 'Kalifornien';
        }

        return opts?.defaultValue ?? '';
      },
    );

    const res = service.listRegions({
      page: 1,
      limit: 80,
      countryCode: 'US',
      search: 'california',
      lang: 'de',
    });

    expect(
      res.data.some((r) => r.code === 'US-CA' && r.label === 'Kalifornien'),
    ).toBe(true);
  });

  it('supports canonical region search when labels are localized', () => {
    i18n.translate.mockImplementation(
      (key: string, opts?: { defaultValue?: string; lang?: string }) => {
        if (key === 'catalog.regions.US-CA' && opts?.lang === 'de') {
          return 'Kalifornien';
        }

        return opts?.defaultValue ?? '';
      },
    );

    const res = service.listRegions({
      page: 1,
      limit: 80,
      countryCode: 'US',
      search: 'california',
      lang: 'de',
    });

    expect(res.data.some((r) => r.code === 'US-CA')).toBe(true);
  });
});
