// OpenFoodFacts API Response Interfaces
export interface OpenFoodFactsProduct {
  code: string;
  product: {
    product_name?: string;
    product_name_en?: string;
    generic_name?: string;
    brands?: string;
    categories?: string;
    categories_tags?: string[];
    labels?: string;
    labels_tags?: string[];
    quantity?: string;
    serving_size?: string;
    packaging?: string;
    packaging_tags?: string[];
    origins?: string;
    manufacturing_places?: string;
    ingredients_text?: string;
    ingredients_text_en?: string;
    allergens?: string;
    allergens_tags?: string[];
    traces?: string;
    traces_tags?: string[];
    nutrition_grades?: string;
    nova_group?: number;
    ecoscore_grade?: string;
    image_url?: string;
    image_front_url?: string;
    image_nutrition_url?: string;
    image_ingredients_url?: string;
    nutriments?: OpenFoodFactsNutriments;
    nutriscore_data?: OpenFoodFactsNutriscore;
    created_t?: number;
    last_modified_t?: number;
    completeness?: number;
    countries?: string;
    countries_tags?: string[];
    stores?: string;
    stores_tags?: string[];
  };
  status: number;
  status_verbose: string;
}

export interface OpenFoodFactsNutriments {
  'energy-kcal'?: number;
  'energy-kcal_100g'?: number;
  'energy-kj'?: number;
  'energy-kj_100g'?: number;
  fat?: number;
  fat_100g?: number;
  'saturated-fat'?: number;
  'saturated-fat_100g'?: number;
  'trans-fat'?: number;
  'trans-fat_100g'?: number;
  cholesterol?: number;
  cholesterol_100g?: number;
  carbohydrates?: number;
  carbohydrates_100g?: number;
  sugars?: number;
  sugars_100g?: number;
  fiber?: number;
  fiber_100g?: number;
  proteins?: number;
  proteins_100g?: number;
  salt?: number;
  salt_100g?: number;
  sodium?: number;
  sodium_100g?: number;
  'vitamin-a'?: number;
  'vitamin-a_100g'?: number;
  'vitamin-c'?: number;
  'vitamin-c_100g'?: number;
  calcium?: number;
  calcium_100g?: number;
  iron?: number;
  iron_100g?: number;
}

export interface OpenFoodFactsNutriscore {
  energy?: number;
  energy_points?: number;
  energy_value?: number;
  fiber?: number;
  fiber_points?: number;
  fiber_value?: number;
  fruits_vegetables_nuts_colza_walnut_olive_oils?: number;
  fruits_vegetables_nuts_colza_walnut_olive_oils_points?: number;
  fruits_vegetables_nuts_colza_walnut_olive_oils_value?: number;
  is_beverage?: number;
  is_cheese?: number;
  is_fat?: number;
  is_water?: number;
  negative_points?: number;
  positive_points?: number;
  proteins?: number;
  proteins_points?: number;
  proteins_value?: number;
  saturated_fat?: number;
  saturated_fat_points?: number;
  saturated_fat_ratio?: number;
  saturated_fat_ratio_points?: number;
  saturated_fat_ratio_value?: number;
  saturated_fat_value?: number;
  sodium?: number;
  sodium_points?: number;
  sodium_value?: number;
  sugars?: number;
  sugars_points?: number;
  sugars_value?: number;
  score?: number;
  grade?: string;
}

export interface OpenFoodFactsSearchResponse {
  count: number;
  page: number;
  page_count: number;
  page_size: number;
  products: OpenFoodFactsProduct['product'][];
  skip: number;
}

// Transformed interfaces for our application
export interface NutritionalInfo {
  energyKcal?: number;
  energyKj?: number;
  fat?: number;
  saturatedFat?: number;
  transFat?: number;
  cholesterol?: number;
  carbohydrates?: number;
  sugars?: number;
  fiber?: number;
  proteins?: number;
  salt?: number;
  sodium?: number;
  vitaminA?: number;
  vitaminC?: number;
  calcium?: number;
  iron?: number;
}

export interface ProductInfo {
  barcode: string;
  name: string;
  genericName?: string;
  brands?: string[];
  categories?: string[];
  labels?: string[];
  quantity?: string;
  servingSize?: string;
  packaging?: string[];
  origins?: string;
  manufacturingPlaces?: string;
  ingredients?: string;
  allergens?: string[];
  traces?: string[];
  nutritionGrade?: string;
  novaGroup?: number;
  ecoscoreGrade?: string;
  imageUrl?: string;
  imageFrontUrl?: string;
  imageNutritionUrl?: string;
  imageIngredientsUrl?: string;
  nutritionalInfo?: NutritionalInfo;
  countries?: string[];
  stores?: string[];
  completeness?: number;
  createdAt?: Date;
  lastModified?: Date;
}

export interface OpenFoodFactsSearchOptions {
  query?: string;
  categories?: string[];
  brands?: string[];
  countries?: string[];
  page?: number;
  pageSize?: number;
  sortBy?:
    | 'product_name'
    | 'created_t'
    | 'last_modified_t'
    | 'completeness'
    | 'popularity';
  fields?: string[];
}

export interface OpenFoodFactsError {
  message: string;
  status?: number;
  code?: string;
}
