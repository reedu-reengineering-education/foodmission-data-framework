import { DocumentBuilder } from '@nestjs/swagger';
import { execSync } from 'child_process';
import { buildOpenApiDescription } from './openapi-description';

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
  const fullSha = process.env.API_GIT_SHA || process.env.GITHUB_SHA;

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

type SwaggerMetadata = { apiVersion: string; apiRelease: string };

let cachedMetadata: SwaggerMetadata | undefined;

const computeSwaggerMetadata = (): SwaggerMetadata => {
  const apiVersion = getApiVersion();
  const releaseBase =
    process.env.API_RELEASE || process.env.OTEL_SERVICE_VERSION || apiVersion;
  const shortSha = getShortGitSha();
  const apiRelease = shortSha ? `${releaseBase}+${shortSha}` : releaseBase;

  return { apiVersion, apiRelease };
};

export const getSwaggerMetadata = (): SwaggerMetadata =>
  (cachedMetadata ??= computeSwaggerMetadata());

const parseServersFromEnv = (): SwaggerServer[] => {
  const rawServers = process.env.API_DOC_SERVERS?.trim();
  if (!rawServers) {
    return DEFAULT_SWAGGER_SERVERS;
  }

  try {
    const parsed = JSON.parse(rawServers) as SwaggerServer[];
    const valid = (Array.isArray(parsed) ? parsed : []).filter(
      (server) => typeof server?.url === 'string',
    );
    if (valid.length > 0) {
      return valid.map((server) => ({
        url: server.url,
        description: server.description || 'API server',
      }));
    }
  } catch {
    return DEFAULT_SWAGGER_SERVERS;
  }

  return DEFAULT_SWAGGER_SERVERS;
};

export const createSwaggerConfig = () => {
  const { apiVersion, apiRelease } = getSwaggerMetadata();

  const builder = new DocumentBuilder()
    .setTitle('Foodmission Data Framework API')
    .setDescription(buildOpenApiDescription(apiVersion, apiRelease))
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
    )
    .addOAuth2(
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

  for (const tag of TAG_DESCRIPTIONS) {
    builder.addTag(tag.name, tag.description);
  }

  for (const server of parseServersFromEnv()) {
    builder.addServer(server.url, server.description);
  }

  return builder.build();
};
