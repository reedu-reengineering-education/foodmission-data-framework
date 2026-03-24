import { PrismaClient, User } from '@prisma/client';

export async function findUserByKeycloakId(
  prisma: PrismaClient,
  keycloakId: string,
): Promise<User | null> {
  return prisma.user.findUnique({ where: { keycloakId } });
}

export function warnSeedSkippedMissingUser(
  keycloakId: string,
  context: string,
): void {
  console.warn(`⚠️  User ${keycloakId} not found, skipping ${context}`);
}

export function warnSeedSkippedMissingOwner(
  keycloakId: string,
  context: string,
): void {
  console.warn(`⚠️  Owner ${keycloakId} not found, skipping ${context}`);
}

export interface SeedUserInput {
  keycloakId: string;
  email: string;
  firstName: string;
  lastName: string;
  preferences?: Record<string, unknown>;
}

export async function upsertSeedUser(
  prisma: PrismaClient,
  input: SeedUserInput,
): Promise<User> {
  const user = await prisma.user.upsert({
    where: { keycloakId: input.keycloakId },
    update: {
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
    },
    create: {
      keycloakId: input.keycloakId,
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
    },
  });
  if (input.preferences !== undefined) {
    await prisma.user.update({
      where: { id: user.id },
      data: { preferences: input.preferences as object },
    });
  }
  return user;
}

export async function upsertSeedFoodByBarcode(
  prisma: PrismaClient,
  input: { name: string; description: string; barcode: string },
  createdBy: string,
) {
  return prisma.food.upsert({
    where: { barcode: input.barcode },
    update: {
      name: input.name,
      description: input.description,
    },
    create: {
      name: input.name,
      description: input.description,
      barcode: input.barcode,
      createdBy,
    },
  });
}

export async function upsertDevFood(
  prisma: PrismaClient,
  foodInfo: {
    name: string;
    description: string;
    barcode?: string;
  },
) {
  const barcode =
    foodInfo.barcode ||
    `dev-${foodInfo.name.toLowerCase().replace(/\s+/g, '-')}`;
  return prisma.food.upsert({
    where: { barcode },
    update: {
      name: foodInfo.name,
      description: foodInfo.description,
    },
    create: {
      name: foodInfo.name,
      description: foodInfo.description,
      barcode: foodInfo.barcode ?? barcode,
      createdBy: 'dev-seed',
    },
  });
}
