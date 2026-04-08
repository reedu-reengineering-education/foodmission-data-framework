import { Injectable } from '@nestjs/common';
import { FoodShelfLife, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ShelfLifeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByProductId(
    foodKeeperProductId: number,
  ): Promise<FoodShelfLife | null> {
    return this.prisma.foodShelfLife.findUnique({
      where: { foodKeeperProductId },
    });
  }

  async findByKeywords(keywords: string[]): Promise<FoodShelfLife[]> {
    const normalizedKeywords = keywords.map((k) => k.toLowerCase().trim());
    return this.prisma.foodShelfLife.findMany({
      where: {
        keywords: { hasSome: normalizedKeywords },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findBestMatch(foodName: string): Promise<FoodShelfLife | null> {
    const normalizedName = foodName.toLowerCase().trim();

    // Try exact name match first
    const exactMatch = await this.prisma.foodShelfLife.findFirst({
      where: {
        name: { equals: normalizedName, mode: 'insensitive' },
      },
    });
    if (exactMatch) return exactMatch;

    // Tokenize and search by keywords (normalizedName is already lowercased)
    const tokens = normalizedName.split(/[\s,]+/).filter((t) => t.length > 2);

    if (tokens.length === 0) return null;

    const candidates = await this.prisma.foodShelfLife.findMany({
      where: {
        keywords: { hasSome: tokens },
      },
    });

    if (candidates.length === 0) return null;

    // Score by keyword overlap
    const scored = candidates.map((candidate) => {
      const candidateKeywords = new Set(
        candidate.keywords.map((k) => k.toLowerCase()),
      );
      const overlapCount = tokens.filter((t) =>
        candidateKeywords.has(t),
      ).length;
      return { candidate, score: overlapCount };
    });

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    return scored[0]?.candidate ?? null;
  }

  async findAll(options?: {
    skip?: number;
    take?: number;
    where?: Prisma.FoodShelfLifeWhereInput;
    orderBy?: Prisma.FoodShelfLifeOrderByWithRelationInput;
  }): Promise<FoodShelfLife[]> {
    const { skip = 0, take = 50, where, orderBy } = options ?? {};
    return this.prisma.foodShelfLife.findMany({
      skip,
      take,
      where,
      orderBy: orderBy ?? { name: 'asc' },
    });
  }

  async count(where?: Prisma.FoodShelfLifeWhereInput): Promise<number> {
    return this.prisma.foodShelfLife.count({ where });
  }
}
