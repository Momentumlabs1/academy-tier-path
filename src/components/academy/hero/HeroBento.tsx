import heroFloor from "@/assets/hero-floor.jpg";
import heroSignals from "@/assets/hero-signals.jpg";
import heroMentors from "@/assets/hero-mentors.jpg";
import { Card } from "../primitives/Card";

const ITEMS = [
  {
    title: "Master Live Markets in Real Time",
    image: heroFloor,
    eyebrow: "Live Trading Floor",
    span: "lg:col-span-2 lg:row-span-2",
    titleClass: "font-display text-3xl lg:text-5xl font-bold leading-[1.05]",
  },
  {
    title: "Daily Signals",
    image: heroSignals,
    eyebrow: "Realtime",
    span: "",
    titleClass: "font-display text-2xl lg:text-3xl font-bold",
  },
  {
    title: "Mentor Network",
    image: heroMentors,
    eyebrow: "1:1 reviews",
    span: "",
    titleClass: "font-display text-2xl lg:text-3xl font-bold",
  },
];

export function HeroBento() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:grid-rows-2">
      {ITEMS.map((item, idx) => (
        <Card
          key={item.title}
          variant="hero"
          className={`relative overflow-hidden ${item.span} min-h-[180px] lg:min-h-0`}
        >
          <img
            src={item.image}
            alt=""
            loading={idx === 0 ? "eager" : "lazy"}
            className="absolute inset-0 h-full w-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-black/70 via-black/20 to-transparent" />
          <div className="relative flex h-full flex-col justify-between p-6 lg:p-8">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              {item.eyebrow}
            </div>
            <h2 className={item.titleClass}>{item.title}</h2>
          </div>
        </Card>
      ))}
    </div>
  );
}