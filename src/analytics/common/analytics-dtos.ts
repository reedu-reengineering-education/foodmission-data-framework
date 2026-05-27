// Unified DTOs for analytics API responses

export interface AnalyticsNutritionDto {
  id: string;
  date: Date;
  typeOfMeal?: string;
  userCount: number;
  mealCount?: number;
  avgCalories?: number;
  avgProteins?: number;
  avgFat?: number;
  avgCarbs?: number;
  avgFiber?: number;
  avgSodium?: number;
  avgSugar?: number;
  avgSaturatedFat?: number;
  p25Calories?: number;
  p50Calories?: number;
  p75Calories?: number;
  // Add other common fields as needed
}

export interface AnalyticsFoodPopularityDto {
  id: string;
  date: Date;
  itemName: string;
  itemGroup?: string;
  foodName: string;
  foodGroup?: string;
  itemType?: string;
  frequency: number;
  uniqueUsers?: number;
  avgQuantity?: number;
  predominantUnit?: string;
}

// Add more DTOs for patterns, sustainability, classification, etc. as needed
