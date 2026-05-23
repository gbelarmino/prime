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

printf 'window.__PRIME_ENV__={"NEXT_PUBLIC_API_BASE_URL":"%s","NEXT_PUBLIC_SKIP_AUTH":"%s"};\n' \
  "$API_ESC" "$SKIP_ESC" > /usr/share/nginx/html/env-config.js

exec nginx -g 'daemon off;'
