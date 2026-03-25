import { PrismaClient, Pantry } from '@prisma/client';

export async function seedPantries(prisma: PrismaClient) {
  console.log('🥫 Seeding pantries...');

  const users = await prisma.user.findMany({
    include: { pantry: true },
  });

  let created = 0;
  for (const user of users) {
    if (!user.pantry) {
      await prisma.pantry.create({
        data: {
          userId: user.id,
        },
      });
      created++;
    }
  }

  const totalPantries = await prisma.pantry.count();
  if (created > 0) {
    console.log(`✅ Created ${created} missing pantries`);
  }
  console.log(`📊 Total pantries: ${totalPantries}`);
  
  return await prisma.pantry.findMany();
}
