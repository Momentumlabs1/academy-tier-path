# Vinted Sniper – Fertige Suchen (sofort nutzbar)

> Diese URLs kannst du **heute schon ohne Bot** in den Browser kopieren, auf
> vinted.at öffnen und mit **„Suche speichern"** als Alert anlegen. Der Bot
> (siehe `../../tools/vinted-sniper/`) nutzt später exakt dieselben Filter,
> nur automatisch und schneller.

## So nutzt du eine URL richtig

1. URL öffnen → du landest im Katalog mit **Preis-Limit + „Neueste zuerst"** vorgesetzt.
2. Im Filter zusätzlich setzen (kann die URL nicht zuverlässig vorbelegen):
   - **Zustand:** „Neu mit Etikett", „Neu ohne Etikett", „Sehr gut"
   - **Größe:** deine Zielgrößen (z. B. XS–M)
   - **Kategorie:** Damen › Tops bzw. Damen › Kleider
3. Oben rechts **„Suche speichern"** → Vinted schickt dir dann selbst Push/Mail bei neuen Treffern (langsamer als der Bot, aber gratis).

**Preis-Logik (deine Vorgabe):** `price_to` = **Artikelpreis**. Der Versand
(≤ 6 €) kommt oben drauf – das prüft der Bot separat. Manuell einfach beim
Treffer kurz auf die Versandkosten schauen.

---

## Tops – Artikel ≤ 6 € (Ziel-Resale ~30 €)

| Aesthetic | Such-URL |
|---|---|
| Fairycore | `https://www.vinted.at/catalog?search_text=mesh%20top&price_to=6&currency=EUR&order=newest_first` |
| Fairycore | `https://www.vinted.at/catalog?search_text=schmetterling%20top&price_to=6&currency=EUR&order=newest_first` |
| Coquette / Whitecore | `https://www.vinted.at/catalog?search_text=spitze%20top&price_to=6&currency=EUR&order=newest_first` |
| Coquette / Whitecore | `https://www.vinted.at/catalog?search_text=schleife%20top&price_to=6&currency=EUR&order=newest_first` |
| Y2K | `https://www.vinted.at/catalog?search_text=baby%20tee&price_to=6&currency=EUR&order=newest_first` |
| Y2K | `https://www.vinted.at/catalog?search_text=neckholder%20top&price_to=6&currency=EUR&order=newest_first` |
| Pailletten | `https://www.vinted.at/catalog?search_text=pailletten%20top&price_to=6&currency=EUR&order=newest_first` |
| Häkel / Crochet | `https://www.vinted.at/catalog?search_text=h%C3%A4kel%20top&price_to=6&currency=EUR&order=newest_first` |
| Muster / Print | `https://www.vinted.at/catalog?search_text=blumenmuster%20top&price_to=6&currency=EUR&order=newest_first` |

## Kleider – Artikel ≤ 10–15 € (Ziel-Resale ~35–40 €)

| Aesthetic | Such-URL |
|---|---|
| Fairycore | `https://www.vinted.at/catalog?search_text=feenkleid&price_to=12&currency=EUR&order=newest_first` |
| Whitecore / Coquette | `https://www.vinted.at/catalog?search_text=wei%C3%9Fes%20kleid&price_to=12&currency=EUR&order=newest_first` |
| Whitecore / Coquette | `https://www.vinted.at/catalog?search_text=spitzenkleid&price_to=12&currency=EUR&order=newest_first` |
| Cottagecore / Floral | `https://www.vinted.at/catalog?search_text=blumenkleid&price_to=12&currency=EUR&order=newest_first` |
| Cottagecore | `https://www.vinted.at/catalog?search_text=milkmaid%20kleid&price_to=12&currency=EUR&order=newest_first` |
| Pailletten | `https://www.vinted.at/catalog?search_text=paillettenkleid&price_to=15&currency=EUR&order=newest_first` |
| Y2K | `https://www.vinted.at/catalog?search_text=slip%20dress&price_to=12&currency=EUR&order=newest_first` |

## Sonstiges

| Kategorie | Such-URL |
|---|---|
| Mini-/Sommerrock ≤ 6 € | `https://www.vinted.at/catalog?search_text=minirock&price_to=6&currency=EUR&order=newest_first` |
| Two-Piece Set ≤ 10 € | `https://www.vinted.at/catalog?search_text=two%20piece%20set&price_to=10&currency=EUR&order=newest_first` |

---

## Marken, die in deiner Nische gut weiterverkaufen

Wenn du auf eine dieser Marken zusätzlich filterst (oder der Bot sie als
„Priority" markiert), sind Fehlkäufe seltener und die Marge höher:

**Brandy Melville, Jaded London, Motel Rocks, Sabo Skirt, Realisation Par,
Selkie, For Love & Lemons, Reformation, House of Sunny, Free People,
Urban Outfitters, Sister Jane, Damson Madder, Nobody's Child, Ganni,
Rat & Boa, Never Fully Dressed, White Fox, Oh Polly, Peppermayo, Rixo,
Sézane, Sandro, Maje** – plus als „Statement-Stücke" auch **Zara, Mango,
Stradivarius, Bershka, Hollister**.

---

## Warum der Bot trotzdem gewinnt

Gespeicherte Vinted-Suchen benachrichtigen dich, aber mit **Verzögerung von
Minuten** – die guten Deals sind dann oft weg. Der Poller checkt alle
paar Sekunden und pusht in **1–5 s** nach dem Listing. Genau dafür ist
`tools/vinted-sniper/poll.mjs` da. Details & Kosten:
[`strategie-und-kosten.md`](./strategie-und-kosten.md).
