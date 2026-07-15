import * as path from 'node:path';
import { readJsonFile } from '../../i18n/utils';

export type KnowledgeQuizQuestion = {
  question: string;
  options: string[];
  correctAnswer: string;
};

export type KnowledgeSeedItem = {
  title: string;
  description: string;
  questions: KnowledgeQuizQuestion[];
};

type EnKnowledge = {
  items: Record<string, KnowledgeSeedItem>;
};

let cachedEnKnowledge: EnKnowledge | null = null;

function loadEnKnowledge(): EnKnowledge {
  if (!cachedEnKnowledge) {
    const filePath = path.join(
      __dirname,
      '../../../src/i18n/en/knowledge.json',
    );
    const json = readJsonFile(filePath);

    cachedEnKnowledge = {
      items: json.items as Record<string, KnowledgeSeedItem>,
    };
  }

  return cachedEnKnowledge;
}

export function getKnowledgeSeedCopy(slug: string): KnowledgeSeedItem {
  const item = loadEnKnowledge().items[slug];

  if (!item) {
    throw new Error(
      `Missing knowledge copy for slug "${slug}" in src/i18n/en/knowledge.json`,
    );
  }

  return item;
}
