# FOODMISSION Data Framework

[![CI](https://github.com/reedu-reengineering-education/foodmission-data-framework/workflows/CI/badge.svg)](https://github.com/reedu-reengineering-education/foodmission-data-framework/actions)

<!-- [![Coverage](https://img.shields.io/badge/coverage-85%25-green.svg)](https://github.com/reedu-reengineering-education/foodmission-data-framework) -->

[![License](https://img.shields.io/badge/license-AGPL--3.0-blue.svg)](LICENSE)

A comprehensive, production-ready backend system for managing food-related data built with NestJS, Prisma, and PostgreSQL. The system provides secure API endpoints, OpenFoodFacts integration, user authentication via Keycloak, and is fully containerized for consistent deployment across environments.

## 🚀 Features

- **Modern Architecture**: Built with NestJS, TypeScript, and Prisma ORM
- **Food Data Management**: Complete CRUD operations for food items
- **OpenFoodFacts Integration**: Automatic nutritional data retrieval from external API
- **User Management**: User profiles, preferences, and dietary restrictions
- **Authentication & Authorization**: Keycloak integration with JWT tokens and role-based access control
- **Caching**: Redis-based caching for improved performance
- **API Documentation**: Comprehensive OpenAPI/Swagger documentation
- **Testing**: Unit, integration, and end-to-end tests with high coverage
- **Monitoring**: Health checks, metrics, and structured logging
- **Security**: Input validation, rate limiting, and security headers
- **DevOps Ready**: Docker containerization, Kubernetes manifests, and CI/CD pipelines

## 📋 Table of Contents

- [Features](#-features)
- [Prerequisites](#-prerequisites)
- [Quick Start](#-quick-start)
- [Development Setup](#-development-setup)
- [API Documentation](#-api-documentation)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Architecture](#-architecture)
- [Contributing](#-contributing)
- [License](#-license)
- [Support](#-support)
- [Acknowledgments](#-acknowledgments)

## 🔧 Prerequisites

- **Node.js** 24+ (specified in `.nvmrc`)
- **npm** 10+ (comes with Node.js 24)
- **Docker** and Docker Compose
- **Git**

### Version Management

This project uses Node.js 24. To ensure you're using the correct version:

**Using nvm (recommended):**

```bash
# Install nvm if you haven't already: https://github.com/nvm-sh/nvm
nvm install 24
nvm use 24
```

The project includes an `.nvmrc` file that automatically sets the Node.js version when you run `nvm use` in the project directory.

## ⚡ Quick Start

### 1. Clone and Setup

```bash
git clone <repository-url>
cd foodmission-data-framework
npm install
```

### 2. Environment Configuration

Create environment files:

```bash
cp .env.example .env
cp .env.test.example .env.test
```

Configure your `.env` file:

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/foodmission_db?schema=public"
DATABASE_URL_TEST="postgresql://postgres:password@localhost:5432/foodmission_test_db?schema=public"

# Redis
REDIS_URL="redis://localhost:6379"

# Keycloak
KEYCLOAK_BASE_URL="http://localhost:8080"
KEYCLOAK_AUTH_SERVER_URL="http://localhost:8080"  # Optional: falls back to KEYCLOAK_BASE_URL if not provided
KEYCLOAK_REALM="foodmission"
KEYCLOAK_CLIENT_ID="foodmission-api"
KEYCLOAK_CLIENT_SECRET="your-keycloak-client-secret"
KEYCLOAK_SERVICE_CLIENT_ID="foodmission-service"
KEYCLOAK_SERVICE_CLIENT_SECRET="foodmission-service-secret"


# OpenFoodFacts
OPENFOODFACTS_API_URL="https://world.openfoodfacts.org"

# Application
NODE_ENV="development"
PORT=3000
```

### 3. Keycloak Setup

The application uses Keycloak for authentication. A pre-configured realm JSON file is included in the repository that contains all necessary configuration.

#### 3.1. Start Keycloak

Keycloak should be running via Docker Compose. If not already started:

```bash
npm run docker:up
```

Keycloak Admin Console will be available at `http://localhost:8080`

- Default username: `admin`
- Default password: `admin`

#### 3.2. Import the Realm Configuration

1. Access Keycloak Admin Console at `http://localhost:8080`
2. Log in with admin credentials (username: `admin`, password: `admin`)
3. In the top-left corner, click the realm dropdown (shows "master" by default)
4. Click **"Create Realm"** (or **"Add realm"**)
5. Click the **"Browse..."** button
6. Navigate to and select: `keycloak/foodmission-realm.dev.json` in your project directory
7. Click **"Create"** (or **"Import"**)

The imported realm includes:

- **Realm**: `foodmission`
- **Client**: `foodmission-api & foodmission-service`
- **Pre-configured users** (passwords and JWT `sub` ↔ DB `keycloakId` alignment — see [keycloak/README.md](keycloak/README.md#seeded-users-and-database)):
  - `developer`, `jane`, `mike`, `sarah`, `admin` (plus service accounts as needed)
- **Roles**: `admin` and `user` roles for the `foodmission-api` client

After seeding the database, JWT **`sub`** must match **`User.keycloakId`** for these users. Use the bundled realm file so user IDs stay stable.

#### 3.3. Verify the Import

1. Switch to the `foodmission` realm using the dropdown in the top-left corner
2. Navigate to **Users** → You should see at least:
   - `admin`, `developer`, `jane`, `mike`, `sarah`
3. Navigate to **Clients** → You should see:
   - `foodmission-api` client

#### 3.4. Configure Client Secret

**IMPORTANT: Never commit secrets to version control!**

The client secret is configured in the realm JSON. You need to configure it in your `.env` file:

```env
KEYCLOAK_CLIENT_SECRET="your-actual-client-secret-here"
```

**Security Best Practices:**

- Use environment variables or a secret manager for sensitive values
- Never hardcode secrets in code or commit them to version control
- Use different secrets for development, staging, and production environments
- Rotate secrets regularly

To find your client secret:

1. Go to Keycloak Admin Console → Clients → `foodmission-api`
2. Go to the "Credentials" tab
3. Copy the "Client Secret" value
4. Set it in your `.env` file (which should be in `.gitignore`)

#### 3.5. Test Authentication

Test the setup with the pre-configured admin user:

**Step 1: Get JWT Token**

First, export your client secret as an environment variable (never include it directly in commands):

```bash
# Export the secret from your .env file
export KEYCLOAK_CLIENT_SECRET="your-actual-client-secret-here"
```

Then use it in the curl command:

```bash
curl -X POST http://localhost:8080/realms/foodmission/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password" \
  -d "client_id=foodmission-api" \
  -d "client_secret=${KEYCLOAK_CLIENT_SECRET}" \
  -d "username=admin" \
  -d "password=admin123"
```

**Step 2: Test Protected Endpoint**

Use the `access_token` from the response above:

```bash
# Replace YOUR_ACCESS_TOKEN with the actual token from Step 1
curl http://localhost:3000/api/v1/auth/admin-only \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Security Best Practices:**

- ✅ Always use environment variables for secrets
- ✅ Never include secrets directly in command-line arguments
- ✅ Never commit secrets to version control
- ✅ Use secure credential stores in production environments

### 4. Start Services

```bash
# Start database and Redis services
npm run docker:up

# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate:deploy

# Seed the database with initial data
npm run db:seed
```

### 5. Start the Application

```bash
# Development mode with hot reload
npm run start:dev

# The API will be available at http://localhost:3000
# Swagger documentation at http://localhost:3000/api/docs
```

## 🛠 Development Setup

### DevContainer (Recommended)

For the best development experience, use the provided DevContainer:

1. Open the project in VSCode
2. Install the "Dev Containers" extension
3. Press `Ctrl+Shift+P` and select "Dev Containers: Reopen in Container"
4. The container will automatically set up the development environment

### Manual Setup

```bash
# Ensure you're using the correct Node.js version
# If using nvm, the .nvmrc file will automatically set Node.js 24
nvm use

# Verify version
node --version  # Should be v24.x.x

# Install dependencies
npm install

# Set up development environment
npm run dev:setup

# Start development services
npm run docker:up

# Start the application
npm run start:dev
```

### Available Scripts

#### Development

- `npm run start:dev` - Start in development mode with hot reload
- `npm run start:debug` - Start in debug mode
- `npm run dev:setup` - Set up development environment
- `npm run dev:reset` - Reset development database

#### Database

- `npm run db:generate` - Generate Prisma client
- `npm run db:migrate` - Create and apply new migration
- `npm run db:migrate:deploy` - Apply existing migrations
- `npm run db:migrate:reset` - Reset database and apply all migrations
- `npm run db:studio` - Open Prisma Studio (database GUI)
- `npm run db:seed` - Seed database with initial data
- `npm run db:backup` - Create database backup
- `npm run db:restore` - Restore database from backup

#### Testing

- `npm run test` - Run unit tests
- `npm run test:unit` - Run unit tests only
- `npm run test:integration` - Run integration tests
- `npm run test:e2e` - Run end-to-end tests
- `npm run test:cov` - Run tests with coverage report
- `npm run ci:test` - Run all tests in CI mode

#### Build & Deploy

- `npm run build` - Build the application
- `npm run start:prod` - Start in production mode
- `npm run docker:up` - Start Docker services
- `npm run docker:down` - Stop Docker services

#### Code Quality

- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## 📚 API Documentation

### Swagger/OpenAPI

- **Interactive UI (Swagger)**: [http://localhost:3000/api/docs](http://localhost:3000/api/docs) when the app is running (replace host in production). Use **Try it out** for request/response examples.
- **Generated files** (commit after API changes): [`docs/openapi.yaml`](docs/openapi.yaml) and [`docs/openapi.json`](docs/openapi.json) — regenerate with `npm run docs:generate`.

## 🧪 Testing

The project includes comprehensive testing at multiple levels:

### Test Types

- **Unit Tests**: Test individual components in isolation
- **Integration Tests**: Test module interactions and database operations
- **End-to-End Tests**: Test complete API workflows

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

# Run tests in CI mode
npm run ci:test
```

### Test Coverage

The project maintains high test coverage:

- **Unit Tests**: 85%+ coverage
- **Integration Tests**: Critical paths covered
- **E2E Tests**: Main user workflows covered

### Writing Tests

Tests are located in:

- `src/**/*.spec.ts` - Unit tests
- `test/**/*.integration.spec.ts` - Integration tests
- `test/**/*.e2e-spec.ts` - End-to-end tests

## 🚀 Deployment

### Docker Deployment

#### Build and Run

```bash
# Build the Docker image
docker build -t foodmission-data-framework .

# Run with Docker Compose
docker-compose up -d
```

#### Docker Compose Services

The `docker-compose.yml` file includes:

- **PostgreSQL**: Database server with test database initialization
- **Redis**: Cache and session store
- **Keycloak**: Authentication and authorization server

For production deployments, create a custom docker-compose file or use container orchestration platforms with appropriate environment configurations.

### CI/CD Pipeline

The project uses GitHub Actions for automated CI/CD:

- **Continuous Integration**: Automated testing, linting, and security scanning
- **Continuous Deployment**: Automated deployment to staging and production
- **Quality Gates**: Code coverage and security requirements

#### Pipeline Stages

1. **Code Quality**: ESLint, Prettier, TypeScript compilation
2. **Security**: Dependency scanning, SAST analysis
3. **Testing**: Unit, integration, and e2e tests
4. **Build**: Docker image creation and registry push
5. **Deploy**: Automated deployment to environments

### Environment Configuration

#### Development

- Local database and Redis
- Hot reloading enabled
- Debug logging
- Mock external services

#### Staging

- Shared database instance
- Production-like configuration
- Integration with external services
- Performance monitoring

#### Production

- High-availability database cluster
- Redis cluster for caching
- Full monitoring and alerting
- Security hardening

## 🏗 Architecture

### System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client Apps   │    │   Load Balancer │    │    API Gateway  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
         ┌───────────────────────▼───────────────────────┐
         │              NestJS Application               │
         │  ┌─────────────────────────────────────────┐  │
         │  │           Controllers Layer             │  │
         │  └─────────────────────────────────────────┘  │
         │  ┌─────────────────────────────────────────┐  │
         │  │            Services Layer               │  │
         │  └─────────────────────────────────────────┘  │
         │  ┌─────────────────────────────────────────┐  │
         │  │           Repository Layer              │  │
         │  └─────────────────────────────────────────┘  │
         └─────────────────┬───────────────────────────┘
                           │
    ┌──────────────────────┼──────────────────────┐
    │                      │                      │
┌───▼────┐         ┌──────▼──────┐        ┌──────▼──────┐
│PostgreSQL│       │    Redis    │        │  Keycloak   │
│Database  │       │   Cache     │        │    Auth     │
└──────────┘       └─────────────┘        └─────────────┘
```

### Module Structure

```
src/
├── auth/              # Authentication & authorization
├── cache/             # Caching services and decorators
├── common/            # Shared utilities and exceptions
├── database/          # Database configuration and services
├── food/              # Food management module
├── health/            # Health checks and monitoring
├── monitoring/        # Metrics and performance monitoring
├── security/          # Security services and middleware
└── user/              # User management module
```

### Key Design Patterns

- **Repository Pattern**: Data access abstraction
- **Dependency Injection**: Loose coupling and testability
- **Decorator Pattern**: Cross-cutting concerns (caching, validation)
- **Strategy Pattern**: Multiple authentication strategies
- **Observer Pattern**: Event-driven architecture

### Database Schema

```sql
-- Core entities
Food (id, name, description, barcode, openFoodFactsId, createdBy)
User (id, keycloakId, email, firstName, lastName)
UserPreferences (id, userId, dietaryRestrictions, allergies, preferredCategories)
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Run the test suite: `npm test`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Code Standards

- **TypeScript**: Strict mode enabled
- **ESLint**: Airbnb configuration with custom rules
- **Prettier**: Consistent code formatting
- **Conventional Commits**: Standardized commit messages
- **Test Coverage**: Minimum 80% coverage required

## 📄 License

This project is licensed under the AGPL-3.0 License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [Full documentation](docs/)
- **Issues**: [GitHub Issues](https://github.com/reedu-reengineering-education/foodmission-data-framework/issues)
- **Discussions**: [GitHub Discussions](https://github.com/reedu-reengineering-education/foodmission-data-framework/discussions)

## 🙏 Acknowledgments

- [NestJS](https://nestjs.com/) - Progressive Node.js framework
- [Prisma](https://www.prisma.io/) - Next-generation ORM
- [OpenFoodFacts](https://world.openfoodfacts.org/) - Open food database
- [Keycloak](https://www.keycloak.org/) - Identity and access management
- [RIVM](https://www.rivm.nl/) - Food Category nutritional data
