import { INestApplication } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import { createSwaggerConfig, getSwaggerMetadata } from './swagger.config';

export const OPENAPI_GLOBAL_PREFIX = 'api/v1';
export const OPENAPI_DOCS_PATH = 'api/docs';

const documentOptions = {
  operationIdFactory: (_controllerKey: string, methodKey: string) => methodKey,
  deepScanRoutes: true as const,
};

export type OpenApiDocument = ReturnType<typeof createOpenApiDocument>;

export function createOpenApiDocument(app: INestApplication) {
  const config = createSwaggerConfig();
  return SwaggerModule.createDocument(app, config, documentOptions);
}

function setupOpenApiDocs(app: INestApplication, document: OpenApiDocument): void {
  const { apiVersion, apiRelease } = getSwaggerMetadata();

  SwaggerModule.setup(OPENAPI_DOCS_PATH, app, document, {
    useGlobalPrefix: false,
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

export function registerOpenApi(app: INestApplication): void {
  const document = createOpenApiDocument(app);
  setupOpenApiDocs(app, document);
}
