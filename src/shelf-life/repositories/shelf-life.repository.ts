import { Injectable } from '@nestjs/common';
import { FoodProductShelfLife, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ShelfLifeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByProductId(
    foodKeeperProductId: number,
  ): Promise<FoodProductShelfLife | null> {
    return this.prisma.foodProductShelfLife.findUnique({
      where: { foodKeeperProductId },
    });
  }

  async findByKeywords(keywords: string[]): Promise<FoodProductShelfLife[]> {
    const normalizedKeywords = keywords.map((k) => k.toLowerCase().trim());
    return this.prisma.foodProductShelfLife.findMany({
      where: {
        keywords: { hasSome: normalizedKeywords },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findBestMatch(foodName: string): Promise<FoodProductShelfLife | null> {
    const normalizedName = foodName.toLowerCase().trim();
    const exactMatch = await this.prisma.foodProductShelfLife.findFirst({
      where: {
        name: { equals: normalizedName, mode: 'insensitive' },
      },
    });
    if (exactMatch) return exactMatch;
    const tokens = normalizedName.split(/[\s,]+/).filter((t) => t.length > 2);
    if (tokens.length === 0) return null;
    const candidates = await this.prisma.foodProductShelfLife.findMany({
      where: {
        keywords: { hasSome: tokens },
      },
    });
    if (candidates.length === 0) return null;
    const scored = candidates.map((candidate) => {
      const candidateKeywords = new Set(
        candidate.keywords.map((k) => k.toLowerCase()),
      );
      const overlapCount = tokens.filter((t) =>
        candidateKeywords.has(t),
      ).length;
      return { candidate, score: overlapCount };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored[0]?.candidate ?? null;
  }

  async findAll(options?: {
    skip?: number;
    take?: number;
    where?: Prisma.FoodProductShelfLifeWhereInput;
    orderBy?: Prisma.FoodProductShelfLifeOrderByWithRelationInput;
  }): Promise<FoodProductShelfLife[]> {
    const { skip = 0, take = 50, where, orderBy } = options ?? {};
    return this.prisma.foodProductShelfLife.findMany({
      skip,
      take,
      where,
      orderBy: orderBy ?? { name: 'asc' },
    });
  }

  async count(where?: Prisma.FoodProductShelfLifeWhereInput): Promise<number> {
    return this.prisma.foodProductShelfLife.count({ where });
  }
}
