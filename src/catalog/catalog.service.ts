import { Injectable } from '@nestjs/common';
import { DietaryLabel, MealCategory, MealCourse } from '@prisma/client';

@Injectable()
export class CatalogService {
  private enumValues<T extends Record<string, string>>(enumObj: T): string[] {
    return Object.values(enumObj);
  }

  getMealCategories(): string[] {
    return this.enumValues(MealCategory);
  }

  getMealCourses(): string[] {
    return this.enumValues(MealCourse);
  }

  getDietaryPreferences(): string[] {
    return this.enumValues(DietaryLabel);
  }
}
