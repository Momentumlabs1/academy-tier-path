"""Eine Sperre fuer queue.json — damit sich die Crons nicht gegenseitig ueberschreiben.

WARUM ES DAS GIBT
Fuenf Crons schreiben in dieselbe Warteschlange: teaser (*/2), lobby (*/3),
bilanz (*/5), trade_card (*/10), cosmo_text. Um :00, :10, :30 laufen mehrere
gleichzeitig. Jeder liest die Queue, rechnet, haengt an und schreibt zurueck.
Liest trade_card die Queue mit Laenge N, und teaser_cron schreibt in derselben
Sekunde seine Live-Karte an Position N, dann ueberschreibt der Letzte den
Ersten: ein Eintrag ist weg, und trade_card merkt sich Index N fuer einen
Streifen, der dort gar nicht mehr steht. Beim naechsten Ergebniswechsel ersetzt
der Poster dann die Live-Karte eines ANDEREN Trades durch diesen Streifen
(Code-Review 13.09.).

Deshalb: Lesen–Aendern–Schreiben der Queue nur noch innerhalb von `gesperrt()`,
und geschrieben wird ueber eine eigene tmp-Datei je Prozess plus os.replace —
so sieht ein Leser nie eine halb geschriebene Datei.
"""
import contextlib, fcntl, json, os, sys, time

BASE = "/opt/cc-infoqueue"
QUEUE = f"{BASE}/queue.json"
LOCK = f"{BASE}/queue.lock"


@contextlib.contextmanager
def gesperrt(warten=90):
    """Exklusiv, aber nie endlos: nach `warten` Sekunden gibt der Lauf auf.

    Haengt ein Halter (Telegram antwortet nicht), sollen sich die Crons nicht
    alle zwei Minuten dahinter stapeln, bis der Server voll ist (Review
    13.09.). Wer aufgibt, beendet sich still — der naechste Takt versucht es
    neu. warten=0: nur nehmen, wenn frei (so laeuft der Poster).
    """
    with open(LOCK, "a") as f:
        frist = time.monotonic() + warten
        while True:
            try:
                fcntl.flock(f, fcntl.LOCK_EX | fcntl.LOCK_NB)
                break
            except BlockingIOError:
                if time.monotonic() >= frist:
                    print(f"Queue belegt — dieser Lauf gibt nach {warten} s auf", file=sys.stderr)
                    sys.exit(0)
                time.sleep(0.5)
        try:
            yield
        finally:
            fcntl.flock(f, fcntl.LOCK_UN)


def lies():
    return json.load(open(QUEUE))


def schreibe(queue):
    tmp = f"{QUEUE}.{os.getpid()}.tmp"
    with open(tmp, "w") as f:
        json.dump(queue, f, ensure_ascii=False, indent=1)
    os.replace(tmp, QUEUE)
