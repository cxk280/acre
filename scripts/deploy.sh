#!/usr/bin/env bash
#
# Deploy the Acre console to a fresh Vultr Cloud Compute instance (Ubuntu).
# Builds locally, ships the Next.js standalone bundle + your inference env over
# SSH, and runs it under systemd so it survives crashes/reboots.
#
#   Usage:  scripts/deploy.sh root@<INSTANCE_IP> [PORT]
#           (PORT defaults to 80 so the app is reachable at http://<INSTANCE_IP>)
#
# Prereqs: your SSH key is on the instance (add it when you create the instance),
# and .env.local has your Vultr inference settings (ACRE_INFERENCE / key / model).
# Deploys whatever is currently checked out — merge everything into main and check
# it out first for the fullest demo.

set -euo pipefail

TARGET="${1:?Usage: scripts/deploy.sh user@host [port]}"
PORT="${2:-80}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Building (standalone)…"
npm run build

echo "==> Assembling deploy bundle…"
rm -rf .deploy .deploy.tgz
mkdir -p .deploy
cp -r .next/standalone/. .deploy/
mkdir -p .deploy/.next
cp -r .next/static .deploy/.next/static
[ -d public ] && cp -r public .deploy/public
tar -C .deploy -czf .deploy.tgz .

echo "==> Reading inference config from .env.local…"
# shellcheck disable=SC1091
set -a; [ -f .env.local ] && . ./.env.local; set +a
ENVFILE="$(mktemp)"
{
  echo "NODE_ENV=production"
  echo "PORT=${PORT}"
  echo "HOSTNAME=0.0.0.0"
  echo "ACRE_INFERENCE=${ACRE_INFERENCE:-vultr}"
  echo "VULTR_INFERENCE_API_KEY=${VULTR_INFERENCE_API_KEY:-}"
  echo "VULTR_INFERENCE_MODEL=${VULTR_INFERENCE_MODEL:-deepseek-ai/DeepSeek-V4-Flash}"
} > "$ENVFILE"

echo "==> Uploading to ${TARGET}…"
scp -q .deploy.tgz "${TARGET}:/tmp/acre.tgz"
scp -q "$ENVFILE" "${TARGET}:/tmp/acre.env"
scp -q scripts/acre.service "${TARGET}:/tmp/acre.service"
rm -f "$ENVFILE"

echo "==> Installing + starting on the server…"
ssh "$TARGET" 'bash -s' <<'REMOTE'
set -euo pipefail
# Install Node 20 if it's missing or too old.
if ! command -v node >/dev/null 2>&1 || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 20 ]; then
  echo "   installing Node 20…"
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null 2>&1
  apt-get install -y nodejs >/dev/null 2>&1
fi
mkdir -p /opt/acre
find /opt/acre -mindepth 1 -maxdepth 1 -not -name '.env' -exec rm -rf {} +
tar -C /opt/acre -xzf /tmp/acre.tgz
mv -f /tmp/acre.env /opt/acre/.env
mv -f /tmp/acre.service /etc/systemd/system/acre.service
systemctl daemon-reload
systemctl enable acre >/dev/null 2>&1
systemctl restart acre
sleep 2
systemctl is-active acre >/dev/null && echo "   acre is running" || { journalctl -u acre --no-pager -n 20; exit 1; }
REMOTE

rm -rf .deploy .deploy.tgz
HOSTONLY="${TARGET#*@}"
echo "==> Done. Live at:  http://${HOSTONLY}:${PORT}"
