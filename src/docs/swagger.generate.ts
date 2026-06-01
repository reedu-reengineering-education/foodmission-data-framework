import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { writeOpenApiArtifacts } from './swagger.artifacts';
import {
  createOpenApiDocument,
  OPENAPI_GLOBAL_PREFIX,
  type OpenApiDocument,
} from './swagger.document';

function ensureOpenApiGenerationEnv(): void {
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'test';
  }
  process.env.DATABASE_URL ??= 'postgresql://mock:mock@localhost:5432/mock_db';
  process.env.KEYCLOAK_BASE_URL ??= 'http://localhost:8080';
  process.env.KEYCLOAK_REALM ??= 'mock-realm';
  process.env.KEYCLOAK_CLIENT_ID ??= 'mock-client-id';
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
