# Codeloods offerte-backend

Mini-FastAPI die de wizard-aanvraag van codeloods.nl/offerte/ omzet in twee
mails: de prijsindicatie naar de aanvrager, en een lead-notificatie naar jou.

## Deploy op Railway
1. Nieuw Railway-project → deploy deze `backend/`-map (of als aparte repo).
2. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
3. Env vars instellen:
   - `RESEND_API_KEY` — gratis account op resend.com, verifieer codeloods.nl
     (SPF/DKIM-records toevoegen bij je DNS — zelfde soort stap als je DMARC-fix destijds)
   - `MAIL_VAN` — `Codeloods <hallo@codeloods.nl>`
   - `MAIL_NAAR` — jouw adres voor lead-notificaties
   - `TOEGESTANE_ORIGINS` — optioneel; standaard staat codeloods.nl + www al goed
4. Test: `GET https://<railway-url>/health` → `{"status":"ok"}`
5. Zet de Railway-URL + `/api/offerte` in `frontend/assets/js/offerte.js` → `API_URL`.

## Lokaal draaien
    pip install -r requirements.txt
    RESEND_API_KEY=... uvicorn main:app --reload

## Nog geen zin in een backend?
De wizard heeft een ingebouwde fallback: als de API niet bereikbaar is, krijgt
de bezoeker een voorgevulde mailto-knop met de complete aanvraag. De site werkt
dus ook 100% statisch — de backend maakt het alleen professioneler (indicatie
automatisch in de inbox van de lead).
