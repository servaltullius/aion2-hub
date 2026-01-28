import type { HubModule, HubPage, HubWidget } from "./module.js";
import { getModuleById } from "./registry.js";

export function resolveModulePage(
  moduleId: string,
  pageId: string
): { module: HubModule; page: HubPage } | undefined {
  const module = getModuleById(moduleId);
  const page = module?.pages.find((value) => value.id === pageId);
  if (!module || !page) return undefined;
  return { module, page };
}

export function resolveModuleWidget(
  moduleId: string,
  widgetId: string
): { module: HubModule; widget: HubWidget } | undefined {
  const module = getModuleById(moduleId);
  const widget = module?.widgets.find((value) => value.id === widgetId);
  if (!module || !widget) return undefined;
  return { module, widget };
}

