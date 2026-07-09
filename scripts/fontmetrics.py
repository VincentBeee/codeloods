#!/usr/bin/env python3
"""Berekent de fallback-metriek voor de @font-face-blokken in loods.css.

Zolang de webfonts nog laden rendert de browser in een systeemfont. Verschilt de
breedte van dat font, dan verspringt de tekst zodra het webfont binnenkomt — CLS.
Met size-adjust en de ascent/descent-overrides krijgt het fallback-font exact de
metriek van het webfont, en verspringt er niets.

Draaien na een fontwissel of een nieuw gewicht:

    pip install fonttools brotli
    python3 scripts/fontmetrics.py

Neem de percentages over in de @font-face-blokken bovenin frontend/assets/css/loods.css.

Twee dingen die niet vanzelf goed gaan:

  * Big Shoulders Display en Archivo zijn variabele fonts. Hun hmtx-tabel bevat de
    breedtes van de default-instantie — voor Big Shoulders is dat wght=100, een
    haarlijn. Wie het bestand naïef uitleest zit er 40% naast. Daarom instantiëren
    we eerst op het gewicht dat de pagina echt gebruikt.
  * De gemiddelde breedte meten we over de tekens die het font ook echt zet: de
    koppen staan op text-transform:uppercase, de bodytekst is overwegend onderkast.

Referentie is Arial, want dat is wat de fallback-stack in de praktijk oplevert
(Arial op Windows, Helvetica op macOS — metrisch gelijk, Liberation Sans op Linux).
"""

import string
import sys

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ARIAL = "/System/Library/Fonts/Supplemental/Arial.ttf"
FONTS = "frontend/assets/fonts"

# (bestand, gewicht zoals de pagina het gebruikt, tekens, naam van de fallback-familie)
DOELEN = [
    (f"{FONTS}/big-shoulders-display-latin.woff2", 800, string.ascii_uppercase, "'Big Shoulders fallback'"),
    (f"{FONTS}/archivo-latin.woff2", 400, string.ascii_lowercase, "'Archivo fallback'"),
]


def gemiddelde_breedte(font, tekens):
    cmap = font.getBestCmap()
    hmtx = font["hmtx"]
    breedtes = [hmtx[cmap[ord(t)]][0] for t in tekens if ord(t) in cmap]
    if not breedtes:
        sys.exit("geen van de gevraagde tekens zit in het font")
    return sum(breedtes) / len(breedtes)


def lees(pad, tekens, gewicht=None):
    font = TTFont(pad, fontNumber=0)
    if "fvar" in font:
        if gewicht is None:
            sys.exit(f"{pad} is variabel; geef een gewicht op")
        font = instancer.instantiateVariableFont(font, {"wght": gewicht})
    upem = font["head"].unitsPerEm
    hhea = font["hhea"]
    return {
        "upem": upem,
        "ascender": hhea.ascender,
        "descender": hhea.descender,
        "lineGap": hhea.lineGap,
        "breedte": gemiddelde_breedte(font, tekens) / upem,
    }


def main():
    for pad, gewicht, tekens, familie in DOELEN:
        try:
            web = lees(pad, tekens, gewicht)
        except FileNotFoundError:
            sys.exit(f"{pad} ontbreekt — draai dit script vanuit de repo-root")
        arial = lees(ARIAL, tekens)

        # size-adjust schaalt het fallback-font zo dat het even breed zet als het
        # webfont. De overrides zijn de metriek van het webfont, teruggerekend
        # naar het geschaalde em-kwadraat.
        size_adjust = web["breedte"] / arial["breedte"]
        ascent = web["ascender"] / web["upem"] / size_adjust
        descent = abs(web["descender"]) / web["upem"] / size_adjust
        line_gap = web["lineGap"] / web["upem"] / size_adjust

        naam = pad.rsplit("/", 1)[-1]
        breder = (arial["breedte"] / web["breedte"] - 1) * 100
        print(f"/* {naam} @ wght={gewicht} — Arial zet deze tekens {breder:.0f}% breder */")
        print("@font-face{")
        print(f"  font-family:{familie};")
        print("  src:local('Arial'),local('Helvetica'),local('Liberation Sans');")
        print(
            f"  size-adjust:{size_adjust * 100:.2f}%;"
            f"ascent-override:{ascent * 100:.2f}%;"
            f"descent-override:{descent * 100:.2f}%;"
            f"line-gap-override:{line_gap * 100:.2f}%;"
        )
        print("}")
        print()


if __name__ == "__main__":
    main()
