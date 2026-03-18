import { CatalogService } from './catalog.service';

describe('CatalogService', () => {
  let service: CatalogService;

  beforeEach(() => {
    service = new CatalogService();
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

  it('requires countryCode or search for regions', () => {
    expect(() => service.listRegions({ page: 1, limit: 10 })).toThrow(
      /countryCode or search/i,
    );
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

  it('provides dietary preferences phase 1 mapped to recipe tags', () => {
    const res = service.listDietaryPreferencesPhase1();
    const vegan = res.data.find((x) => x.code === 'VEGAN');
    expect(vegan?.meta?.recipeFilter?.includeTags).toEqual(['vegan']);
  });
});
