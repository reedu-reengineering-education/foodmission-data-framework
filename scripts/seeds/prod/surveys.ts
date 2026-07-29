import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

interface SurveyData {
  title: string;
  description?: string;
  questions: Array<{
    id: string;
    text: string;
    type: string;
    source_survey: number;
  }>;
}

export async function seedSurveys(prisma: PrismaClient) {
  try {
    console.log('🌱 Seeding surveys...');

    const surveysPath = path.join(
      process.cwd(),
      'prisma',
      'seeds',
      'data',
      'surveys',
    );
    const surveyFiles = fs
      .readdirSync(surveysPath)
      .filter((file) => file.endsWith('.json') && file !== 'surveys.json')
      .sort();

    const results = {
      surveysCreated: 0,
      questionsCreated: 0,
      questionsUpdated: 0,
      questionsRemoved: 0,
    };

    for (const file of surveyFiles) {
      const filePath = path.join(surveysPath, file);
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const surveyData: SurveyData = JSON.parse(fileContent);

      // Create or update survey
      const survey = await prisma.survey.upsert({
        where: { title: surveyData.title },
        update: {
          description: surveyData.description,
        },
        create: {
          title: surveyData.title,
          description: surveyData.description,
        },
      });

      results.surveysCreated++;
      console.log(`  ✓ Survey: ${surveyData.title}`);

      // Update questions in place, matched by position. Deleting and
      // recreating them would cascade-delete every user's answers
      // (QuestionResponse.questionId is onDelete: Cascade).
      const existingQuestions = await prisma.question.findMany({
        where: { surveyId: survey.id },
        orderBy: { order: 'asc' },
      });

      for (let qIndex = 0; qIndex < surveyData.questions.length; qIndex++) {
        const questionData = surveyData.questions[qIndex];
        const existing = existingQuestions.find((q) => q.order === qIndex);

        if (existing) {
          await prisma.question.update({
            where: { id: existing.id },
            data: { text: questionData.text, type: questionData.type },
          });
          results.questionsUpdated++;
        } else {
          await prisma.question.create({
            data: {
              text: questionData.text,
              type: questionData.type,
              order: qIndex,
              surveyId: survey.id,
            },
          });
          results.questionsCreated++;
        }
      }

      // Questions dropped from the seed file (answers to them go with them).
      const removed = await prisma.question.deleteMany({
        where: {
          surveyId: survey.id,
          order: { gte: surveyData.questions.length },
        },
      });
      results.questionsRemoved += removed.count;
    }

    console.log('\n✅ Survey seeding completed!');
    console.log('📊 Summary:');
    console.log(`  - Surveys: ${results.surveysCreated}`);
    console.log(`  - Questions created: ${results.questionsCreated}`);
    console.log(`  - Questions updated: ${results.questionsUpdated}`);
    console.log(`  - Questions removed: ${results.questionsRemoved}`);

    return results;
  } catch (error) {
    console.error('❌ Error seeding surveys:', error);
    throw error;
  }
}
