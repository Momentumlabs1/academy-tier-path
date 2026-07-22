# Vinted Sniper – Paket-Übersicht

Ziel: automatisch günstige, gut weiterverkaufbare Damen-Teile (ca. 20–30 J.,
Aesthetic-Nische) auf Vinted finden, bevor sie weg sind – und per Telegram pushen.

Nische: **Fairycore · Whitecore/Coquette · Y2K · Pailletten · Cottagecore/Floral ·
Sommer**. Preis-Logik: **Tops Artikel ≤ 6 € (+ ≤ 6 € Versand), Kleider ≤ 10–15 €**,
Zustand ab „Sehr gut", Ziel-Resale ~30–40 €.

## Was hier liegt

| Datei | Inhalt |
|---|---|
| [`empfehlung-architektur.md`](./empfehlung-architektur.md) | **Die Empfehlung.** Sinnvollste Logik fürs Ganze: Trichter über den eigenen Vinted-Strom (LLM-Keywords = Recall, FashionCLIP = Precision). Ehrliche Antwort zur Bildersuche + geprüfte Optionen. |
| [`setup-verbindungen.md`](./setup-verbindungen.md) | **Zum Loslegen.** Welche Services du verbinden musst (SerpApi, Anthropic, …), was sie kosten, und die Deploy-Befehle. |
| [`strategie-und-kosten.md`](./strategie-und-kosten.md) | **Zuerst lesen.** Wie Sniping 2026 funktioniert, API-Realität, „geht's ohne Grabber?", Grabber-/Proxy-Kosten, Architektur in diesem Repo, Rechtliches, Quellen. |
| [`presets.md`](./presets.md) | Fertige **Such-URLs** für vinted.at – heute schon manuell speicherbar. |
| [`presets.json`](./presets.json) | Maschinenlesbare Presets, die der Poller einliest. |
| [`bildersuche-workflow.md`](./bildersuche-workflow.md) | „Ich werf dir Bilder rein" → automatisch neue Presets (+ optionale CLIP-Ähnlichkeit). |
| [`../../tools/vinted-sniper/`](../../tools/vinted-sniper/) | Lauffähiger **Poller-Prototyp** (Node, keine Extra-Deps). |

## TL;DR

1. **Keine offizielle API** fürs Sniping → alle Bots pollen die interne
   `/api/v2/catalog/items` mit `order=newest_first`.
2. **Ohne Grabber möglich** bei wenigen Suchen + Heim-IP + höflichem Tempo.
   Nadelöhr ist **DataDome** (blockt v. a. Server-/Datacenter-IPs).
3. **Kosten:** DIY 0 €; Residential-Proxys ~50–200 $/Mon; Managed-Grabber
   ~0,018 $/Start + ~0,0005 $/Item (Dauerbetrieb wird darüber teuer).
4. **Bilder:** keine stabile Bild-API → Vision-Modell macht aus Bildern Presets;
   optional CLIP-Ähnlichkeit fürs Re-Ranking.
5. **Architektur hier:** Poller (Heim-IP) + Supabase (Presets/Dedup/Treffer) +
   bestehender **Telegram-Bot** als Push-Kanal.

## Schnellstart

```bash
# 1) Cookie aus eingeloggtem vinted.at-Browser holen (siehe tools/vinted-sniper/README)
cp tools/vinted-sniper/.env.example tools/vinted-sniper/.env   # Werte eintragen
node tools/vinted-sniper/poll.mjs --once                       # ein Testlauf
```
