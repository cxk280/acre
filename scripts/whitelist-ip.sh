#!/usr/bin/env bash
# One-off: add an IP to the Vultr account-owner API access-control whitelist so a
# host (e.g. the demo server) is permitted to call the Vultr API.
#   Usage: scripts/whitelist-ip.sh <ip> [subnet_size]   (default size 32)
set -euo pipefail
IP="${1:?Usage: scripts/whitelist-ip.sh <ip> [subnet_size]}"
SIZE="${2:-32}"
USER_ID=00363a2f-845d-45fa-a84a-ee1778ffe063

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
set -a; . "$ROOT/.env.local"; set +a

echo "==> Adding ${IP}/${SIZE} to Vultr API whitelist (user ${USER_ID})…"
curl -s -w "\nHTTP %{http_code}\n" -X POST \
  "https://api.vultr.com/v2/users/${USER_ID}/ip-whitelist" \
  -H "Authorization: Bearer ${VULTR_API_KEY}" \
  -H "Content-Type: application/json" \
  --data "{\"subnet\":\"${IP}\",\"subnet_size\":${SIZE}}"

echo "==> Current whitelist:"
curl -s "https://api.vultr.com/v2/users/${USER_ID}/ip-whitelist" \
  -H "Authorization: Bearer ${VULTR_API_KEY}"
echo
