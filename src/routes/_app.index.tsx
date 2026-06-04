import { createFileRoute } from "@tanstack/react-router";
import { HeroBento } from "@/components/academy/hero/HeroBento";
import { LessonGroup } from "@/components/academy/lessons/LessonGroup";
import { SectionTitle } from "@/components/academy/primitives/SectionTitle";
import { LESSONS } from "@/lib/academy-data";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Agent Trading Academy" },
      { name: "description", content: "Your live trading education hub." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const foundations = LESSONS.filter((l) => l.category === "Foundations" || l.category === "Technical").slice(0, 4);
  const risk = LESSONS.filter((l) => l.category === "Risk" || l.category === "Psychology" || l.category === "Advanced").slice(0, 4);

  return (
    <div className="space-y-10">
      <HeroBento />

      <section>
        <SectionTitle
          action={
            <Link to="/lessons" className="text-sm font-medium text-primary hover:underline">
              All lessons →
            </Link>
          }
        >
          Popular
        </SectionTitle>
        <LessonGroup title="Foundations & Charts" lessons={foundations} />
      </section>

      <section>
        <SectionTitle>This Week</SectionTitle>
        <LessonGroup title="Risk & Psychology" lessons={risk} />
      </section>
    </div>
  );
}