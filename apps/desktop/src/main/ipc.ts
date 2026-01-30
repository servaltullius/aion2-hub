import type { IpcDeps } from "./ipcHandlers/types.js";

import { registerAppHandlers } from "./ipcHandlers/appHandlers.js";
import { registerBackupHandlers } from "./ipcHandlers/backupHandlers.js";
import { registerBuildScoreHandlers } from "./ipcHandlers/buildScoreHandlers.js";
import { registerCharactersHandlers } from "./ipcHandlers/charactersHandlers.js";
import { registerCollectiblesHandlers } from "./ipcHandlers/collectiblesHandlers.js";
import { registerNoticesHandlers } from "./ipcHandlers/noticesHandlers.js";
import { registerPlannerHandlers } from "./ipcHandlers/plannerHandlers.js";

export function registerIpcHandlers(deps: IpcDeps) {
  registerAppHandlers(deps);
  registerNoticesHandlers(deps);
  registerCharactersHandlers(deps);
  registerPlannerHandlers(deps);
  registerBuildScoreHandlers(deps);
  registerCollectiblesHandlers(deps);
  registerBackupHandlers(deps);
}

