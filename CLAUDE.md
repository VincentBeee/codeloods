# Codeloods — werkinstructies

## Structuur
    frontend/   → statische site, wordt door GitHub Actions naar Pages gepubliceerd
    backend/    → FastAPI voor de offerte-wizard, draait op Railway
    scripts/    → losse onderhoudsscripts

Alle links in de HTML zijn **absolute paden** (`/assets/...`, `/blog/`). De site
werkt daarom alleen vanaf de domein-root, niet vanaf `<user>.github.io/codeloods/`.

## Deploy
Elke push naar `main` draait `.github/workflows/pages.yml`, die `frontend/`
publiceert. Pages-source staat op "GitHub Actions" (niet deploy-from-branch).

De workflow draait drie jobs achter elkaar: `controle` (statische SEO-check, ook
op pull requests), `deploy`, en `botcheck` (curl-check op de live URL's).

## Technische SEO

    ./scripts/seo-check.sh    # statisch, offline: canonicals, H1's, sitemap-dekking
    ./scripts/botcheck.sh     # live: haalt elke sitemap-URL op als bingbot
    ./scripts/redirect.sh     # zet een redirect-stub op een oud pad

`seo-check.sh` gaat ervan uit dat **elke `index.html` een rankbare pagina is** en
eist per pagina precies één H1, een kopstructuur zonder overgeslagen niveaus, één
absolute canonical die naar de pagina zelf wijst, en een regel in `sitemap.xml`.
Elk ander `.html`-bestand moet `noindex` hebben en juist níét in de sitemap staan
(nu alleen `404.html`). Een nieuwe pagina die je vergeet in de sitemap te zetten
laat de build dus falen.

`botcheck.sh` is de check uit de checklist: levert de pagina een `<h1>` en de
juiste canonical aan een crawler, zónder JavaScript. Op deze statische site kan
dat nauwelijks stuk — de check staat er voor de dag dat een pagina wél door een
framework wordt gerenderd.

### Fonts

De fonts staan in `frontend/assets/fonts/` en worden **niet** bij Google opgehaald.
Twee redenen: een `<link>` naar `fonts.googleapis.com` is een render-blocking
verzoek naar een derde partij op het kritieke pad, en het stuurt het IP van elke
bezoeker naar Google nog vóór de cookiebanner iets heeft gevraagd — precies wat
`consent.js` voor Analytics wél zorgvuldig vermijdt. `seo-check.sh` faalt als er
weer een verwijzing naar Google Fonts in de HTML sluipt.

Alleen het latin-subset staat in de repo. De pijltjes (`→`, `←`) vallen daarbuiten
en komen uit een systeemfont; dat was met Google Fonts ook al zo. De licenties
staan in `frontend/assets/fonts/LICENSE.txt` — OFL eist dat ze meereizen.

De tweede set `@font-face`-blokken in `loods.css` zijn metrisch gelijkgemaakte
fallbacks. Zonder die blokken springt de H1 zichtbaar zodra de webfonts binnenkomen:
Arial is in kapitalen ~51% breder dan Big Shoulders Display. Wissel je van font of
gewicht, draai dan `python3 scripts/fontmetrics.py` en neem de nieuwe percentages
over. Zelf getallen verzinnen maakt het erger, niet beter.

Let op bij het meten: Big Shoulders Display en Archivo zijn **variabele** fonts.
Hun `hmtx`-tabel bevat de breedtes van de default-instantie, en die is voor Big
Shoulders `wght=100` — een haarlijn. Wie het bestand naïef uitleest zit er 40%
naast. `fontmetrics.py` instantieert daarom eerst op het gewicht dat de pagina
echt gebruikt.

## Slug wijzigen

GitHub Pages serveert statische bestanden en kan **geen 301** sturen. Hernoem dus
nooit zomaar een URL: de oude 404't dan en de ranking van die pagina is weg.

    ./scripts/redirect.sh /blog/oude-slug/ /blog/nieuwe-slug/

Dat zet op het oude pad een stub met een 0-seconden meta-refresh plus een canonical
naar het doel. Google behandelt dat als een permanente redirect; Bing en de
AI-crawlers zijn er minder stellig over. Bewust géén `noindex` op de stub — dat zou
crawlers vertellen de pagina te laten vallen in plaats van het signaal door te geven.

`seo-check.sh` herkent stubs aan de meta-refresh en eist dan dat de canonical naar
het doel wijst, dat het doel bestaat, dat het doel niet zélf een redirect is
(ketens verwateren het signaal) en dat de stub niet in de sitemap staat.

Wil je een échte 301 voor alle crawlers, dan moet er een proxy voor de site:
DNS naar Cloudflare, GitHub Pages als origin, en de redirects als Bulk Redirects.
Dat is een infrastructuurkeuze, geen codewijziging.

## Git
Commit messages **zonder** `Co-Authored-By`-trailer.

## IndexNow

IndexNow duwt nieuwe of gewijzigde URL's direct naar Bing, Yandex, Seznam en
Naver. **Google doet niet mee aan IndexNow** — daar blijft `sitemap.xml` plus
Search Console het kanaal.

- Key: `868517a498aa310eba8c085fad3748b5`
- Key-bestand: `frontend/868517a498aa310eba8c085fad3748b5.txt` (inhoud is exact de
  key, zonder newline), live op `https://codeloods.nl/868517a498aa310eba8c085fad3748b5.txt`

### Aanmelden

    ./scripts/indexnow.sh                                  # alles uit sitemap.xml
    ./scripts/indexnow.sh https://codeloods.nl/blog/xyz/   # alleen deze URL's

Het script controleert eerst of het key-bestand live staat en weigert anders te
posten — IndexNow wijst de hele batch af als de key niet verifieerbaar is.

### Bij nieuwe of gewijzigde pagina's

1. Voeg de URL toe aan `frontend/sitemap.xml` met een actuele `<lastmod>`.
2. Push naar `main` en wacht tot de Pages-deploy klaar is.
3. Draai `./scripts/indexnow.sh <url>` — pas ná de deploy, anders meld je een
   URL aan die nog 404't.

Meld alleen URL's aan die echt zijn veranderd. Ongewijzigde pagina's opnieuw
posten levert niets op en kan tot rate limiting (429) leiden.
