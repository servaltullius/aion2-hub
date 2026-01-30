import cors from "@fastify/cors";
import Fastify from "fastify";

import { registerNoticesRoutes } from "./routes/notices.js";

export function buildApp() {
  const app = Fastify({ logger: process.env.NODE_ENV !== "test" });

  app.register(cors, {
    origin: process.env.CORS_ORIGIN?.split(",") ?? true
  });

  app.get("/health", async () => ({ ok: true }));

  app.register(registerNoticesRoutes, { prefix: "/api/v1" });

  return app;
}
