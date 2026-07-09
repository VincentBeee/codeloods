# Codeloods.nl

Statische site (GitHub Pages) + optionele FastAPI-backend (Railway) voor de offerte-wizard.

## Structuur
    frontend/   → GitHub Pages (codeloods.nl)
    backend/    → Railway (offerte-mails via Resend)

## Frontend live zetten (GitHub Pages)
1. Nieuwe repo, push de inhoud van `frontend/` naar de root (of gebruik /docs).
2. Settings → Pages → deploy from branch.
3. DNS bij je registrar: A-records naar GitHub Pages IP's
   (185.199.108.153 / .109 / .110 / .111) + CNAME `www` → `<user>.github.io`.
   Het CNAME-bestand (codeloods.nl) zit er al in.
4. Enforce HTTPS aanvinken zodra het certificaat er is.

## Backend (optioneel maar aangeraden)
Zie backend/README.md. Zonder backend werkt de wizard ook: fallback is een
voorgevulde mailto-knop.

## Na livegang (SEO-checklist)
- [ ] Google Search Console: domein verifiëren, sitemap.xml indienen
- [ ] Bing Webmaster Tools idem (voedt ook ChatGPT-search)
- [ ] KVK-nummer invullen in de footers (staat nu op 00000000)
- [ ] Google Bedrijfsprofiel aanmaken
- [ ] IndexNow-key toevoegen (zelfde aanpak als RentePerMaand.nl)
- [ ] API_URL in frontend/assets/js/offerte.js aanpassen na Railway-deploy
