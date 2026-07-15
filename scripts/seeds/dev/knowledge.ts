import { PrismaClient } from '@prisma/client';
import { KEYCLOAK_DEV_USER_IDS } from './keycloak-dev-user-ids';
import { getKnowledgeSeedCopy } from './knowledge-seed-copy';
import {
  findUserByKeycloakId,
  warnSeedSkippedMissingOwner,
  warnSeedSkippedMissingUser,
} from './seed-helpers';

export interface KnowledgeSeedData {
  slug: string;
  ownerKeycloakId: string;
  available?: boolean;
}

export const knowledgeData: KnowledgeSeedData[] = [
  {
    slug: 'nutrition-basics',
    ownerKeycloakId: KEYCLOAK_DEV_USER_IDS.adminUser1,
    available: true,
  },
  {
    slug: 'food-safety-101',
    ownerKeycloakId: KEYCLOAK_DEV_USER_IDS.adminUser1,
    available: true,
  },
];

export interface UserKnowledgeProgressSeedData {
  userKeycloakId: string;
  knowledgeSlug: string;
  knowledgeOwnerKeycloakId?: string;
  completed?: boolean;
  progress?: any;
}

export const userKnowledgeProgressData: UserKnowledgeProgressSeedData[] = [
  {
    userKeycloakId: KEYCLOAK_DEV_USER_IDS.devUser1,
    knowledgeSlug: 'nutrition-basics',
    knowledgeOwnerKeycloakId: KEYCLOAK_DEV_USER_IDS.adminUser1,
    completed: false,
    progress: { currentQuestionIndex: 1, answers: [0], score: 0 },
  },
  {
    userKeycloakId: KEYCLOAK_DEV_USER_IDS.devUser2,
    knowledgeSlug: 'food-safety-101',
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
        `knowledge "${k.slug}"`,
      );
      continue;
    }

    const copy = getKnowledgeSeedCopy(k.slug);

    const upserted = await prisma.knowledge.upsert({
      where: { slug: k.slug },
      update: {
        title: copy.title,
        description: copy.description,
        available: k.available ?? true,
        content: { questions: copy.questions },
      },
      create: {
        slug: k.slug,
        userId: owner.id,
        title: copy.title,
        description: copy.description,
        available: k.available ?? true,
        content: { questions: copy.questions },
      },
    });

    created.push(upserted);
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
        `progress for "${p.knowledgeSlug}"`,
      );
      continue;
    }

    const ownerKeycloak = p.knowledgeOwnerKeycloakId ?? p.userKeycloakId;
    const owner = await findUserByKeycloakId(prisma, ownerKeycloak);
    if (!owner) {
      warnSeedSkippedMissingOwner(
        ownerKeycloak,
        `progress for "${p.knowledgeSlug}"`,
      );
      continue;
    }

    const knowledge = await prisma.knowledge.findUnique({
      where: { slug: p.knowledgeSlug },
    });
    if (!knowledge) {
      console.warn(
        `⚠️  Knowledge "${p.knowledgeSlug}" not found, skipping progress seed`,
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
