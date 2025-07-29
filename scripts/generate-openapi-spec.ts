import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { AppModule } from '../src/app.module';

async function generateOpenApiSpec() {
  const app = await NestFactory.create(AppModule, { logger: false });

  // Enable validation pipes globally (same as in main.ts)
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Set global prefix for API routes (same as in main.ts)
  app.setGlobalPrefix('api/v1');

  // Configure Swagger/OpenAPI (same config as in main.ts)
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
    .addServer('http://localhost:3000/api/v1', 'Development server')
    .addServer('https://api.foodmission.dev/api/v1', 'Production server')
    .addServer('https://staging-api.foodmission.dev/api/v1', 'Staging server')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
    deepScanRoutes: true,
  });

  // Write OpenAPI spec to files
  const outputDir = join(__dirname, '..', 'docs');

  // JSON format
  writeFileSync(
    join(outputDir, 'openapi.json'),
    JSON.stringify(document, null, 2),
    'utf8',
  );

  // YAML format (basic conversion)
  const yaml = require('js-yaml');
  writeFileSync(
    join(outputDir, 'openapi.yaml'),
    yaml.dump(document, { indent: 2 }),
    'utf8',
  );

  console.log('✅ OpenAPI specification generated successfully!');
  console.log(`📄 JSON: ${join(outputDir, 'openapi.json')}`);
  console.log(`📄 YAML: ${join(outputDir, 'openapi.yaml')}`);
  console.log('');
  console.log('📊 Statistics:');
  console.log(`   Paths: ${Object.keys(document.paths || {}).length}`);
  console.log(
    `   Schemas: ${Object.keys(document.components?.schemas || {}).length}`,
  );
  console.log(`   Tags: ${(document.tags || []).length}`);
  console.log(
    `   Security Schemes: ${Object.keys(document.components?.securitySchemes || {}).length}`,
  );

  await app.close();
}

// Run the script
generateOpenApiSpec().catch((error) => {
  console.error('❌ Failed to generate OpenAPI specification:', error);
  process.exit(1);
});
