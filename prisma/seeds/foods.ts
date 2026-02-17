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

/**
 * Derives boolean diet flags from ingredients_analysis_tags.
 *
 * Tags follow patterns like:
 *   "en:vegan" / "en:non-vegan" / "en:vegan-status-unknown"
 *   "en:vegetarian" / "en:non-vegetarian" / "en:vegetarian-status-unknown"
 *   "en:palm-oil-free" / "en:palm-oil" / "en:may-contain-palm-oil"
 */
function parseDietFlags(tags?: string[]): {
  isVegan: boolean | null;
  isVegetarian: boolean | null;
  isPalmOilFree: boolean | null;
} {
  const result = {
    isVegan: null as boolean | null,
    isVegetarian: null as boolean | null,
    isPalmOilFree: null as boolean | null,
  };
  if (!tags || !Array.isArray(tags)) return result;

  for (const tag of tags) {
    if (tag === 'en:vegan') result.isVegan = true;
    else if (tag === 'en:non-vegan') result.isVegan = false;

    if (tag === 'en:vegetarian') result.isVegetarian = true;
    else if (tag === 'en:non-vegetarian') result.isVegetarian = false;

    if (tag === 'en:palm-oil-free') result.isPalmOilFree = true;
    else if (tag === 'en:palm-oil') result.isPalmOilFree = false;
  }

  return result;
}

/**
 * Safely read a numeric nutriment value, returning undefined if absent/NaN.
 */
function num(val: unknown): number | undefined {
  if (val === undefined || val === null || val === '') return undefined;
  const n = Number(val);
  return Number.isNaN(n) ? undefined : n;
}

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

      const p = data.product;
      const nutriments = p.nutriments || {};
      const dietFlags = parseDietFlags(p.ingredients_analysis_tags);

      const food = await prisma.food.create({
        data: {
          name:
            p.product_name ||
            p.product_name_en ||
            p.generic_name ||
            `Product ${barcode}`,
          description:
            p.generic_name ||
            p.generic_name_en ||
            p.product_name ||
            'Imported from OpenFoodFacts',
          barcode: barcode,
          createdBy: 'system-seed-openfoodfacts',

          // Product metadata
          brands: p.brands || undefined,
          categories: p.categories_tags || [],
          labels: p.labels_tags || [],
          quantity: p.quantity || undefined,
          servingSize: p.serving_size || undefined,
          ingredientsText:
            p.ingredients_text_en || p.ingredients_text || undefined,
          allergens: p.allergens_tags || [],
          traces: p.traces_tags || [],
          countries: p.countries_tags || [],
          origins: p.origins || undefined,
          manufacturingPlaces: p.manufacturing_places || undefined,
          imageUrl: p.image_url || undefined,
          imageFrontUrl: p.image_front_url || undefined,

          // Nutriments per 100g
          nutritionDataPer: p.nutrition_data_per || undefined,
          energyKcal100g: num(nutriments['energy-kcal_100g']),
          energyKj100g: num(nutriments['energy-kj_100g']),
          fat100g: num(nutriments.fat_100g),
          saturatedFat100g: num(nutriments['saturated-fat_100g']),
          transFat100g: num(nutriments['trans-fat_100g']),
          cholesterol100g: num(nutriments.cholesterol_100g),
          carbohydrates100g: num(nutriments.carbohydrates_100g),
          sugars100g: num(nutriments.sugars_100g),
          addedSugars100g: num(nutriments['added-sugars_100g']),
          fiber100g: num(nutriments.fiber_100g),
          proteins100g: num(nutriments.proteins_100g),
          salt100g: num(nutriments.salt_100g),
          sodium100g: num(nutriments.sodium_100g),
          vitaminA100g: num(nutriments['vitamin-a_100g']),
          vitaminC100g: num(nutriments['vitamin-c_100g']),
          calcium100g: num(nutriments.calcium_100g),
          iron100g: num(nutriments.iron_100g),
          potassium100g: num(nutriments.potassium_100g),
          magnesium100g: num(nutriments.magnesium_100g),
          zinc100g: num(nutriments.zinc_100g),

          // Store full nutriments JSON for anything not covered above
          nutrimentsRaw: nutriments,

          // Scores & grades
          nutriscoreGrade:
            p.nutriscore_grade || p.nutrition_grades || undefined,
          nutriscoreScore: num(p.nutriscore_score ?? p.nutriscore_data?.score),
          novaGroup: num(p.nova_group),
          ecoscoreGrade: p.ecoscore_grade || undefined,
          carbonFootprint: num(
            nutriments['carbon-footprint-from-known-ingredients_product'],
          ),

          // Nutrient levels (traffic lights)
          nutrientLevels: p.nutrient_levels || undefined,

          // Diet flags
          isVegan: dietFlags.isVegan,
          isVegetarian: dietFlags.isVegetarian,
          isPalmOilFree: dietFlags.isPalmOilFree,
          ingredientsAnalysisTags: p.ingredients_analysis_tags || [],

          // Packaging
          packagingTags: p.packaging_tags || [],
          packagingMaterials: p.packaging_materials_tags || [],
          packagingRecycling: p.packaging_recycling_tags || [],
          packagingText: p.packaging_text_en || p.packaging_text || undefined,

          // Data quality
          completeness: num(p.completeness),
        },
      });

      foods.push(food);
      successCount++;
      console.log(
        `✅ ${food.name} | Nutri-Score: ${food.nutriscoreGrade ?? '?'} | NOVA: ${food.novaGroup ?? '?'} | Eco: ${food.ecoscoreGrade ?? '?'}`,
      );

      // Be respectful to the API
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
