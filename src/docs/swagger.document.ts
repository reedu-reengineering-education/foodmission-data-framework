import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import * as yaml from 'js-yaml';
import { AppModule } from '../app.module';
import { createSwaggerConfig, getSwaggerMetadata } from './swagger.config';

export const OPENAPI_GLOBAL_PREFIX = 'api/v1';
export const OPENAPI_DOCS_PATH = 'api/docs';

const documentOptions = {
  operationIdFactory: (_controllerKey: string, methodKey: string) => methodKey,
  deepScanRoutes: true as const,
};

type OpenApiDocument = ReturnType<typeof createOpenApiDocument>;

function ensureOpenApiGenerationEnv(): void {
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'test';
  }
  process.env.DATABASE_URL ??= 'postgresql://mock:mock@localhost:5432/mock_db';
  process.env.KEYCLOAK_BASE_URL ??= 'http://localhost:8080';
  process.env.KEYCLOAK_REALM ??= 'mock-realm';
  process.env.KEYCLOAK_CLIENT_ID ??= 'mock-client-id';
}

function createOpenApiDocument(app: INestApplication) {
  const config = createSwaggerConfig();
  return SwaggerModule.createDocument(app, config, documentOptions);
}

function setupOpenApiDocs(app: INestApplication, document: OpenApiDocument): void {
  const { apiVersion, apiRelease } = getSwaggerMetadata();

  SwaggerModule.setup(OPENAPI_DOCS_PATH, app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      docExpansion: 'none',
      filter: true,
      showRequestHeaders: true,
      showCommonExtensions: true,
      tryItOutEnabled: true,
      displayOperationId: false,
      displayRequestDuration: true,
      oauth2RedirectUrl: `/${OPENAPI_DOCS_PATH}/oauth2-redirect.html`,
      initOAuth: {
        clientId: process.env.KEYCLOAK_CLIENT_ID,
        realm: process.env.KEYCLOAK_REALM,
        appName: 'Foodmission API Documentation',
        scopes: ['openid', 'profile', 'email', 'roles'],
        useBasicAuthenticationWithAccessCodeGrant: false,
      },
    },
    customSiteTitle: `Foodmission API Documentation (v${apiVersion}, ${apiRelease})`,
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
}

function writeOpenApiArtifacts(document: OpenApiDocument, outputDir: string): void {
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  writeFileSync(
    join(outputDir, 'openapi.json'),
    JSON.stringify(document, null, 2),
    'utf8',
  );
  writeFileSync(
    join(outputDir, 'openapi.yaml'),
    yaml.dump(document, { indent: 2 }),
    'utf8',
  );
}

export function registerOpenApi(app: INestApplication): void {
  const document = createOpenApiDocument(app);
  setupOpenApiDocs(app, document);
}

export async function generateOpenApiFiles(
  outputDir: string,
): Promise<OpenApiDocument> {
  ensureOpenApiGenerationEnv();

  const app = await NestFactory.create(AppModule, {
    logger: false,
    abortOnError: false,
  });
  app.setGlobalPrefix(OPENAPI_GLOBAL_PREFIX);

  const document = createOpenApiDocument(app);
  writeOpenApiArtifacts(document, outputDir);
  await app.close();

  return document;
}
