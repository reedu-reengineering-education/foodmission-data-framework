import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { writeFileSync } from 'fs';
import { join } from 'path';
import * as yaml from 'js-yaml';
import { AppModule } from '../src/app.module';

async function generateOpenApiSpec() {
  console.log('🚀 Starting OpenAPI spec generation...');
  console.log('📋 Environment:', process.env.NODE_ENV);

  // Set required environment variables for documentation generation
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = 'postgresql://mock:mock@localhost:5432/mock_db';
    console.log('🔧 Set mock DATABASE_URL for documentation generation');
  }

  if (!process.env.KEYCLOAK_BASE_URL) {
    process.env.KEYCLOAK_BASE_URL = 'http://localhost:8080';
    console.log('🔧 Set mock KEYCLOAK_BASE_URL for documentation generation');
  }

  if (!process.env.KEYCLOAK_REALM) {
    process.env.KEYCLOAK_REALM = 'mock-realm';
    console.log('🔧 Set mock KEYCLOAK_REALM for documentation generation');
  }

  if (!process.env.KEYCLOAK_CLIENT_ID) {
    process.env.KEYCLOAK_CLIENT_ID = 'mock-client-id';
    console.log('🔧 Set mock KEYCLOAK_CLIENT_ID for documentation generation');
  }

  try {
    console.log('🏗️  Creating NestJS application...');
    const app = await NestFactory.create(AppModule, {
      logger: false,
      abortOnError: false,
    });

    // Enable validation pipes globally (same as in main.ts)
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );

    // Set global prefix to generate full paths, then we'll clean them
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
      .addServer('http://localhost:3000', 'Development server')
      .addServer('https://api.foodmission.dev', 'Production server')
      .addServer('https://staging-api.foodmission.dev', 'Staging server')
      .build();

    const document = SwaggerModule.createDocument(app, config, {
      operationIdFactory: (controllerKey: string, methodKey: string) =>
        methodKey,
      deepScanRoutes: true,
    });

    console.log('📝 Creating OpenAPI document...');

    // Write OpenAPI spec to files
    const outputDir = join(__dirname, '..', 'docs');
    console.log('📁 Output directory:', outputDir);

    // JSON format
    console.log('💾 Writing JSON file...');
    writeFileSync(
      join(outputDir, 'openapi.json'),
      JSON.stringify(document, null, 2),
      'utf8',
    );

    // YAML format (basic conversion)
    console.log('💾 Writing YAML file...');
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

    console.log('🔄 Closing application...');
    await app.close();
    console.log('✨ Process completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('💥 Error during app creation or processing:', error);
    throw error;
  }
}

// Run the script
generateOpenApiSpec().catch((error) => {
  console.error('❌ Failed to generate OpenAPI specification:', error);
  process.exit(1);
});
