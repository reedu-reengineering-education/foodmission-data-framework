import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { writeFileSync } from 'fs';
import { join } from 'path';
import * as yaml from 'js-yaml';
import { AppModule } from '../src/app.module';
import { createSwaggerConfig } from '../src/docs/swagger.config';

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

    const config = createSwaggerConfig();

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
