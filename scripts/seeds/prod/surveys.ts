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
    answers: string[] | string;
    source_survey: number;
  }>;
}

export async function seedSurveys(prisma: PrismaClient) {
  try {
    console.log('🌱 Seeding surveys...');

    const surveysPath = path.join(process.cwd(), 'prisma', 'seeds', 'data', 'surveys');
    const surveyFiles = fs
      .readdirSync(surveysPath)
      .filter((file) => file.endsWith('.json') && file !== 'surveys.json')
      .sort();

    const results = {
      surveysCreated: 0,
      questionsCreated: 0,
      answerOptionsCreated: 0,
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

      // Delete existing questions for this survey to ensure clean state
      await prisma.question.deleteMany({
        where: { surveyId: survey.id },
      });

      // Create questions for this survey
      for (let qIndex = 0; qIndex < surveyData.questions.length; qIndex++) {
        const questionData = surveyData.questions[qIndex];
        const answers = Array.isArray(questionData.answers)
          ? questionData.answers
          : [];

        // Create question
        const question = await prisma.question.create({
          data: {
            text: questionData.text,
            type: questionData.type,
            order: qIndex,
            surveyId: survey.id,
            answerOptions: {
              create: answers.map((answer, aIndex) => ({
                text: answer,
                order: aIndex,
              })),
            },
          },
        });

        results.questionsCreated++;
        results.answerOptionsCreated += answers.length;
      }
    }

    console.log('\n✅ Survey seeding completed!');
    console.log('📊 Summary:');
    console.log(`  - Surveys: ${results.surveysCreated}`);
    console.log(`  - Questions: ${results.questionsCreated}`);
    console.log(`  - Answer Options: ${results.answerOptionsCreated}`);

    return results;
  } catch (error) {
    console.error('❌ Error seeding surveys:', error);
    throw error;
  }
}
