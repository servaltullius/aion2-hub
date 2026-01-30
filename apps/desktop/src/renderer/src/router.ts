export type Route =
  | { name: "dashboard" }
  | { name: "noticesFeed" }
  | { name: "noticesDiff"; id: string }
  | { name: "plannerToday" }
  | { name: "plannerTemplates" }
  | { name: "plannerStats" }
  | { name: "buildScore" }
  | { name: "lootLogbook" }
  | { name: "economy" }
  | { name: "linksOfficial" }
  | { name: "characters" }
  | { name: "settingsModules" }
  | { name: "settingsBackup" }
  | { name: "settingsSafety" }
  | { name: "overlay"; tab: "planner" | "loot" };

export function parseRoute(hash: string): Route {
  const trimmed = hash.startsWith("#") ? hash.slice(1) : hash;
  const [pathPart, qs] = trimmed.split("?");
  const path = pathPart || "/";

  const params = new URLSearchParams(qs ?? "");

  if (path === "/overlay") {
    const tab = params.get("tab");
    return { name: "overlay", tab: tab === "loot" ? "loot" : "planner" };
  }

  if (path === "/m/notices/diff") {
    const id = params.get("id");
    if (id) return { name: "noticesDiff", id };
    return { name: "noticesFeed" };
  }

  switch (path) {
    case "/":
      return { name: "dashboard" };
    case "/m/notices/feed":
      return { name: "noticesFeed" };
    case "/m/build/score":
      return { name: "buildScore" };
    case "/m/loot/logbook":
      return { name: "lootLogbook" };
    case "/m/economy":
      return { name: "economy" };
    case "/m/planner/today":
      return { name: "plannerToday" };
    case "/m/planner/templates":
      return { name: "plannerTemplates" };
    case "/m/planner/stats":
      return { name: "plannerStats" };
    case "/m/links/official":
      return { name: "linksOfficial" };
    case "/characters":
      return { name: "characters" };
    case "/settings/modules":
      return { name: "settingsModules" };
    case "/settings/backup":
      return { name: "settingsBackup" };
    case "/settings/safety":
      return { name: "settingsSafety" };
    default:
      return { name: "dashboard" };
  }
}

