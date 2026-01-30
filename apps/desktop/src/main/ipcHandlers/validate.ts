import type { z, ZodTypeAny } from "zod";

export function parseInput<TSchema extends ZodTypeAny>(schema: TSchema, input: unknown): z.infer<TSchema> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const err = new Error("bad_request");
    (err as Error & { cause?: unknown }).cause = parsed.error;
    throw err;
  }
  return parsed.data;
}

