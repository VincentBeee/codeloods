#!/usr/bin/env bash
# Meldt URL's aan bij IndexNow. Zonder argumenten: alles uit frontend/sitemap.xml.
# Met argumenten: alleen die URL's, bv. ./scripts/indexnow.sh https://codeloods.nl/blog/
set -euo pipefail

HOST="codeloods.nl"
KEY="868517a498aa310eba8c085fad3748b5"
KEY_LOCATION="https://$HOST/$KEY.txt"
SITEMAP="$(cd "$(dirname "$0")/.." && pwd)/frontend/sitemap.xml"

if [ "$#" -gt 0 ]; then
  urls=("$@")
else
  # shellcheck disable=SC2207
  urls=($(grep -oE '<loc>[^<]+</loc>' "$SITEMAP" | sed -E 's#</?loc>##g'))
fi

# Het key-bestand moet live staan, anders weigert IndexNow de hele batch.
if ! curl -sf --max-time 15 "$KEY_LOCATION" | grep -qx "$KEY"; then
  echo "FOUT: $KEY_LOCATION serveert de key niet. Eerst deployen." >&2
  exit 1
fi

payload=$(HOST="$HOST" KEY="$KEY" KEY_LOCATION="$KEY_LOCATION" python3 -c '
import json, os, sys
print(json.dumps({
    "host": os.environ["HOST"],
    "key": os.environ["KEY"],
    "keyLocation": os.environ["KEY_LOCATION"],
    "urlList": sys.argv[1:],
}))' "${urls[@]}")

echo "Aanmelden bij IndexNow: ${#urls[@]} URL's"
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "https://api.indexnow.org/IndexNow" \
  -H 'Content-Type: application/json; charset=utf-8' \
  --max-time 30 -d "$payload")

case "$code" in
  200|202) echo "OK ($code) — geaccepteerd" ;;
  400) echo "400 — ongeldig verzoek (payload klopt niet)" >&2; exit 1 ;;
  403) echo "403 — key afgewezen; staat $KEY_LOCATION echt live?" >&2; exit 1 ;;
  422) echo "422 — URL's horen niet bij host $HOST" >&2; exit 1 ;;
  429) echo "429 — te veel verzoeken; later opnieuw" >&2; exit 1 ;;
  *)   echo "onverwachte status $code" >&2; exit 1 ;;
esac
