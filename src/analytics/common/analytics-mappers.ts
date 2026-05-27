import {
  AnalyticsNutritionDto,
  AnalyticsFoodPopularityDto,
} from './analytics-dtos';

export function toAnalyticsNutritionDto(row: any): AnalyticsNutritionDto {
  return {
    id: row.id,
    date: row.date,
    typeOfMeal: row.typeOfMeal,
    userCount: row.userCount,
    mealCount: row.mealCount,
    avgCalories: row.avgCalories,
    avgProteins: row.avgProteins,
    avgFat: row.avgFat,
    avgCarbs: row.avgCarbs,
    avgFiber: row.avgFiber,
    avgSodium: row.avgSodium,
    avgSugar: row.avgSugar,
    avgSaturatedFat: row.avgSaturatedFat,
    p25Calories: row.p25Calories,
    p50Calories: row.p50Calories,
    p75Calories: row.p75Calories,
  };
}

export function toAnalyticsFoodPopularityDto(
  row: any,
): AnalyticsFoodPopularityDto {
  return {
    id: row.id,
    date: row.date,
    foodName: row.foodName,
    foodGroup: row.foodGroup,
    itemType: row.itemType,
    frequency: row.frequency,
    uniqueUsers: row.uniqueUsers,
    avgQuantity: row.avgQuantity,
    predominantUnit: row.predominantUnit,
  };
}

// Add more mappers as needed
