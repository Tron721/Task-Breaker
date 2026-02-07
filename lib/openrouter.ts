import { z } from "zod";
import { type AiGenerationResult, type PlannerMessage } from "@/lib/types";

const plannerResponseSchema = z.object({
  assistantReply: z.string().trim().min(1),
  steps: z
    .array(
      z.object({
        text: z.string().trim().min(1).max(500),
      }),
    )
    .min(1)
    .max(200),
});

type OpenRouterMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type RequestModelResult = {
  rawContent: string;
};

const DEFAULT_MODEL_PRIMARY = "google/gemini-3-flash-preview";
const DEFAULT_MODEL_FALLBACK = "google/gemini-2.5-flash";

class ModelCallError extends Error {
  status?: number;
  retryable: boolean;

  constructor(message: string, opts?: { status?: number; retryable?: boolean }) {
    super(message);
    this.name = "ModelCallError";
    this.status = opts?.status;
    this.retryable = opts?.retryable ?? false;
  }
}

export class AiProviderError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, opts?: { status?: number; details?: unknown }) {
    super(message);
    this.name = "AiProviderError";
    this.status = opts?.status ?? 503;
    this.details = opts?.details;
  }
}

function getApiKey(): string {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new AiProviderError("OPENROUTER_API_KEY is missing from server environment.", { status: 500 });
  }
  return apiKey;
}

function getModelConfig() {
  return {
    primary: process.env.OPENROUTER_MODEL_PRIMARY ?? DEFAULT_MODEL_PRIMARY,
    fallback: process.env.OPENROUTER_MODEL_FALLBACK ?? DEFAULT_MODEL_FALLBACK,
  };
}

function shouldFallback(error: ModelCallError): boolean {
  if (error.retryable) {
    return true;
  }

  if (error.status === 400 || error.status === 404) {
    return true;
  }

  return false;
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}

function extractFirstJsonObject(text: string): string {
  const startIndex = text.indexOf("{");
  if (startIndex === -1) {
    throw new Error("Model response did not include a JSON object.");
  }

  let depth = 0;
  for (let i = startIndex; i < text.length; i += 1) {
    const char = text[i];
    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return text.slice(startIndex, i + 1);
      }
    }
  }

  throw new Error("Model response contained an incomplete JSON object.");
}

function coerceContent(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    const joined = content
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }

        if (part && typeof part === "object" && "text" in part) {
          return String(part.text);
        }

        return "";
      })
      .join("\n");

    return joined;
  }

  return "";
}

function buildSystemPrompt() {
  return [
    "You are a pragmatic task planning assistant.",
    "Given the user objective and chat context, produce a concise plan with actionable ordered steps.",
    "Return ONLY JSON matching this schema:",
    '{"assistantReply":"short plain-language guidance","steps":[{"text":"step"}]}',
    "Rules:",
    "- 3 to 12 steps unless user explicitly asks otherwise.",
    "- Steps must be clear, concrete, and non-overlapping.",
    "- No markdown or extra keys.",
  ].join("\n");
}

function toOpenRouterMessages(history: PlannerMessage[], userPrompt: string): OpenRouterMessage[] {
  const recentHistory = history.slice(-40).map((message) => ({
    role: message.role,
    content: message.content,
  }));

  return [
    {
      role: "system",
      content: buildSystemPrompt(),
    },
    ...recentHistory,
    {
      role: "user",
      content: userPrompt,
    },
  ];
}

async function requestModel(
  model: string,
  messages: OpenRouterMessage[],
  apiKey: string,
  fetchImpl: typeof fetch,
): Promise<RequestModelResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  try {
    const response = await fetchImpl("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const message =
        payload && typeof payload === "object" && "error" in payload
          ? JSON.stringify((payload as { error: unknown }).error)
          : `OpenRouter request failed with status ${response.status}.`;
      throw new ModelCallError(message, {
        status: response.status,
        retryable: isRetryableStatus(response.status),
      });
    }

    const content = (payload as { choices?: Array<{ message?: { content?: unknown } }> })?.choices?.[0]?.message?.content;
    const rawContent = coerceContent(content);

    if (!rawContent.trim()) {
      throw new ModelCallError("OpenRouter returned an empty model response.", {
        retryable: true,
      });
    }

    return { rawContent };
  } catch (error) {
    if (error instanceof ModelCallError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new ModelCallError("OpenRouter request timed out.", { retryable: true });
    }

    throw new ModelCallError("OpenRouter request failed unexpectedly.", { retryable: true });
  } finally {
    clearTimeout(timeout);
  }
}

function parsePlannerResponse(rawContent: string) {
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(extractFirstJsonObject(rawContent));
  } catch {
    throw new ModelCallError("Model returned invalid JSON payload.", { retryable: true });
  }

  const parsed = plannerResponseSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new ModelCallError("Model JSON did not match expected schema.", { retryable: true });
  }

  return parsed.data;
}

async function generateWithFallback(
  messages: OpenRouterMessage[],
  fetchImpl: typeof fetch,
): Promise<AiGenerationResult> {
  const apiKey = getApiKey();
  const models = getModelConfig();

  let primaryError: ModelCallError | null = null;

  try {
    const primaryResult = await requestModel(models.primary, messages, apiKey, fetchImpl);
    const parsed = parsePlannerResponse(primaryResult.rawContent);
    return {
      ...parsed,
      modelUsed: "primary",
    };
  } catch (error) {
    if (!(error instanceof ModelCallError)) {
      throw error;
    }
    primaryError = error;

    if (!shouldFallback(error)) {
      throw new AiProviderError("Primary model request failed and fallback was skipped.", {
        status: 502,
        details: { primaryError: error.message },
      });
    }
  }

  try {
    const fallbackResult = await requestModel(models.fallback, messages, apiKey, fetchImpl);
    const parsed = parsePlannerResponse(fallbackResult.rawContent);
    return {
      ...parsed,
      modelUsed: "fallback",
    };
  } catch (error) {
    const fallbackError = error instanceof Error ? error.message : "Unknown fallback error";
    throw new AiProviderError("AI planning failed for both primary and fallback models.", {
      status: 503,
      details: {
        primaryError: primaryError?.message,
        fallbackError,
      },
    });
  }
}

export async function generateInitialTaskPlan(
  input: {
    objective: string;
    title?: string;
  },
  fetchImpl: typeof fetch = fetch,
): Promise<AiGenerationResult> {
  const titlePrefix = input.title ? `Task title: ${input.title}\n` : "";
  const userPrompt = `${titlePrefix}Objective: ${input.objective}\nReturn ordered steps to complete this objective.`;

  const messages = toOpenRouterMessages([], userPrompt);
  return generateWithFallback(messages, fetchImpl);
}

export async function generateTaskPlanFromChat(
  input: {
    objective: string;
    title: string;
    existingSteps: Array<{ text: string }>;
    history: PlannerMessage[];
    newMessage: string;
  },
  fetchImpl: typeof fetch = fetch,
): Promise<AiGenerationResult> {
  const existingStepText =
    input.existingSteps.length > 0
      ? input.existingSteps.map((step, index) => `${index + 1}. ${step.text}`).join("\n")
      : "No steps exist yet.";

  const userPrompt = [
    `Task title: ${input.title}`,
    `Task objective: ${input.objective}`,
    "Current steps:",
    existingStepText,
    "User message:",
    input.newMessage,
    "Return updated actionable steps reflecting this new input.",
  ].join("\n");

  const messages = toOpenRouterMessages(input.history, userPrompt);
  return generateWithFallback(messages, fetchImpl);
}

export const __internal = {
  parsePlannerResponse,
  extractFirstJsonObject,
  getModelConfig,
  shouldFallback,
  requestModel,
};
