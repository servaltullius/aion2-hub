import { registerModules } from "@aion2/core";

import { manifest as legion } from "@aion2/module-legion/manifest";
import { manifest as links } from "@aion2/module-links/manifest";
import { manifest as notices } from "@aion2/module-notices/manifest";
import { manifest as planner } from "@aion2/module-planner/manifest";

export const ALL_MODULES = [planner, notices, legion, links];

registerModules(ALL_MODULES);

