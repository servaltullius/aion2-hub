import { describe, expect, it } from "vitest";

import supertest from "supertest";

import { buildApp } from "../src/app.js";

describe("GET /health", () => {
  it("returns ok", async () => {
    const app = buildApp();
    await app.ready();

    const response = await supertest(app.server).get("/health").expect(200);
    expect(response.body).toEqual({ ok: true });

    await app.close();
  });
});

