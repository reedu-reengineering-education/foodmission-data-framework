import { CatalogService } from './catalog.service';

describe('CatalogService', () => {
  let service: CatalogService;

  beforeEach(() => {
    service = new CatalogService();
  });

  it('should expose meal taxonomy enums', () => {
    expect(service.getMealCategories()).toContain('MEAT');
    expect(service.getMealCourses()).toContain('MAIN');
    expect(service.getDietaryLabels()).toContain('GLUTEN_FREE');
  });
});
