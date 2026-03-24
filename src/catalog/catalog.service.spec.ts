import { CatalogService } from './catalog.service';

describe('CatalogService', () => {
  let service: CatalogService;

  beforeEach(() => {
    service = new CatalogService();
  });

  it('should expose meal taxonomy enums', () => {
    expect(service.getMealCategories()).toContain('ANIMAL_PROTEIN');
    expect(service.getMealCourses()).toContain('MAIN_DISH');
    expect(service.getDietaryPreferences()).toContain('VEGAN');
  });
});
