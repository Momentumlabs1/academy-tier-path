// Phrase captions, timed on word boundaries of the Whisper transcript.
// All times are in SOURCE seconds of the raw recording (Video 1.mov).

export type Caption = {s: number; e: number; text: string};

export const CAPTIONS_MAIN: Caption[] = [
  {s: 0.59, e: 1.85, text: 'Nach fünf Jahren Trading'},
  {s: 1.85, e: 4.01, text: 'hat mir Komplexität nie Geld eingebracht.'},
  {s: 4.01, e: 5.2, text: 'Einfachheit schon.'},
  {s: 5.83, e: 8.75, text: 'Und der einfachste Edge, den ich gefunden habe,'},
  {s: 8.97, e: 10.85, text: 'ist die erste 15-Minuten-Kerze'},
  {s: 10.85, e: 11.9, text: 'der New York Session.'},
  {s: 12.13, e: 13.23, text: 'Markiere einfach das High'},
  {s: 13.23, e: 15.3, text: 'und das Low der ersten 15 Minuten.'},
  {s: 15.55, e: 17.3, text: 'Das ist dann deine Opening Range.'},
  {s: 17.53, e: 19.7, text: 'Aber anstatt den Breakout zu traden,'},
  {s: 19.99, e: 21.57, text: 'legst du einfach das Volumenprofil'},
  {s: 21.57, e: 23.4, text: 'über die ersten 15 Minuten.'},
  {s: 23.65, e: 25.51, text: 'Dort siehst du jetzt, wo 70 %'},
  {s: 25.51, e: 27.51, text: 'des Volumens tatsächlich gehandelt wurden.'},
  {s: 27.51, e: 30.15, text: 'Dieser Bereich wird Value Area genannt.'},
  {s: 30.15, e: 33.79, text: 'Die obere Grenze ist das Value Area High,'},
  {s: 33.79, e: 36.6, text: 'die untere Grenze das Value Area Low.'},
  {s: 38.91, e: 41.6, text: 'An diesen Levels können zwei Dinge passieren.'},
  {s: 42.89, e: 45.6, text: 'Erstens: Fakeout am Value Area High.'},
  {s: 45.87, e: 48.9, text: 'Der Preis bricht über das Value Area High aus,'},
  {s: 49.23, e: 51.4, text: 'schließt aber wieder innerhalb der Value Area.'},
  {s: 51.61, e: 52.91, text: 'Die Käufer wurden getrappt —'},
  {s: 52.91, e: 55.29, text: 'und der Close zurück in der Value Area'},
  {s: 55.29, e: 57.3, text: 'ist dein Einstieg, also dein Entry.'},
  {s: 57.59, e: 59.73, text: 'Den Stop-Loss setzt du einfach über das High'},
  {s: 59.73, e: 62.6, text: 'und dein Target ist das Value Area Low.'},
  {s: 62.93, e: 64.59, text: 'Traile jetzt deinen Stop-Loss'},
  {s: 64.59, e: 67.4, text: 'nach jeder Candle, die in deine Richtung geht.'},
  {s: 68.03, e: 71.1, text: 'Genau da entstehen oft die explosivsten Moves.'},
  {s: 72.29, e: 76.3, text: 'Nummer zwei: Akzeptanz über der Value Area.'},
  {s: 76.57, e: 78.93, text: 'Der Preis bricht über die Value Area aus'},
  {s: 78.93, e: 80.4, text: 'und hält sich auch darüber.'},
  {s: 80.69, e: 83.5, text: 'Das zeigt: Der Markt akzeptiert höhere Preise.'},
  {s: 83.87, e: 86.95, text: 'Warte jetzt auf einen Pullback zum Value Area High'},
  {s: 86.95, e: 89.0, text: 'und trade die Continuation.'},
  {s: 89.31, e: 91.37, text: 'Auch hier: Zieh deinen Stop-Loss'},
  {s: 91.37, e: 93.35, text: 'unter das Low jeder neuen Kerze nach'},
  {s: 93.35, e: 94.73, text: 'und lass den Trade laufen,'},
  {s: 94.73, e: 96.1, text: 'bis du ausgestoppt wirst.'},
  {s: 96.55, e: 100.2, text: 'So holst du das Maximum aus deinen Gewinnen raus.'},
];

// Ending A — organic ("comment below")
export const CAPTIONS_CTA_ORGANIC: Caption[] = [
  {s: 100.81, e: 102.97, text: 'Wenn du mehr über das Volumenprofil lernen möchtest:'},
  {s: 103.05, e: 105.81, text: 'Ich habe einen kostenlosen Kurs und eine kostenlose Community.'},
  {s: 105.81, e: 108.4, text: 'Einfach unter dem Video kommentieren.'},
];

// Ending B — ad ("click the button below this ad")
export const CAPTIONS_CTA_AD: Caption[] = [
  {s: 110.22, e: 112.8, text: 'Wenn du mehr über das Volumenprofil lernen möchtest,'},
  {s: 112.9, e: 115.3, text: 'dann klick einfach unter dieser Ad auf den Button.'},
  {s: 115.48, e: 117.22, text: 'Denn ich habe eine kostenlose Community'},
  {s: 117.22, e: 119.22, text: 'und einen komplett kostenlosen Kurs,'},
  {s: 119.32, e: 122.3, text: 'wo ich das Ganze tagtäglich den Leuten beibringe.'},
];
