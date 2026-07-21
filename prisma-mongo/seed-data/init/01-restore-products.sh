#!/usr/bin/env bash
# Runs once, on first container start, via docker-entrypoint-initdb.d.
# Restores the tiny sample dump (see scripts/dump-off-sample.sh) into the
# "off" database so MONGODB_OFF_URL has something to query in dev.
set -euo pipefail

if [[ -d /dump/off ]]; then
  mongorestore /dump
else
  echo "01-restore-products.sh: /dump/off not found, skipping (run scripts/dump-off-sample.sh first)" >&2
fi
