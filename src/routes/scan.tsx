/**
 * /scan — Cosmo Earth Scan: Cosmos eigene Nachrichten-Plattform ("das allererste Skynet" für Cosmo).
 *
 * WARUM (Diego, 24.10.2026): "vielleicht kannst du ja eh auch für Cosmo … nochmal eine Plattform bauen …
 * Dann baust du für Cosmo vielleicht das allererste Skynet … Basic-Probe-Version als Alien … weil in Telegram
 * die ganzen Nachrichten im Chat gehen ein bisschen unter. Das soll aber auch alles extrem geil gut strukturiert
 * sein und so mit Videos. Soll auch den Leuten dort reichen, aber trotzdem natürlich ab und zu Verlinkung zu
 * unserer eigenen Plattform dann, die ja über Cosmo Candles läuft."
 *
 * WIE
 * Die Seite liest nur eine Datei: earth-scan/index.json im öffentlichen Supabase-Speicher. Die schreibt der
 * Cosmo-Server (/opt/cc-news/plattform.py) nach jedem Lauf des News-Planers: jeder freigegebene SKYNET-Beitrag
 * mit fertigem Scan-Clip (Mac, scan_clip.py). Kein Login, keine Datenbank, keine Tabelle.
 *
 * Grenzen (Cosmo-Kern §6): Cosmo ist eine KI-Figur, jeder Beitrag nennt seine Quelle mit Link, Unbelegtes steht
 * als Frage oder "my systems say". Der Trading-Kanal wird nie als "free" beworben.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { openTelegramApp } from "@/components/academy/signals/telegram-handoff";

const INDEX = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/earth-scan/index.json`;
const ORDNER = "https://t.me/addlist/Cvk1zi2Y6jwyZDg0"; // News + Info + Trading in einem Tipp
const INFO = "https://t.me/+W3EHV-PZp4M0MWJk";

type Quelle = { name?: string; url?: string; datum?: string };
type Video = { titel?: string; url?: string; quelle?: string };
type Beitrag = {
  id: string;
  art?: "aktuell" | "akte";
  titel?: string;
  schlagzeile?: string;
  rubrik?: string;
  ort?: { name?: string };
  jahr?: string;
  stempel?: string;
  belegstand?: string;
  system?: string;
  text?: string;
  quelle?: Quelle;
  videos?: Video[];
  ki_hinweis?: string;
  clip: string;
  poster?: string;
  datum: string;
};

export const Route = createFileRoute("/scan")({
  validateSearch: (s: Record<string, unknown>) => ({ f: typeof s.f === "string" ? s.f : undefined }),
  head: () => ({
    meta: [
      { title: "Cosmo Earth Scan · transmissions from an alien" },
      {
        name: "description",
        content:
          "An alien scans your planet: buried files, leaked deals, things your news put in paragraph nine. Every scan with its source.",
      },
      { property: "og:title", content: "Cosmo Earth Scan" },
      { property: "og:description", content: "Transmissions from an alien who scans your planet. Sources linked." },
      { name: "theme-color", content: "#05070A" },
    ],
    links: [{ rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Silkscreen&display=swap" }],
  }),
  component: ScanSeite,
});

const STEMPEL_FARBE: Record<string, string> = {
  CONFIRMED: "#FF3B4E",
  DECLASSIFIED: "#FF3B4E",
  LEAKED: "#FFD34E",
  DISPUTED: "#A3E635",
  BURIED: "#D946EF",
  REPORTED: "#FFD34E",
};

function stempelVon(b: Beitrag) {
  const frage = (b.schlagzeile || b.titel || "").trim().endsWith("?");
  const st = stempelRoh(b);
  return frage && (st === "CONFIRMED" || st === "DECLASSIFIED") ? "REPORTED" : st; // eine Frage bestätigt man nicht
}

function stempelRoh(b: Beitrag) {
  if (b.stempel) return b.stempel.toUpperCase();
  const s = (b.belegstand || "").toLowerCase();
  if (b.art === "akte" && (s === "stimmt" || s === "belegt")) return "DECLASSIFIED";
  if (s === "stimmt" || s === "belegt") return "CONFIRMED";
  if (s.includes("umstritten")) return "DISPUTED";
  return "LEAKED";
}

function datumText(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
}

/** Der Fließtext ohne Titelzeile, Quelle und KI-Zeile (die stehen eigens auf der Seite). */
function absaetze(b: Beitrag) {
  return (b.text || "")
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function telegram(e: React.MouseEvent, url: string) {
  e.preventDefault();
  openTelegramApp(url).then((ok) => {
    if (!ok) window.location.href = url;
  });
}

function Stempel({ b, gross }: { b: Beitrag; gross?: boolean }) {
  const s = stempelVon(b);
  const c = STEMPEL_FARBE[s] || "#FF3B4E";
  return (
    <span className={`es-stempel${gross ? " gross" : ""}`} style={{ color: c, borderColor: c }}>
      {s}
    </span>
  );
}

function Clip({ b, laut }: { b: Beitrag; laut?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = !laut;
    v.play().catch(() => {});
  }, [b.id, laut]);
  return (
    <video
      ref={ref}
      key={b.id}
      className="es-clip"
      src={b.clip}
      poster={b.poster}
      autoPlay
      muted
      loop
      playsInline
      controls={laut}
      preload="metadata"
    />
  );
}

function Bericht({ b, onTeilen }: { b: Beitrag; onTeilen: (b: Beitrag) => void }) {
  const videos = (b.videos || []).filter((v) => v.url);
  return (
    <div className="es-bericht">
      <div className="es-zeile">
        <Stempel b={b} gross />
        <span className="es-meta">
          {b.art === "akte" ? "DECLASSIFIED FILE" : "LIVE SCAN"}
          {b.ort?.name ? ` · ${b.ort.name.toUpperCase()}` : ""}
          {b.jahr ? ` · ${b.jahr}` : ""}
          {datumText(b.datum) ? ` · ${datumText(b.datum)}` : ""}
        </span>
      </div>
      <h2 className="es-titel">{b.titel}</h2>
      {absaetze(b).map((p, i) => (
        <p key={i} className={i === 0 ? "es-lead" : "es-text"}>
          {p}
        </p>
      ))}
      {b.quelle?.url && (
        <a className="es-quelle" href={b.quelle.url} target="_blank" rel="noopener noreferrer nofollow">
          <span>SOURCE</span>
          {b.quelle.name || new URL(b.quelle.url).hostname}
          {b.quelle.datum ? ` · ${b.quelle.datum}` : ""} ↗
        </a>
      )}
      {videos.length > 0 && (
        <div className="es-videos">
          <div className="es-klein">WATCH THE EVIDENCE</div>
          {videos.map((v) => (
            <a key={v.url} href={v.url} target="_blank" rel="noopener noreferrer nofollow" className="es-video">
              ▶ {v.titel || v.url}
              {v.quelle ? <em> · {v.quelle}</em> : null}
            </a>
          ))}
        </div>
      )}
      <div className="es-aktionen">
        <a href={ORDNER} onClick={(e) => telegram(e, ORDNER)} className="es-knopf rot">
          GET SCANS FIRST ON TELEGRAM
        </a>
        <button type="button" className="es-knopf" onClick={() => onTeilen(b)}>
          SHARE THIS SCAN
        </button>
      </div>
      <p className="es-ki">{b.ki_hinweis || "AI-generated summary, checked against the linked source."}</p>
    </div>
  );
}

function ScanSeite() {
  const { f } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [alle, setAlle] = useState<Beitrag[] | null>(null);
  const [fehler, setFehler] = useState(false);
  const [filter, setFilter] = useState<string>("ALL");
  const [kopiert, setKopiert] = useState(false);

  useEffect(() => {
    fetch(INDEX, { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => setAlle((d.beitraege || []) as Beitrag[]))
      .catch(() => setFehler(true));
  }, []);

  const filter_liste = useMemo(() => {
    const r = new Set<string>();
    (alle || []).forEach((b) => b.rubrik && r.add(b.rubrik.toUpperCase()));
    return ["ALL", "LIVE SCANS", "FILES", ...Array.from(r).sort()];
  }, [alle]);

  const gezeigt = useMemo(
    () =>
      (alle || []).filter((b) =>
        filter === "ALL"
          ? true
          : filter === "LIVE SCANS"
            ? b.art !== "akte"
            : filter === "FILES"
              ? b.art === "akte"
              : (b.rubrik || "").toUpperCase() === filter,
      ),
    [alle, filter],
  );

  const offen = (alle || []).find((b) => b.id === f) || null;
  const neu = gezeigt[0];
  const rest = gezeigt.slice(1);

  const oeffnen = (b: Beitrag | null) => {
    navigate({ search: { f: b ? b.id : undefined }, replace: !b });
    if (b) window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const teilen = async (b: Beitrag) => {
    const url = `${window.location.origin}/scan?f=${encodeURIComponent(b.id)}`;
    try {
      if (navigator.share) await navigator.share({ title: b.titel, text: "Cosmo scanned this:", url });
      else {
        await navigator.clipboard.writeText(url);
        setKopiert(true);
        setTimeout(() => setKopiert(false), 1800);
      }
    } catch {
      /* Teilen abgebrochen */
    }
  };

  return (
    <div className="es">
      <style>{CSS}</style>
      <header className="es-kopf">
        <a href="/scan" className="es-marke" onClick={(e) => (e.preventDefault(), oeffnen(null))}>
          <i className="es-punkt" />
          COSMO EARTH SCAN
        </a>
        <a href={ORDNER} onClick={(e) => telegram(e, ORDNER)} className="es-knopf rot klein">
          JOIN<span className="es-lang"> ON TELEGRAM</span>
        </a>
      </header>

      <section className="es-intro">
        <img src="/cosmo/news-profil.png" alt="Cosmo, the alien" className="es-cosmo" />
        <div>
          <div className="es-klein rot">INCOMING TRANSMISSION</div>
          <h1>Your news buried it. My scanners didn't.</h1>
          <p>
            I'm Cosmo. I scan your planet from orbit: declassified files, quiet deals, the paragraph your news hoped
            you'd skip. Every scan comes with its source. Where the proof ends, I ask the question. You decide.
          </p>
        </div>
      </section>

      {offen && (
        <section className="es-offen">
          <button type="button" className="es-zurueck" onClick={() => oeffnen(null)}>
            ← ALL SCANS
          </button>
          <div className="es-gross">
            <Clip b={offen} laut />
            <Bericht b={offen} onTeilen={teilen} />
          </div>
        </section>
      )}

      <nav className="es-filter" aria-label="Filter">
        {filter_liste.map((x) => (
          <button key={x} type="button" className={x === filter ? "an" : ""} onClick={() => setFilter(x)}>
            {x}
          </button>
        ))}
      </nav>

      {!alle && !fehler && <div className="es-laden">SCANNING…</div>}
      {fehler && <div className="es-laden">SIGNAL LOST. Try again in a minute.</div>}

      {neu && !offen && (
        <section className="es-gross">
          <Clip b={neu} />
          <Bericht b={neu} onTeilen={teilen} />
        </section>
      )}

      {rest.length > 0 && (
        <section className="es-raster">
          {rest.map((b, i) => (
            <FragmentMitWerbung key={b.id} i={i}>
              <button type="button" className="es-karte" onClick={() => oeffnen(b)}>
                <div className="es-bild">
                  {b.poster ? (
                    <img src={b.poster} alt="" loading="lazy" />
                  ) : (
                    <video src={b.clip} muted playsInline preload="metadata" />
                  )}
                  <span className="es-play">▶</span>
                </div>
                <div className="es-karte-text">
                  <div className="es-zeile">
                    <Stempel b={b} />
                    <span className="es-meta">{datumText(b.datum)}</span>
                  </div>
                  <h3>{b.titel}</h3>
                </div>
              </button>
            </FragmentMitWerbung>
          ))}
        </section>
      )}

      <footer className="es-fuss">
        <p>
          Cosmo is an AI-generated character. Every transmission is an AI-generated summary, checked against the
          linked source. Where the evidence is thin, Cosmo asks instead of claiming.
        </p>
        <p>
          <a href="/impressum">Impressum</a> · <a href="/datenschutz">Datenschutz</a> · <a href="/">CosmosCandles</a>
        </p>
      </footer>
      {kopiert && <div className="es-toast">LINK COPIED</div>}
    </div>
  );
}

/** Nach jeder sechsten Karte ein Hinweis auf Cosmos Info-Kanal (Märkte). Trading nie als "free". */
function FragmentMitWerbung({ i, children }: { i: number; children: React.ReactNode }) {
  return (
    <>
      {children}
      {i % 6 === 5 && (
        <a href={INFO} onClick={(e) => telegram(e, INFO)} className="es-werbung">
          <div className="es-klein rot">SIDE SCAN</div>
          <strong>My scanners also read your markets.</strong>
          <span>Gold, indices, currencies. What moved and why, in my info channel. →</span>
        </a>
      )}
    </>
  );
}

const CSS = `
.es{--bg:#05070A;--bg1:#0B1022;--bg2:#121A33;--rot:#FF3B4E;--weiss:#F2F4F8;--grau:#8A93A6;--grau2:#4A5266;
  min-height:100vh;background:var(--bg);color:var(--weiss);font-family:"Instrument Sans",system-ui,sans-serif;
  background-image:radial-gradient(1px 1px at 20% 30%,#6A7BA8 50%,transparent 51%),radial-gradient(1px 1px at 70% 80%,#6A7BA8 50%,transparent 51%),radial-gradient(1px 1px at 85% 15%,#E8F0FF 50%,transparent 51%);
  background-size:220px 220px,340px 340px,480px 480px;padding-bottom:40px}
.es *{box-sizing:border-box}
.es a{color:inherit}
.es-kopf{position:sticky;top:0;z-index:5;display:flex;align-items:center;justify-content:space-between;gap:12px;
  padding:12px 16px;background:rgba(5,7,10,.92);backdrop-filter:blur(6px);border-bottom:2px solid #B3122A}
.es-marke{font-family:Silkscreen,monospace;font-size:15px;letter-spacing:.06em;text-decoration:none;display:flex;align-items:center;gap:8px;white-space:nowrap}
.es-punkt{width:8px;height:8px;background:var(--rot);box-shadow:0 0 10px var(--rot);display:inline-block;animation:es-blink 1.2s steps(2) infinite}
@keyframes es-blink{50%{opacity:.15}}
.es-knopf{font-family:Silkscreen,monospace;font-size:13px;letter-spacing:.04em;padding:11px 14px;border:2px solid var(--weiss);
  background:transparent;color:var(--weiss);text-decoration:none;cursor:pointer;display:inline-block;text-align:center}
.es-knopf.rot{background:var(--rot);border-color:var(--rot);color:#fff;box-shadow:0 0 18px rgba(255,59,78,.35)}
.es-knopf.klein{font-size:11px;padding:8px 10px}
.es-intro{max-width:1100px;margin:0 auto;padding:28px 16px 8px;display:flex;gap:20px;align-items:center}
.es-cosmo{width:92px;height:92px;image-rendering:pixelated;flex:none;border-radius:50%}
.es-intro h1{font-family:Silkscreen,monospace;font-weight:400;font-size:clamp(22px,4vw,36px);line-height:1.1;margin:6px 0 10px}
.es-intro p{color:#C9D3E3;max-width:640px;line-height:1.55;margin:0}
.es-klein{font-family:Silkscreen,monospace;font-size:11px;letter-spacing:.1em;color:var(--grau)}
.es-klein.rot{color:var(--rot)}
.es-filter{max-width:1100px;margin:18px auto 0;padding:0 16px;display:flex;gap:8px;overflow-x:auto;scrollbar-width:none}
.es-filter button{font-family:Silkscreen,monospace;font-size:12px;white-space:nowrap;padding:8px 12px;background:var(--bg1);
  color:var(--grau);border:1px solid var(--grau2);cursor:pointer}
.es-filter button.an{color:#fff;border-color:var(--rot);background:#1a0b10}
.es-laden{font-family:Silkscreen,monospace;text-align:center;color:var(--grau);padding:60px 16px}
.es-gross{max-width:1100px;margin:18px auto 0;padding:0 16px;display:grid;grid-template-columns:minmax(0,420px) minmax(0,1fr);gap:28px;align-items:start}
.es-clip{width:100%;aspect-ratio:4/5;background:#000;border:2px solid #B3122A;image-rendering:pixelated;display:block}
.es-zeile{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.es-stempel{font-family:Silkscreen,monospace;font-size:11px;border:2px solid;padding:3px 7px;letter-spacing:.06em}
.es-stempel.gross{font-size:13px}
.es-meta{font-family:Silkscreen,monospace;font-size:11px;color:var(--grau);letter-spacing:.05em}
.es-titel{font-family:Unbounded,system-ui,sans-serif;font-size:clamp(24px,3.4vw,38px);line-height:1.1;margin:14px 0 14px}
.es-lead{font-size:19px;line-height:1.5;color:#fff;margin:0 0 12px}
.es-text{font-size:17px;line-height:1.6;color:#C9D3E3;margin:0 0 12px}
.es-quelle{display:inline-flex;gap:10px;align-items:center;margin:6px 0 4px;padding:10px 12px;border:1px solid var(--grau2);
  background:var(--bg1);text-decoration:none;font-size:15px;max-width:100%;overflow-wrap:anywhere}
.es-quelle span{font-family:Silkscreen,monospace;font-size:11px;color:var(--rot)}
.es-videos{margin-top:14px;display:flex;flex-direction:column;gap:6px}
.es-video{padding:10px 12px;background:var(--bg2);text-decoration:none;font-size:15px;border-left:3px solid var(--rot)}
.es-video em{color:var(--grau);font-style:normal}
.es-aktionen{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}
.es-ki{color:var(--grau);font-size:13px;margin-top:14px}
.es-offen{max-width:1100px;margin:0 auto;padding:10px 0 18px;border-bottom:1px solid var(--grau2)}
.es-zurueck{font-family:Silkscreen,monospace;font-size:12px;background:none;border:0;color:var(--grau);padding:8px 16px;cursor:pointer}
.es-raster{max-width:1100px;margin:34px auto 0;padding:0 16px;display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:18px}
.es-karte{display:flex;flex-direction:column;text-align:left;background:var(--bg1);border:1px solid var(--grau2);color:inherit;padding:0;cursor:pointer;
  transition:border-color .15s,transform .15s}
.es-karte:hover{border-color:var(--rot);transform:translateY(-2px)}
.es-bild{position:relative;aspect-ratio:4/5;background:#000;overflow:hidden}
.es-bild img,.es-bild video{width:100%;height:100%;object-fit:cover;image-rendering:pixelated;display:block}
.es-play{position:absolute;right:10px;bottom:10px;width:34px;height:34px;display:grid;place-items:center;background:var(--rot);color:#fff;font-size:13px}
.es-karte-text{padding:12px}
.es-karte h3{font-size:17px;line-height:1.3;margin:10px 0 2px;font-weight:600}
.es-werbung{grid-column:1/-1;display:flex;flex-direction:column;gap:6px;padding:20px;border:2px dashed var(--rot);background:#12070b;text-decoration:none}
.es-werbung strong{font-family:Silkscreen,monospace;font-weight:400;font-size:18px}
.es-werbung span{color:#C9D3E3}
.es-fuss{max-width:1100px;margin:48px auto 0;padding:18px 16px 0;border-top:1px solid var(--grau2);color:var(--grau);font-size:13px;line-height:1.6}
.es-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);font-family:Silkscreen,monospace;background:var(--rot);color:#fff;padding:10px 14px;z-index:9}
@media (max-width:760px){
  .es-gross{grid-template-columns:1fr;gap:16px}
  .es-intro{flex-direction:column;align-items:flex-start;gap:12px;padding-top:20px}
  .es-cosmo{width:72px;height:72px}
  .es-lead{font-size:18px}
  .es-raster{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
  .es-karte h3{font-size:14px}
  .es-karte-text{padding:9px}
  .es-marke{font-size:13px;letter-spacing:.03em}
  .es-knopf.klein{font-size:10px;padding:7px 9px;white-space:nowrap}
}
@media (max-width:420px){.es-lang{display:none}}
`;
