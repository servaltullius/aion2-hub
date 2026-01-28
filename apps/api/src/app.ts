import cors from "@fastify/cors";
import Fastify from "fastify";

export function buildApp() {
  const app = Fastify({ logger: process.env.NODE_ENV !== "test" });

  app.register(cors, {
    origin: process.env.CORS_ORIGIN?.split(",") ?? true
  });

  app.get("/health", async () => ({ ok: true }));

  return app;
}
