/* Codeloods offerte-wizard
   Prijsmodel staat in PRIJZEN — pas gerust aan, de rest volgt vanzelf.
   API_URL wijst naar de FastAPI-backend op Railway (zie backend/README.md). */

const API_URL = "https://codeloods-backend.up.railway.app/api/offerte"; // <-- aanpassen na Railway-deploy

const PRIJZEN = {
  website:  { basis: 1500, omvang: [
      { label: "Compact (1–5 pagina's)",   uitleg: "Landingspagina of kleine zakelijke site", plus: 0 },
      { label: "Middel (6–12 pagina's)",   uitleg: "Volwaardige bedrijfssite met diensten en blog", plus: 900 },
      { label: "Groot (13+ pagina's)",     uitleg: "Uitgebreide site met veel content", plus: 2000 }
    ]},
  webshop:  { basis: 2950, omvang: [
      { label: "Tot 25 producten",         uitleg: "Compacte shop, één taal, iDEAL", plus: 0 },
      { label: "25–150 producten",         uitleg: "Categorieën, filters, varianten", plus: 1200 },
      { label: "150+ producten",           uitleg: "Grote catalogus, import/export", plus: 2800 }
    ]},
  software: { basis: 7500, omvang: [
      { label: "Eenvoudige tool",          uitleg: "Eén kernfunctie, klein aantal schermen", plus: 0 },
      { label: "MVP met gebruikers",       uitleg: "Accounts, data, dashboard", plus: 5000 },
      { label: "Uitgebreid product",       uitleg: "Meerdere modules of rollen", plus: 12500 }
    ]},
  seo:      { basis: 750, omvang: [
      { label: "Kleine site (tot 15 pagina's)", uitleg: "Audit + contentplan", plus: 0 },
      { label: "Middelgrote site",         uitleg: "Audit + plan + implementatie quick wins", plus: 500 },
      { label: "Grote site of webshop",    uitleg: "Volledige audit inclusief techniek en content", plus: 1250 }
    ]}
};

const EXTRAS = [
  { id: "content",    label: "Teksten laten schrijven",  uitleg: "SEO-teksten voor de belangrijkste pagina's", plus: 450,  nietBij: ["seo"] },
  { id: "meertalig",  label: "Meertalig (NL + EN)",      uitleg: "Tweede taal inclusief hreflang-structuur",   plus: 600,  nietBij: ["seo"] },
  { id: "koppeling",  label: "Koppeling met ander systeem", uitleg: "Bijv. boekhoudpakket, CRM of planning",   plus: 500,  nietBij: ["seo"] },
  { id: "huisstijl",  label: "Logo en huisstijl",        uitleg: "Basisidentiteit: logo, kleuren, typografie", plus: 650,  nietBij: ["seo"] },
  { id: "migratie",   label: "Content overzetten",       uitleg: "Bestaande pagina's en producten migreren",   plus: 350,  nietBij: [] }
];

const MARGE = 0.15; // bandbreedte ±15%

const form = document.getElementById("offerte-form");
const panelen = [...document.querySelectorAll(".stap-paneel")];
const balk = document.getElementById("balk");
const stapLabel = document.getElementById("stap-label");
const btnTerug = document.getElementById("terug");
const btnVerder = document.getElementById("verder");
const melding = document.getElementById("melding");
let stap = 1;
const TOTAAL = 5;

function toon(n) {
  stap = n;
  panelen.forEach(p => p.hidden = +p.dataset.stap !== n);
  balk.style.width = (n / TOTAAL * 100) + "%";
  stapLabel.textContent = `STAP ${n} / ${TOTAAL}`;
  btnTerug.style.visibility = n === 1 ? "hidden" : "visible";
  btnVerder.textContent = n === TOTAAL ? "Stuur mijn indicatie →" : "Volgende →";
  if (n === 2) vulOmvang();
  if (n === 3) vulExtras();
  if (n === 5) toonSchatting();
  document.getElementById("wizard").scrollIntoView({ behavior: "smooth", block: "start" });
}

function gekozenType() {
  const el = form.querySelector('input[name="type"]:checked');
  return el ? el.value : null;
}

function vulOmvang() {
  const type = gekozenType();
  const doel = document.getElementById("omvang-opties");
  const bewaard = form.querySelector('input[name="omvang"]:checked')?.value;
  doel.innerHTML = PRIJZEN[type].omvang.map((o, i) => `
    <label class="optie"><input type="radio" name="omvang" value="${i}" ${String(i) === bewaard ? "checked" : ""} required>
      <span><span class="titel">${o.label}</span><br><span class="uitleg">${o.uitleg}</span></span></label>`).join("");
  markeer(doel);
}

function vulExtras() {
  const type = gekozenType();
  const doel = document.getElementById("extra-opties");
  const bewaard = [...form.querySelectorAll('input[name="extra"]:checked')].map(e => e.value);
  doel.innerHTML = EXTRAS.filter(e => !e.nietBij.includes(type)).map(e => `
    <label class="optie"><input type="checkbox" name="extra" value="${e.id}" ${bewaard.includes(e.id) ? "checked" : ""}>
      <span><span class="titel">${e.label}</span><br><span class="uitleg">${e.uitleg} · +€${e.plus}</span></span></label>`).join("");
  markeer(doel);
}

function markeer(scope) {
  (scope || document).querySelectorAll(".optie input").forEach(inp => {
    const sync = () => {
      if (inp.type === "radio") {
        inp.closest(".opties").querySelectorAll(".optie").forEach(o => o.classList.remove("gekozen"));
      }
      inp.closest(".optie").classList.toggle("gekozen", inp.checked);
    };
    inp.addEventListener("change", sync);
    sync();
  });
}
markeer();

function berekenSchatting() {
  const type = gekozenType();
  const omvangIdx = +(form.querySelector('input[name="omvang"]:checked')?.value ?? 0);
  const extras = [...form.querySelectorAll('input[name="extra"]:checked')].map(e => e.value);
  let totaal = PRIJZEN[type].basis + PRIJZEN[type].omvang[omvangIdx].plus;
  extras.forEach(id => { const e = EXTRAS.find(x => x.id === id); if (e) totaal += e.plus; });
  const laag = Math.round(totaal * (1 - MARGE) / 50) * 50;
  const hoog = Math.round(totaal * (1 + MARGE) / 50) * 50;
  return { type, omvangIdx, extras, totaal, laag, hoog,
    omvangLabel: PRIJZEN[type].omvang[omvangIdx].label,
    groei: form.querySelector('input[name="groei"]:checked')?.value ?? "nee" };
}

function toonSchatting() {
  const s = berekenSchatting();
  const f = n => n.toLocaleString("nl-NL");
  document.getElementById("schatting-bedrag").textContent =
    s.type === "software" && s.omvangIdx > 0
      ? `€ ${f(s.laag)} – € ${f(s.hoog)}+`
      : `€ ${f(s.laag)} – € ${f(s.hoog)}`;
  const groeiTekst = s.groei === "ja" ? " Plus Groei-abonnement: €295/mnd." : "";
  document.getElementById("schatting-toelichting").textContent =
    `Vaste prijs, exclusief btw. Definitief na een kort gesprek — zonder verrassingen.${groeiTekst}`;
}

function stapGeldig() {
  if (stap === 1 && !gekozenType()) return "Kies eerst een type project.";
  if (stap === 2 && !form.querySelector('input[name="omvang"]:checked')) return "Kies een omvang.";
  if (stap === 4 && !form.querySelector('input[name="groei"]:checked')) return "Maak een keuze — 'nee' mag ook.";
  if (stap === 5) {
    if (!document.getElementById("naam").value.trim()) return "Vul je naam in.";
    const email = document.getElementById("email").value.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return "Vul een geldig e-mailadres in.";
  }
  return null;
}

btnVerder.addEventListener("click", async () => {
  const fout = stapGeldig();
  if (fout) { toonMelding(fout, "fout"); return; }
  melding.className = "melding";
  if (stap < TOTAAL) { toon(stap + 1); return; }
  await verstuur();
});

btnTerug.addEventListener("click", () => { if (stap > 1) toon(stap - 1); });

function toonMelding(tekst, soort) {
  melding.textContent = tekst;
  melding.className = "melding " + soort;
}

async function verstuur() {
  if (form.querySelector('input[name="website_url"]').value) return; // honeypot
  const s = berekenSchatting();
  const data = {
    naam: document.getElementById("naam").value.trim(),
    email: document.getElementById("email").value.trim(),
    bedrijf: document.getElementById("bedrijf").value.trim(),
    type: s.type, omvang: s.omvangLabel, extras: s.extras,
    groei: s.groei, indicatie_laag: s.laag, indicatie_hoog: s.hoog
  };
  btnVerder.disabled = true;
  btnVerder.textContent = "Versturen…";
  try {
    const r = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!r.ok) throw new Error("Serverfout");
    toonMelding("Gelukt! Je indicatie staat in je inbox (check eventueel je spamfolder). We nemen binnen één werkdag contact op voor een vrijblijvend gesprek.", "ok");
    btnVerder.textContent = "Verstuurd ✓";
  } catch (e) {
    btnVerder.disabled = false;
    btnVerder.textContent = "Stuur mijn indicatie →";
    const onderwerp = encodeURIComponent("Prijsindicatie aanvraag — " + data.naam);
    const body = encodeURIComponent(
      `Type: ${data.type}\nOmvang: ${data.omvang}\nExtra's: ${data.extras.join(", ") || "geen"}\nGroei-abonnement: ${data.groei}\nIndicatie: €${s.laag.toLocaleString("nl-NL")} – €${s.hoog.toLocaleString("nl-NL")}\n\nNaam: ${data.naam}\nBedrijf: ${data.bedrijf}\nE-mail: ${data.email}`);
    toonMelding("Versturen lukte even niet. Mail je aanvraag direct via de knop hieronder — alles staat al klaar.", "fout");
    melding.insertAdjacentHTML("beforeend",
      ` <a class="btn btn-geel" style="margin-top:10px;display:inline-block" href="mailto:hallo@codeloods.nl?subject=${onderwerp}&body=${body}">Mail de aanvraag</a>`);
  }
}

toon(1);
