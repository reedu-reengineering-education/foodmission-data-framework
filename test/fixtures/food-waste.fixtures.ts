import { WasteReason, DetectionMethod, Unit } from '@prisma/client';

export const TEST_FOOD_WASTE = {
  id: 'food-waste-1',
  userId: 'user-1',
  pantryItemId: 'pantry-item-1',
  foodId: 'food-1',
  quantity: 1.5,
  unit: Unit.KG,
  wasteReason: WasteReason.EXPIRED,
  detectionMethod: DetectionMethod.MANUAL,
  notes: 'Found moldy in the fridge',
  costEstimate: 5.99,
  carbonFootprint: 1.25,
  wastedAt: new Date('2026-02-13T10:30:00.000Z'),
  createdAt: new Date('2026-02-13T10:30:00.000Z'),
  updatedAt: new Date('2026-02-13T10:30:00.000Z'),
};

export const TEST_FOOD_WASTE_2 = {
  id: 'food-waste-2',
  userId: 'user-1',
  pantryItemId: null,
  foodId: 'food-2',
  quantity: 0.5,
  unit: Unit.KG,
  wasteReason: WasteReason.SPOILED,
  detectionMethod: DetectionMethod.AUTOMATIC,
  notes: null,
  costEstimate: 2.5,
  carbonFootprint: 0.75,
  wastedAt: new Date('2026-02-14T15:00:00.000Z'),
  createdAt: new Date('2026-02-14T15:00:00.000Z'),
  updatedAt: new Date('2026-02-14T15:00:00.000Z'),
};

export const TEST_CREATE_FOOD_WASTE_DTO = {
  foodId: 'food-1',
  quantity: 1.5,
  unit: Unit.KG,
  wasteReason: WasteReason.EXPIRED,
  detectionMethod: DetectionMethod.MANUAL,
  notes: 'Test waste entry',
  costEstimate: 5.99,
  wastedAt: '2026-02-13T10:30:00.000Z',
};

export const TEST_UPDATE_FOOD_WASTE_DTO = {
  quantity: 2.0,
  notes: 'Updated notes',
};

export const TEST_QUERY_FOOD_WASTE_DTO = {
  page: 1,
  limit: 10,
  wasteReason: WasteReason.EXPIRED,
};

export const TEST_FOOD_WASTE_STATISTICS = {
  totalWaste: 10,
  totalCost: 50.0,
  totalCarbon: 15.5,
  wasteByReason: [
    { reason: WasteReason.EXPIRED, count: 5 },
    { reason: WasteReason.SPOILED, count: 3 },
    { reason: WasteReason.OTHER, count: 2 },
  ],
  wasteByMethod: [
    { method: DetectionMethod.MANUAL, count: 6 },
    { method: DetectionMethod.AUTOMATIC, count: 4 },
  ],
  mostWastedFoods: [
    { foodId: 'food-1', foodName: 'Test Food', totalQuantity: 5, count: 3 },
  ],
};

export const TEST_FOOD_WASTE_TRENDS = {
  data: [
    { date: '2026-02-13', totalWaste: 1.5, totalCost: 5.99, totalCarbon: 1.25, count: 1 },
    { date: '2026-02-14', totalWaste: 0.5, totalCost: 2.5, totalCarbon: 0.75, count: 1 },
  ],
  dateFrom: '2026-02-13',
  dateTo: '2026-02-14',
  interval: 'day' as const,
};

export const TEST_PAGINATED_FOOD_WASTE = {
  data: [TEST_FOOD_WASTE, TEST_FOOD_WASTE_2],
  total: 2,
  page: 1,
  limit: 10,
  totalPages: 1,
};
