/**
 * Event catalog for the append-only `user_events` ledger.
 *
 * ## Domains
 * - **Account** — session / onboarding (`USER_LOGGED_IN`, `ONBOARDING_COMPLETED`)
 * - **Wallet** — points / XP / admin adjustments (`WALLET_*`)
 * - **Progress** — mission / challenge / quest completion
 * - **Achievements** — badges and progress indicators
 * - **Behavioural** — evidence missions/challenges can count
 *   (`MEAL_*`, `SWAP_*`, `SHOPPING_*`, `PROCESSING_*`, `PACKAGING_*`,
 *   `FOOD_WASTE_*`, `NUTRITION_*`, `LEARNING_*`)
 *
 * Naming: `DOMAIN[_ENTITY]_ACTION` (SCREAMING_SNAKE), past tense for completed facts.
 *
 * ## Recording (`UserEventService.record`)
 * | Field | Rule |
 * |-------|------|
 * | `eventType` | Use `EventType.*` — encodes *what* happened. |
 * | `source` | Use `EventSource.*` — producing feature/channel. |
 * | `subject` | Primary entity; merged into `metadata.subject`. Prefer `EventSubjectType.*`. |
 * | `metadata` | Context only (ids, amounts, tags). Do not encode the event kind here. |
 * | `idempotencyKey` | Stable unique key when retries must not double-write. |
 * | `groupId` | Optional group scope. |
 *
 * ## Metadata shapes by family
 * - **Meal** — `{ mealId, mealType?, tags? }`
 * - **Swap** — `{ from, to, productId? }` (type already names the swap)
 * - **Shopping / processing / packaging** — `{ productId?, barcode?, score? }`
 * - **Learning** — `{ contentId?, contentType? }`
 * - **Wallet** — `{ currency, amount, reason }`
 * - **Onboarding** — `{ segment }`
 * - **Mission / challenge link** — optional `{ missionId? }` / `{ challengeId? }`
 *   on behavioural events; emit `MISSION_COMPLETED` / `CHALLENGE_COMPLETED`
 *   only when progress actually completes (do not double-count the same action).
 *
 * ## Subject
 * Stored under `metadata.subject` as `{ type, id? }`. Known types: {@link EventSubjectType}.
 */

/** What happened — shared across app features. */
export const EventType = {
  // ==========================================
  // ACCOUNT
  // ==========================================
  USER_LOGGED_IN: 'USER_LOGGED_IN',
  ONBOARDING_COMPLETED: 'ONBOARDING_COMPLETED',

  // ==========================================
  // WALLET
  // ==========================================
  WALLET_POINTS_AWARDED: 'WALLET_POINTS_AWARDED',
  WALLET_XP_AWARDED: 'WALLET_XP_AWARDED',
  WALLET_MANUAL_ADJUSTMENT: 'WALLET_MANUAL_ADJUSTMENT',

  // ==========================================
  // PROGRESS (missions, challenges, quests)
  // ==========================================
  MISSION_COMPLETED: 'MISSION_COMPLETED',
  CHALLENGE_COMPLETED: 'CHALLENGE_COMPLETED',
  QUEST_STARTED: 'QUEST_STARTED',
  QUEST_COMPLETED: 'QUEST_COMPLETED',

  // ==========================================
  // ACHIEVEMENTS
  // ==========================================
  BADGE_EARNED: 'BADGE_EARNED',
  PROGRESS_INDICATOR_UPDATED: 'PROGRESS_INDICATOR_UPDATED',

  // ==========================================
  // 1. MEAL & DIET PATTERNS
  // ==========================================
  MEAL_LOGGED: 'MEAL_LOGGED',
  MEAL_MEAT_CONSUMED: 'MEAL_MEAT_CONSUMED',
  MEAL_MEAT_FREE: 'MEAL_MEAT_FREE',
  MEAL_LEGUME_CONSUMED: 'MEAL_LEGUME_CONSUMED',
  MEAL_ALTERNATIVE_STAPLE: 'MEAL_ALTERNATIVE_STAPLE',
  MEAL_ANCIENT_GRAIN: 'MEAL_ANCIENT_GRAIN',
  MEAL_SUSTAINABLE_PLATE: 'MEAL_SUSTAINABLE_PLATE',

  // ==========================================
  // 2. SUBSTITUTIONS & SWAPS
  // ==========================================
  SWAP_BEEF_TO_PORK: 'SWAP_BEEF_TO_PORK',
  SWAP_BEEF_TO_CHICKEN: 'SWAP_BEEF_TO_CHICKEN',
  SWAP_BEEF_TO_LEGUMES: 'SWAP_BEEF_TO_LEGUMES',
  SWAP_PORK_TO_CHICKEN: 'SWAP_PORK_TO_CHICKEN',
  SWAP_PORK_TO_LEGUMES: 'SWAP_PORK_TO_LEGUMES',
  SWAP_CHICKEN_TO_LEGUMES: 'SWAP_CHICKEN_TO_LEGUMES',
  SWAP_SUGARY_DRINK_TO_WATER: 'SWAP_SUGARY_DRINK_TO_WATER',
  SWAP_SNACK_TO_FRUIT_NUTS: 'SWAP_SNACK_TO_FRUIT_NUTS',
  SWAP_SUGARY_CEREAL_TO_OATS: 'SWAP_SUGARY_CEREAL_TO_OATS',
  SWAP_READY_MEAL_TO_HOMECOOKED: 'SWAP_READY_MEAL_TO_HOMECOOKED',
  SWAP_PROCESSED_MEAT_TO_LEGUMES: 'SWAP_PROCESSED_MEAT_TO_LEGUMES',

  // ==========================================
  // 3. PRODUCT ORIGIN & SHOPPING
  // ==========================================
  SHOPPING_ORIGIN_CHECKED: 'SHOPPING_ORIGIN_CHECKED',
  SHOPPING_LOCAL_CHOSEN: 'SHOPPING_LOCAL_CHOSEN',
  SHOPPING_SEASONAL_CHOSEN: 'SHOPPING_SEASONAL_CHOSEN',
  SHOPPING_CERTIFICATION_CHOSEN: 'SHOPPING_CERTIFICATION_CHOSEN',
  SHOPPING_PACKAGING_INFO_CHECKED: 'SHOPPING_PACKAGING_INFO_CHECKED',
  SHOPPING_MULTICRITERIA_PURCHASE: 'SHOPPING_MULTICRITERIA_PURCHASE',

  // ==========================================
  // 4. FOOD PROCESSING & SCORES
  // ==========================================
  PROCESSING_NOVA_CHECKED: 'PROCESSING_NOVA_CHECKED',
  PROCESSING_INGREDIENTS_REVIEWED: 'PROCESSING_INGREDIENTS_REVIEWED',
  PROCESSING_GREENSCORE_CHECKED: 'PROCESSING_GREENSCORE_CHECKED',
  PROCESSING_INDICATORS_COMPARED: 'PROCESSING_INDICATORS_COMPARED',
  PROCESSING_PRODUCTION_METHOD_CHECKED: 'PROCESSING_PRODUCTION_METHOD_CHECKED',

  // ==========================================
  // 5. PACKAGING & CIRCULARITY
  // ==========================================
  PACKAGING_MATERIAL_OBSERVED: 'PACKAGING_MATERIAL_OBSERVED',
  PACKAGING_RECYCLING_LABEL_READ: 'PACKAGING_RECYCLING_LABEL_READ',
  PACKAGING_REUSABLE_SPOT_CHOSEN: 'PACKAGING_REUSABLE_SPOT_CHOSEN',
  PACKAGING_RECYCLABILITY_EVALUATED: 'PACKAGING_RECYCLABILITY_EVALUATED',
  PACKAGING_COMPARISON_MADE: 'PACKAGING_COMPARISON_MADE',
  PACKAGING_SMART_OBSERVED: 'PACKAGING_SMART_OBSERVED',

  // ==========================================
  // 6. FOOD WASTE PREVENTION
  // ==========================================
  FOOD_WASTE_HALF_PLATE_SAVED: 'FOOD_WASTE_HALF_PLATE_SAVED',
  FOOD_WASTE_FULL_PLATE_SAVED: 'FOOD_WASTE_FULL_PLATE_SAVED',
  FOOD_WASTE_EXPIRED_CONSUMED: 'FOOD_WASTE_EXPIRED_CONSUMED',
  FOOD_WASTE_STORAGE_INSTRUCTIONS_READ: 'FOOD_WASTE_STORAGE_INSTRUCTIONS_READ',
  FOOD_WASTE_MEAL_PLANNED: 'FOOD_WASTE_MEAL_PLANNED',
  FOOD_WASTE_FRIDGE_PANTRY_CHECKED: 'FOOD_WASTE_FRIDGE_PANTRY_CHECKED',
  FOOD_WASTE_FIFO_ORGANIZED: 'FOOD_WASTE_FIFO_ORGANIZED',

  // ==========================================
  // 7. NUTRITION & HEALTH
  // ==========================================
  NUTRITION_PROTEIN_INCLUDED: 'NUTRITION_PROTEIN_INCLUDED',
  NUTRITION_FRUIT_VEG_SERVING_ADDED: 'NUTRITION_FRUIT_VEG_SERVING_ADDED',
  NUTRITION_WHOLEGRAIN_CHOSEN: 'NUTRITION_WHOLEGRAIN_CHOSEN',
  NUTRITION_HIGH_FIBRE_MEAL: 'NUTRITION_HIGH_FIBRE_MEAL',
  NUTRITION_SALT_FREE_TABLE: 'NUTRITION_SALT_FREE_TABLE',
  NUTRITION_HEALTHY_FAT_CHOSEN: 'NUTRITION_HEALTHY_FAT_CHOSEN',
  NUTRITION_PROTEIN_VARIETY_LOGGED: 'NUTRITION_PROTEIN_VARIETY_LOGGED',
  NUTRITION_RAINBOW_COLOURS_LOGGED: 'NUTRITION_RAINBOW_COLOURS_LOGGED',
  NUTRITION_ADDED_SUGAR_AVOIDED: 'NUTRITION_ADDED_SUGAR_AVOIDED',
  NUTRITION_PLANT_DIVERSITY_COUNT: 'NUTRITION_PLANT_DIVERSITY_COUNT',

  // ==========================================
  // 8. LEARNING
  // ==========================================
  LEARNING_FACT_VIEWED: 'LEARNING_FACT_VIEWED',
  LEARNING_FOOTPRINT_COMPARED: 'LEARNING_FOOTPRINT_COMPARED',
  LEARNING_RECIPE_EXPLORED: 'LEARNING_RECIPE_EXPLORED',
  LEARNING_RECIPE_SHARED: 'LEARNING_RECIPE_SHARED',
} as const;

export type EventTypeValue = (typeof EventType)[keyof typeof EventType];

/**
 * Who produced the event (service / channel).
 * Prefer matching the feature that observed the action, not the consumer
 * (e.g. meal log → `MEAL_LOG`, even if a mission later counts it).
 */
export const EventSource = {
  API: 'api',
  ONBOARDING: 'onboarding',
  WALLET: 'wallet',
  SEED: 'seed',
  MEAL_LOG: 'meal_log',
  PANTRY: 'pantry',
  SHOPPING_LIST: 'shopping_list',
  LEARNING: 'learning',
  GAME: 'game',
  QUEST: 'quest',
  MISSION: 'mission',
  CHALLENGE: 'challenge',
  QUICK_ACTION: 'quick_action',
} as const;

export type EventSourceValue = (typeof EventSource)[keyof typeof EventSource];

/**
 * Known `metadata.subject.type` values for the primary entity the event is about.
 * Free-form strings are allowed for forward compatibility; prefer these when possible.
 */
export const EventSubjectType = {
  USER: 'USER',
  MEAL: 'MEAL',
  PRODUCT: 'PRODUCT',
  MISSION: 'MISSION',
  CHALLENGE: 'CHALLENGE',
  QUEST: 'QUEST',
  BADGE: 'BADGE',
  CONTENT: 'CONTENT',
  SEED: 'SEED',
} as const;

export type EventSubjectTypeValue =
  (typeof EventSubjectType)[keyof typeof EventSubjectType];

/** Primary entity reference merged into `metadata.subject` by `buildEventMetadata`. */
export interface EventSubject {
  type: EventSubjectTypeValue | string;
  id?: string | null;
}
