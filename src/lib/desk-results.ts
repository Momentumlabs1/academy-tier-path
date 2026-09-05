/**
 * Die geprüften Desk-Zahlen für den Beweis-Block auf den Partnerseiten.
 *
 * WOHER DIE ZAHLEN KOMMEN
 * Aus /opt/cc-infoqueue/desk_report.py auf dem IONOS-Server: jede Zahl hat eine
 * Belegzeile aus signal_relays (den 1:1 gespeicherten Desk-Nachrichten). Es
 * zählt nur, was der Desk selbst bestätigt hat — ein Trade ohne
 * Abschlussmeldung ist "ohne Update", nie ein Gewinn. Deshalb liegen diese
 * Werte UNTER dem, was der Markt tatsächlich erreicht hat (Woche 36 markt-
 * verifiziert: 1429 TP / 347 SL). Lieber zu wenig als angreifbar.
 *
 * WARUM STATISCH
 * Die Seite darf nie eine Zahl zeigen, die niemand geprüft hat. Ein Live-Feed
 * aus der Datenbank hätte am 02.09. einen leeren Tag als "0 Signale" gezeigt
 * und am 04.09. Tims eigene, nicht herleitbare Karte. Hier steht genau eine
 * Woche, von Hand freigegeben; wird freitags nach der Wochenkarte nachgezogen.
 */
export const DESK_WEEK = {
  label: "Week 36",
  range: "Mon 31 Aug – Fri 4 Sep",
  instrument: "Gold",
  signals: 10,
  tpPips: 778,
  slPips: 88,
  be: 0,
  /** Ehrlichkeits-Zeile — der Kanal zeigt auch die roten und leeren Tage. */
  note: "Wednesday: no setup, no trade. Thursday: one stop. We show those too.",
} as const;
