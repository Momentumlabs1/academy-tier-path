import { createFileRoute } from "@tanstack/react-router";
import { AcademyLayout } from "@/components/academy/AcademyLayout";

export const Route = createFileRoute("/_app")({
  component: AcademyLayout,
});