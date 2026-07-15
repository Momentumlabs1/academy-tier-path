# Vergütungs- & IB-Modell — MomentumLabs / Academy

> Interne Doku. Stand: Juli 2026. Zahlen sind Richtwerte und schwanken mit Kundenaktivität.

---

## 1. Grunddaten (Broker-Deal)

| Punkt | Wert |
|---|---|
| IB-Vergütung (Gold/XAUUSD) | **15 USD pro Lot** (uns/dem Master zustehend) |
| Spread Gold | **26 Punkte = 2,6 Pips** (≈ 26 USD Kosten/Lot für den Kunden) |
| Unser Anteil am Spread | ~15 von ~26 USD ≈ **58 %** (Rest ~11 USD Broker) |
| Beispiel Ausführung | Gold 4.100,00 → real 4.100,26 (Spread) |
| Stop-Loss-Effekt | SL bei 4.003,00 → tatsächlich 4.002,74 (Spread muss ins Risiko) |
| Partner-Slots (IB-Plätze) | **7** |

**Wichtig fürs Trading:** Der Spread (26 Pkt) muss immer in Risikoberechnung + SL-Distanz einbezogen werden.

---

## 2. Hierarchie & Analytics

- **Alles läuft über MEINEN (Master-)Account** — damit wir zentral sauber analysieren können (Volumen, Lots, Einzahlungen, Aktivität pro Kunde/Partner).
- **Tim sitzt über mir**, bekommt aber **nichts von meinen Lots ab.**
  → Die **vollen 15 USD/Lot aus meinem Baum gehören mir** und sind frei verteilbar.
  → Was ich intern mit Tim abmache, ist separat und für dieses Modell irrelevant.

```
        TIM  (über mir, 0 % von meinen Lots)
         │
        ICH / MomentumLabs  (Master, volle 15 $/Lot verfügbar)
         │
   ┌─────┼─────┬─────┬──── … (7 Partner-Slots)
 Partner Partner Partner …
   │      │      │
 Kunden  Kunden Kunden   (alle Accounts laufen unter meinem Baum)
```

---

## 3. Partner-Split — Staffel 5 → 10 $/Lot

**Logik:** Ein Trader direkt beim Broker bekommt ~6–10 $/Lot (Schnitt ~8). Unser Partner geht **nicht** direkt — er bekommt das **komplette System gratis** (Website, Academy, Live-Signale, Bot, Telegram, Admin). Er „tauscht" also 2–3 $/Lot gegen ein fertiges Produkt, das ihn selbst Monate + Tausende € kosten würde. Deshalb: **niedrig starten, mit Volumen hochstaffeln.**

| Kunden-Volumen unter dem Partner | Partner bekommt | Ich behalte |
|---|---|---|
| 0 – 25.000 € | **5 $/Lot** | 10 $/Lot |
| 25.000 – 50.000 € | **6 $/Lot** | 9 $/Lot |
| 50.000 – 100.000 € | **8 $/Lot** | 7 $/Lot |
| **100.000 € +** | **10 $/Lot** | 5 $/Lot |

- **Start bei 5 $** → hohe Marge in der Anlaufphase (System refinanzieren) + trotzdem attraktiv.
- **Bis 10 $ ab 100k** → klarer Aufstieg = Partner-Motivation; auch oben hält Master **5 $/Lot auf großem Volumen** = weiter sehr profitabel.
- Optionaler „netter" Start: **6 $** statt 5 (kostet 1 $/Lot, klingt runder beim Recruiten).
- Der Partner muss **kein eigenes Produkt** bauen → er vermarktet unser fertiges System (Bio-Link).

---

## 4. Account-Staffelung (Kunden) — Lotgröße nach Einzahlung

Risikomodell: **≈ 1,2 Lot pro 10.000 € Kontovolumen** bei Gold. → Lot/Trade ≈ `Einzahlung / 10.000 × 1,2`.

Handelsannahmen: **6 Trades/Tag × 5 Tage × 4 Wochen = 120 Trades/Monat.**
→ Lots/Monat = Lot/Trade × 120.

| Einzahlungs-Level | Member-Tier | Lot/Trade | Lots/Monat | **IB brutto @ 15 $/Lot** | davon Partner (8 $) | ich (7 $) |
|---|---|---|---|---|---|---|
| 100 – 999 € | Foundation | ~0,05 | ~6 | ~90 $ | ~48 $ | ~42 $ |
| 1.000 – 1.999 € | Foundation+ | ~0,12 | ~14 | ~216 $ | ~115 $ | ~101 $ |
| 2.000 – 4.999 € | Operator | ~0,25 | ~30 | ~450 $ | ~240 $ | ~210 $ |
| 5.000 – 9.999 € | Operator+ | ~0,6 | ~72 | ~1.080 $ | ~576 $ | ~504 $ |
| 10.000 – 24.999 € | Elite | ~1,2 | ~144 | ~2.160 $ | ~1.152 $ | ~1.008 $ |
| 25.000 – 49.999 € | Elite+ | ~3,0 | ~360 | ~5.400 $ | ~2.880 $ | ~2.520 $ |
| 50.000 € + | Black | ~6,0 | ~720 | ~10.800 $ | ~5.760 $ | ~5.040 $ |

> Alle Werte **pro Kunde pro Monat**, brutto vor Kontenschwund. Hohe Frequenz = optimistisch (siehe §7).

### „Mehr Prozente ab höherem Level" (Member-Vorteil-Staffel)
Zwei Optionen (zu bestätigen — siehe §8):
- **A) Perks-Staffel** (empfohlen): höhere Einzahlung = mehr Leistung (mehr Signale, Auto-Trader ab Operator, Live-Room, 1:1 ab Elite, VIP ab Black).
- **B) Cashback-Staffel**: Member bekommt einen wachsenden Teil des Spreads/Rebates zurück, z.B. Foundation 0 $ / Operator 1 $ / Elite 2 $ / Black 3 $ pro Lot — reduziert unsere Marge, erhöht Bindung.

---

## 5. Beispielrechnung (Original-Case: 10.000 € / Partner)

```
1,2 Lot × 120 Trades = 144 Lots/Monat
Partner:  144 × 8 $ = 1.152 $/Monat
Ich:      144 × 7 $ = 1.008 $/Monat  (pro Partner)

7 Partner × 1.008 $ = 7.056 $/Monat für mich (Best-Case-Decke)
```

---

## 6. Marktvergleich & Verhandlungshebel (Recherche Juli 2026)

- **15 $/Lot auf Gold = überdurchschnittlich** (Markt-Schnitt IB ~10 $/Lot).
- Höhere Sätze existieren, meist **volumen-gated**: HFM bis ~29,70 $ (Premium-Volumen), einige Programme „bis 25 $", OANDA 18 $/100 oz.
- **26-Pkt-Spread ist breit** (normal 10–25) — finanziert die hohe Auszahlung, kostet aber den Kunden.
- **Bester Move: nicht wechseln, sondern Staffel nachverhandeln:**
  - „15 $ bis 100 Lots/Mo, **18 $ ab 100**, **20 $ ab 300**"
  - optional **engere-Spread-Variante (~18 Pkt)** für abspringende Kunden (Kunden überleben länger → mehr Lots).

---

## 7. Risiko-Hinweis zu den Projektionen

- 144 Lots/Monat aus **einem** 10k-Konto = ~**3.744 $ Spread-Kosten/Monat** = **~37 % des Kontos/Monat**.
- Funktioniert nur, wenn Kunden **finanziert bleiben & aktiv traden** (gewinnen oder nachschießen).
- → **7k/Monat = Decke, nicht Durchschnitt.** Reale Einnahmen hängen an **Kunden-Überlebensrate & Aktivität.**

---

## 8. Offene Punkte (zu bestätigen)

1. „Mehr Prozente ab Level" = **Perks-Staffel (A)** oder **Cashback-Staffel (B)** oder beides?
2. Genaue Lot-Größen pro Einzahlungs-Level final festzurren (Tabelle §4 ist Vorschlag).
3. Partner-Split-Staffel für Top-Partner (mehr als 8 $ ab X Lots)?
4. Deposit-Freischaltung Telegram: bleibt Schwelle bei **100 €** (Foundation)?
