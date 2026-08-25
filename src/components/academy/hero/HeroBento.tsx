import { Link } from "@tanstack/react-router";
import heroFloor from "@/assets/hero-floor.jpg";
import heroSignals from "@/assets/hero-signals.jpg";
import heroMentors from "@/assets/hero-mentors.jpg";
import { Card } from "../primitives/Card";
import { ArrowRight } from "lucide-react";

const ITEMS = [
  {
    title: "Master Live Markets in Real Time",
    image: heroFloor,
    eyebrow: "Live Trading Floor",
    to: "/lessons",
    cta: "Start learning",
    span: "col-span-2 lg:col-span-2 lg:row-span-2",
    titleClass: "font-display text-2xl sm:text-3xl lg:text-4xl font-bold leading-[1.1]",
    // Taller than it was: this is the block that shows what the deposit buys,
    // and at 220px it sat lower than the stat tiles above it.
    minH: "min-h-[300px] sm:min-h-[340px]",
  },
  {
    title: "Daily Signals",
    image: heroSignals,
    eyebrow: "Realtime",
    to: "/signals",
    cta: "Open channel",
    span: "",
    titleClass: "font-display text-xl font-bold",
    minH: "min-h-[190px]",
  },
  {
    title: "Mentor Network",
    image: heroMentors,
    eyebrow: "1:1 reviews",
    to: "/tier",
    cta: "Unlock Elite",
    span: "",
    titleClass: "font-display text-xl font-bold",
    minH: "min-h-[190px]",
  },
];

export function HeroBento() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:grid-rows-2 lg:gap-4">
      {ITEMS.map((item, idx) => (
        <Link
          key={item.title}
          to={item.to}
          className={`group relative overflow-hidden rounded-[var(--radius)] shadow-[var(--shadow-card)] ${item.span} ${item.minH} block animate-stagger`}
          style={{ animationDelay: `${idx * 100}ms` }}
        >
          <Card variant="hero" className="h-full w-full">
            <img
              src={item.image}
              alt=""
              loading={idx === 0 ? "eager" : "lazy"}
              className="absolute inset-0 h-full w-full object-cover opacity-80 transition-transform duration-500 group-hover:scale-105"
            />
            {/* Markenschleier.
                Die drei Aufnahmen sind Magenta-Partikelrender aus der Zeit vor
                dem blauen Auftritt — auf einem Dashboard, das sonst durchgehend
                Azur traegt, waren sie der einzige pinke Fleck und lasen sich
                wie ein fremdes Produkt. `color` faerbt den Farbton um und
                laesst die Helligkeit stehen, sodass die Partikelstruktur
                erhalten bleibt; der Multiply-Verlauf darueber zieht die hellen
                Stellen ins Dunkle, statt sie auszubrennen. Kein Neurendern
                noetig, und wenn spaeter echte Aufnahmen kommen, faellt der
                Schleier einfach weg. */}
            <span
              aria-hidden
              className="absolute inset-0"
              style={{ background: "var(--primary)", mixBlendMode: "color", opacity: 0.85 }}
            />
            <span
              aria-hidden
              className="absolute inset-0"
              style={{
                background: "linear-gradient(160deg, rgba(4,19,44,.55), rgba(4,19,44,.15))",
                mixBlendMode: "multiply",
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
            <div className="relative flex h-full flex-col justify-between p-4 lg:p-6">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                {item.eyebrow}
              </div>
              <div>
                <h2 className={item.titleClass}>{item.title}</h2>
                <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white/90 backdrop-blur-sm transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  {item.cta} <ArrowRight className="h-3 w-3" />
                </div>
              </div>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
