import type { HubModule } from "@aion2/core";

export const manifest: HubModule = {
  id: "notices",
  name: "Notices",
  description: "Official notice/update diff feed",
  version: "0.0.0",
  permission: "public",
  nav: [{ title: "Notices", href: "/m/notices/feed" }],
  pages: [
    {
      id: "feed",
      title: "Feed",
      href: "/m/notices/feed",
      load: () => import("./pages/feed.js")
    }
  ],
  widgets: [
    {
      id: "changes",
      title: "공지 변경",
      load: () => import("./widgets/changes.js")
    }
  ]
};

