export const TRANSLATABLE_ENTITY_TYPES = [
  'GenericFood',
  'Mission',
  'Challenge',
  'FoodFact',
  'Quiz',
  'QuizOption',
  'Quest',
  'MicroLearning',
  'Dimension',
  'Topic',
  'Survey',
  'Question',
] as const;

export type TranslatableEntityType = (typeof TRANSLATABLE_ENTITY_TYPES)[number];

export const ENTITY_TRANSLATABLE_FIELDS = {
  GenericFood: ['foodName', 'foodGroup', 'remark', 'synonym'] as const,
  Mission: ['title', 'goal', 'whyItMatters'] as const,
  Challenge: ['title', 'task', 'whyItMatters'] as const,
  FoodFact: ['body'] as const,
  Quiz: ['question', 'explanation'] as const,
  QuizOption: ['text'] as const,
  Quest: ['name', 'title', 'description'] as const,
  MicroLearning: ['title', 'body', 'tips'] as const,
  Dimension: ['name'] as const,
  Topic: ['name'] as const,
  Survey: ['title', 'description'] as const,
  Question: ['text'] as const,
} as const;

export type EntityTranslatableField<T extends TranslatableEntityType> =
  (typeof ENTITY_TRANSLATABLE_FIELDS)[T][number];

export function isTranslatableEntityType(
  value: string,
): value is TranslatableEntityType {
  return (TRANSLATABLE_ENTITY_TYPES as readonly string[]).includes(value);
}

export function isValidFieldForEntity(
  entityType: TranslatableEntityType,
  field: string,
): boolean {
  return (ENTITY_TRANSLATABLE_FIELDS[entityType] as readonly string[]).includes(
    field,
  );
}
