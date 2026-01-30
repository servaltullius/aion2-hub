import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("aion2Hub", {
  ping: async () => ipcRenderer.invoke("app:ping"),
  getStatus: async () => ipcRenderer.invoke("app:getStatus"),
  app: {
    getActiveCharacterId: async () => ipcRenderer.invoke("app:getActiveCharacterId"),
    setActiveCharacterId: async (characterId: string | null) =>
      ipcRenderer.invoke("app:setActiveCharacterId", characterId)
  },
  characters: {
    list: async () => ipcRenderer.invoke("characters:list"),
    create: async (input: unknown) => ipcRenderer.invoke("characters:create", input),
    update: async (input: unknown) => ipcRenderer.invoke("characters:update", input),
    delete: async (characterId: string) => ipcRenderer.invoke("characters:delete", characterId)
  },
  planner: {
    getSettings: async (input?: unknown) => ipcRenderer.invoke("planner:getSettings", input ?? null),
    setSettings: async (input: unknown) => ipcRenderer.invoke("planner:setSettings", input),
    clearServerSettings: async (input: unknown) => ipcRenderer.invoke("planner:clearServerSettings", input),
    applyPreset: async (input: unknown) => ipcRenderer.invoke("planner:applyPreset", input),
    listTemplates: async () => ipcRenderer.invoke("planner:listTemplates"),
    createTemplate: async (input: unknown) => ipcRenderer.invoke("planner:createTemplate", input),
    updateTemplate: async (input: unknown) => ipcRenderer.invoke("planner:updateTemplate", input),
    deleteTemplate: async (templateId: string) => ipcRenderer.invoke("planner:deleteTemplate", templateId),
    getOverview: async (input: unknown) => ipcRenderer.invoke("planner:getOverview", input),
    toggleComplete: async (input: unknown) => ipcRenderer.invoke("planner:toggleComplete", input),
    useCharge: async (input: unknown) => ipcRenderer.invoke("planner:useCharge", input),
    undoCharge: async (input: unknown) => ipcRenderer.invoke("planner:undoCharge", input),
    addDuration: async (input: unknown) => ipcRenderer.invoke("planner:addDuration", input),
    listDurations: async (input: unknown) => ipcRenderer.invoke("planner:listDurations", input),
    deleteDuration: async (input: unknown) => ipcRenderer.invoke("planner:deleteDuration", input),
    getDurationStats: async (input: unknown) => ipcRenderer.invoke("planner:getDurationStats", input)
  },
  buildScore: {
    get: async (input: unknown) => ipcRenderer.invoke("buildScore:get", input),
    set: async (input: unknown) => ipcRenderer.invoke("buildScore:set", input),
    reset: async (input: unknown) => ipcRenderer.invoke("buildScore:reset", input)
  },
  buildScorePresets: {
    list: async (input: unknown) => ipcRenderer.invoke("buildScorePreset:list", input),
    get: async (input: unknown) => ipcRenderer.invoke("buildScorePreset:get", input),
    create: async (input: unknown) => ipcRenderer.invoke("buildScorePreset:create", input),
    update: async (input: unknown) => ipcRenderer.invoke("buildScorePreset:update", input),
    clone: async (input: unknown) => ipcRenderer.invoke("buildScorePreset:clone", input),
    delete: async (input: unknown) => ipcRenderer.invoke("buildScorePreset:delete", input),
    exportJson: async (input: unknown) => ipcRenderer.invoke("buildScorePreset:exportJson", input),
    importJson: async (input: unknown) => ipcRenderer.invoke("buildScorePreset:importJson", input)
  },
  collectibles: {
    list: async (input: unknown) => ipcRenderer.invoke("collectibles:list", input),
    listMaps: async () => ipcRenderer.invoke("collectibles:listMaps"),
    exportItemsJson: async () => ipcRenderer.invoke("collectibles:exportItemsJson"),
    importItemsJson: async () => ipcRenderer.invoke("collectibles:importItemsJson"),
    syncAion2Im: async () => ipcRenderer.invoke("collectibles:syncAion2Im"),
    toggleDone: async (input: unknown) => ipcRenderer.invoke("collectibles:toggleDone", input)
  },
  backup: {
    exportJson: async () => ipcRenderer.invoke("backup:exportJson"),
    importJson: async () => ipcRenderer.invoke("backup:importJson")
  },
  notices: {
    list: async (input: unknown) => ipcRenderer.invoke("notices:list", input),
    get: async (noticeId: string) => ipcRenderer.invoke("notices:get", noticeId),
    getLatestDiff: async (noticeId: string) => ipcRenderer.invoke("notices:getLatestDiff", noticeId),
    syncNow: async () => ipcRenderer.invoke("notices:syncNow")
  }
});
