#!/bin/bash
# CI-friendly OpenAPI generation (env defaults are applied in src/docs).

set -euo pipefail

export NODE_ENV="${NODE_ENV:-test}"

echo "🚀 Starting CI documentation generation (NODE_ENV=$NODE_ENV)"
npm run docs:generate
echo "✅ Documentation generation completed successfully!"
