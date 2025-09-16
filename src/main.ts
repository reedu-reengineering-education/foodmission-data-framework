import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { SecurityService } from './security/security.service';
import { InputSanitizationPipe } from './security/pipes/input-sanitization.pipe';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Get security service for configuration
  const securityService = app.get(SecurityService);

  // Validate environment variables
  securityService.validateEnvironmentVariables();

  // Enable CORS with security configuration
  app.enableCors(securityService.getCorsConfiguration());

  // Enable validation pipes globally with input sanitization
  app.useGlobalPipes(
    new InputSanitizationPipe(securityService),
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      disableErrorMessages: process.env.NODE_ENV === 'production',
      validationError: {
        target: false,
        value: false,
      },
    }),
  );

  // Configure Swagger/OpenAPI
  const config = new DocumentBuilder()
    .setTitle('FOODMISSION Data Framework API')
    .setDescription(
      `
      A comprehensive backend system for managing food-related data and operations.
      
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
      
      ## Support
      For support and documentation, visit our [GitHub repository](https://github.com/reedu-reengineering-education/foodmission-data-framework).
    `,
    )
    .setVersion('1.0.0')
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
    )
    .addTag(
      'auth',
      'Authentication and authorization endpoints for Keycloak integration',
    )
    .addTag(
      'foods',
      'Food item management with OpenFoodFacts integration for nutritional data',
    )
    .addTag(
      'users',
      'User profile management and dietary preferences configuration',
    )
    .addTag(
      'health',
      'Application health checks, readiness probes, and monitoring metrics',
    )
    .addServer('http://localhost:3000/', 'Development server')
    .addServer('https://api.foodmission.dev/', 'Production server')
    .addServer('https://staging-api.foodmission.dev/', 'Staging server')
    .build();

  // Set global prefix for API routes BEFORE creating Swagger document
  app.setGlobalPrefix('api/v1');

  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
    deepScanRoutes: true,
  });

  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      docExpansion: 'none',
      filter: true,
      showRequestHeaders: true,
      showCommonExtensions: true,
      tryItOutEnabled: true,
      oauth2RedirectUrl: `http://localhost:3000/api/docs/oauth2-redirect.html`, // TODO: get url from environment or app
      initOAuth: {
        clientId: process.env.KEYCLOAK_CLIENT_ID,
        realm: process.env.KEYCLOAK_REALM,
        appName: 'FOODMISSION API Documentation',
        scopes: ['openid', 'profile', 'email', 'roles'],
        useBasicAuthenticationWithAccessCodeGrant: false,
      },
    },
    customSiteTitle: 'FOODMISSION API Documentation',
    customfavIcon: '/favicon.ico',
    customJs: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.min.js',
    ],
    customCssUrl: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css',
    ],
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info { margin: 50px 0 }
      .swagger-ui .info .title { color: #2c3e50 }
      .swagger-ui .scheme-container { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0 }
    `,
  });

  await app.listen(process.env.PORT ?? 3000);
  console.log(`Application is running on: ${await app.getUrl()}`);
  console.log(
    `Swagger documentation available at: ${await app.getUrl()}/api/docs`,
  );
}
void bootstrap();
