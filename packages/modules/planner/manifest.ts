import type { HubModule } from "@aion2/core";

export const manifest: HubModule = {
  id: "planner",
  name: "Planner",
  description: "Local-first checklist planner",
  version: "0.0.0",
  permission: "public",
  nav: [
    { title: "Planner", href: "/m/planner/today" },
    { title: "Week", href: "/m/planner/week" },
    { title: "Templates", href: "/m/planner/templates" },
    { title: "Stats", href: "/m/planner/stats" }
  ],
  pages: [
    {
      id: "today",
      title: "Today",
      href: "/m/planner/today",
      load: () => import("./pages/today.js")
    },
    {
      id: "week",
      title: "Week",
      href: "/m/planner/week",
      load: () => import("./pages/week.js")
    },
    {
      id: "templates",
      title: "Templates",
      href: "/m/planner/templates",
      load: () => import("./pages/templates.js")
    },
    {
      id: "stats",
      title: "Stats",
      href: "/m/planner/stats",
      load: () => import("./pages/stats.js")
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
