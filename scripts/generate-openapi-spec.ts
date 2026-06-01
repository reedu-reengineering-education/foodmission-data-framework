import { join } from 'path';
import { generateOpenApiFiles } from '../src/docs';

async function main() {
  const outputDir = join(__dirname, '..', 'docs');
  const document = await generateOpenApiFiles(outputDir);

  console.log('✅ OpenAPI specification generated successfully!');
  console.log(`📄 JSON: ${join(outputDir, 'openapi.json')}`);
  console.log(`📄 YAML: ${join(outputDir, 'openapi.yaml')}`);
  console.log(`   Paths: ${Object.keys(document.paths || {}).length}`);
  console.log(
    `   Schemas: ${Object.keys(document.components?.schemas || {}).length}`,
  );
  console.log(`   Tags: ${(document.tags || []).length}`);
}

main().catch((error) => {
  console.error('❌ Failed to generate OpenAPI specification:', error);
  process.exit(1);
});
