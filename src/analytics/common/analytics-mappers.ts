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
    mealCount: row.mealCount ?? row.itemCount,
    avgCalories: row.avgCalories ?? row.avgCaloriesPer100g,
    avgProteins: row.avgProteins ?? row.avgProteinsPer100g,
    avgFat: row.avgFat ?? row.avgFatPer100g,
    avgCarbs: row.avgCarbs ?? row.avgCarbsPer100g,
    avgFiber: row.avgFiber ?? row.avgFiberPer100g,
    avgSodium: row.avgSodium ?? row.avgSodiumPer100g,
    avgSugar: row.avgSugar ?? row.avgSugarPer100g,
    avgSaturatedFat: row.avgSaturatedFat ?? row.avgSaturatedFatPer100g,
    p25Calories: row.p25Calories ?? row.p25CaloriesPer100g,
    p50Calories: row.p50Calories ?? row.p50CaloriesPer100g,
    p75Calories: row.p75Calories ?? row.p75CaloriesPer100g,
  };
}

export function toAnalyticsFoodPopularityDto(
  row: any,
): AnalyticsFoodPopularityDto {
  return {
    id: row.id,
    date: row.date,
    itemName: row.foodName,
    itemGroup: row.foodGroup,
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
