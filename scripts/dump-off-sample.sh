#!/usr/bin/env bash
# Pulls a tiny sample (a handful of barcodes) out of a real OpenFoodFacts
# MongoDB clone via mongodump, filtered to just those documents, and writes
# the result to prisma-mongo/seed-data/dump. docker-compose's mongo-off
# service restores that dump on first container start (see
# prisma-mongo/seed-data/init/01-restore-products.sh), so committing the
# (small, filtered) dump gives every dev a working local OFF Mongo without
# needing access to the real source.
#
# Usage:
#   OFF_SOURCE_MONGODB_URL='mongodb://user:pass@host:27017/off?authSource=admin' \
#     ./scripts/dump-off-sample.sh [barcode ...]
#
# Requires Docker (runs mongodump via the mongo:7 image, so no local install
# of the MongoDB database tools is needed). With no barcodes given, dumps
# DEFAULT_BARCODES below.
set -euo pipefail

SOURCE_URL="${OFF_SOURCE_MONGODB_URL:-}"
if [[ -z "$SOURCE_URL" ]]; then
  echo "error: set OFF_SOURCE_MONGODB_URL to the real OFF Mongo clone to dump from" >&2
  exit 1
fi

DEFAULT_BARCODES=(
  3017620422003 # Nutella
  5449000000996 # Coca-Cola
  8076809513722 # Barilla (Basilico pasta sauce)
  3033710065967 # Nesquik Cacao
  3068320114453 # Badoit water
  5410188031072 # Gazpacho
)

barcodes=("$@")
if [[ ${#barcodes[@]} -eq 0 ]]; then
  barcodes=("${DEFAULT_BARCODES[@]}")
fi

# Build a {"_id": {"$in": [...]}} filter from the barcode list.
query='{"_id":{"$in":['
for i in "${!barcodes[@]}"; do
  [[ $i -gt 0 ]] && query+=','
  query+="\"${barcodes[$i]}\""
done
query+=']}}'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DUMP_DIR="$ROOT_DIR/prisma-mongo/seed-data/dump"

rm -rf "$DUMP_DIR"
mkdir -p "$DUMP_DIR"

echo "Dumping ${#barcodes[@]} product(s) from the source OFF Mongo clone..."

# Runs on the default bridge network. If SOURCE_URL points at "localhost"
# (e.g. a kubectl port-forward on your machine), swap it for
# "host.docker.internal" first, since "localhost" inside this container
# refers to the container itself.
docker run --rm \
  -v "$DUMP_DIR:/dump" \
  mongo:7 \
  mongodump \
  --uri="$SOURCE_URL" \
  --collection=products \
  --query="$query" \
  --out=/dump

echo "Wrote dump to ${DUMP_DIR#"$ROOT_DIR"/}"
