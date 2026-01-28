import type { HubModule } from "./module.js";

const moduleById = new Map<string, HubModule>();

export function registerModules(modules: HubModule[]): void {
  for (const module of modules) {
    moduleById.set(module.id, module);
  }
}

export function getModules(): HubModule[] {
  return Array.from(moduleById.values());
}

export function getModuleById(id: string): HubModule | undefined {
  return moduleById.get(id);
}
