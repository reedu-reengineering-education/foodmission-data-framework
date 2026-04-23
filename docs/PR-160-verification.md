# PR #160 — Recipe Recommendations & Shelf Life Expiry

## What this PR does

Adds pantry-based recipe recommendations and automatic expiry date calculation for pantry items.

**New endpoint:**
- `GET /api/v1/recipes/me/recommendations` — returns the authenticated user's recipes sorted by how many of their pantry ingredients appear and how many are expiring soon.

**Key changes:**

| Area | Change |
|------|--------|
| `FoodShelfLife` model | New table seeded from USDA FoodKeeper JSON (103 products, 14 categories) |
| `Food.shelfLifeId` / `FoodCategory.shelfLifeId` | FK links resolved at seed time — 260/262 foods (99%), 2328/2328 food categories (100%) linked |
| `PantryItem.expiryDateSource` | New field: `"auto_foodkeeper"` or `"manual"` |
| Auto-expiry priority chain | 1. FK shelf life lookup (O(1)) → 2. fuzzy name fallback → 3. manual override |
| `RecommendationsService` | Scores recipes by expiring + total pantry matches; derives expiring items in memory (no second DB query) |
| `RecipesRepository` | New `findCandidatesForRecommendation(foodIds, categoryIds, userId)` — includes user's own private recipes |
| FoodKeeper seeder | Replaced per-product `findUnique`+`upsert` loop with `createMany({ skipDuplicates })` |
| `db-e2e-helpers` | Guard against `undefined` DB URL before `PrismaClient` construction |

---

## Pre-requisites

- App running locally: `npm run dev` (port 3000)
- DB seeded: `npm run dev:reset` (runs migrations + full seed including FoodKeeper + shelf life linking)
- A valid JWT token from Keycloak (log in via `POST /api/v1/auth/login`)
- All requests: `Authorization: Bearer <token>`, `Content-Type: application/json`
- Base URL: `http://localhost:3000/api/v1`

---

## Setup (run once before all scenarios)

### S0-a — Get or create your pantry
```http
GET /api/v1/pantry
```
Note the `id` from the first result → `{pantryId}`.

### S0-b — Look up food IDs needed in scenarios
```http
GET /api/v1/foods?search=Milk
GET /api/v1/foods?search=Eggs
GET /api/v1/foods?search=Chicken
GET /api/v1/foods?search=Tomatoes
GET /api/v1/foods?search=Pasta
```
Note each `id` → `{milkFoodId}`, `{eggsFoodId}`, `{chickenFoodId}`, `{tomatoesFoodId}`, `{pastaFoodId}`.

> These foods are linked to FoodKeeper shelf life entries at seed time (Milk = 7d refrigerator, Eggs = 35d, Chicken pieces = 2d, Tomatoes = 14d, Pasta dried = pantry 730d).

---

## Scenario 1 — Auto-expiry via FK shelf life

**What it verifies:** When a food has a `shelfLifeId` FK and no `expiryDate` is provided, the system calculates the expiry date from the FoodKeeper record and sets `expiryDateSource: "auto_foodkeeper"`.

```http
POST /api/v1/pantry/{pantryId}/items
```
```json
{
  "foodId": "{milkFoodId}",
  "quantity": 1,
  "unit": "PIECES"
}
```

**Expected `201`:**
```json
{
  "expiryDate": "<~7 days from today>",
  "expiryDateSource": "auto_foodkeeper"
}
```

---

## Scenario 2 — Manual date overrides auto-expiry

**What it verifies:** When `expiryDate` is explicitly provided, it takes priority over the FK shelf life calculation and `expiryDateSource` is set to `"manual"`.

```http
POST /api/v1/pantry/{pantryId}/items
```
```json
{
  "foodId": "{milkFoodId}",
  "quantity": 1,
  "unit": "PIECES",
  "expiryDate": "2026-05-01"
}
```

**Expected `201`:**
```json
{
  "expiryDate": "2026-05-01T00:00:00.000Z",
  "expiryDateSource": "manual"
}
```

---

## Scenario 3 — No shelf life link, no auto-expiry

**What it verifies:** If a food has no `shelfLifeId` and no `expiryDate` is given, neither field is populated.

First create a food without a shelf life link:
```http
POST /api/v1/foods
```
```json
{
  "name": "Mystery Spice Blend",
  "unit": "G"
}
```
Note `id` → `{noShelfLifeFoodId}`.

```http
POST /api/v1/pantry/{pantryId}/items
```
```json
{
  "foodId": "{noShelfLifeFoodId}",
  "quantity": 1,
  "unit": "PIECES"
}
```

**Expected `201`:**
```json
{
  "expiryDate": null,
  "expiryDateSource": null
}
```

---

## Scenario 4 — Expiring items ranked first in recommendations

**What it verifies:** Recipes whose ingredients include pantry items expiring within the window are ranked above recipes with only non-expiring matches (`expiringMatchCount` drives sort order).

### Step 4a — Add item expiring soon (chicken, 2 days)
```http
POST /api/v1/pantry/{pantryId}/items
```
```json
{
  "foodId": "{chickenFoodId}",
  "quantity": 500,
  "unit": "G",
  "expiryDate": "2026-04-09"
}
```

### Step 4b — Add item expiring later (pasta, shelf-stable)
```json
{
  "foodId": "{pastaFoodId}",
  "quantity": 500,
  "unit": "G",
  "expiryDate": "2027-01-01"
}
```

### Step 4c — Create a recipe that uses both
```http
POST /api/v1/recipes
```
```json
{
  "title": "Chicken Pasta",
  "isPublic": true,
  "ingredients": [
    { "name": "Chicken pieces", "foodId": "{chickenFoodId}", "measure": "500g" },
    { "name": "Pasta", "foodId": "{pastaFoodId}", "measure": "200g" }
  ]
}
```

### Step 4d — Get recommendations
```http
GET /api/v1/recipes/me/recommendations?expiringWithinDays=7
```

**Expected `200`:** "Chicken Pasta" appears at the top with `expiringMatchCount: 1` (chicken is expiring) and `matchCount: 2`.

---

## Scenario 5 — Empty pantry returns immediately

**What it verifies:** When the user's pantry is empty the endpoint returns the empty-state response without querying recipe candidates.

Clear all pantry items (use `DELETE /api/v1/pantry/{pantryId}/items/{itemId}` for each), then:

```http
GET /api/v1/recipes/me/recommendations
```

**Expected `200`:**
```json
{
  "data": [],
  "expiringItemsCount": 0,
  "totalPantryItems": 0
}
```

---

## Scenario 6 — Private recipes included for owner, excluded for others

**What it verifies:** The `OR [{ isPublic: true }, { userId }]` fix means a user's own private recipes appear in their recommendations but not in other users' recommendations.

### Step 6a — As user A: create a private recipe
```http
POST /api/v1/recipes
```
```json
{
  "title": "My Secret Tomato Soup",
  "isPublic": false,
  "ingredients": [
    { "name": "Tomatoes", "foodId": "{tomatoesFoodId}", "measure": "4 medium" }
  ]
}
```

### Step 6b — Add tomatoes to user A's pantry (expiring soon)
```json
{
  "foodId": "{tomatoesFoodId}",
  "quantity": 4,
  "unit": "PIECES",
  "expiryDate": "2026-04-10"
}
```

### Step 6c — User A gets recommendations → private recipe appears
```http
GET /api/v1/recipes/me/recommendations
```
**Expected:** `data` contains `"My Secret Tomato Soup"`.

### Step 6d — User B adds tomatoes to their own pantry, gets recommendations → private recipe absent
```http
POST /api/v1/pantry/{pantryId}/items        # with user B token
```
```json
{
  "foodId": "{tomatoesFoodId}",
  "quantity": 2,
  "unit": "PIECES",
  "expiryDate": "2026-04-10"
}
```
```http
GET /api/v1/recipes/me/recommendations  # with user B token
```
**Expected:** `data` does **not** contain `"My Secret Tomato Soup"`.

---

## Scenario 7 — Query parameter bounds return 400

**What it verifies:** `expiringWithinDays` is capped at 365 and `limit` is capped at 50 by the DTO validators.

```http
GET /api/v1/recipes/me/recommendations?expiringWithinDays=366
```
**Expected `400 Bad Request`.**

```http
GET /api/v1/recipes/me/recommendations?limit=51
```
**Expected `400 Bad Request`.**

```http
GET /api/v1/recipes/me/recommendations?expiringWithinDays=3&limit=2
```
**Expected `200`** with `data.length <= 2`.

---

## Scenario 8 — Unauthenticated request returns 401

**What it verifies:** The endpoint is protected; no token → no access.

```http
GET /api/v1/recipes/me/recommendations
# No Authorization header
```

**Expected `401`:**
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```
