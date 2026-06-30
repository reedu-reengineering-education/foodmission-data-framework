import path from 'node:path';
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

const isProd = process.env.NODE_ENV === 'production';

export default defineConfig({
  schema: path.join('prisma'),
  migrations: {
    path: path.join('prisma', 'migrations'),
    seed: isProd
      ? `node ${path.join('dist', 'prisma', 'seed.js')}`
      : `ts-node ${path.join('prisma', 'seed.ts')}`,
  },
});
