# Empfehlung: Die sinnvollste Logik fürs Ganze (Bild-Suche + Sniper)

> Basiert auf recherchierten **und** adversarisch gegengeprüften Fakten
> (Stand Juli 2026). Kurzfassung der geprüften Optionen unten, Quellen in
> `strategie-und-kosten.md`.

## Die ehrliche Kernaussage zuerst

**Es gibt 2026 KEIN zuverlässiges „Magic"-Tool, das ein hochgeladenes Bild nimmt
und dir daraus das exakte kaufbare Teil findet** – weder auf Vinted noch „im
ganzen Internet". Belegt:

- **Vinteds eigene Bildersuche** kam 09/2025 und war nach **~1 Woche wieder weg** – instabil, nur in der App, keine API.
- **Bing Visual Search** ist **komplett abgeschaltet** (Retirement 11.08.2025, liefert HTTP 410).
- **Google Lens (SerpApi)** findet **kein gezieltes Vinted-Angebot** – kein Domain-Filter, zeigt eher Retail-/Neuware oder „ähnliche Bilder", nicht das konkrete gebrauchte Teil.
- **Blackbox-Tools** (imagesearchai.com, 8 $/Woche) sind unverifizierbar, liefern „ähnlich statt exakt", können jederzeit sterben.

**Aber:** Es gibt einen Weg, der **wirklich zuverlässig** ist – nur denkt er das
Problem anders herum. Nicht „Bild sucht im Internet", sondern **„Bild rankt
deinen eigenen, ohnehin gescrapten Vinted-Strom".**

---

## Die empfohlene Logik: ein Trichter über den EIGENEN Vinted-Strom

Der Denkfehler bei „Bild → finde Produkt" ist, dass das Bild die Suche machen
soll. Das ist der unzuverlässige Teil. Robust wird es, wenn das Bild **zwei
zuverlässige Dinge** tut: **Suchbegriffe liefern** und **als Maßstab ranken**.

```
LAYER 0 · INGEST   (der Poller, den wir schon haben)
  Vinted /api/v2/catalog/items (order=newest_first) breit pollen
  → Strom NEUER, echt kaufbarer Listings (Titel, Preis, Marke, Größe,
    Zustand, BILD-URLs, Link). Heim-IP/Proxy, dedup.

LAYER 1 · TEXT/REGEL-FILTER  (gratis, killt ~95 % Müll)
  Preis-Cap inkl. Versand, Zustand, Größe, Negativ-Wörter,
  Keyword-Match gegen deine Aesthetic-Presets.

LAYER 2 · VISUELLES RE-RANKING  (der „Bild"-Teil, self-hosted FashionCLIP)
  Jedes übrig gebliebene Listing-Foto einbetten, Cosine-Ähnlichkeit zu
  deiner Bibliothek an Inspirationsbildern. Score 0–1.
  → fängt die schlecht betitelten Treffer („süßes Top 🌸") und sortiert
    „sieht aus wie mein Geschmack" nach oben.

LAYER 3 · PUSH
  Top-Treffer → Telegram (Foto, Preis, Ähnlichkeits-Score, Link).
```

### Der Bild-Intake (dein „ich werf dir laufend Bilder rein")

Ein Upload verbessert **beide** Schichten gleichzeitig:

```
Bild hochladen
   │
   ├─▶ Vision-LLM (Claude Haiku o.ä.) liest Attribute aus:
   │     { aesthetic, kleidungsstück, farbe, muster, keywords[de/en], preisband }
   │     → erzeugt/aktualisiert ein PRESET  → treibt Layer 0/1 (Recall)
   │
   └─▶ das Bild selbst kommt in die FashionCLIP-Referenzbibliothek
         → treibt Layer 2 (Precision / „sieht aus wie das")
```

**Merksatz:** LLM-Keywords = **Recall** (finde kaufbare Kandidaten),
FashionCLIP = **Precision** (ranke „sieht aus wie mein Geschmack").

---

## Warum genau DAS zuverlässig ist

- **Jeder Kandidat kommt aus Vinteds eigener Suche** → garantiert real, kaufbar, in deiner Region. Kein „ähnliches Bild irgendwo im Netz".
- **Keine Abhängigkeit von einer fragilen Magic-API**, die sterben kann (Vinted-nativ und Bing sind genau daran gestorben).
- **FashionCLIP läuft auf deinem eigenen Server** → keine Rate-Limits, keine Kosten pro Anfrage, deterministisch, volle Datenhoheit.
- **Vision-LLM-Attribute sind billig und robust**; Nischen-Aesthetics (Fairycore/Coquette) funktionieren, weil Verkäufer diese Wörter selbst in die Titel schreiben.
- **Ein Schwachpunkt bewusst entschärft:** VLMs erkennen Marken nur bei sichtbarem Logo zuverlässig → **Marke nie als harter Filter**, nur als weicher Bonus/Kandidat.

---

## Kosten dieser Logik

| Baustein | Kosten |
|---|---|
| Poller (Layer 0/1) | **~0 €** auf Heim-IP; später optional Residential-Proxy 50–200 $/Mon |
| Vision-LLM-Intake | **< 1 $ pro 1000 Bilder** (Haiku/Gemini Flash-Lite); läuft nur auf deinen Uploads |
| FashionCLIP (Layer 2) | **0 € Lizenz** (Apache-2.0), CPU auf dem Scraper-Server reicht; optional kleiner GPU-VPS 30–150 €/Mon für schnelles Massen-Embedding |
| Telegram-Push | **0 €** (euer bestehender Bot) |

→ Der ganze zuverlässige Kern läuft **nahe 0 €**. Keine SerpApi-/Ximilar-Abos nötig.

### Optionale Managed-Abkürzung (falls du NICHTS selbst hosten willst)

Statt FashionCLIP selbst zu betreiben: **Ximilar Fashion Search** macht Layer 2
als Dienst gegen deinen hochgeladenen Feed. Self-serve, transparente Preise
(**Free 1.000 Credits/Mon; ab 59 €/Mon ≈ 400k Suchen**, ~0,25 Credit/Query).
Gleiche Logik – du mietest statt hostest. Lohnt erst, wenn Self-Hosting nervt.

---

## Geprüfte Optionen im Überblick (Verdikt nach Gegencheck)

| Ansatz | Verdikt | Für unseren Zweck (kaufbare Vinted-Treffer) |
|---|---|---|
| **Self-hosted FashionCLIP / Marqo-SigLIP** | **hoch** | ✅ **Kern-Empfehlung** (Layer 2). Läuft auf eigenem Server, 0 € Lizenz, ranked eigenen Feed. |
| **Vision-LLM → Keywords → Vinted-Textsuche** | mittel | ✅ **Kern-Empfehlung** (Intake + Layer 1). Billig, robust, jeder Treffer kaufbar. |
| **Fashion-API Ximilar / Lykdat** | mittel | ➕ Optionaler Managed-Ersatz für Layer 2 (ab 59 €/Mon). |
| **Google Lens via SerpApi** | mittel (für Vinted grenzwertig) | ⚠️ Nur als **Zusatz** zum Identifizieren „welche Marke/Modell ist das + Preis-Check". Findet keine gezielten Vinted-Angebote. |
| **Google Vision Product Search** | niedrig | ❌ Modell „eigener Katalog" – müsste ganz Vinted selbst ingesten. FashionCLIP macht das besser & fashion-nativ. |
| **Bing Visual Search** | tot | ❌ Abgeschaltet (HTTP 410). |
| **Vinted-nativ / imagesearchai.com** | niedrig | ❌ Instabil/Blackbox, keine API, nicht automatisierbar. |

---

## Empfohlene Bau-Reihenfolge (wenn du grünes Licht gibst)

1. **Layer 0/1 fest machen** – Poller → Supabase (Presets/Dedup/Treffer) → Telegram-Push. Das ist der funktionierende Sniper, sofort nützlich, **ohne jede Bild-Magie**.
2. **Bild-Intake (Vision-LLM)** – „Bild rein → Preset raus". Verbessert Recall, kostet fast nichts.
3. **Layer 2 (FashionCLIP)** – visuelles Re-Ranking der Treffer gegen deine Inspo-Bibliothek. Das ist der „Klugheit dahinter"-Teil.
4. **Optional** – Ximilar statt Self-Hosting, oder SerpApi-Lens als Marken-Identifikator, oder Residential-Proxys für Tempo.

**Mein Rat:** Schritt 1 zuerst (echter Nutzen an Tag 1), dann 2, dann 3.
Nicht mit der Bild-Magie anfangen – die ist die Kür, nicht die Basis.
