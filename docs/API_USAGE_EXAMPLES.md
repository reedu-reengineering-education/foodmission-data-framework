# API Usage Examples

This document provides comprehensive examples of how to use the FOODMISSION Data Framework API.

## Table of Contents

- [Authentication](#authentication)
- [Food Management](#food-management)
- [Category Management](#category-management)
- [User Management](#user-management)
- [Meal Logging](#meal-logging)
- [OpenFoodFacts Integration](#openfoodfacts-integration)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)

## Authentication

### Login

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "user@example.com",
    "password": "password123"
  }'
```

**Response:**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

### Get User Profile

```bash
curl -X GET http://localhost:3000/api/v1/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**

```json
{
  "id": "user-uuid",
  "keycloakId": "keycloak-user-id",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

## Food Management

### List Foods

```bash
# Basic listing
curl -X GET http://localhost:3000/api/v1/foods \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# With pagination and search
curl -X GET "http://localhost:3000/api/v1/foods?page=1&limit=10&search=banana" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# With OpenFoodFacts data
curl -X GET "http://localhost:3000/api/v1/foods?includeNutrition=true" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**

```json
{
  "data": [
    {
      "id": "food-uuid",
      "name": "Organic Banana",
      "description": "Fresh organic banana",
      "barcode": "1234567890123",
      "openFoodFactsId": "3017620422003",
      "category": {
        "id": "category-uuid",
        "name": "Fruits",
        "description": "Fresh fruits"
      },
      "nutrition": {
        "calories": 89,
        "protein": 1.1,
        "carbohydrates": 22.8,
        "fat": 0.3,
        "fiber": 2.6,
        "sugar": 12.2,
        "sodium": 1,
        "unit": "per 100g",
        "source": "openfoodfacts"
      },
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

### Create Food Item

```bash
curl -X POST http://localhost:3000/api/v1/foods \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Organic Banana",
    "description": "Fresh organic banana from local farm",
    "barcode": "1234567890123",
    "openFoodFactsId": "3017620422003",
    "categoryId": "category-uuid"
  }'
```

**Response:**

```json
{
  "id": "food-uuid",
  "name": "Organic Banana",
  "description": "Fresh organic banana from local farm",
  "barcode": "1234567890123",
  "openFoodFactsId": "3017620422003",
  "categoryId": "category-uuid",
  "createdBy": "user-uuid",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

### Get Food by ID

```bash
curl -X GET http://localhost:3000/api/v1/foods/food-uuid \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# With nutrition data
curl -X GET "http://localhost:3000/api/v1/foods/food-uuid?includeNutrition=true" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Food by Barcode

```bash
curl -X GET http://localhost:3000/api/v1/foods/barcode/1234567890123 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Update Food Item

```bash
curl -X PUT http://localhost:3000/api/v1/foods/food-uuid \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Premium Organic Banana",
    "description": "Premium organic banana with enhanced nutrition"
  }'
```

### Delete Food Item

```bash
curl -X DELETE http://localhost:3000/api/v1/foods/food-uuid \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## User Management

### Get User Profile

```bash
curl -X GET http://localhost:3000/api/v1/users/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Update User Profile

```bash
curl -X PUT http://localhost:3000/api/v1/users/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "firstName": "Jane",
    "lastName": "Smith"
  }'
```

### Get User Preferences

```bash
curl -X GET http://localhost:3000/api/v1/users/preferences \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**

```json
{
  "id": "preferences-uuid",
  "userId": "user-uuid",
  "dietaryRestrictions": ["vegetarian", "gluten-free"],
  "allergies": ["nuts", "dairy"],
  "preferredCategories": ["Fruits", "Vegetables", "Grains"]
}
```

### Update User Preferences

```bash
curl -X PUT http://localhost:3000/api/v1/users/preferences \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "dietaryRestrictions": ["vegan", "organic"],
    "allergies": ["shellfish"],
    "preferredCategories": ["Fruits", "Vegetables"]
  }'
```

## Meal Logging

The Meal Logging API enables users to track their food consumption in a digital food diary. Each log records which meal was consumed, when, and contextual information like whether it was eaten out or came from pantry items.

### Create a Meal Log

Record a meal consumption event:

```bash
curl -X POST http://localhost:3000/api/v1/meal-logs \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mealId": "meal-uuid",
    "typeOfMeal": "BREAKFAST",
    "timestamp": "2025-02-05T08:00:00Z",
    "mealFromPantry": true,
    "eatenOut": false
  }'
```

**Response:**
```json
{
  "id": "log-uuid",
  "userId": "user-uuid",
  "mealId": "meal-uuid",
  "typeOfMeal": "BREAKFAST",
  "timestamp": "2025-02-05T08:00:00.000Z",
  "mealFromPantry": true,
  "eatenOut": false,
  "createdAt": "2025-02-05T10:00:00.000Z",
  "updatedAt": "2025-02-05T10:00:00.000Z"
}
```

**Field Descriptions:**
- `mealId` (required): UUID of the meal being logged
- `typeOfMeal` (required): Type of meal - `BREAKFAST`, `LUNCH`, `DINNER`, `SNACK`, or `SPECIAL_DRINKS`
- `timestamp` (optional): When the meal was consumed (defaults to current time)
- `mealFromPantry` (optional): Whether meal came from pantry items (auto-detected if meal has `pantryItemId`)
- `eatenOut` (optional): Whether meal was eaten outside home

### List Meal Logs

Retrieve your meal history with filtering:

```bash
# Get all meal logs
curl -X GET "http://localhost:3000/api/v1/meal-logs?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Filter by meal type
curl -X GET "http://localhost:3000/api/v1/meal-logs?typeOfMeal=BREAKFAST" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Filter by date range
curl -X GET "http://localhost:3000/api/v1/meal-logs?dateFrom=2025-02-01&dateTo=2025-02-05" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Filter meals eaten out
curl -X GET "http://localhost:3000/api/v1/meal-logs?eatenOut=true" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Filter meals from pantry
curl -X GET "http://localhost:3000/api/v1/meal-logs?mealFromPantry=true" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "data": [
    {
      "id": "log-uuid-1",
      "userId": "user-uuid",
      "mealId": "meal-uuid",
      "typeOfMeal": "BREAKFAST",
      "timestamp": "2025-02-05T08:00:00.000Z",
      "mealFromPantry": true,
      "eatenOut": false
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 10,
  "totalPages": 5
}
```

### Get Meal Log by ID

```bash
curl -X GET http://localhost:3000/api/v1/meal-logs/{id} \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Update Meal Log

```bash
curl -X PATCH http://localhost:3000/api/v1/meal-logs/{id} \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "typeOfMeal": "BRUNCH",
    "timestamp": "2025-02-05T10:30:00Z",
    "eatenOut": true
  }'
```

### Delete Meal Log

```bash
curl -X DELETE http://localhost:3000/api/v1/meal-logs/{id} \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Common Use Cases

**Log today's breakfast (timestamp defaults to now):**
```bash
curl -X POST http://localhost:3000/api/v1/meal-logs \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mealId": "oatmeal-meal-id",
    "typeOfMeal": "BREAKFAST"
  }'
```

**View this week's meals:**
```bash
curl -X GET "http://localhost:3000/api/v1/meal-logs?dateFrom=2025-01-29&dateTo=2025-02-05" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Track restaurant meals this month:**
```bash
curl -X GET "http://localhost:3000/api/v1/meal-logs?eatenOut=true&dateFrom=2025-02-01&dateTo=2025-02-28" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## OpenFoodFacts Integration

### Import Food from OpenFoodFacts

```bash
curl -X POST http://localhost:3000/api/v1/foods/import/openfoodfacts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "barcode": "3017620422003",
    "categoryId": "category-uuid"
  }'
```

**Response:**

```json
{
  "id": "food-uuid",
  "name": "Nutella",
  "description": "Hazelnut spread with cocoa",
  "barcode": "3017620422003",
  "openFoodFactsId": "3017620422003",
  "categoryId": "category-uuid",
  "nutrition": {
    "calories": 539,
    "protein": 6.3,
    "carbohydrates": 57.5,
    "fat": 30.9,
    "fiber": 0,
    "sugar": 56.3,
    "sodium": 0.107,
    "unit": "per 100g",
    "source": "openfoodfacts"
  },
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

### Search OpenFoodFacts

```bash
curl -X GET "http://localhost:3000/api/v1/foods/search/openfoodfacts?query=chocolate&categories=snacks" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**

```json
{
  "products": [
    {
      "barcode": "3017620422003",
      "name": "Nutella",
      "brands": "Ferrero",
      "categories": "Spreads, Sweet spreads, Cocoa and hazelnuts spreads",
      "nutrition": {
        "calories": 539,
        "protein": 6.3,
        "carbohydrates": 57.5,
        "fat": 30.9
      }
    }
  ],
  "count": 1,
  "page": 1
}
```

## Health Checks and Monitoring

### Health Check

```bash
curl -X GET http://localhost:3000/api/v1/health
```

**Response:**

```json
{
  "status": "ok",
  "info": {
    "database": {
      "status": "up",
      "responseTime": 5
    },
    "openfoodfacts": {
      "status": "up",
      "responseTime": 120
    }
  },
  "error": {},
  "details": {
    "database": {
      "status": "up",
      "responseTime": 5
    },
    "openfoodfacts": {
      "status": "up",
      "responseTime": 120
    }
  }
}
```

### Readiness Check

```bash
curl -X GET http://localhost:3000/api/v1/health/readiness
```

### Liveness Check

```bash
curl -X GET http://localhost:3000/api/v1/health/liveness
```

### Metrics

```bash
curl -X GET http://localhost:3000/api/v1/metrics
```

**Response (Prometheus format):**

```
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/api/v1/foods",status_code="200"} 42

# HELP http_request_duration_seconds HTTP request duration in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{method="GET",route="/api/v1/foods",le="0.1"} 30
```

## Error Handling

### Validation Errors

```bash
curl -X POST http://localhost:3000/api/v1/foods \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "",
    "categoryId": "invalid-uuid"
  }'
```

**Response (400 Bad Request):**

```json
{
  "statusCode": 400,
  "message": ["name should not be empty", "categoryId must be a valid UUID"],
  "error": "Bad Request",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "path": "/api/v1/foods",
  "correlationId": "req-12345"
}
```

### Not Found Errors

```bash
curl -X GET http://localhost:3000/api/v1/foods/non-existent-uuid \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response (404 Not Found):**

```json
{
  "statusCode": 404,
  "message": "Food with ID 'non-existent-uuid' not found",
  "error": "Not Found",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "path": "/api/v1/foods/non-existent-uuid",
  "correlationId": "req-12346"
}
```

### Authentication Errors

```bash
curl -X GET http://localhost:3000/api/v1/foods
```

**Response (401 Unauthorized):**

```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "path": "/api/v1/foods",
  "correlationId": "req-12347"
}
```

### Server Errors

**Response (500 Internal Server Error):**

```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "error": "Internal Server Error",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "path": "/api/v1/foods",
  "correlationId": "req-12348"
}
```

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Default**: 100 requests per minute per IP
- **Authenticated users**: 1000 requests per minute per user
- **Admin users**: 5000 requests per minute per user

### Rate Limit Headers

```bash
curl -I http://localhost:3000/api/v1/foods \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response Headers:**

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

### Rate Limit Exceeded

**Response (429 Too Many Requests):**

```json
{
  "statusCode": 429,
  "message": "Rate limit exceeded. Please try again later.",
  "error": "Too Many Requests",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "path": "/api/v1/foods",
  "correlationId": "req-12349"
}
```

## JavaScript/TypeScript SDK Example

```typescript
import axios from 'axios';

class FOODMISSIONAPI {
  private baseURL = 'http://localhost:3000/api/v1';
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  async getFoods(params?: {
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: string;
    includeNutrition?: boolean;
  }) {
    const response = await axios.get(`${this.baseURL}/foods`, {
      headers: this.headers,
      params,
    });
    return response.data;
  }

  async createFood(food: {
    name: string;
    description?: string;
    barcode?: string;
    openFoodFactsId?: string;
    categoryId: string;
  }) {
    const response = await axios.post(`${this.baseURL}/foods`, food, {
      headers: this.headers,
    });
    return response.data;
  }

  async importFromOpenFoodFacts(barcode: string, categoryId: string) {
    const response = await axios.post(
      `${this.baseURL}/foods/import/openfoodfacts`,
      { barcode, categoryId },
      { headers: this.headers },
    );
    return response.data;
  }
}

// Usage
const api = new FOODMISSIONAPI('your-jwt-token');

// Get foods
const foods = await api.getFoods({
  page: 1,
  limit: 10,
  search: 'banana',
  includeNutrition: true,
});

// Create food
const newFood = await api.createFood({
  name: 'Organic Apple',
  description: 'Fresh organic apple',
  categoryId: 'category-uuid',
});

// Import from OpenFoodFacts
const importedFood = await api.importFromOpenFoodFacts(
  '3017620422003',
  'category-uuid',
);
```

## Python SDK Example

```python
import requests
from typing import Optional, Dict, Any

class FOODMISSIONAPI:
    def __init__(self, token: str, base_url: str = "http://localhost:3000/api/v1"):
        self.base_url = base_url
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

    def get_foods(self, page: int = 1, limit: int = 10, search: Optional[str] = None,
                  category_id: Optional[str] = None, include_nutrition: bool = False) -> Dict[str, Any]:
        params = {
            "page": page,
            "limit": limit,
            "includeNutrition": include_nutrition
        }
        if search:
            params["search"] = search
        if category_id:
            params["categoryId"] = category_id

        response = requests.get(f"{self.base_url}/foods", headers=self.headers, params=params)
        response.raise_for_status()
        return response.json()

    def create_food(self, name: str, category_id: str, description: Optional[str] = None,
                    barcode: Optional[str] = None, open_food_facts_id: Optional[str] = None) -> Dict[str, Any]:
        data = {
            "name": name,
            "categoryId": category_id
        }
        if description:
            data["description"] = description
        if barcode:
            data["barcode"] = barcode
        if open_food_facts_id:
            data["openFoodFactsId"] = open_food_facts_id

        response = requests.post(f"{self.base_url}/foods", headers=self.headers, json=data)
        response.raise_for_status()
        return response.json()

    def import_from_openfoodfacts(self, barcode: str, category_id: str) -> Dict[str, Any]:
        data = {
            "barcode": barcode,
            "categoryId": category_id
        }
        response = requests.post(
            f"{self.base_url}/foods/import/openfoodfacts",
            headers=self.headers,
            json=data
        )
        response.raise_for_status()
        return response.json()

# Usage
api = FOODMISSIONAPI("your-jwt-token")

# Get foods
foods = api.get_foods(page=1, limit=10, search="banana", include_nutrition=True)

# Create food
new_food = api.create_food(
    name="Organic Apple",
    description="Fresh organic apple",
    category_id="category-uuid"
)

# Import from OpenFoodFacts
imported_food = api.import_from_openfoodfacts("3017620422003", "category-uuid")
```

This documentation provides comprehensive examples for integrating with the FOODMISSION Data Framework API across different programming languages and use cases.
