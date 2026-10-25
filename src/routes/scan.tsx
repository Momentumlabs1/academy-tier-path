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
 * mit fertigem Scan-Clip (Mac, scan_clip.py). Keine Datenbank, keine Tabelle.
 *
 * SPERRE (Diego, 25.10.2026): „dass die Leute da durchklicken können, nach 15 Sekunden ist es halt gesperrt. Und sie
 * müssen sich registrieren, genau. … Und bei Telegram kommt man einfach so rein.“ Ohne Konto läuft eine Vorschau von
 * 15 Sekunden (ab dem ersten Besuch, gemerkt in localStorage, sonst reicht Neuladen), dann legt sich die Sperre über
 * die Seite: Konto mit E-Mail und Passwort direkt hier (gleiche Supabase-Registrierung wie /signup, Partner aus dem
 * cosmo_ref-Cookie), oder ohne Konto weiter in den Telegram-Kanal. Mit Konto ist die Seite offen.
 *
 * Grenzen (Cosmo-Kern §6): Cosmo ist eine KI-Figur, jeder Beitrag nennt seine Quelle mit Link, Unbelegtes steht
 * als Frage oder "my systems say". Der Trading-Kanal wird nie als "free" beworben.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { openTelegramApp } from "@/components/academy/signals/telegram-handoff";
import { supabase } from "@/integrations/supabase/client";

const INDEX = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/earth-scan/index.json`;
const ORDNER = "https://t.me/addlist/Cvk1zi2Y6jwyZDg0"; // News + Info + Trading in einem Tipp
const INFO = "https://t.me/+W3EHV-PZp4M0MWJk";
const EARTH_SCAN_TG = "https://t.me/+TQaO3Y-pTpVhYTU0"; // der Kanal allein, ohne Konto
const VORSCHAU_S = 15;
const VORSCHAU_KEY = "cc_scan_vorschau"; // Zeitpunkt des ersten Besuchs (ms)

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

type SperrStand = "pruefen" | "vorschau" | "gesperrt" | "offen";

/** Vorschau-Uhr: offen mit Konto, sonst 15 s ab dem ersten Besuch, danach gesperrt. */
function useScanSperre() {
  const [stand, setStand] = useState<SperrStand>("pruefen");
  const [rest, setRest] = useState(VORSCHAU_S);
  useEffect(() => {
    let lebt = true;
    let uhr: number | undefined;
    supabase.auth.getSession().then(({ data }) => {
      if (!lebt) return;
      if (data.session) return setStand("offen");
      let start = Date.now();
      try {
        const alt = Number(localStorage.getItem(VORSCHAU_KEY));
        if (alt > 0 && alt <= start) start = alt;
        else localStorage.setItem(VORSCHAU_KEY, String(start));
      } catch {
        /* privater Modus: Vorschau gilt je Besuch */
      }
      const ticken = () => {
        if (!lebt) return;
        const r = Math.max(0, VORSCHAU_S - Math.floor((Date.now() - start) / 1000));
        setRest(r);
        setStand((s) => (s === "offen" ? s : r > 0 ? "vorschau" : "gesperrt"));
        if (r > 0) uhr = window.setTimeout(ticken, 250);
      };
      ticken();
    });
    const { data: abo } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) setStand("offen");
    });
    return () => {
      lebt = false;
      window.clearTimeout(uhr);
      abo.subscription.unsubscribe();
    };
  }, []);

  // Gesperrt: Clips anhalten, Seite steht still.
  useEffect(() => {
    if (stand !== "gesperrt") return;
    document.querySelectorAll<HTMLVideoElement>(".es video").forEach((v) => v.pause());
    const vorher = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = vorher;
    };
  }, [stand]);

  return { stand, rest };
}

function cookieLesen(name: string): string | null {
  const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : null;
}

/** Die Sperre: Konto hier anlegen (oder einloggen), oder ohne Konto weiter auf Telegram. */
function Sperre() {
  const [modus, setModus] = useState<"neu" | "login">("neu");
  const [mail, setMail] = useState("");
  const [passwort, setPasswort] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [bestaetigen, setBestaetigen] = useState(false);

  async function einloggen() {
    const { error } = await supabase.auth.signInWithPassword({ email: mail.trim(), password: passwort });
    if (error) setFehler("Email or password doesn't match. Try again, or create a new account.");
  }

  async function senden(e: React.FormEvent) {
    e.preventDefault();
    setLaeuft(true);
    setFehler(null);
    if (modus === "login") {
      await einloggen();
      setLaeuft(false);
      return;
    }
    const { data, error } = await supabase.auth.signUp({
      email: mail.trim(),
      password: passwort,
      options: {
        emailRedirectTo: `${window.location.origin}/scan`,
        data: { app: "academy", referred_by_tenant: cookieLesen("cosmo_ref"), signup_source: "earth-scan" },
      },
    });
    // Schon registriert (Fehler oder leere identities wegen Enumeration-Schutz, wie in /signup): einloggen.
    const gibtEs =
      (error && /already|registered|exists/i.test(error.message)) ||
      (!error && data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0);
    if (gibtEs) await einloggen();
    else if (error) setFehler(error.message);
    else if (!data.session) setBestaetigen(true);
    setLaeuft(false);
  }

  return (
    <div className="es-sperre" role="dialog" aria-modal="true" aria-labelledby="es-sperre-titel">
      <div className="es-sperre-box">
        <img src="/cosmo/profil-pixel.png" alt="" width={84} height={84} className="es-sperre-cosmo" />
        <div className="es-klein rot">SCANNER LOCKED</div>
        {bestaetigen ? (
          <>
            <h2 id="es-sperre-titel">Check your inbox.</h2>
            <p>I sent you a link. Tap it and the scanner opens again.</p>
          </>
        ) : (
          <>
            <h2 id="es-sperre-titel">{modus === "neu" ? "Free preview over." : "Welcome back."}</h2>
            <p>
              {modus === "neu"
                ? "Make a free account to keep scanning. Takes 20 seconds, just email and password."
                : "Log in and the scanner opens again."}
            </p>
            <form onSubmit={senden} className="es-form">
              <input
                type="email"
                required
                placeholder="Email"
                autoComplete="email"
                value={mail}
                onChange={(e) => setMail(e.target.value)}
              />
              <input
                type="password"
                required
                minLength={6}
                placeholder={modus === "neu" ? "Choose a password" : "Password"}
                autoComplete={modus === "neu" ? "new-password" : "current-password"}
                value={passwort}
                onChange={(e) => setPasswort(e.target.value)}
              />
              <button type="submit" className="es-knopf rot" disabled={laeuft}>
                {laeuft ? "SCANNING…" : modus === "neu" ? "UNLOCK EARTH SCAN" : "LOG IN"}
              </button>
            </form>
            {fehler && <p className="es-fehler">{fehler}</p>}
            <button
              type="button"
              className="es-wechsel"
              onClick={() => (setModus(modus === "neu" ? "login" : "neu"), setFehler(null))}
            >
              {modus === "neu" ? "I already have an account" : "New here? Make a free account"}
            </button>
          </>
        )}
        <div className="es-oder">or, no account</div>
        <a href={EARTH_SCAN_TG} onClick={(e) => telegram(e, EARTH_SCAN_TG)} className="es-knopf">
          READ THE SCANS ON TELEGRAM
        </a>
      </div>
    </div>
  );
}

function ScanSeite() {
  const { f } = Route.useSearch();
  const { stand, rest: sekunden } = useScanSperre();
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
        {stand === "vorschau" && (
          <>
            <i className="es-uhr-balken" style={{ width: `${(sekunden / VORSCHAU_S) * 100}%` }} aria-hidden="true" />
            <span className="es-uhr">FREE PREVIEW {sekunden}s</span>
          </>
        )}
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
      {stand === "gesperrt" && <Sperre />}
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
.es-uhr-balken{position:absolute;left:0;bottom:-2px;height:2px;background:#FFD34E;box-shadow:0 0 8px #FFD34E;transition:width .25s linear}
.es-uhr{position:absolute;right:16px;bottom:-24px;font-family:Silkscreen,monospace;font-size:10px;letter-spacing:.08em;color:#FFD34E;
  background:rgba(5,7,10,.9);padding:3px 6px}
.es-sperre{position:fixed;inset:0;z-index:50;display:grid;place-items:center;padding:16px;overflow-y:auto;
  background:rgba(5,7,10,.72);backdrop-filter:blur(7px) saturate(.6);-webkit-backdrop-filter:blur(7px) saturate(.6);animation:es-sperre-an .35s steps(6) both}
@keyframes es-sperre-an{from{opacity:0}to{opacity:1}}
.es-sperre-box{width:100%;max-width:400px;background:var(--bg1);border:2px solid var(--rot);box-shadow:0 0 0 4px #05070A,0 0 40px rgba(255,59,78,.25);
  padding:22px 20px 20px;text-align:center}
.es-sperre-cosmo{display:block;margin:0 auto 12px;width:84px;height:84px;image-rendering:pixelated}
.es-sperre h2{font-family:Silkscreen,monospace;font-weight:400;font-size:19px;line-height:1.25;margin:8px 0 8px}
.es-sperre p{color:#C9D3E3;font-size:15px;line-height:1.5;margin:0 0 14px}
.es-form{display:flex;flex-direction:column;gap:10px;margin-top:6px}
.es-form input{font:16px "Instrument Sans",system-ui,sans-serif;color:var(--weiss);background:#05070A;border:1px solid var(--grau2);padding:12px;width:100%}
.es-form input:focus{outline:2px solid var(--rot);outline-offset:0;border-color:var(--rot)}
.es-form .es-knopf{width:100%;font-size:14px;padding:13px}
.es-form .es-knopf:disabled{opacity:.7;cursor:wait}
.es-fehler{color:#FF8A96 !important;font-size:14px !important;margin:10px 0 0 !important}
.es-wechsel{background:none;border:0;color:var(--grau);font-size:14px;text-decoration:underline;text-underline-offset:3px;cursor:pointer;margin-top:12px;padding:4px}
.es-oder{display:flex;align-items:center;gap:10px;margin:16px 0 12px;font-family:Silkscreen,monospace;font-size:10px;letter-spacing:.1em;color:var(--grau)}
.es-oder::before,.es-oder::after{content:"";flex:1;height:1px;background:var(--grau2)}
.es-sperre-box > .es-knopf{width:100%;font-size:12px}
.es-sperre a:focus-visible,.es-sperre button:focus-visible{outline:3px solid #FFD34E;outline-offset:2px}
@media (prefers-reduced-motion:reduce){.es-sperre{animation:none}.es-uhr-balken{transition:none}}
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
