import type { HubModule } from "@aion2/core";

export const manifest: HubModule = {
  id: "legion",
  name: "Legion",
  description: "Legion events, signup, attendance",
  version: "0.0.0",
  permission: "discord-guild-admin",
  nav: [{ title: "Legion", href: "/m/legion/overview" }],
  pages: [
    {
      id: "overview",
      title: "Overview",
      href: "/m/legion/overview",
      load: () => import("./pages/overview.js")
    }
  ],
  widgets: [
    {
      id: "next-event",
      title: "다음 이벤트",
      load: () => import("./widgets/next-event.js")
    }
  ]
};

