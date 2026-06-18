import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class RecipeAnalyticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findRecipes(from?: Date, to?: Date) {
    return this.prisma.recipe.findMany({
      where: {
        createdAt: this.buildDateFilter(from, to),
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
        prepTime: true,
        cookTime: true,
        difficulty: true,
        nutritionalInfo: true,
        sustainabilityScore: true,
        rating: true,
        ratingCount: true,
        cuisineType: true,
        dietaryLabels: true,
        isPublic: true,
        ingredients: {
          select: {
            name: true,
          },
        },
        meals: {
          where: {
            createdAt: this.buildDateFilter(from, to),
          },
          select: {
            id: true,
            userId: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  private buildDateFilter(
    from?: Date,
    to?: Date,
  ): Prisma.DateTimeFilter | undefined {
    if (!from && !to) {
      return undefined;
    }

    return {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
  }
}
