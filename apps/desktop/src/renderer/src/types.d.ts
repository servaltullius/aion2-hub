export {};

declare global {
  interface Window {
    aion2Hub: {
      ping: () => Promise<string>;
      getStatus: () => Promise<unknown>;
      app: {
        getActiveCharacterId: () => Promise<string | null>;
        setActiveCharacterId: (characterId: string | null) => Promise<string | null>;
      };
      characters: {
        list: () => Promise<unknown>;
        create: (input: unknown) => Promise<unknown>;
        update: (input: unknown) => Promise<unknown>;
        delete: (characterId: string) => Promise<unknown>;
      };
      planner: {
        getSettings: (input?: unknown) => Promise<unknown>;
        setSettings: (input: unknown) => Promise<unknown>;
        clearServerSettings: (input: unknown) => Promise<unknown>;
        applyPreset: (input: unknown) => Promise<unknown>;
        listTemplates: () => Promise<unknown>;
        createTemplate: (input: unknown) => Promise<unknown>;
        updateTemplate: (input: unknown) => Promise<unknown>;
        deleteTemplate: (templateId: string) => Promise<unknown>;
        getOverview: (input: unknown) => Promise<unknown>;
        toggleComplete: (input: unknown) => Promise<unknown>;
        useCharge: (input: unknown) => Promise<unknown>;
        undoCharge: (input: unknown) => Promise<unknown>;
        addDuration: (input: unknown) => Promise<unknown>;
        listDurations: (input: unknown) => Promise<unknown>;
        deleteDuration: (input: unknown) => Promise<unknown>;
        getDurationStats: (input: unknown) => Promise<unknown>;
      };
      buildScore: {
        get: (input: unknown) => Promise<unknown>;
        set: (input: unknown) => Promise<unknown>;
        reset: (input: unknown) => Promise<unknown>;
      };
      buildScorePresets: {
        list: (input: unknown) => Promise<unknown>;
        get: (input: unknown) => Promise<unknown>;
        create: (input: unknown) => Promise<unknown>;
        update: (input: unknown) => Promise<unknown>;
        clone: (input: unknown) => Promise<unknown>;
        delete: (input: unknown) => Promise<unknown>;
        exportJson: (input: unknown) => Promise<unknown>;
        importJson: (input: unknown) => Promise<unknown>;
      };
      backup: {
        exportJson: () => Promise<unknown>;
        importJson: () => Promise<unknown>;
      };
      economy: {
        listItems: (input: unknown) => Promise<unknown>;
        updateItem: (input: unknown) => Promise<unknown>;
        deleteItem: (input: unknown) => Promise<unknown>;
        addPrice: (input: unknown) => Promise<unknown>;
        listPrices: (input: unknown) => Promise<unknown>;
        listWatches: (input: unknown) => Promise<unknown>;
        createWatch: (input: unknown) => Promise<unknown>;
        setWatchActive: (input: unknown) => Promise<unknown>;
        deleteWatch: (input: unknown) => Promise<unknown>;
        listAlerts: (input: unknown) => Promise<unknown>;
        markAlertRead: (input: unknown) => Promise<unknown>;
      };
      loot: {
        listRuns: (input: unknown) => Promise<unknown>;
        getRun: (input: unknown) => Promise<unknown>;
        createRun: (input: unknown) => Promise<unknown>;
        deleteRun: (input: unknown) => Promise<unknown>;
        weeklyReport: (input: unknown) => Promise<unknown>;
      };
      notices: {
        list: (input: unknown) => Promise<unknown>;
        get: (noticeId: string) => Promise<unknown>;
        getLatestDiff: (noticeId: string) => Promise<unknown>;
        syncNow: () => Promise<unknown>;
      };
    };
  }
}
