import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { parseCsvLine } from './seedNevoLangualFoodex';

const VERSION = '3.2';
const DATA_DIR = path.join(
  process.cwd(),
  'prisma',
  'seeds',
  'data',
  'agribalyse',
);
const CSV_PATH = path.join(DATA_DIR, `agribalyse-${VERSION}-synthese.csv`);
const MAPPING_PATH = path.join(DATA_DIR, 'nevo-agribalyse-mapping.json');

async function linkGenericFoods(prisma: PrismaClient): Promise<number> {
  const { foods } = JSON.parse(fs.readFileSync(MAPPING_PATH, 'utf-8')) as {
    foods: { nevoCode: number; agribalyseCode: string }[];
  };
  await prisma.genericFood.updateMany({
    where: { nevoCode: { notIn: foods.map((food) => food.nevoCode) } },
    data: { agribalyseCode: null },
  });
  let linked = 0;
  for (const { nevoCode, agribalyseCode } of foods) {
    const { count } = await prisma.genericFood.updateMany({
      where: { nevoCode },
      data: { agribalyseCode },
    });
    linked += count;
  }
  return linked;
}

export async function seedAgribalyse(
  prisma: PrismaClient,
): Promise<{ upserted: number; linked: number }> {
  const [header, ...lines] = fs
    .readFileSync(CSV_PATH, 'utf-8')
    .replace(/^\uFEFF/, '')
    .split('\n')
    .filter((line) => line.trim() !== '');
  const columns = parseCsvLine(header);
  const column = (name: string) => {
    const index = columns.indexOf(name);
    if (index === -1) throw new Error(`AGRIBALYSE column missing: ${name}`);
    return index;
  };
  const col = {
    code: column('Code AGB'),
    ciqualCode: column('Code CIQUAL'),
    foodGroup: column("Groupe d'aliment"),
    foodSubgroup: column("Sous-groupe d'aliment"),
    nameFr: column('Nom du Produit en Français'),
    nameEn: column('LCI Name'),
    preparation: column('Préparation'),
    dqr: column('DQR'),
    efScorePerKg: column('Score unique EF'),
    co2PerKg: column('Changement climatique'),
  };

  for (const line of lines) {
    const cells = parseCsvLine(line);
    const code = cells[col.code];
    const data = {
      ciqualCode: Number(cells[col.ciqualCode]),
      foodGroup: cells[col.foodGroup],
      foodSubgroup: cells[col.foodSubgroup],
      nameFr: cells[col.nameFr],
      nameEn: cells[col.nameEn],
      preparation: cells[col.preparation],
      dqr: Number(cells[col.dqr]),
      efScorePerKg: Number(cells[col.efScorePerKg]),
      co2PerKg: Number(cells[col.co2PerKg]),
      version: VERSION,
    };
    await prisma.agribalyseFood.upsert({
      where: { code },
      update: data,
      create: { code, ...data },
    });
  }

  const linked = await linkGenericFoods(prisma);

  console.log(
    `   🌍 AGRIBALYSE ${VERSION}: ${lines.length} foods upserted, ${linked} generic foods linked`,
  );
  return { upserted: lines.length, linked };
}
