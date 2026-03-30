import { Injectable, Logger } from '@nestjs/common';
import { FoodShelfLife } from '@prisma/client';
import { FoodShelfLifeRepository } from '../repositories/food-shelf-life.repository';

export type StorageType = 'pantry' | 'refrigerator' | 'freezer';

export interface ExpiryCalculationResult {
  expiryDate: Date | null;
  source: 'manual' | 'auto_foodkeeper' | 'none';
  shelfLifeDays: number | null;
  storageType: StorageType | null;
}

@Injectable()
export class ShelfLifeService {
  private readonly logger = new Logger(ShelfLifeService.name);

  constructor(private readonly shelfLifeRepository: FoodShelfLifeRepository) {}

  /**
   * Calculate expiry date for a food item based on FoodKeeper data.
   * Storage type is inferred from the food's category.
   */
  async calculateExpiryDate(
    foodName: string,
    purchaseDate: Date = new Date(),
  ): Promise<ExpiryCalculationResult> {
    const shelfLife = await this.shelfLifeRepository.findBestMatch(foodName);

    if (!shelfLife) {
      this.logger.debug(`No shelf life data found for: ${foodName}`);
      return {
        expiryDate: null,
        source: 'none',
        shelfLifeDays: null,
        storageType: null,
      };
    }

    const storageType = this.inferStorageType(shelfLife);
    const days = this.getDaysForStorageType(shelfLife, storageType);

    if (days === null) {
      this.logger.debug(
        `No shelf life days for ${foodName} with storage type ${storageType}`,
      );
      return {
        expiryDate: null,
        source: 'none',
        shelfLifeDays: null,
        storageType,
      };
    }

    const expiryDate = new Date(purchaseDate);
    expiryDate.setDate(expiryDate.getDate() + days);

    this.logger.debug(
      `Calculated expiry for ${foodName}: ${days} days (${storageType}) -> ${expiryDate.toISOString()}`,
    );

    return {
      expiryDate,
      source: 'auto_foodkeeper',
      shelfLifeDays: days,
      storageType,
    };
  }

  /**
   * Infer storage type from FoodKeeper category.
   */
  inferStorageType(shelfLife: FoodShelfLife): StorageType {
    // Use the defaultStorageType from the data if available
    if (shelfLife.defaultStorageType) {
      const storageType = shelfLife.defaultStorageType.toLowerCase();
      if (
        storageType === 'pantry' ||
        storageType === 'refrigerator' ||
        storageType === 'freezer'
      ) {
        return storageType;
      }
    }

    // Fallback: category-based inference
    const category = shelfLife.categoryName?.toLowerCase() ?? '';

    // Refrigerator categories
    if (
      category.includes('dairy') ||
      category.includes('egg') ||
      category.includes('meat') ||
      category.includes('poultry') ||
      category.includes('seafood') ||
      category.includes('deli') ||
      category.includes('prepared')
    ) {
      return 'refrigerator';
    }

    // Freezer categories
    if (category.includes('frozen')) {
      return 'freezer';
    }

    // Pantry by default
    return 'pantry';
  }

  /**
   * Get shelf life days for a specific storage type.
   * Prefers maxDays over minDays for a conservative estimate.
   */
  getDaysForStorageType(
    shelfLife: FoodShelfLife,
    storageType: StorageType,
  ): number | null {
    switch (storageType) {
      case 'pantry':
        return shelfLife.pantryMaxDays ?? shelfLife.pantryMinDays ?? null;
      case 'refrigerator':
        return (
          shelfLife.refrigeratorMaxDays ?? shelfLife.refrigeratorMinDays ?? null
        );
      case 'freezer':
        return shelfLife.freezerMaxDays ?? shelfLife.freezerMinDays ?? null;
      default:
        return null;
    }
  }

  /**
   * Search for shelf life data by food name.
   */
  async searchByFoodName(foodName: string): Promise<FoodShelfLife | null> {
    return this.shelfLifeRepository.findBestMatch(foodName);
  }

  /**
   * Get all shelf life records with pagination.
   */
  async findAll(options?: {
    skip?: number;
    take?: number;
    categoryName?: string;
  }): Promise<{ data: FoodShelfLife[]; total: number }> {
    const where = options?.categoryName
      ? {
          categoryName: {
            equals: options.categoryName,
            mode: 'insensitive' as const,
          },
        }
      : undefined;

    const [data, total] = await Promise.all([
      this.shelfLifeRepository.findAll({
        skip: options?.skip,
        take: options?.take,
        where,
      }),
      this.shelfLifeRepository.count(where),
    ]);

    return { data, total };
  }
}
