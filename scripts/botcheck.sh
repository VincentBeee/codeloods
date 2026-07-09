#!/usr/bin/env bash
# De bot-check uit de technische-SEO-checklist: haalt elke sitemap-URL op als
# bingbot en eist een <h1> en de juiste canonical in de kále HTML, zonder JS.
#
#     ./scripts/botcheck.sh                       # tegen de live site
#     ./scripts/botcheck.sh http://localhost:8000 # tegen een lokale server
#
# Op de huidige statische site kan dit nauwelijks stuk. De check staat er voor
# de dag dat een pagina wél door een framework wordt gerenderd: dan ziet een
# crawler lege HTML en valt dit script om vóórdat het verkeer wegzakt.

set -uo pipefail
cd "$(dirname "$0")/.."

BASIS=${1:-https://codeloods.nl}
ORIGIN=https://codeloods.nl
UA='Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)'
POGINGEN=${POGINGEN:-3}

fouten=0
meld() { printf '  ✗ %s\n' "$*" >&2; fouten=$((fouten + 1)); }

tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT

for url in $(grep -o '<loc>[^<]*</loc>' frontend/sitemap.xml | sed 's|</\{0,1\}loc>||g'); do
  doel="$BASIS${url#"$ORIGIN"}"

  # Na een Pages-deploy kan de edge nog even de oude versie serveren.
  status=000
  for poging in $(seq "$POGINGEN"); do
    status=$(curl -sS -A "$UA" --max-time 20 -o "$tmp" -w '%{http_code}' "$doel")
    [ "$status" = 200 ] && break
    [ "$poging" -lt "$POGINGEN" ] && sleep 5
  done

  if [ "$status" != 200 ]; then
    meld "$doel gaf HTTP $status"
    continue
  fi

  if ! grep -q '<h1[ >]' "$tmp"; then
    meld "$doel levert geen <h1> aan bingbot — prerender kapot"
    continue
  fi

  canonical=$(grep -o '<link rel="canonical" href="[^"]*"' "$tmp" | sed 's|.*href="||;s|"$||')
  if [ "$canonical" != "$url" ]; then
    meld "$doel canonicaliseert naar '${canonical:-niets}', verwacht $url"
    continue
  fi

  printf '  ✓ %s\n' "$doel"
done

if [ "$fouten" -gt 0 ]; then
  printf '\nbotcheck: %s probleem(en)\n' "$fouten" >&2
  exit 1
fi

printf 'botcheck: alle pagina'"'"'s leveren HTML aan de crawler\n'
