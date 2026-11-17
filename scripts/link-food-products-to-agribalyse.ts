import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaClient as OffMongoClient } from '.prisma/off-mongo-client';
import {
  OFF_AGRIBALYSE_PROJECTION,
  offAgribalyseCode,
} from '../src/food-products/utils/off-agribalyse';

const BATCH_SIZE = 500;

async function main() {
  const url = process.env.MONGODB_OFF_URL;
  if (!url) throw new Error('MONGODB_OFF_URL is not set');
  const prisma = new PrismaClient();
  const offMongo = new OffMongoClient({ datasourceUrl: url });

  try {
    const known = new Set(
      (await prisma.agribalyseFood.findMany({ select: { code: true } })).map(
        ({ code }) => code,
      ),
    );
    const products = await prisma.foodProduct.findMany({
      where: { barcode: { not: null } },
      select: { id: true, barcode: true, agribalyseCode: true },
    });

    let linked = 0;
    let updated = 0;
    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      const batch = products.slice(i, i + BATCH_SIZE);
      const docs = (await offMongo.offProduct.findRaw({
        filter: { _id: { $in: batch.map(({ barcode }) => barcode) } },
        options: { projection: OFF_AGRIBALYSE_PROJECTION },
      })) as unknown as Record<string, unknown>[];
      const codeByBarcode = new Map(
        docs.map((doc) => [String(doc._id), offAgribalyseCode(doc)]),
      );

      for (const product of batch) {
        const code = codeByBarcode.get(product.barcode!);
        const agribalyseCode = code && known.has(code) ? code : null;
        if (agribalyseCode) linked++;
        if (agribalyseCode === product.agribalyseCode) continue;
        await prisma.foodProduct.update({
          where: { id: product.id },
          data: { agribalyseCode },
        });
        updated++;
      }
    }

    console.log(
      `🌍 Food products with an AGRIBALYSE code: ${linked} of ${products.length} (${updated} updated)`,
    );
  } finally {
    await prisma.$disconnect();
    await offMongo.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
