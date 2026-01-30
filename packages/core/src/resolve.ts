import type { HubModule, HubPage, HubWidget } from "./module.js";
import { getModuleById } from "./registry.js";

type Loaded = { default: unknown };

const pageLoadCache = new Map<string, Promise<Loaded>>();
const widgetLoadCache = new Map<string, Promise<Loaded>>();

export function resolveModulePage(
  moduleId: string,
  pageId: string
): { module: HubModule; page: HubPage } | undefined {
  const module = getModuleById(moduleId);
  const page = module?.pages.find((value) => value.id === pageId);
  if (!module || !page) return undefined;
  return { module, page };
}

export function loadModulePage(moduleId: string, pageId: string): Promise<Loaded> {
  const resolved = resolveModulePage(moduleId, pageId);
  if (!resolved) return Promise.reject(new Error("not_found"));
  const key = `${moduleId}:${pageId}`;
  const cached = pageLoadCache.get(key);
  if (cached) return cached;

  const promise = resolved.page.load().catch((err) => {
    pageLoadCache.delete(key);
    throw err;
  });
  pageLoadCache.set(key, promise);
  return promise;
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

export function loadModuleWidget(moduleId: string, widgetId: string): Promise<Loaded> {
  const resolved = resolveModuleWidget(moduleId, widgetId);
  if (!resolved) return Promise.reject(new Error("not_found"));
  const key = `${moduleId}:${widgetId}`;
  const cached = widgetLoadCache.get(key);
  if (cached) return cached;

  const promise = resolved.widget.load().catch((err) => {
    widgetLoadCache.delete(key);
    throw err;
  });
  widgetLoadCache.set(key, promise);
  return promise;
}
