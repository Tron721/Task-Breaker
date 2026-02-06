import { beforeEach, describe, expect, it } from "vitest";
import { AiProviderError, generateInitialTaskPlan } from "../lib/openrouter";

function okPayload(content: string) {
  return {
    choices: [
      {
        message: {
          content,
        },
      },
    ],
  };
}

describe("OpenRouter fallback behavior", () => {
  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = "test-key";
    process.env.OPENROUTER_MODEL_PRIMARY = "google/gemini-3-flash-preview";
    process.env.OPENROUTER_MODEL_FALLBACK = "google/gemini-2.5-flash";
  });

  it("uses the primary model when successful", async () => {
    const fakeFetch: typeof fetch = async () =>
      new Response(
        JSON.stringify(okPayload('{"assistantReply":"Here is your plan","steps":[{"text":"Step one"}]}')),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );

    const result = await generateInitialTaskPlan(
      { objective: "Ship an MVP with authentication" },
      fakeFetch,
    );

    expect(result.modelUsed).toBe("primary");
    expect(result.steps).toHaveLength(1);
  });

  it("falls back when the primary model fails with retryable status", async () => {
    const seenModels: string[] = [];

    const fakeFetch: typeof fetch = async (_url, init) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as { model?: string };
      seenModels.push(body.model ?? "unknown");

      if (seenModels.length === 1) {
        return new Response(JSON.stringify({ error: { message: "rate limited" } }), {
          status: 429,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify(okPayload('{"assistantReply":"Fallback plan","steps":[{"text":"Step from fallback"}]}')),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    };

    const result = await generateInitialTaskPlan({ objective: "Plan a launch checklist" }, fakeFetch);

    expect(result.modelUsed).toBe("fallback");
    expect(seenModels).toEqual([
      "google/gemini-3-flash-preview",
      "google/gemini-2.5-flash",
    ]);
  });

  it("returns structured provider error when both models fail", async () => {
    const fakeFetch: typeof fetch = async () =>
      new Response(JSON.stringify({ error: { message: "service down" } }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });

    await expect(generateInitialTaskPlan({ objective: "Build a roadmap" }, fakeFetch)).rejects.toMatchObject<
      Partial<AiProviderError>
    >({
      name: "AiProviderError",
      status: 503,
    });
  });
});
