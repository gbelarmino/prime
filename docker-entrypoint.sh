#!/bin/sh
set -eu

API_URL="${API_BASE_URL:-${NEXT_PUBLIC_API_BASE_URL:-}}"
# Staff dashboard exige JWT — nunca propagar SKIP_AUTH em runtime de produção.
SKIP_AUTH="false"

escape_json() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

API_ESC=$(escape_json "$API_URL")
SKIP_ESC=$(escape_json "$SKIP_AUTH")

RUNTIME_JSON="{\"NEXT_PUBLIC_API_BASE_URL\":\"${API_ESC}\",\"NEXT_PUBLIC_SKIP_AUTH\":\"${SKIP_ESC}\"}"

# JS (script tag) + JSON (fetch no cliente — evita race no 1.º carregamento).
printf 'window.__PRIME_ENV__=Object.assign(window.__PRIME_ENV__||{},%s);\n' \
  "$RUNTIME_JSON" > /usr/share/nginx/html/env-config.js
printf '%s\n' "$RUNTIME_JSON" > /usr/share/nginx/html/env-config.json

exec nginx -g 'daemon off;'
