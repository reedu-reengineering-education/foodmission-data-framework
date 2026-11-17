import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { parseCsvLine } from './seedNevoLangualFoodex';

const VERSION = '3.2';
const CSV_PATH = path.join(
  process.cwd(),
  'prisma',
  'seeds',
  'data',
  'agribalyse',
  `agribalyse-${VERSION}-synthese.csv`,
);

export async function seedAgribalyse(
  prisma: PrismaClient,
): Promise<{ upserted: number }> {
  const [header, ...lines] = fs
    .readFileSync(CSV_PATH, 'utf-8')
    .replace(/^﻿/, '')
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

  console.log(`   🌍 AGRIBALYSE ${VERSION}: ${lines.length} foods upserted`);
  return { upserted: lines.length };
}
