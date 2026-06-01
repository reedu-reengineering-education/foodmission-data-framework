import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { FoodShelfLife } from '@prisma/client';
import { ShelfLifeRepository } from '../repositories/shelf-life.repository';

export type StorageType = 'pantry' | 'refrigerator' | 'freezer';

export interface ExpiryCalculationResult {
  expiryDate: Date | null;
  source: 'auto_foodkeeper' | 'none';
  shelfLifeDays: number | null;
  storageType: StorageType | null;
}

export interface ResolvedExpiryResult {
  expiryDate: Date | undefined;
  source: 'auto_foodkeeper' | undefined;
}

@Injectable()
export class ShelfLifeService {
  private readonly logger = new Logger(ShelfLifeService.name);

  constructor(private readonly shelfLifeRepository: ShelfLifeRepository) {}

  async calculateExpiryDate(
    foodName: string,
    purchaseDate: Date = new Date(),
  ): Promise<ExpiryCalculationResult> {
    const shelfLife = await this.shelfLifeRepository.findBestMatch(foodName);
    if (!shelfLife) {
      throw new NotFoundException(`No shelf life data found for: ${foodName}`);
    }
    const storageType = this.inferStorageType(shelfLife);
    const days = this.getDaysForStorageType(shelfLife, storageType);
    if (days === null) {
      throw new NotFoundException(
        `No shelf life days for ${foodName} with storage type ${storageType}`,
      );
    }
    const expiryDate = new Date(purchaseDate);
    expiryDate.setDate(expiryDate.getDate() + days);
    return {
      expiryDate,
      source: 'auto_foodkeeper',
      shelfLifeDays: days,
      storageType,
    };
  }

  inferStorageType(shelfLife: FoodShelfLife): StorageType {
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
    const category = shelfLife.categoryName?.toLowerCase() ?? '';
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
    if (category.includes('frozen')) {
      return 'freezer';
    }
    return 'pantry';
  }

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

  async searchByFoodName(foodName: string): Promise<FoodShelfLife | null> {
    return this.shelfLifeRepository.findBestMatch(foodName);
  }

  /**
   * Resolves an expiry date using a three-tier fallback chain:
   *  1. FK-linked shelf life record (shelfLifeId) — most precise
   *  2. Name-based fuzzy search (foodName)
   *  3. Category-based match (categoryHints)
   *
   * Returns undefined expiry when none of the tiers produce a result.
   * When shelfLifeId is provided the fallback tiers are skipped.
   */
  async resolveExpiryDate(params: {
    shelfLifeId?: string | null;
    foodName?: string | null;
    categoryHints?: string[];
  }): Promise<ResolvedExpiryResult> {
    const { shelfLifeId, foodName, categoryHints = [] } = params;

    if (shelfLifeId) {
      const shelfLife = await this.shelfLifeRepository.findById(shelfLifeId);
      if (shelfLife) {
        const date = this.dateFromShelfLife(shelfLife);
        if (date) return { expiryDate: date, source: 'auto_foodkeeper' };
      }
      return { expiryDate: undefined, source: undefined };
    }

    if (foodName) {
      try {
        const result = await this.calculateExpiryDate(foodName);
        if (result.expiryDate) {
          return { expiryDate: result.expiryDate, source: 'auto_foodkeeper' };
        }
      } catch (err) {
        if (!(err instanceof NotFoundException)) throw err;
      }
    }

    if (categoryHints.length > 0) {
      const shelfLife =
        await this.shelfLifeRepository.findByCategoryHints(categoryHints);
      if (shelfLife) {
        const date = this.dateFromShelfLife(shelfLife);
        if (date) return { expiryDate: date, source: 'auto_foodkeeper' };
      }
    }

    return { expiryDate: undefined, source: undefined };
  }

  private dateFromShelfLife(shelfLife: FoodShelfLife): Date | null {
    const storageType = this.inferStorageType(shelfLife);
    const days = this.getDaysForStorageType(shelfLife, storageType);
    if (days === null) return null;
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  }

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
