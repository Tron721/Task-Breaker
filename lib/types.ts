export type ChatRole = "user" | "assistant";
export type TaskStatus = "NOW" | "NEXT" | "LATER" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type RecurrenceType = "NONE" | "DAILY" | "WEEKLY";
export type WeeklyDay = "SUN" | "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT";

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
