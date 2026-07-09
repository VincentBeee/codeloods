#!/usr/bin/env bash
# Statische SEO-controle op frontend/. Draait in CI vóór de deploy, zodat een
# pagina zonder canonical, met twee H1's of buiten de sitemap nooit live gaat.
#
#     ./scripts/seo-check.sh
#
# Elke index.html is een rankbare pagina; ieder ander .html-bestand moet noindex
# zijn (404.html) en juist níét in de sitemap staan.

set -uo pipefail
cd "$(dirname "$0")/.."

FRONTEND=frontend
SITEMAP=$FRONTEND/sitemap.xml
ORIGIN=https://codeloods.nl

fouten=0
meld() { printf '  ✗ %s\n' "$*" >&2; fouten=$((fouten + 1)); }

[ -f "$SITEMAP" ] || { echo "$SITEMAP ontbreekt" >&2; exit 1; }

locs() { grep -o '<loc>[^<]*</loc>' "$SITEMAP" | sed 's|</\{0,1\}loc>||g'; }
sitemap_urls=$(locs)

canonicals=""

for bestand in $(find "$FRONTEND" -name '*.html' | sort); do
  rel=${bestand#"$FRONTEND"}
  case "$bestand" in
    */index.html) url="$ORIGIN${rel%index.html}" ;;
    *)            url="" ;;
  esac

  if grep -q '<meta name="robots" content="[^"]*noindex' "$bestand"; then
    if printf '%s\n' "$sitemap_urls" | grep -Fxq "$ORIGIN$rel"; then
      meld "$bestand is noindex maar staat in sitemap.xml"
    fi
    continue
  fi

  if [ -z "$url" ]; then
    meld "$bestand is indexeerbaar maar geen index.html — geef het een schone URL of zet noindex"
    continue
  fi

  # Precies één H1
  aantal_h1=$(grep -o '<h1[ >]' "$bestand" | wc -l | tr -d ' ')
  [ "$aantal_h1" = 1 ] || meld "$bestand heeft $aantal_h1 H1's, moet er precies één zijn"

  # Koppen zonder overgeslagen niveau
  probleem=$(grep -o '<h[1-6][ >]' "$bestand" | tr -dc '1-6\n' | awk '
    NR == 1 && $1 != 1 { print "eerste kop is een h" $1 " in plaats van h1"; exit }
    NR >  1 && $1 > vorige + 1 { print "h" vorige " wordt gevolgd door h" $1; exit }
    { vorige = $1 }')
  [ -z "$probleem" ] || meld "$bestand: $probleem"

  # Canonical: precies één, absoluut, naar zichzelf
  aantal_canonical=$(grep -o '<link rel="canonical"' "$bestand" | wc -l | tr -d ' ')
  if [ "$aantal_canonical" != 1 ]; then
    meld "$bestand heeft $aantal_canonical canonical-tags, moet er precies één zijn"
  else
    canonical=$(grep -o '<link rel="canonical" href="[^"]*"' "$bestand" | sed 's|.*href="||;s|"$||')
    if [ "$canonical" != "$url" ]; then
      meld "$bestand canonicaliseert naar $canonical, verwacht $url"
    fi
    canonicals="$canonicals$canonical\n"
  fi

  # In de sitemap
  printf '%s\n' "$sitemap_urls" | grep -Fxq "$url" \
    || meld "$bestand ($url) staat niet in sitemap.xml"

  # Mobiel-first en taal
  grep -q '<meta name="viewport"' "$bestand" || meld "$bestand mist de viewport-meta"
  grep -q '<html lang="' "$bestand"          || meld "$bestand mist lang= op <html>"
done

# Twee pagina's met dezelfde canonical: precies de bug uit de checklist
dubbel=$(printf '%b' "$canonicals" | sort | uniq -d)
[ -z "$dubbel" ] || meld "meerdere pagina's delen een canonical: $(echo "$dubbel" | tr '\n' ' ')"

# Elke sitemap-URL moet een bestand hebben
for url in $sitemap_urls; do
  pad="$FRONTEND${url#"$ORIGIN"}"
  case "$pad" in */) pad="${pad}index.html" ;; esac
  [ -f "$pad" ] || meld "sitemap.xml noemt $url maar $pad bestaat niet"
done

if [ "$fouten" -gt 0 ]; then
  printf '\nseo-check: %s probleem(en)\n' "$fouten" >&2
  exit 1
fi

aantal=$(printf '%s\n' "$sitemap_urls" | wc -l | tr -d ' ')
printf 'seo-check: %s pagina'"'"'s in orde\n' "$aantal"
