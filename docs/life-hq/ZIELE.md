# 🎯 Zielkatalog — Diegos Nachtschicht-Backlog

Diese Datei ist die Arbeitsgrundlage für autonome Claude-Sessions (z. B. die
nächtliche Routine). **Diego pflegt die Prioritäten** — oberster offener Punkt
mit `[ ]` wird zuerst gebaut. Einfach umsortieren, ergänzen, streichen.

## Regeln für die Nachtschicht (nicht verhandelbar)

1. **Nur auf Feature-Branches arbeiten** (`claude/nightshift-<thema>`), niemals
   direkt auf `main` pushen, keine Pull Requests mergen.
2. **Keine destruktiven Aktionen**: nichts löschen, keine Live-Datenbank-Schemas
   ändern, keine Deployments, keine Nachrichten an Kunden/Kanäle senden.
3. **Qualität vor Menge**: Build + Typecheck + Lint müssen grün sein, sonst wird
   nicht gepusht. Lieber ein sauberes Thema als drei halbe.
4. **Ein Thema pro Nacht.** Das oberste offene `[ ]`-Item, das in einer Session
   realistisch schaffbar ist. Zu großes Item → in Teilschritte zerlegen und den
   ersten Schritt bauen.
5. **Bericht schreiben**: Am Ende Ergebnis unten ins Log eintragen (Datum,
   Branch, was fertig ist, was offen blieb) und die Datei mit committen.

## Backlog (Priorität von oben nach unten)

### 📈 Trading Academy (dieses Repo)
- [ ] Admin-Dashboard von Demo-Daten auf echte Supabase-Daten umstellen
      (`src/lib/admin-data.ts` ersetzen: members, deposits, audit_log,
      signal_relays live laden; Fallback auf Demo, wenn env fehlt)
- [ ] Members-Verwaltung: Anlegen/Bearbeiten/Tier-Wechsel mit echten Writes
      + Audit-Log-Einträgen
- [ ] Vergütungs-/IB-Rechner als Seite bauen (Grundlage:
      `docs/verguetung-modell.md` — Staffel 5→10 USD/Lot visualisieren)
- [ ] Signals-Seite (`/signals`) an echte `signal_relays` anbinden

### 🧠 HQ — Life OS
- [ ] Wochen-Review-Brief (sonntags 18:00): Wochenzahlen aller Ventures,
      erledigte Aufgaben, offene P1s für nächste Woche
- [ ] Zielkatalog-Tab im HQ: diese Datei lesen/bearbeiten direkt vom Handy
- [ ] Venture-Detailseiten mit 30-Tage-Charts (Spy Secret Funnel, Content-Views)

### 🕵️ Spy Secret
- [ ] (Ideen hier eintragen — Nachtschicht fasst das Spy-Secret-Repo nur an,
      wenn es explizit hier steht und das Repo der Session hinzugefügt wurde)

### 🎬 Content / StrichAbi
- [ ] (Ideen hier eintragen)

## Log der Nachtschichten

| Datum | Branch | Ergebnis |
|---|---|---|
| — | — | Noch keine Nachtschicht gelaufen. |
