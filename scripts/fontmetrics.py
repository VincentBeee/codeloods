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

De referentie is Arial, want dat is wat de fallback-stack in de praktijk oplevert
(Arial op Windows, Helvetica op macOS — metrisch gelijk, Liberation Sans op Linux).
De gemiddelde breedte meten we over de tekens die het font ook echt zet: de koppen
staan op text-transform:uppercase, de bodytekst is overwegend onderkast.
"""

import io
import string
import subprocess
import sys

from fontTools.ttLib import TTFont

ARIAL = "/System/Library/Fonts/Supplemental/Arial.ttf"

# Latin-subset woff2 van Google Fonts. Ververs deze URL's uit de CSS-respons van
# fonts.googleapis.com als de fontversie opschuift (de /v24/ in het pad).
FONTS = [
    (
        "Big Shoulders Display 800",
        "https://fonts.gstatic.com/s/bigshouldersdisplay/v24/fC1MPZJEZG-e9gHhdI4-NBbfd2ys3SjJCx12wPgf9g-_3F0YdQ88FFkwSA.woff2",
        string.ascii_uppercase,
        "'Big Shoulders fallback'",
    ),
    (
        "Archivo 400",
        "https://fonts.gstatic.com/s/archivo/v25/k3k6o8UDI-1M0wlSV9XAw6lQkqWY8Q82sJaRE-NWIDdgffTTNDNZ9xdp.woff2",
        string.ascii_lowercase,
        "'Archivo fallback'",
    ),
]


def gemiddelde_breedte(font, tekens):
    cmap = font.getBestCmap()
    hmtx = font["hmtx"]
    breedtes = [hmtx[cmap[ord(t)]][0] for t in tekens if ord(t) in cmap]
    if not breedtes:
        sys.exit("geen van de gevraagde tekens zit in het font")
    return sum(breedtes) / len(breedtes)


def lees(pad_of_bytes, tekens):
    font = TTFont(pad_of_bytes, fontNumber=0)
    upem = font["head"].unitsPerEm
    hhea = font["hhea"]
    return {
        "upem": upem,
        "ascender": hhea.ascender,
        "descender": hhea.descender,
        "lineGap": hhea.lineGap,
        "breedte": gemiddelde_breedte(font, tekens) / upem,
    }


def haal(url):
    """Via curl, niet urllib: de python.org-build op macOS heeft geen CA-bundel."""
    klaar = subprocess.run(["curl", "-sSf", url], capture_output=True)
    if klaar.returncode != 0:
        sys.exit(f"ophalen mislukt: {url}\n{klaar.stderr.decode()}")
    return klaar.stdout


def main():
    for naam, url, tekens, familie in FONTS:
        web = lees(io.BytesIO(haal(url)), tekens)
        arial = lees(ARIAL, tekens)

        # size-adjust schaalt het fallback-font zo dat het even breed zet als het
        # webfont. De overrides zijn de metriek van het webfont, teruggerekend
        # naar het geschaalde em-kwadraat.
        size_adjust = web["breedte"] / arial["breedte"]
        noemer = size_adjust
        ascent = web["ascender"] / web["upem"] / noemer
        descent = abs(web["descender"]) / web["upem"] / noemer
        line_gap = web["lineGap"] / web["upem"] / noemer

        print(f"/* {naam} — fallback voor {familie} */")
        print(f"@font-face{{")
        print(f"  font-family:{familie};")
        print(f"  src:local('Arial'),local('Helvetica'),local('Liberation Sans');")
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
