#!/bin/sh
# The "production-like" path: compose a supergraph schema file with rover,
# then run the standalone router binary against it (no rover dev).
#
#   LEVEL=2 npm run compose          # writes router/supergraph.graphql
#   LEVEL=2 npm run compose -- run   # ...and then starts the router on :4000
#
# The subgraphs must already be running (e.g. `npm run dev -w subgraphs/users`).
set -eu
cd "$(dirname "$0")/.."

[ -f .env ] && . ./.env && export APOLLO_ELV2_LICENSE

LEVEL="${LEVEL:-6}" node scripts/write-supergraph-config.ts
rover supergraph compose --config router/supergraph.yaml --output router/supergraph.graphql
echo "wrote router/supergraph.graphql"

if [ "${1:-}" = "run" ]; then
  ROUTER="$(ls ~/.rover/bin/router-v* | sort -V | tail -1)"
  exec "$ROUTER" --config router/router.yaml --supergraph router/supergraph.graphql
fi
