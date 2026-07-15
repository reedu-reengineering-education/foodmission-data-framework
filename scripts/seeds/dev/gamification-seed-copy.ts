import * as path from 'node:path';
import { readJsonFile } from '../../i18n/utils';

type GamificationCopy = { title: string; description: string };
type GamificationSection = Record<string, GamificationCopy>;

interface EnGamification {
  missions: GamificationSection;
  quests: GamificationSection;
  challenges: GamificationSection;
}

let cachedEnGamification: EnGamification | null = null;

function loadEnGamification(): EnGamification {
  if (!cachedEnGamification) {
    const filePath = path.join(
      __dirname,
      '../../../src/i18n/en/gamification.json',
    );
    const json = readJsonFile(filePath);

    cachedEnGamification = {
      missions: json.missions as GamificationSection,
      quests: json.quests as GamificationSection,
      challenges: json.challenges as GamificationSection,
    };
  }

  return cachedEnGamification;
}

function getCopy(
  section: keyof EnGamification,
  slug: string,
): GamificationCopy {
  const copy = loadEnGamification()[section][slug];

  if (!copy) {
    throw new Error(
      `Missing ${section} copy for slug "${slug}" in src/i18n/en/gamification.json`,
    );
  }

  return copy;
}

export function getMissionSeedCopy(slug: string): GamificationCopy {
  return getCopy('missions', slug);
}

export function getQuestSeedCopy(slug: string): GamificationCopy {
  return getCopy('quests', slug);
}

export function getChallengeSeedCopy(slug: string): GamificationCopy {
  return getCopy('challenges', slug);
}
