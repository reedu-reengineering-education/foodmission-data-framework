import { DocumentBuilder } from '@nestjs/swagger';
import { execSync } from 'child_process';

type SwaggerServer = {
  url: string;
  description: string;
};

const DEFAULT_API_VERSION = '1.0.0';
const DEFAULT_SWAGGER_SERVERS: SwaggerServer[] = [
  { url: 'http://localhost:3000', description: 'Local development server' },
  { url: 'https://api.foodmission.eu', description: 'Production server' },
];

const TAG_DESCRIPTIONS: Array<{ name: string; description: string }> = [
  {
    name: 'auth',
    description: 'Authentication and authorization endpoints for Keycloak integration',
  },
  {
    name: 'auth-admin',
    description: 'Admin-only authentication and user administration',
  },
  {
    name: 'users',
    description: 'User profile management and dietary preferences configuration',
  },
  {
    name: 'user-groups',
    description: 'User group creation, membership, and invitations',
  },
  {
    name: 'food-products',
    description: 'Branded/barcoded food products with OpenFoodFacts nutritional metadata',
  },
  {
    name: 'generic-foods',
    description: 'Generic food entries (e.g., "apple", "rice") used when no branded product is needed',
  },
  { name: 'catalog', description: 'Reference datasets and dropdown options' },
  { name: 'recipes', description: 'Recipe management and recommendation endpoints' },
  { name: 'meals', description: 'Meal management and meal composition' },
  { name: 'meal-items', description: 'Meal item operations for foods within a meal' },
  { name: 'meal-logs', description: 'Meal logging and nutrition tracking entries' },
  {
    name: 'pantry',
    description: 'Pantry tracking for available ingredients and household stock',
  },
  { name: 'shopping-lists', description: 'Shopping list lifecycle management' },
  {
    name: 'shopping-list-items',
    description: 'Shopping list item operations and item status updates',
  },
  {
    name: 'food-waste',
    description: 'Food waste registration, analytics, and reduction insights',
  },
  {
    name: 'knowledge',
    description: 'Knowledge base content, quizzes, and progress tracking',
  },
  {
    name: 'challenges',
    description: 'Challenge management - Create and manage user challenges',
  },
  { name: 'missions', description: 'Mission management - Create and manage user missions' },
  {
    name: 'health',
    description: 'Application health checks, readiness probes, and monitoring metrics',
  },
  {
    name: 'analytics-meal-log',
    description: 'Anonymized meal-log analytics, reports, and batch workflows',
  },
  { name: 'monitoring', description: 'Prometheus metrics and operational observability' },
  {
    name: 'performance',
    description: 'Performance diagnostics for cache and database behavior',
  },
  { name: 'webhooks', description: 'Inbound webhook handlers and event processing' },
];

const getApiVersion = (): string =>
  process.env.API_VERSION || process.env.npm_package_version || DEFAULT_API_VERSION;

const getShortGitSha = (): string | undefined => {
  const fullSha =
    process.env.API_GIT_SHA ||
    process.env.GIT_SHA ||
    process.env.COMMIT_SHA ||
    process.env.GITHUB_SHA ||
    process.env.VERCEL_GIT_COMMIT_SHA;

  if (fullSha) {
    return fullSha.slice(0, 7);
  }

  try {
    const gitSha = execSync('git rev-parse --short HEAD', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return gitSha || undefined;
  } catch {
    return undefined;
  }
};

export const getSwaggerMetadata = (): { apiVersion: string; apiRelease: string } => {
  const apiVersion = getApiVersion();
  const releaseBase =
    process.env.API_RELEASE || process.env.OTEL_SERVICE_VERSION || apiVersion;
  const shortSha = getShortGitSha();
  const apiRelease = shortSha ? `${releaseBase}+${shortSha}` : releaseBase;

  return {
    apiVersion,
    apiRelease,
  };
};

const parseServersFromEnv = (): SwaggerServer[] => {
  const rawServers = process.env.API_DOC_SERVERS?.trim();
  if (!rawServers) {
    return DEFAULT_SWAGGER_SERVERS;
  }

  try {
    const parsed = JSON.parse(rawServers) as SwaggerServer[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      const valid = parsed.filter(
        (server) => server?.url && typeof server.url === 'string',
      );
      if (valid.length > 0) {
        return valid.map((server) => ({
          url: server.url,
          description: server.description || 'API server',
        }));
      }
    }
  } catch {
    // Fallback to plain list parsing.
  }

  const servers = rawServers
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => {
      const [url, description] = value.split('|');
      return {
        url: url.trim(),
        description: (description || 'API server').trim(),
      };
    });

  return servers.length > 0 ? servers : DEFAULT_SWAGGER_SERVERS;
};

type SwaggerConfigOptions = {
  includeOAuth2?: boolean;
};

export const createSwaggerConfig = (
  options: SwaggerConfigOptions = {},
) => {
  const { apiVersion, apiRelease } = getSwaggerMetadata();

  let builder = new DocumentBuilder()
    .setTitle('Foodmission Data Framework API')
    .setDescription(
      `
      A comprehensive backend system for managing food-related data and operations.

      **API Version:** ${apiVersion}
      **Release:** ${apiRelease}
      
      ## Features
      - **Authentication**: Secure JWT-based authentication via Keycloak
      - **Food Management**: CRUD operations for food items with categorization
      - **OpenFoodFacts Integration**: Automatic nutritional data retrieval
      - **User Management**: User profiles and dietary preferences
      - **Health Monitoring**: Comprehensive health checks and metrics
      
      ## Getting Started
      1. Obtain a JWT token from the authentication endpoints
      2. Include the token in the Authorization header: \`Bearer <token>\`
      3. Use the interactive documentation below to explore available endpoints
      
      ## Authentication
      This API uses stateless JWT authentication via Keycloak.
      
      1. Get Keycloak configuration from \`/auth/info\`
      2. Authenticate directly with Keycloak using OAuth2/OIDC
      3. Include JWT tokens in the Authorization header: \`Bearer <token>\`
      
      ## Rate Limiting
      API requests are rate-limited to prevent abuse. Check response headers for rate limit information.
      
      ## Error Handling
      All endpoints follow a consistent error response format. When an error occurs, the API returns a JSON object with the following structure:
      
      - **statusCode**: HTTP status code (e.g., 400, 401, 404, 500)
      - **message**: Human-readable error message or array of validation errors
      - **error**: Error code/type (e.g., 'VALIDATION_ERROR', 'RESOURCE_NOT_FOUND')
      - **timestamp**: ISO 8601 timestamp when the error occurred
      - **path**: API path where the error occurred
      - **traceId**: Unique identifier for request tracing
      - **details**: Optional object containing additional error information (e.g., validation errors array)
      
      ### Common Error Responses
      
      - **400 Bad Request**: Invalid input data or validation failed. The \`details.errors\` field contains an array of validation error messages.
      - **401 Unauthorized**: Authentication required or invalid/expired JWT token.
      - **403 Forbidden**: Authenticated but insufficient permissions for the requested resource.
      - **404 Not Found**: The requested resource does not exist.
      - **409 Conflict**: Resource already exists or state conflict (e.g., duplicate email).
      - **422 Unprocessable Entity**: Request is well-formed but semantically incorrect (business validation failed).
      - **429 Too Many Requests**: Rate limit exceeded. Check response headers for retry information.
      - **500 Internal Server Error**: An unexpected server error occurred. The trace ID can be used for support.
      
      ### Example Error Response
      
      \`\`\`json
      {
        "statusCode": 400,
        "message": "Validation failed",
        "error": "VALIDATION_ERROR",
        "timestamp": "2024-01-15T10:30:00.000Z",
        "path": "/api/v1/food-products",
        "traceId": "abc123def456",
        "details": {
          "errors": [
            "name should not be empty",
            "categoryId must be a valid UUID"
          ]
        }
      }
      \`\`\`
      
      ## Support
      For support and documentation, visit our [GitHub repository](https://github.com/reedu-reengineering-education/foodmission-data-framework).
    `,
    )
    .setVersion(apiVersion)
    .setContact(
      'FOODMISSION Team',
      'https://github.com/reedu-reengineering-education/foodmission-data-framework',
      'support@foodmission.dev',
    )
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token obtained from Keycloak authentication',
        in: 'header',
      },
      'JWT-auth',
    );

  if (options.includeOAuth2) {
    builder = builder.addOAuth2(
      {
        type: 'oauth2',
        flows: {
          authorizationCode: {
            authorizationUrl: `${process.env.KEYCLOAK_BASE_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/auth`,
            tokenUrl: `${process.env.KEYCLOAK_BASE_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/token`,
            scopes: {
              openid: 'OpenID Connect scope',
              profile: 'Access to user profile information',
              email: 'Access to user email',
              roles: 'Access to user roles',
            },
          },
        },
      },
      'keycloak-oauth2',
    );
  }

  for (const tag of TAG_DESCRIPTIONS) {
    builder = builder.addTag(tag.name, tag.description);
  }

  for (const server of parseServersFromEnv()) {
    builder = builder.addServer(server.url, server.description);
  }

  return builder.build();
};
