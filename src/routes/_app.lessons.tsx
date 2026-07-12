import { createFileRoute, Outlet } from "@tanstack/react-router";

// Layout route: renders the lesson list (index) at /lessons and the
// lesson detail ($lessonId) at /lessons/:id through the Outlet.
export const Route = createFileRoute("/_app/lessons")({
  component: () => <Outlet />,
});
