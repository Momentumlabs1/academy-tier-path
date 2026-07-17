# Inspirationsbilder → Presets (der Bild-Workflow)

Dein Wunsch: „Ich werf dir laufend Bilder rein, du machst was Ähnliches draus."
Da Vinted **keine stabile Bild-API** hat (native Reverse-Suche wurde 09/2025 nach
einer Woche wieder entfernt), lösen wir es so:

## Weg 1 – Bild → Suchbegriffe (funktioniert sofort, ohne Extra-Kosten)

Du gibst mir (oder später einem Vision-Endpoint) das Bild. Ergebnis ist ein
strukturiertes Preset – exakt im Format von `presets.json`:

```json
{
  "id": "auto-2026-07-17-fairycloud",
  "label": "Auto · Weißes Mesh-Feenkleid",
  "aesthetic": "fairycore",
  "garment": "dresses",
  "keywords": ["mesh kleid weiß", "feenkleid", "fairycore dress", "corset mesh dress"],
  "catalog_ids": [10],
  "price_to": 12,
  "max_shipping": 6,
  "status_ids": [6, 1, 2],
  "order": "newest_first",
  "currency": "EUR",
  "resale_est": 35,
  "source_image": "inspo/2026-07-17-fairycloud.jpg"
}
```

Das Vision-Modell liest aus dem Bild ab: **Aesthetic, Kleidungsstück, Farbe,
Muster, Material, wahrscheinliche Marke** → daraus werden `keywords` (DE + EN),
`garment` (→ Preis-Regel) und `catalog_ids`.

**Ablauf im Alltag:**
1. Bilder sammeln in einem Ordner `inspo/` (oder in den Chat werfen).
2. „Mach Presets draus" → neue Einträge werden an `presets.json` angehängt.
3. Poller zieht die neuen Presets automatisch beim nächsten Lauf.

## Weg 2 – Visuelle Ähnlichkeit als Re-Ranking (optional, später)

Titel auf Vinted sind oft schlecht („süßes Top 🌸"). Damit wir die trotzdem
fangen:

1. Poller lädt die **Thumbnail-URLs** der Treffer (kommen im JSON mit).
2. Ein Embedding-Modell (**CLIP**) macht aus jedem Inspirationsbild + jedem
   Treffer-Bild einen Vektor.
3. **Cosine-Similarity** sortiert die Treffer, die deinen Inspos visuell am
   nächsten sind, nach oben → die pusht der Bot zuerst.

Das ist der „Klugheit dahinter"-Teil: nicht nur Stichwort-Matching, sondern
„sieht aus wie das, was ich mag". Kostet etwas Rechenzeit, aber keine Vinted-API.

## Was du mir zum Start am besten gibst

- Pro Bild kurz: **Kleidungsstück** (Top/Kleid/Rock) und dein **Ziel-Verkaufspreis**,
  falls er vom Standard (Tops 30 €, Kleider 35 €) abweicht.
- Gerne mehrere Bilder auf einmal – ich clustere sie zu Aesthetics und lege pro
  Cluster ein Preset an, statt 20 fast gleiche.
