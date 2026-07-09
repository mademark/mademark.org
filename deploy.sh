#!/usr/bin/env bash
#
# Deploy the Made Mark site to Bluehost over SSH.
#
# Uploads only files that changed (rsync compares timestamps + size), so
# unchanged assets are skipped. Never deletes anything on the server by
# default. Credentials live in deploy.env (gitignored) — copy the example:
#
#   cp deploy.env.example deploy.env   # then fill in your Bluehost details
#   ./deploy.sh --dry-run              # preview what WOULD upload
#   ./deploy.sh                        # do the upload
#
set -euo pipefail
cd "$(dirname "$0")"

if [[ ! -f deploy.env ]]; then
  echo "Missing deploy.env — copy deploy.env.example to deploy.env and fill it in." >&2
  exit 1
fi
# shellcheck disable=SC1091
source deploy.env

: "${SSH_HOST:?set SSH_HOST in deploy.env}"
: "${SSH_USER:?set SSH_USER in deploy.env}"
: "${REMOTE_PATH:?set REMOTE_PATH in deploy.env}"
SSH_PORT="${SSH_PORT:-22}"

DRY_RUN=""
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN="--dry-run"
  echo "== DRY RUN — no files will be uploaded =="
fi

# Files that live in the repo but must NOT be published to the web server.
EXCLUDES=(
  --exclude '.git/'
  --exclude '.gitignore'
  --exclude '.claude/'
  --exclude '_releases/'
  --exclude '.DS_Store'
  --exclude 'deploy.sh'
  --exclude 'deploy.env'
  --exclude 'deploy.env.example'
  --exclude 'server.rb'
  --exclude 'README.md'
  --exclude 'LICENSE.md'
)

rsync -avz $DRY_RUN --itemize-changes \
  -e "ssh -p ${SSH_PORT}" \
  "${EXCLUDES[@]}" \
  ./ "${SSH_USER}@${SSH_HOST}:${REMOTE_PATH}/"

echo "Done."
