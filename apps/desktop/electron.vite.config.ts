import path from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "electron-vite";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  main: {
    build: {
      outDir: "dist/main",
      externalizeDeps: {
        // Bundle workspace packages into dist to avoid pnpm symlink issues in packaged apps.
        exclude: ["@aion2/constants", "@aion2/notices-client"]
      }
    }
  },
  preload: {
    build: {
      outDir: "dist/preload",
      rollupOptions: {
        output: {
          format: "cjs",
          entryFileNames: "index.cjs"
        }
      }
    }
  },
  renderer: {
    root: path.join(rootDir, "src/renderer"),
    plugins: [react()],
    build: {
      outDir: path.join(rootDir, "dist/renderer"),
      emptyOutDir: true
    }
  }
});
