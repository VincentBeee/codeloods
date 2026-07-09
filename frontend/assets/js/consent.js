/* Codeloods — cookietoestemming en Google Analytics.

   Analytics laadt pas ná een expliciete klik op "Analytics toestaan". Zolang
   de bezoeker niets heeft gekozen gaat er géén enkel verzoek naar Google: het
   script van googletagmanager.com wordt dan niet eens opgehaald. Daarom staat
   er ook bewust geen preconnect naar Google in de <head> — dat zou al vóór de
   toestemming verbinding maken.

   De keuze bewaren we in localStorage in plaats van in een cookie, zodat er
   niets meereist met verzoeken naar de server.

   Publieke API (gebruikt door /privacy/):
     codeloodsConsent.open(trigger)  toont de banner opnieuw
     codeloodsConsent.keuze()        "granted" | "denied" | null
*/
(function () {
  "use strict";

  var MEET_ID = "G-3Y02PC6Z08";
  var SLEUTEL = "codeloods-consent";
  var VERSIE = 1;

  var analyticsGeladen = false;
  var banner = null;
  var herstelFocusNaar = null;

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;

  /* Alles geweigerd tot de bezoeker zelf kiest. Dit staat er ook voor het
     geval gtag.js ooit langs een andere weg binnenkomt. */
  gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
    personalization_storage: "denied",
    functionality_storage: "granted",
    security_storage: "granted"
  });

  /* localStorage gooit in Safari-privémodus en als opslag geblokkeerd is.
     Dan gedragen we ons alsof er niets bewaard is: banner opnieuw, analytics uit. */
  function lees() {
    try {
      var ruw = window.localStorage.getItem(SLEUTEL);
      if (!ruw) return null;
      var keuze = JSON.parse(ruw);
      if (!keuze || keuze.versie !== VERSIE) return null;
      return keuze.analytics === "granted" ? "granted" : "denied";
    } catch (e) {
      return null;
    }
  }

  function bewaar(keuze) {
    try {
      window.localStorage.setItem(SLEUTEL, JSON.stringify({
        versie: VERSIE,
        analytics: keuze,
        moment: new Date().toISOString()
      }));
    } catch (e) {
      /* Keuze geldt dan alleen voor deze pageview. Beter dan omvallen. */
    }
  }

  function laadAnalytics() {
    if (analyticsGeladen) return;
    analyticsGeladen = true;
    var script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + MEET_ID;
    document.head.appendChild(script);
    gtag("js", new Date());
    gtag("config", MEET_ID);
  }

  /* GA4 zet _ga en _ga_<meet-id>. Bij intrekken ruimt Google die niet voor ons
     op, dus doen we het zelf — op de host én op elk bovenliggend domein. */
  function wisAnalyticsCookies() {
    var host = window.location.hostname;
    var domeinen = [null, host, "." + host];
    var delen = host.split(".");
    for (var i = 1; i < delen.length - 1; i++) {
      domeinen.push("." + delen.slice(i).join("."));
    }
    document.cookie.split(";").forEach(function (paar) {
      var naam = paar.split("=")[0].trim();
      if (naam.indexOf("_ga") !== 0) return;
      domeinen.forEach(function (domein) {
        document.cookie = naam + "=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT" +
          (domein ? "; domain=" + domein : "");
      });
    });
  }

  function kies(keuze) {
    var vorige = lees();
    bewaar(keuze);
    verberg();

    if (keuze === "granted") {
      gtag("consent", "update", { analytics_storage: "granted" });
      laadAnalytics();
      return;
    }

    gtag("consent", "update", { analytics_storage: "denied" });
    /* Toestemming ingetrokken terwijl gtag.js al draait: dat script stoppen
       kan alleen door te herladen. Eerst de cookies weg, anders staan ze er na
       de reload nog. */
    if (vorige === "granted" || analyticsGeladen) {
      wisAnalyticsCookies();
      window.location.reload();
    }
  }

  function bouw() {
    var el = document.createElement("aside");
    el.className = "consent";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "false");
    el.setAttribute("aria-labelledby", "consent-titel");
    el.setAttribute("aria-describedby", "consent-tekst");
    el.setAttribute("tabindex", "-1");
    el.innerHTML =
      '<div class="consent-inner">' +
        '<div class="consent-tekst">' +
          '<p class="mono consent-label">COOKIES</p>' +
          '<h2 id="consent-titel">Even eerlijk over cookies</h2>' +
          '<p id="consent-tekst">Deze site plaatst uit zichzelf geen enkele cookie. ' +
          'Alleen als je hieronder ja zegt laden we Google Analytics, om te zien welke ' +
          "pagina's gelezen worden. Zeg je nee, dan gebeurt er niets en werkt de site " +
          'precies hetzelfde. <a href="/privacy/">Lees de privacyverklaring</a>.</p>' +
        '</div>' +
        '<div class="consent-acties">' +
          '<button type="button" class="btn consent-btn consent-weiger" data-keuze="denied">Alleen noodzakelijk</button>' +
          '<button type="button" class="btn btn-geel consent-btn" data-keuze="granted">Analytics toestaan</button>' +
        '</div>' +
      '</div>';

    el.addEventListener("click", function (e) {
      var knop = e.target.closest("[data-keuze]");
      if (knop) kies(knop.getAttribute("data-keuze"));
    });
    return el;
  }

  /* De banner komt vooraan in de body te staan, niet achteraan. Zo bereiken
     toetsenbord- en schermlezergebruikers hem als eerste, zonder dat we de
     focus bij het laden hoeven af te pakken. */
  function toon(trigger) {
    if (banner) return;
    herstelFocusNaar = trigger || null;
    banner = bouw();
    document.body.insertBefore(banner, document.body.firstChild);
    requestAnimationFrame(function () {
      if (banner) banner.setAttribute("data-zichtbaar", "true");
    });
    if (trigger) banner.focus();
  }

  function verberg() {
    if (!banner) return;
    banner.remove();
    banner = null;
    if (herstelFocusNaar && document.contains(herstelFocusNaar)) {
      herstelFocusNaar.focus();
    }
    herstelFocusNaar = null;
  }

  function zodraKlaar(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  window.codeloodsConsent = {
    open: function (trigger) { zodraKlaar(function () { toon(trigger); }); },
    keuze: lees
  };

  var keuze = lees();
  if (keuze === "granted") {
    gtag("consent", "update", { analytics_storage: "granted" });
    laadAnalytics();
  } else if (keuze === null) {
    zodraKlaar(function () { toon(null); });
  }
})();
