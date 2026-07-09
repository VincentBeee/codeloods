"""Codeloods offerte-backend.

Ontvangt aanvragen van de offerte-wizard op codeloods.nl/offerte/,
mailt de indicatie naar de aanvrager en een lead-notificatie naar jou.

Stack: FastAPI + Resend (https://resend.com, 3.000 mails/mnd gratis).
Deploy: Railway (zie README.md).

Omgevingsvariabelen:
  RESEND_API_KEY      API-key van Resend
  MAIL_VAN            Afzender, bijv. "Codeloods <hallo@codeloods.nl>"
  MAIL_NAAR           Waar lead-notificaties heen gaan (jouw adres)
  TOEGESTANE_ORIGINS  Komma-gescheiden, standaard codeloods.nl + www
"""

import logging
import os
from datetime import datetime, timezone

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("codeloods")

RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
MAIL_VAN = os.environ.get("MAIL_VAN", "Codeloods <hallo@codeloods.nl>")
MAIL_NAAR = os.environ.get("MAIL_NAAR", "hallo@codeloods.nl")
ORIGINS = [o.strip() for o in os.environ.get(
    "TOEGESTANE_ORIGINS", "https://codeloods.nl,https://www.codeloods.nl"
).split(",")]

app = FastAPI(title="Codeloods offerte-API", docs_url=None, redoc_url=None)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ORIGINS,
    allow_methods=["POST"],
    allow_headers=["Content-Type"],
)

TYPE_LABELS = {
    "website": "Website",
    "webshop": "Webshop",
    "software": "Software of app",
    "seo": "Vindbaarheid (SEO/AEO)",
}

EXTRA_LABELS = {
    "content": "Teksten laten schrijven",
    "meertalig": "Meertalig (NL + EN)",
    "koppeling": "Koppeling met ander systeem",
    "huisstijl": "Logo en huisstijl",
    "migratie": "Content overzetten",
}


class OfferteAanvraag(BaseModel):
    naam: str = Field(min_length=1, max_length=120)
    email: EmailStr
    bedrijf: str = Field(default="", max_length=160)
    type: str
    omvang: str = Field(max_length=120)
    extras: list[str] = Field(default_factory=list, max_length=10)
    groei: str = "nee"
    indicatie_laag: int = Field(ge=0, le=200_000)
    indicatie_hoog: int = Field(ge=0, le=400_000)


def eur(n: int) -> str:
    return f"€ {n:,}".replace(",", ".")


def mail_html_klant(a: OfferteAanvraag) -> str:
    extras = ", ".join(EXTRA_LABELS.get(e, e) for e in a.extras) or "geen"
    groei = ("Ja — €295/mnd" if a.groei == "ja"
             else "Bespreken in het gesprek" if a.groei == "misschien" else "Nee")
    software_noot = (
        "<p style='font-size:14px;color:#8A6800'>Let op: bij software en apps is de "
        "indicatie grover dan bij websites — het definitieve bedrag bepalen we samen "
        "na het gesprek.</p>" if a.type == "software" else ""
    )
    return f"""
<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1C2B36">
  <div style="background:#1C2B36;padding:20px 28px">
    <span style="color:#F4F2EB;font-weight:800;font-size:20px;letter-spacing:1px">CODE<span style="background:#FFC61A;color:#1C2B36;padding:0 6px">LOODS</span></span>
  </div>
  <div style="height:8px;background:repeating-linear-gradient(-45deg,#FFC61A 0 12px,#1C2B36 12px 24px)"></div>
  <div style="padding:28px;background:#F4F2EB">
    <p>Beste {a.naam},</p>
    <p>Bedankt voor je aanvraag. Hier is je eerlijke prijsindicatie:</p>
    <div style="background:#1C2B36;color:#F4F2EB;padding:22px 26px;margin:18px 0">
      <div style="font-size:12px;letter-spacing:2px;color:#FFC61A">JOUW INDICATIE</div>
      <div style="font-size:34px;font-weight:800;margin:6px 0">{eur(a.indicatie_laag)} – {eur(a.indicatie_hoog)}</div>
      <div style="font-size:13px;color:#8A99A8">Vaste prijs, exclusief btw. Definitief na een kort gesprek — zonder verrassingen.</div>
    </div>
    <table style="width:100%;font-size:14.5px;border-collapse:collapse">
      <tr><td style="padding:6px 0;color:#47596A">Type</td><td style="text-align:right;font-weight:bold">{TYPE_LABELS.get(a.type, a.type)}</td></tr>
      <tr><td style="padding:6px 0;color:#47596A">Omvang</td><td style="text-align:right;font-weight:bold">{a.omvang}</td></tr>
      <tr><td style="padding:6px 0;color:#47596A">Extra's</td><td style="text-align:right;font-weight:bold">{extras}</td></tr>
      <tr><td style="padding:6px 0;color:#47596A">Groei-abonnement</td><td style="text-align:right;font-weight:bold">{groei}</td></tr>
    </table>
    {software_noot}
    <p style="margin-top:22px">We nemen binnen één werkdag contact op voor een vrijblijvend
    kennismakingsgesprek van 30 minuten. Liever niet? Antwoord dan even op deze mail —
    geen probleem, geen opvolging.</p>
    <p>Groet uit de loods,<br><strong>Codeloods</strong><br>
    <a href="https://codeloods.nl" style="color:#8A6800">codeloods.nl</a></p>
  </div>
</div>"""


def mail_html_intern(a: OfferteAanvraag) -> str:
    extras = ", ".join(a.extras) or "geen"
    return (
        f"<h2>Nieuwe offerte-aanvraag</h2>"
        f"<p><b>{a.naam}</b> ({a.email}) — {a.bedrijf or 'geen bedrijf opgegeven'}</p>"
        f"<ul><li>Type: {a.type}</li><li>Omvang: {a.omvang}</li>"
        f"<li>Extra's: {extras}</li><li>Groei: {a.groei}</li>"
        f"<li>Indicatie: {eur(a.indicatie_laag)} – {eur(a.indicatie_hoog)}</li>"
        f"<li>Tijdstip: {datetime.now(timezone.utc).isoformat()}</li></ul>"
        f"<p>Actie: binnen één werkdag opvolgen voor kennismakingsgesprek.</p>"
    )


async def verstuur_mail(client: httpx.AsyncClient, naar: str, onderwerp: str,
                        html: str, reply_to: str | None = None) -> None:
    payload = {"from": MAIL_VAN, "to": [naar], "subject": onderwerp, "html": html}
    if reply_to:
        payload["reply_to"] = reply_to
    r = await client.post(
        "https://api.resend.com/emails",
        headers={"Authorization": f"Bearer {RESEND_API_KEY}"},
        json=payload,
        timeout=15,
    )
    r.raise_for_status()


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/api/offerte")
async def offerte(aanvraag: OfferteAanvraag):
    if not RESEND_API_KEY:
        log.error("RESEND_API_KEY ontbreekt")
        raise HTTPException(status_code=503, detail="Mailservice niet geconfigureerd")
    if aanvraag.type not in TYPE_LABELS:
        raise HTTPException(status_code=422, detail="Onbekend projecttype")

    async with httpx.AsyncClient() as client:
        try:
            await verstuur_mail(
                client, aanvraag.email,
                f"Je prijsindicatie van Codeloods: {eur(aanvraag.indicatie_laag)} – {eur(aanvraag.indicatie_hoog)}",
                mail_html_klant(aanvraag),
            )
            await verstuur_mail(
                client, MAIL_NAAR,
                f"[LEAD] {aanvraag.naam} — {TYPE_LABELS[aanvraag.type]} ({eur(aanvraag.indicatie_laag)}+)",
                mail_html_intern(aanvraag),
                reply_to=aanvraag.email,
            )
        except httpx.HTTPError:
            log.exception("Mail versturen mislukt")
            raise HTTPException(status_code=502, detail="Mail versturen mislukt")

    log.info("Aanvraag verwerkt: %s (%s)", aanvraag.naam, aanvraag.type)
    return {"status": "verzonden"}
