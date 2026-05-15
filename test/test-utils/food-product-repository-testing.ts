import { Test, TestingModule } from '@nestjs/testing';
import { FoodProductRepository } from '../../src/food-products/repositories/food-product.repository';
import { PrismaService } from '../../src/database/prisma.service';

/** Prisma client subset used by `FoodProductRepository` tests. */
export function createMockPrismaFoodProductClient() {
  return {
    foodProduct: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };
}

export type MockPrismaFoodProductClient = ReturnType<
  typeof createMockPrismaFoodProductClient
>;

export async function compileFoodProductRepositoryTestingModule(
  mockPrisma: MockPrismaFoodProductClient,
): Promise<{
  module: TestingModule;
  repository: FoodProductRepository;
}> {
  const module = await Test.createTestingModule({
    providers: [
      FoodProductRepository,
      { provide: PrismaService, useValue: mockPrisma },
    ],
  }).compile();

  return {
    module,
    repository: module.get<FoodProductRepository>(FoodProductRepository),
  };
}
