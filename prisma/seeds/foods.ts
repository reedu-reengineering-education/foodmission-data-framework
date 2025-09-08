import { PrismaClient } from '@prisma/client';

// Only verified working OpenFoodFacts barcodes - tested and confirmed 100% working
export const openFoodFactsBarcodes: string[] = [
  // Norway
  '7033330013245', // Bremykt
  '7039010149020', // Stabbur-Makrell,

  // Germany
  '4000405002360', // Vegane Pommersche
  '4066600603405', // Spezi – Paulaner

  // Netherlands
  '8718907845052', // Jonge Kaas
  '8710739489084', // Stroopwaffels

  // Italy
  '8000500037560', // Kinder Bueno
  '8076809513753', // Pesto Genovese

  // Spain
  '8480000590756', // Lomo
  '8480000171320', // Tomate frito

  // Greece
  '5201004020338', // Caprice classic
  '5202576281288', // Gigantes

  // Slovenia
  '3838901606949', // Hrenovke golica
  '3830008604309', // Kekec pašteta

  // Poland
  '5900242001610', // majonez kielecki
  '5907029010797', // Beskidzkie paluszki
];

// Smaller set for testing to speed up test execution - all verified working
export const testOpenFoodFactsBarcodes: string[] = [
  '3017620422003', // Nutella 400g
  '4017074053166', // Töftes Sport
  '4000417025005', // Milka Chocolate (verified working)
  '8712100849084', // Magnum Ice Cream (verified working)
  '8000500037560', // Kinder Bueno (verified working)
];

export async function seedFoods(
  prisma: PrismaClient,
  useTestData: boolean = false,
) {
  console.log('🍎 Seeding food items from OpenFoodFacts...');

  const foods: any[] = [];
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  // Use smaller dataset for testing
  const barcodesToUse = useTestData
    ? testOpenFoodFactsBarcodes
    : openFoodFactsBarcodes;

  for (const barcode of barcodesToUse) {
    try {
      // Check if food already exists
      const existingFood = await prisma.food.findUnique({
        where: { barcode },
      });

      if (existingFood) {
        console.log(`⏭️  Skipping ${barcode} - already exists`);
        foods.push(existingFood);
        skipCount++;
        continue;
      }

      // Import from OpenFoodFacts using a direct HTTP call
      console.log(`📥 Importing ${barcode} from OpenFoodFacts...`);

      const response = await fetch(
        `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
      );
      const data = await response.json();

      if (!data || data.status !== 1 || !data.product) {
        console.log(`❌ Product not found in OpenFoodFacts: ${barcode}`);
        errorCount++;
        continue;
      }

      const product = data.product;

      // Create food from OpenFoodFacts data
      const food = await prisma.food.create({
        data: {
          name:
            product.product_name ||
            product.generic_name ||
            `Product ${barcode}`,
          description:
            product.generic_name ||
            product.product_name ||
            'Imported from OpenFoodFacts',
          barcode: barcode,
          openFoodFactsId: barcode,
          createdBy: 'system-seed-openfoodfacts',
        },
      });

      foods.push(food);
      successCount++;
      console.log(`✅ Successfully imported: ${food.name}`);

      // Add a small delay to be respectful to the API
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`❌ Error importing ${barcode}:`, error.message);
      errorCount++;
    }
  }

  console.log(`✅ Food seeding completed:`);
  console.log(`   - Successfully imported: ${successCount}`);
  console.log(`   - Skipped (already exist): ${skipCount}`);
  console.log(`   - Errors: ${errorCount}`);
  console.log(`   - Total foods in database: ${foods.length}`);

  return foods;
}
