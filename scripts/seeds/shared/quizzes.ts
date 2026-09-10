import { ContentLevel, PrismaClient } from '@prisma/client';
import { loadCatalogJson } from './food-facts';

interface QuizOptionSeed {
  label: string;
  text: string;
  isCorrect: boolean;
}

interface QuizSeedRow {
  code: string;
  topicCode: string;
  level: ContentLevel | string;
  question: string;
  explanation: string;
  source: string | null;
  health?: boolean;
  foodChoice?: boolean;
  foodWaste?: boolean;
  options: QuizOptionSeed[];
  correctLabel: string | null;
}

export async function seedQuizzes(prisma: PrismaClient) {
  console.log('❓ Seeding quizzes...');
  const rows = loadCatalogJson<QuizSeedRow>('quizzes.en.json');
  if (rows.length === 0) {
    console.log('   ⏭️  No quizzes to seed');
    return { seeded: 0, options: 0, needingCuration: 0 };
  }

  const topics = await prisma.topic.findMany({ select: { id: true, code: true } });
  const topicByCode = new Map(topics.map((t) => [t.code, t.id]));

  const quizReward = await prisma.reward.findUnique({ where: { name: 'Standard Quiz Reward' } });
  if (!quizReward) {
    console.warn('   ⚠️  Standard Quiz Reward not found – run seedStandardRewards first');
  }

  let seeded = 0;
  let optionsUpserted = 0;
  let skipped = 0;
  let needingCuration = 0;

  for (const row of rows) {
    const topicId = topicByCode.get(row.topicCode);
    if (!topicId) {
      console.warn(`   ⚠️  Unknown topic ${row.topicCode} for ${row.code}`);
      skipped += 1;
      continue;
    }

    if (row.correctLabel == null) {
      needingCuration += 1;
    }

    const quiz = await prisma.quiz.upsert({
      where: { code: row.code },
      update: {
        topicId,
        question: row.question,
        explanation: row.explanation,
        source: row.source,
        level: row.level as ContentLevel,
        health: row.health ?? false,
        foodChoice: row.foodChoice ?? false,
        foodWaste: row.foodWaste ?? false,
        available: true,
        rewardId: quizReward?.id ?? null,
      },
      create: {
        code: row.code,
        topicId,
        question: row.question,
        explanation: row.explanation,
        source: row.source,
        level: row.level as ContentLevel,
        health: row.health ?? false,
        foodChoice: row.foodChoice ?? false,
        foodWaste: row.foodWaste ?? false,
        available: true,
        rewardId: quizReward?.id ?? null,
      },
    });

    for (let i = 0; i < row.options.length; i++) {
      const opt = row.options[i];
      const isCorrect =
        row.correctLabel != null
          ? opt.label === row.correctLabel
          : Boolean(opt.isCorrect);
      await prisma.quizOption.upsert({
        where: {
          quizId_label: {
            quizId: quiz.id,
            label: opt.label,
          },
        },
        update: {
          text: opt.text,
          isCorrect,
          sortOrder: i,
        },
        create: {
          quizId: quiz.id,
          label: opt.label,
          text: opt.text,
          isCorrect,
          sortOrder: i,
        },
      });
      optionsUpserted += 1;
    }

    seeded += 1;
  }

  console.log(
    `✅ Upserted ${seeded} quizzes / ${optionsUpserted} options (${skipped} skipped)`,
  );
  console.log(
    `   ℹ️  ${needingCuration} quizzes need correctLabel curation (all isCorrect=false)`,
  );
  return { seeded, options: optionsUpserted, skipped, needingCuration };
}
