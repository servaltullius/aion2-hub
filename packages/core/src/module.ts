export type HubPermission = "public" | "user";

export type HubNavItem = {
  title: string;
  href: string;
  icon?: string;
};

export type HubPage = {
  id: string;
  title: string;
  href: string;
  load: () => Promise<{ default: unknown }>;
};

export type HubWidget = {
  id: string;
  title: string;
  load: () => Promise<{ default: unknown }>;
};

export type HubModule = {
  id: string;
  name: string;
  description?: string;
  version: string;
  permission: HubPermission;
  nav: HubNavItem[];
  pages: HubPage[];
  widgets: HubWidget[];
};
