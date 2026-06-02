import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { dump } from 'js-yaml';
import { join } from 'path';
import type { OpenApiDocument } from './swagger.document';

export function writeOpenApiArtifacts(
  document: OpenApiDocument,
  outputDir: string,
): void {
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
    dump(document, { indent: 2 }),
    'utf8',
  );
}
