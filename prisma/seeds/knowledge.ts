import { PrismaClient } from '@prisma/client';
import { KEYCLOAK_DEV_USER_IDS } from './keycloak-dev-user-ids';
import {
  findUserByKeycloakId,
  warnSeedSkippedMissingOwner,
  warnSeedSkippedMissingUser,
} from './seed-helpers';

export interface KnowledgeSeedData {
  ownerKeycloakId: string;
  title: string;
  description?: string;
  available?: boolean;
  content: any;
}

export const knowledgeData: KnowledgeSeedData[] = [
  {
    ownerKeycloakId: KEYCLOAK_DEV_USER_IDS.adminUser1,
    title: 'Nutrition Basics',
    description: 'A short quiz about basic nutrition facts and macros.',
    available: true,
    content: {
      questions: [
        {
          question: 'Which macronutrient is the primary source of energy?',
          options: ['Vitamins', 'Carbohydrates', 'Water', 'Minerals'],
          correctAnswer: 'Carbohydrates',
        },
        {
          question: 'Which vitamin is fat-soluble?',
          options: ['Vitamin C', 'Vitamin B12', 'Vitamin A', 'Vitamin B6'],
          correctAnswer: 'Vitamin A',
        },
      ],
    },
  },
  {
    ownerKeycloakId: KEYCLOAK_DEV_USER_IDS.adminUser1,
    title: 'Food Safety 101',
    description: 'Basic food safety practices to avoid contamination.',
    available: true,
    content: {
      questions: [
        {
          question:
            'What temperature range is considered the "danger zone" for bacterial growth?',
          options: ['0-4°C', '5-60°C', '61-90°C', 'below 0°C'],
          correctAnswer: '5-60°C',
        },
      ],
    },
  },
];

export interface UserKnowledgeProgressSeedData {
  userKeycloakId: string;
  knowledgeTitle: string;
  knowledgeOwnerKeycloakId?: string; // optional if knowledge belongs to same user
  completed?: boolean;
  progress?: any;
}

export const userKnowledgeProgressData: UserKnowledgeProgressSeedData[] = [
  {
    userKeycloakId: KEYCLOAK_DEV_USER_IDS.devUser1,
    knowledgeTitle: 'Nutrition Basics',
    knowledgeOwnerKeycloakId: KEYCLOAK_DEV_USER_IDS.adminUser1,
    completed: false,
    progress: { currentQuestionIndex: 1, answers: [0], score: 0 },
  },
  {
    userKeycloakId: KEYCLOAK_DEV_USER_IDS.devUser2,
    knowledgeTitle: 'Food Safety 101',
    knowledgeOwnerKeycloakId: KEYCLOAK_DEV_USER_IDS.adminUser1,
    completed: true,
    progress: { currentQuestionIndex: 1, answers: [1], score: 1 },
  },
];

export async function seedKnowledge(prisma: PrismaClient) {
  console.log('📚 Seeding knowledge items...');

  const created: any[] = [];

  for (const k of knowledgeData) {
    const owner = await findUserByKeycloakId(prisma, k.ownerKeycloakId);

    if (!owner) {
      warnSeedSkippedMissingOwner(
        k.ownerKeycloakId,
        `knowledge "${k.title}"`,
      );
      continue;
    }

    // Attempt to find existing knowledge with same title for same owner
    const existing = await prisma.knowledge.findFirst({
      where: { userId: owner.id, title: k.title },
    });

    if (existing) {
      // Update content/description/available if changed
      const updated = await prisma.knowledge.update({
        where: { id: existing.id },
        data: {
          description: k.description,
          available: k.available ?? true,
          content: k.content,
        },
      });
      created.push(updated);
    } else {
      const createdKnowledge = await prisma.knowledge.create({
        data: {
          userId: owner.id,
          title: k.title,
          description: k.description ?? '',
          available: k.available ?? true,
          content: k.content,
        },
      });
      created.push(createdKnowledge);
    }
  }

  console.log(`✅ Created/updated ${created.length} knowledge items`);
  return created;
}

export async function seedUserKnowledgeProgress(prisma: PrismaClient) {
  console.log('📈 Seeding user knowledge progress...');

  const created: any[] = [];

  for (const p of userKnowledgeProgressData) {
    const user = await findUserByKeycloakId(prisma, p.userKeycloakId);
    if (!user) {
      warnSeedSkippedMissingUser(
        p.userKeycloakId,
        `progress for "${p.knowledgeTitle}"`,
      );
      continue;
    }

    const ownerKeycloak = p.knowledgeOwnerKeycloakId ?? p.userKeycloakId;
    const owner = await findUserByKeycloakId(prisma, ownerKeycloak);
    if (!owner) {
      warnSeedSkippedMissingOwner(
        ownerKeycloak,
        `progress for "${p.knowledgeTitle}"`,
      );
      continue;
    }

    const knowledge = await prisma.knowledge.findFirst({
      where: { userId: owner.id, title: p.knowledgeTitle },
    });
    if (!knowledge) {
      console.warn(
        `⚠️  Knowledge "${p.knowledgeTitle}" not found for owner ${ownerKeycloak}, skipping`,
      );
      continue;
    }

    try {
      const upserted = await prisma.userKnowledgeProgress.upsert({
        where: {
          userId_knowledgeId: { userId: user.id, knowledgeId: knowledge.id },
        },
        update: {
          completed: p.completed ?? false,
          progress: p.progress ?? {},
          lastAccessedAt: new Date(),
        },
        create: {
          userId: user.id,
          knowledgeId: knowledge.id,
          completed: p.completed ?? false,
          progress: p.progress ?? {},
          lastAccessedAt: new Date(),
        },
      });

      created.push(upserted);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('❌ Error upserting user knowledge progress:', msg);
    }
  }

  console.log(
    `✅ Created/updated ${created.length} user knowledge progress records`,
  );
  return created;
}
