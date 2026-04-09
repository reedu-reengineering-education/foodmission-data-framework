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
