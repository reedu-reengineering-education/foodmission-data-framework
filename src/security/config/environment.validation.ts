import * as Joi from 'joi';

export const environmentValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  PORT: Joi.number().port().default(3000),

  DATABASE_URL: Joi.string()
    .uri()
    .required()
    .description('PostgreSQL database connection URL'),

  KEYCLOAK_BASE_URL: Joi.string()
    .uri()
    .required()
    .description('Keycloak server base URL'),

  KEYCLOAK_AUTH_SERVER_URL: Joi.string()
    .uri()
    .optional()
    .description(
      'Keycloak authentication server URL (fallback to KEYCLOAK_BASE_URL if not provided)',
    ),

  KEYCLOAK_REALM: Joi.string().required().description('Keycloak realm name'),

  KEYCLOAK_CLIENT_ID: Joi.string().required().description('Keycloak client ID'),

  KEYCLOAK_CLIENT_SECRET: Joi.string()
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.required(),
      otherwise: Joi.optional(),
    })
    .description('Keycloak client secret (required in production)'),

  REDIS_URL: Joi.string()
    .uri()
    .optional()
    .description('Redis connection URL for caching'),

  ALLOWED_ORIGINS: Joi.string()
    .optional()
    .description('Comma-separated list of allowed CORS origins'),

  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug', 'verbose')
    .default('info'),

  RATE_LIMIT_TTL: Joi.number()
    .positive()
    .default(60000)
    .description('Rate limit time window in milliseconds'),

  RATE_LIMIT_MAX: Joi.number()
    .positive()
    .default(100)
    .description('Maximum requests per time window'),

  SESSION_SECRET: Joi.string()
    .min(32)
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.required(),
      otherwise: Joi.optional(),
    })
    .description('Session signing secret (minimum 32 characters)'),

  ENCRYPTION_KEY: Joi.string()
    .length(32)
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.required(),
      otherwise: Joi.optional(),
    })
    .description('Encryption key for sensitive data (exactly 32 characters)'),

  OPENFOODFACTS_API_URL: Joi.string()
    .uri()
    .default('https://world.openfoodfacts.org/api/v0')
    .description('OpenFoodFacts API base URL'),

  OPENFOODFACTS_USER_AGENT: Joi.string()
    .default('FOODMISSION-DataFramework/1.0.0')
    .description('User agent for OpenFoodFacts API requests'),

  MAX_FILE_SIZE: Joi.number()
    .positive()
    .default(5242880) // 5MB
    .description('Maximum file upload size in bytes'),

  CORS_ENABLED: Joi.boolean()
    .default(true)
    .description('Enable CORS middleware'),

  SWAGGER_ENABLED: Joi.boolean()
    .default(true)
    .description('Enable Swagger documentation'),

  METRICS_ENABLED: Joi.boolean()
    .default(true)
    .description('Enable Prometheus metrics'),

  HEALTH_CHECK_ENABLED: Joi.boolean()
    .default(true)
    .description('Enable health check endpoints'),
});

export const validateEnvironment = (config: Record<string, unknown>) => {
  const { error, value } = environmentValidationSchema.validate(config, {
    allowUnknown: true,
    abortEarly: false,
  });

  if (error) {
    const errorMessages = error.details
      .map((detail) => detail.message)
      .join(', ');
    throw new Error(`Environment validation failed: ${errorMessages}`);
  }

  return value;
};
