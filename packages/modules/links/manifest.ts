import type { HubModule } from "@aion2/core";

export const manifest: HubModule = {
  id: "links",
  name: "Links",
  description: "Official links hub",
  version: "0.0.0",
  permission: "public",
  nav: [{ title: "Links", href: "/m/links/official" }],
  pages: [
    {
      id: "official",
      title: "Official Links",
      href: "/m/links/official",
      load: () => import("./pages/official.js")
    }
  ],
  widgets: []
};

