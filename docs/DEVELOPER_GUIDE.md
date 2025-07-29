# Developer Guide

This guide provides comprehensive information for developers working on the FOODMISSION Data Framework.

## Table of Contents

- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Architecture Overview](#architecture-overview)
- [Database Management](#database-management)
- [Testing Strategy](#testing-strategy)
- [Code Standards](#code-standards)
- [Contributing](#contributing)
- [Debugging](#debugging)
- [Performance Optimization](#performance-optimization)

## Getting Started

### Prerequisites

- **Node.js** 18+
- **Docker** and Docker Compose
- **Git**
- **VSCode** (recommended) with Dev Containers extension

### Development Setup

#### Option 1: DevContainer (Recommended)

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd foodmission-data-framework
   ```

2. Open in VSCode and reopen in container:
   ```bash
   code .
   # Press Ctrl+Shift+P and select "Dev Containers: Reopen in Container"
   ```

3. The DevContainer will automatically:
   - Install all dependencies
   - Start database and Redis services
   - Run database migrations
   - Seed the database

#### Option 2: Manual Setup

1. Clone and install dependencies:
   ```bash
   git clone <repository-url>
   cd foodmission-data-framework
   npm install
   ```

2. Start services:
   ```bash
   npm run docker:up
   ```

3. Set up database:
   ```bash
   npm run db:generate
   npm run db:migrate:deploy
   npm run db:seed:dev
   ```

4. Start development server:
   ```bash
   npm run start:dev
   ```

### Environment Configuration

Create your development environment file:

```bash
cp .env.example .env
```

Key environment variables for development:

```env
NODE_ENV=development
DATABASE_URL=postgresql://postgres:password@localhost:5432/foodmission_dev
DATABASE_URL_TEST=postgresql://postgres:password@localhost:5432/foodmission_test
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev-jwt-secret-change-in-production
LOG_LEVEL=debug
```

## Project Structure

```
foodmission-data-framework/
├── .devcontainer/          # DevContainer configuration
├── .github/               # GitHub Actions workflows
├── docs/                  # Documentation
├── k8s/                   # Kubernetes manifests
├── prisma/                # Database schema and migrations
│   ├── migrations/        # Database migrations
│   ├── seeds/            # Database seed files
│   └── schema.prisma     # Prisma schema
├── scripts/              # Utility scripts
├── src/                  # Application source code
│   ├── auth/             # Authentication module
│   ├── cache/            # Caching services
│   ├── common/           # Shared utilities
│   ├── database/         # Database configuration
│   ├── food/             # Food management module
│   ├── health/           # Health checks
│   ├── monitoring/       # Metrics and monitoring
│   ├── security/         # Security services
│   ├── user/             # User management module
│   └── main.ts           # Application entry point
├── test/                 # Test files
│   ├── __mocks__/        # Test mocks
│   ├── *.e2e-spec.ts     # End-to-end tests
│   ├── *.integration.spec.ts # Integration tests
│   └── setup.ts          # Test setup
├── docker-compose.dev.yml # Development services
├── Dockerfile            # Container definition
├── jest.config.js        # Jest configuration
├── package.json          # Dependencies and scripts
└── tsconfig.json         # TypeScript configuration
```

### Module Structure

Each module follows a consistent structure:

```
src/module-name/
├── controllers/          # HTTP controllers
├── dto/                 # Data Transfer Objects
├── entities/            # Database entities (if needed)
├── interfaces/          # TypeScript interfaces
├── repositories/        # Data access layer
├── services/            # Business logic
├── module-name.module.ts # NestJS module definition
└── *.spec.ts            # Unit tests
```

## Development Workflow

### Daily Development

1. **Start development environment:**
   ```bash
   npm run start:dev
   ```

2. **Run tests in watch mode:**
   ```bash
   npm run test:watch
   ```

3. **Check code quality:**
   ```bash
   npm run lint
   npm run format
   ```

### Feature Development

1. **Create feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Implement feature with tests:**
   - Write unit tests for services
   - Write integration tests for repositories
   - Write e2e tests for controllers

3. **Run full test suite:**
   ```bash
   npm run test:all
   ```

4. **Create pull request:**
   - Ensure all tests pass
   - Update documentation if needed
   - Follow conventional commit format

### Database Changes

1. **Modify Prisma schema:**
   ```typescript
   // prisma/schema.prisma
   model NewEntity {
     id        String   @id @default(cuid())
     name      String
     createdAt DateTime @default(now())
   }
   ```

2. **Generate migration:**
   ```bash
   npm run db:migrate
   ```

3. **Update seed files if needed:**
   ```typescript
   // prisma/seeds/new-entity.ts
   export async function seedNewEntity(prisma: PrismaClient) {
     // Seed logic
   }
   ```

## Architecture Overview

### Application Architecture

The application follows a layered architecture:

```
┌─────────────────────────────────────┐
│           Controllers               │ ← HTTP layer
├─────────────────────────────────────┤
│            Services                 │ ← Business logic
├─────────────────────────────────────┤
│          Repositories               │ ← Data access
├─────────────────────────────────────┤
│            Database                 │ ← Persistence
└─────────────────────────────────────┘
```

### Key Patterns

#### Dependency Injection

```typescript
@Injectable()
export class FoodService {
  constructor(
    private readonly foodRepository: FoodRepository,
    private readonly openFoodFactsService: OpenFoodFactsService,
    private readonly cacheService: CacheService,
  ) {}
}
```

#### Repository Pattern

```typescript
@Injectable()
export class FoodRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(options: FindAllOptions): Promise<Food[]> {
    return this.prisma.food.findMany({
      where: options.where,
      include: options.include,
      skip: options.skip,
      take: options.take,
    });
  }
}
```

#### DTO Validation

```typescript
export class CreateFoodDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Food name' })
  name: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ description: 'Food description', required: false })
  description?: string;

  @IsUUID()
  @ApiProperty({ description: 'Category ID' })
  categoryId: string;
}
```

### Error Handling

#### Custom Exceptions

```typescript
export class FoodNotFoundException extends BusinessException {
  constructor(id: string) {
    super(`Food with ID '${id}' not found`, 'FOOD_NOT_FOUND', { id });
  }
}
```

#### Global Exception Filter

```typescript
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const errorInfo = ErrorUtils.extractErrorInfo(exception);
    
    response.status(errorInfo.statusCode).json({
      statusCode: errorInfo.statusCode,
      message: errorInfo.message,
      error: errorInfo.error,
      timestamp: new Date().toISOString(),
      path: request.url,
      correlationId: this.getCorrelationId(request),
    });
  }
}
```

## Database Management

### Prisma Schema

The database schema is defined in `prisma/schema.prisma`:

```prisma
model Food {
  id                String   @id @default(cuid())
  name              String
  description       String?
  barcode           String?  @unique
  openFoodFactsId   String?  @unique
  categoryId        String
  category          FoodCategory @relation(fields: [categoryId], references: [id])
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  createdBy         String

  @@map("foods")
}
```

### Migrations

#### Creating Migrations

```bash
# Create a new migration
npm run db:migrate

# Apply migrations to production
npm run db:migrate:deploy

# Reset database (development only)
npm run db:migrate:reset
```

#### Migration Best Practices

1. **Always review generated migrations**
2. **Test migrations on a copy of production data**
3. **Use descriptive migration names**
4. **Consider data migration scripts for complex changes**

### Seeding

#### Development Seeds

```typescript
// prisma/seeds/foods.ts
export async function seedFoods(prisma: PrismaClient) {
  const categories = await prisma.foodCategory.findMany();
  
  const foods = [
    {
      name: 'Organic Banana',
      description: 'Fresh organic banana',
      barcode: '1234567890123',
      categoryId: categories.find(c => c.name === 'Fruits')?.id,
    },
    // More foods...
  ];

  for (const food of foods) {
    await prisma.food.upsert({
      where: { barcode: food.barcode },
      update: food,
      create: food,
    });
  }
}
```

#### Running Seeds

```bash
# Seed development database
npm run db:seed:dev

# Seed test database
npm run db:seed:test

# Seed production database (be careful!)
npm run db:seed
```

## Testing Strategy

### Test Types

#### Unit Tests

Test individual components in isolation:

```typescript
// src/food/services/food.service.spec.ts
describe('FoodService', () => {
  let service: FoodService;
  let repository: jest.Mocked<FoodRepository>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        FoodService,
        {
          provide: FoodRepository,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<FoodService>(FoodService);
    repository = module.get(FoodRepository);
  });

  it('should create food successfully', async () => {
    const createDto = { name: 'Test Food', categoryId: 'cat-1' };
    const expectedFood = { id: '1', ...createDto };

    repository.create.mockResolvedValue(expectedFood);

    const result = await service.create(createDto);

    expect(result).toEqual(expectedFood);
    expect(repository.create).toHaveBeenCalledWith(createDto);
  });
});
```

#### Integration Tests

Test module interactions with real database:

```typescript
// test/food.integration.spec.ts
describe('Food Integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get<PrismaService>(PrismaService);
    
    await app.init();
  });

  it('should create and retrieve food', async () => {
    const category = await prisma.foodCategory.create({
      data: { name: 'Test Category' },
    });

    const foodData = {
      name: 'Test Food',
      categoryId: category.id,
    };

    const food = await prisma.food.create({ data: foodData });
    const retrieved = await prisma.food.findUnique({ where: { id: food.id } });

    expect(retrieved).toBeDefined();
    expect(retrieved.name).toBe(foodData.name);
  });
});
```

#### End-to-End Tests

Test complete API workflows:

```typescript
// test/food.e2e-spec.ts
describe('Food (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/foods (POST)', () => {
    return request(app.getHttpServer())
      .post('/api/v1/foods')
      .send({
        name: 'Test Food',
        categoryId: 'valid-category-id',
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.name).toBe('Test Food');
      });
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test types
npm run test:unit
npm run test:integration
npm run test:e2e

# Run tests with coverage
npm run test:cov

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- food.service.spec.ts
```

### Test Utilities

#### Test Data Factory

```typescript
// test/factories/food.factory.ts
export class FoodFactory {
  static create(overrides: Partial<Food> = {}): Food {
    return {
      id: faker.string.uuid(),
      name: faker.commerce.productName(),
      description: faker.commerce.productDescription(),
      barcode: faker.string.numeric(13),
      categoryId: faker.string.uuid(),
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: faker.string.uuid(),
      ...overrides,
    };
  }

  static createMany(count: number, overrides: Partial<Food> = {}): Food[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }
}
```

#### Database Helpers

```typescript
// test/helpers/database.helper.ts
export class DatabaseHelper {
  static async cleanDatabase(prisma: PrismaService) {
    await prisma.food.deleteMany();
    await prisma.foodCategory.deleteMany();
    await prisma.user.deleteMany();
  }

  static async seedTestData(prisma: PrismaService) {
    const category = await prisma.foodCategory.create({
      data: { name: 'Test Category' },
    });

    return { category };
  }
}
```

## Code Standards

### TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### ESLint Configuration

```javascript
// eslint.config.mjs
export default [
  {
    rules: {
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/explicit-function-return-type': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
];
```

### Naming Conventions

- **Files**: kebab-case (`food.service.ts`)
- **Classes**: PascalCase (`FoodService`)
- **Methods/Variables**: camelCase (`findById`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRY_ATTEMPTS`)
- **Interfaces**: PascalCase with 'I' prefix (`IFoodRepository`)

### Code Organization

#### Service Structure

```typescript
@Injectable()
export class FoodService {
  constructor(
    private readonly foodRepository: FoodRepository,
    private readonly openFoodFactsService: OpenFoodFactsService,
  ) {}

  // Public methods first
  async create(createFoodDto: CreateFoodDto): Promise<Food> {
    // Implementation
  }

  async findAll(options: FindAllOptions): Promise<PaginatedResult<Food>> {
    // Implementation
  }

  // Private methods last
  private async validateCategory(categoryId: string): Promise<void> {
    // Implementation
  }
}
```

#### Error Handling

```typescript
// Always use specific error types
throw new FoodNotFoundException(id);

// Not generic errors
throw new Error('Food not found');
```

#### Logging

```typescript
@Injectable()
export class FoodService {
  private readonly logger = new Logger(FoodService.name);

  async create(createFoodDto: CreateFoodDto): Promise<Food> {
    this.logger.log(`Creating food: ${createFoodDto.name}`);
    
    try {
      const food = await this.foodRepository.create(createFoodDto);
      this.logger.log(`Food created successfully: ${food.id}`);
      return food;
    } catch (error) {
      this.logger.error(`Failed to create food: ${error.message}`, error.stack);
      throw error;
    }
  }
}
```

## Contributing

### Pull Request Process

1. **Create feature branch:**
   ```bash
   git checkout -b feature/your-feature
   ```

2. **Make changes with tests:**
   - Write unit tests for new functionality
   - Update integration tests if needed
   - Add e2e tests for new endpoints

3. **Run quality checks:**
   ```bash
   npm run lint
   npm run format
   npm run test:all
   ```

4. **Commit with conventional format:**
   ```bash
   git commit -m "feat: add food barcode scanning"
   git commit -m "fix: resolve database connection issue"
   git commit -m "docs: update API documentation"
   ```

5. **Create pull request:**
   - Fill out PR template
   - Link related issues
   - Request appropriate reviewers

### Code Review Guidelines

#### For Authors

- Keep PRs small and focused
- Write clear commit messages
- Include tests for new functionality
- Update documentation as needed

#### For Reviewers

- Check for code quality and standards
- Verify test coverage
- Test functionality locally
- Provide constructive feedback

## Debugging

### Development Debugging

#### VSCode Debug Configuration

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug NestJS",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/src/main.ts",
      "args": [],
      "runtimeArgs": ["-r", "ts-node/register"],
      "env": {
        "NODE_ENV": "development"
      },
      "console": "integratedTerminal",
      "restart": true,
      "protocol": "inspector"
    }
  ]
}
```

#### Debug with Breakpoints

1. Set breakpoints in VSCode
2. Run debug configuration
3. Make API requests to trigger breakpoints

#### Debug Tests

```bash
# Debug specific test
npm run test:debug -- food.service.spec.ts

# Debug with VSCode
# Set breakpoints and run "Debug Jest Tests" configuration
```

### Production Debugging

#### Log Analysis

```bash
# View application logs
kubectl logs -f deployment/foodmission-api -n foodmission

# Search for specific errors
kubectl logs deployment/foodmission-api -n foodmission | grep "ERROR"

# View logs with correlation ID
kubectl logs deployment/foodmission-api -n foodmission | grep "req-12345"
```

#### Health Checks

```bash
# Check application health
curl http://localhost:3000/api/v1/health

# Check specific components
curl http://localhost:3000/api/v1/health/database
curl http://localhost:3000/api/v1/health/openfoodfacts
```

#### Performance Monitoring

```bash
# View metrics
curl http://localhost:3000/api/v1/metrics

# Check memory usage
kubectl top pods -n foodmission

# Check database performance
kubectl exec -it deployment/foodmission-api -n foodmission -- npm run db:studio
```

## Performance Optimization

### Database Optimization

#### Query Optimization

```typescript
// Use select to limit fields
const foods = await this.prisma.food.findMany({
  select: {
    id: true,
    name: true,
    category: {
      select: {
        id: true,
        name: true,
      },
    },
  },
});

// Use pagination
const foods = await this.prisma.food.findMany({
  skip: (page - 1) * limit,
  take: limit,
});

// Use indexes for filtering
const foods = await this.prisma.food.findMany({
  where: {
    categoryId: categoryId, // Indexed field
  },
});
```

#### Connection Pooling

```typescript
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  
  // Connection pooling
  connection_limit = 20
  pool_timeout = 20
  socket_timeout = 60
}
```

### Caching Strategy

#### Service-Level Caching

```typescript
@Injectable()
export class FoodService {
  @Cache({ ttl: 300 }) // 5 minutes
  async findAll(options: FindAllOptions): Promise<Food[]> {
    return this.foodRepository.findAll(options);
  }

  async create(createFoodDto: CreateFoodDto): Promise<Food> {
    const food = await this.foodRepository.create(createFoodDto);
    
    // Invalidate cache
    await this.cacheService.del('foods:*');
    
    return food;
  }
}
```

#### Redis Caching

```typescript
@Injectable()
export class CacheService {
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl: number = 300,
  ): Promise<T> {
    const cached = await this.redis.get(key);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const result = await factory();
    await this.redis.setex(key, ttl, JSON.stringify(result));
    
    return result;
  }
}
```

### Memory Optimization

#### Streaming Large Datasets

```typescript
async findAllStream(): Promise<Readable> {
  return new Readable({
    objectMode: true,
    async read() {
      const batch = await prisma.food.findMany({
        skip: this.offset,
        take: 100,
      });
      
      for (const food of batch) {
        this.push(food);
      }
      
      if (batch.length === 0) {
        this.push(null); // End stream
      }
      
      this.offset += batch.length;
    },
  });
}
```

#### Pagination

```typescript
interface PaginationOptions {
  page: number;
  limit: number;
}

async findAllPaginated(
  options: PaginationOptions,
): Promise<PaginatedResult<Food>> {
  const { page, limit } = options;
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    this.prisma.food.findMany({
      skip,
      take: limit,
    }),
    this.prisma.food.count(),
  ]);

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
```

This developer guide provides comprehensive information for working effectively with the FOODMISSION Data Framework codebase.