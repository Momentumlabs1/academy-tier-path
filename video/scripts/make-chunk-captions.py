# Generates 2-3-word caption chunks (word-accurately timed) from the corrected
# phrase captions + Whisper word timestamps -> video/src/tim/captions.ts
import json

TR = json.load(open('tim-transcript.json'))
WORDS = [w for s in TR['segments'] for w in s['words']]

MAIN = [
    (0.59, 1.85, 'Nach fünf Jahren Trading'),
    (1.85, 2.85, 'hat mir Komplexität'),
    (2.85, 4.01, 'nie Geld eingebracht.'),
    (4.01, 5.2, 'Einfachheit schon.'),
    (5.83, 8.75, 'Und der einfachste Edge, den ich gefunden habe,'),
    (8.97, 10.85, 'ist die erste 15-Minuten-Kerze'),
    (10.85, 11.9, 'der New York Session.'),
    (12.13, 13.23, 'Markiere einfach das High'),
    (13.23, 15.3, 'und das Low der ersten 15 Minuten.'),
    (15.55, 17.3, 'Das ist dann deine Opening Range.'),
    (17.53, 19.7, 'Aber anstatt den Breakout zu traden,'),
    (19.99, 21.57, 'legst du einfach das Volumenprofil'),
    (21.57, 23.4, 'über die ersten 15 Minuten.'),
    (23.65, 25.51, 'Dort siehst du jetzt, wo 70 %'),
    (25.51, 27.51, 'des Volumens tatsächlich gehandelt wurden.'),
    (27.51, 30.15, 'Dieser Bereich wird Value Area genannt.'),
    (30.15, 33.79, 'Die obere Grenze ist das Value Area High,'),
    (33.79, 36.6, 'die untere Grenze das Value Area Low.'),
    (38.91, 41.6, 'An diesen Levels können zwei Dinge passieren.'),
    (42.89, 45.6, 'Erstens: Fakeout am Value Area High.'),
    (45.87, 48.9, 'Der Preis bricht über das Value Area High aus,'),
    (49.23, 51.4, 'schließt aber wieder innerhalb der Value Area.'),
    (51.61, 52.91, 'Die Käufer wurden getrappt —'),
    (52.91, 55.29, 'und der Close zurück in der Value Area'),
    (55.29, 57.3, 'ist dein Einstieg, also dein Entry.'),
    (57.59, 59.73, 'Den Stop-Loss | setzt du einfach | über das High'),
    (59.73, 62.6, 'und dein Target ist das Value Area Low.'),
    (62.93, 64.59, 'Traile jetzt deinen Stop-Loss'),
    (64.59, 67.4, 'nach jeder Candle, die in deine Richtung geht.'),
    (68.03, 71.05, 'Genau da entstehen oft die explosivsten Moves.'),
    (72.29, 76.3, 'Nummer zwei: Akzeptanz über der Value Area.'),
    (76.57, 78.93, 'Der Preis bricht über die Value Area aus'),
    (78.93, 80.4, 'und hält sich auch darüber.'),
    (80.69, 83.5, 'Das zeigt: Der Markt akzeptiert höhere Preise.'),
    (83.87, 86.95, 'Warte jetzt auf einen Pullback zum Value Area High'),
    (86.95, 89.0, 'und trade die Continuation.'),
    (89.31, 90.89, 'Auch hier: Zieh deinen Stop-Loss'),
    (90.89, 93.35, 'unter das Low jeder neuen Kerze nach'),
    (93.35, 94.73, 'und lass den Trade laufen,'),
    (94.73, 96.1, 'bis du ausgestoppt wirst.'),
    (96.55, 100.2, 'So holst du das Maximum aus deinen Gewinnen raus.'),
]
CTA_ORGANIC = [
    (100.81, 102.97, 'Wenn du mehr über das Volumenprofil lernen möchtest:'),
    (103.05, 105.81, 'Ich habe einen | kostenlosen Kurs | und eine kostenlose Community.'),
    (105.81, 108.4, 'Einfach unter dem Video kommentieren.'),
]
CTA_AD = [
    (110.22, 112.8, 'Wenn du mehr über das Volumenprofil lernen möchtest,'),
    (112.9, 115.3, 'dann klick einfach unter dieser Ad auf den Button.'),
    (115.48, 117.22, 'Denn ich habe eine kostenlose Community'),
    (117.22, 119.22, 'und einen komplett kostenlosen Kurs,'),
    (119.32, 122.3, 'wo ich das Ganze tagtäglich den Leuten beibringe.'),
]

ATOMIC = ['Value Area High', 'Value Area Low', 'Value Area', 'Opening Range', 'New York Session']
PUNCT_ONLY = {'—', '–', '-'}


def tokenize(text):
    raw = text.split()
    # glue punctuation-only / '%' tokens to the previous word
    words = []
    for w in raw:
        if words and (w in PUNCT_ONLY or w == '%'):
            words[-1] += ' ' + w if w == '%' else ' ' + w
        else:
            words.append(w)
    # glue atomic multi-word terms into single tokens (weight = word count)
    tokens = []
    i = 0
    while i < len(words):
        matched = False
        for a in ATOMIC:
            parts = a.split()
            n = len(parts)
            cand = [words[i + k].rstrip('.,:;!?') for k in range(n) if i + k < len(words)]
            if len(cand) == n and cand == parts:
                tokens.append((' '.join(words[i:i + n]), n))
                i += n
                matched = True
                break
        if not matched:
            tokens.append((words[i], 1))
            i += 1
    return tokens


def chunk_caption(s, e, text):
    manual = '|' in text  # manual chunking via pipes, exempt from short-merge
    if manual:
        chunks = [[(w, 1) for w in part.split()] for part in text.split('|')]
    else:
        tokens = tokenize(text)
        # greedy: up to 3 display-words per chunk; atomic token may fill a chunk alone
        chunks, cur, curw = [], [], 0
        for tok, w in tokens:
            if cur and curw + w > 3:
                chunks.append(cur)
                cur, curw = [], 0
            cur.append((tok, w))
            curw += w
        if cur:
            chunks.append(cur)
    # proportional timing by character weight across [s, lastWordEnd]
    words_in = [w for w in WORDS if w['s'] >= s - 0.06 and w['e'] <= e + 0.06]
    t0 = words_in[0]['s'] if words_in else s
    t1 = words_in[-1]['e'] if words_in else e
    total_chars = sum(len(t) for ch in chunks for t, _ in ch)
    out, cum = [], 0
    for ci, ch in enumerate(chunks):
        chars = sum(len(t) for t, _ in ch)
        cs = t0 + (t1 - t0) * (cum / total_chars)
        cum += chars
        ce = t0 + (t1 - t0) * (cum / total_chars)
        out.append([cs, ce, ' '.join(t for t, _ in ch)])
    # snap chunk boundaries to actual word starts where possible
    starts = [w['s'] for w in words_in]
    for ci in range(1, len(out)):
        target = out[ci][0]
        best = min(starts, key=lambda x: abs(x - target)) if starts else target
        if abs(best - target) < 0.45:
            out[ci][0] = best
            out[ci - 1][1] = best
    # merge chunks that would flash too briefly (<0.42s) into a neighbor
    changed = not manual
    while changed and len(out) > 1:
        changed = False
        for i, ch in enumerate(out):
            if ch[1] - ch[0] < 0.42:
                if i + 1 < len(out):
                    out[i + 1][0] = ch[0]
                    out[i + 1][2] = ch[2] + ' ' + out[i + 1][2]
                else:
                    out[i - 1][1] = ch[1]
                    out[i - 1][2] += ' ' + ch[2]
                del out[i]
                changed = True
                break
    # continuity inside the caption + padded end on the last chunk
    out[0][0] = s
    out[-1][1] = e
    for ci in range(len(out) - 1):
        out[ci][1] = out[ci + 1][0]
    return out


def emit(name, data):
    lines = [f'export const {name}: Caption[] = [']
    for s, e, text in data:
        for cs, ce, t in chunk_caption(s, e, text):
            t_esc = t.replace("'", "\\'")
            lines.append(f"  {{s: {cs:.2f}, e: {ce:.2f}, text: '{t_esc}'}},")
    lines.append('];')
    return '\n'.join(lines)


header = '''// AUTO-GENERATED by video-work/make-chunk-captions.py — kurze 2-3-Wort-Chunks,
// wortgenau getaktet auf die Whisper-Timestamps. Alle Zeiten in QUELL-Sekunden.

export type Caption = {s: number; e: number; text: string};

'''
body = '\n\n'.join([
    emit('CAPTIONS_MAIN', MAIN),
    '// Ending A — organic ("comment below")\n' + emit('CAPTIONS_CTA_ORGANIC', CTA_ORGANIC),
    '// Ending B — ad ("click the button below this ad")\n' + emit('CAPTIONS_CTA_AD', CTA_AD),
])
open('../video/src/tim/captions.ts', 'w').write(header + body + '\n')
print('written', sum(1 for _ in open('../video/src/tim/captions.ts')))
