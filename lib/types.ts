export type ChatRole = "user" | "assistant";

export type PlannerMessage = {
  role: ChatRole;
  content: string;
};

export type SuggestedStep = {
  text: string;
};

export type AiGenerationResult = {
  steps: SuggestedStep[];
  assistantReply: string;
  modelUsed: "primary" | "fallback";
};
