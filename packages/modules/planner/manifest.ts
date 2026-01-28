import type { HubModule } from "@aion2/core";

export const manifest: HubModule = {
  id: "planner",
  name: "Planner",
  description: "Local-first checklist planner",
  version: "0.0.0",
  permission: "public",
  nav: [{ title: "Planner", href: "/m/planner/today" }],
  pages: [
    {
      id: "today",
      title: "Today",
      href: "/m/planner/today",
      load: () => import("./pages/today.js")
    }
  ],
  widgets: [
    {
      id: "today",
      title: "오늘 숙제",
      load: () => import("./widgets/today.js")
    }
  ]
};

