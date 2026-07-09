# Codeloods.nl

Statische site (GitHub Pages) + optionele FastAPI-backend (Railway) voor de offerte-wizard.

## Structuur
    frontend/   → GitHub Pages (codeloods.nl)
    backend/    → Railway (offerte-mails via Resend)

## Frontend live zetten (GitHub Pages)
Deploy loopt via `.github/workflows/pages.yml`: elke push naar `main` publiceert
de map `frontend/` naar Pages. `backend/` blijft buiten de artifact.

1. Settings → Pages → Source: **GitHub Actions** (niet "deploy from branch";
   dat kan alleen root of /docs, en de site staat in `frontend/`).
2. DNS bij je registrar: A-records naar GitHub Pages IP's
   (185.199.108.153 / .109 / .110 / .111) + CNAME `www` → `<user>.github.io`.
   Het CNAME-bestand (codeloods.nl) zit er al in.
3. Enforce HTTPS aanvinken zodra het certificaat er is.

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
