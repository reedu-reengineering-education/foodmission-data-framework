# FoodCategory REST API

Complete REST API implementation for managing food categories with NEVO nutritional data.

## 🎯 Features

- ✅ **GET** `/api/v1/food-categories` - List all categories (paginated, searchable)
- ✅ **GET** `/api/v1/food-categories/:id` - Get specific category by ID
- ✅ **GET** `/api/v1/food-categories/food-groups` - Get all unique food groups
- ✅ **POST** `/api/v1/food-categories` - Create new category (Admin only)
- ✅ **PATCH** `/api/v1/food-categories/:id` - Update category (Admin only)
- ✅ **DELETE** `/api/v1/food-categories/:id` - Delete category (Admin only)

## 📁 Structure

```
src/foodCategory/
├── controllers/
│   └── food-category.controller.ts    # REST endpoints with auth guards
├── services/
│   └── food-category.service.ts       # Business logic
├── repositories/
│   └── food-category.repository.ts    # Database access (Prisma)
├── dto/
│   ├── create-food-category.dto.ts    # Create validation
│   ├── update-food-category.dto.ts    # Update validation (partial)
│   ├── food-category-query.dto.ts     # Query params (search, pagination)
│   └── food-category-response.dto.ts  # Response schema
└── food-category.module.ts            # NestJS module
```

## 🔒 Authentication

- **Users** (`user` role): Can view all categories and search
- **Admins** (`admin` role): Full CRUD operations

## 🔍 Search & Filter

### Query Parameters

- `search` - Search in food name or synonym (case-insensitive)
- `foodGroup` - Filter by specific food group
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)

### Example Requests

```bash
# Get all categories (paginated)
GET /api/v1/food-categories?page=1&limit=20

# Search for potatoes
GET /api/v1/food-categories?search=potato

# Filter by food group
GET /api/v1/food-categories?foodGroup=Potatoes%20and%20tubers

# Get specific category
GET /api/v1/food-categories/abc-123-uuid

# Get all available food groups
GET /api/v1/food-categories/food-groups

# Admin: Create category
POST /api/v1/food-categories
{
  "nevoVersion": "NEVO-Online 2025 9.0",
  "foodGroup": "Vegetables",
  "nevoCode": 1234,
  "foodName": "Carrot, raw",
  "energyKcal": 41,
  "proteins": 0.93,
  "carbohydrates": 9.58,
  "fat": 0.24
}

# Admin: Update category
PATCH /api/v1/food-categories/abc-123-uuid
{
  "energyKcal": 42
}

# Admin: Delete category
DELETE /api/v1/food-categories/abc-123-uuid
```

## 📊 Response Format

### List Response

```json
{
  "items": [
    {
      "id": "abc-123-uuid",
      "nevoCode": 100,
      "foodName": "Potato, raw",
      "foodGroup": "Potatoes and tubers",
      "energyKcal": 77,
      "proteins": 2.02,
      "carbohydrates": 17.49,
      "fat": 0.09,
      ...
    }
  ],
  "total": 1500,
  "page": 1,
  "limit": 20,
  "totalPages": 75
}
```

### Single Category Response

All nutritional fields from NEVO dataset including:

- Energy (kJ, kcal)
- Macronutrients (protein, fat, carbs, fiber)
- Fatty acids (saturated, mono/polyunsaturated, omega-3/6, trans)
- Minerals (sodium, potassium, calcium, iron, zinc, etc.)
- Vitamins (A, D, E, K, C, B-complex, folate)
- Additional NEVO metadata (food group, traces, fortification)

## 🧪 Testing

Run FoodCategory tests:

```bash
npm test -- --testPathPatterns="food-category"
```

## 📝 Notes

- All endpoints require JWT authentication
- Admin operations require `admin` role in Keycloak
- Pagination prevents excessive data transfer
- Case-insensitive search improves UX
- Nutritional data follows NEVO 2025 standard
