#!/usr/bin/env bash
# Zet op een oud pad een redirect-stub neer die naar een nieuwe URL wijst.
#
#     ./scripts/redirect.sh /blog/oude-slug/ /blog/nieuwe-slug/
#     ./scripts/redirect.sh /blog/oude-slug/ https://codeloods.nl/blog/nieuwe-slug/
#
# GitHub Pages serveert alleen statische bestanden en kan géén 301 sturen. Een
# meta-refresh met 0 seconden plus een canonical naar het doel is het dichtstbij
# dat deze host komt. Google behandelt dat als een permanente redirect; Bing en
# de AI-crawlers zijn er minder stellig over. Wil je een échte 301, dan moet er
# een proxy voor (Cloudflare Bulk Redirects) — zie CLAUDE.md.
#
# Het script schrijft alleen het bestand. Sitemap bijwerken en aanmelden doe je
# daarna zelf; de laatste regels vertellen precies wat er nog moet gebeuren.

set -uo pipefail
cd "$(dirname "$0")/.."

FRONTEND=frontend
ORIGIN=https://codeloods.nl

if [ $# -ne 2 ]; then
  sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'
  exit 1
fi

oud=$1
nieuw=$2

case "$oud" in
  /*/) ;;
  *) echo "oud pad moet met / beginnen en met / eindigen, kreeg: $oud" >&2; exit 1 ;;
esac

# Doel mag relatief of absoluut; we maken het absoluut.
case "$nieuw" in
  "$ORIGIN"/*) doel=$nieuw ;;
  /*)          doel="$ORIGIN$nieuw" ;;
  *) echo "nieuwe URL moet met / of $ORIGIN beginnen, kreeg: $nieuw" >&2; exit 1 ;;
esac
case "$doel" in
  */) ;;
  *) echo "nieuwe URL moet op / eindigen (schone URL), kreeg: $doel" >&2; exit 1 ;;
esac

stub="$FRONTEND$oud" ; stub="${stub}index.html"
doelpad="$FRONTEND${doel#"$ORIGIN"}" ; doelpad="${doelpad}index.html"

if [ "$stub" = "$doelpad" ]; then
  echo "een pagina kan niet naar zichzelf redirecten" >&2; exit 1
fi

if [ ! -f "$doelpad" ]; then
  echo "doel bestaat niet: $doelpad — maak eerst de nieuwe pagina" >&2; exit 1
fi

if grep -q '<meta http-equiv="refresh"' "$doelpad" 2>/dev/null; then
  echo "doel $doelpad is zelf een redirect — wijs direct naar de eindbestemming" >&2; exit 1
fi

# Een bestaande echte pagina overschrijven wist inhoud. Een bestaande stub
# bijwerken is prima: dan verleg je gewoon het doel.
if [ -f "$stub" ] && ! grep -q '<meta http-equiv="refresh"' "$stub"; then
  echo "$stub bestaat al en is een echte pagina, geen redirect." >&2
  echo "Verplaats hem eerst (git mv) of verwijder hem bewust." >&2
  exit 1
fi

mkdir -p "$(dirname "$stub")"
cat > "$stub" <<HTML
<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="refresh" content="0; url=$doel">
<title>Verhuisd — Codeloods</title>
<link rel="canonical" href="$doel">
</head>
<body>
<p>Deze pagina is verhuisd naar <a href="$doel">$doel</a>.</p>
</body>
</html>
HTML

echo "geschreven: $stub  ->  $doel"
echo
echo "Nog te doen:"
echo "  1. Haal $ORIGIN$oud uit frontend/sitemap.xml"
echo "  2. Zet $doel erin met een actuele <lastmod>"
echo "  3. Commit en push; wacht tot de Pages-deploy klaar is"
echo "  4. ./scripts/indexnow.sh $doel"
echo
echo "Bewust géén noindex op de stub: dat zou crawlers vertellen de pagina te"
echo "laten vallen in plaats van het signaal door te geven aan $doel."
