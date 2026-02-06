import { z } from "zod";

export const createTaskSchema = z.object({
  objective: z.string().trim().min(5).max(120000),
  title: z.string().trim().min(1).max(200).optional(),
});

export const patchTaskSchema = z
  .object({
    isComplete: z.boolean().optional(),
    title: z.string().trim().min(1).max(200).optional(),
    objective: z.string().trim().min(5).max(120000).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });

export const chatMessageSchema = z.object({
  message: z.string().trim().min(1).max(120000),
});

export const applySuggestionsSchema = z.object({
  steps: z
    .array(
      z.object({
        text: z.string().trim().min(1).max(500),
      }),
    )
    .min(1)
    .max(200),
});

export const createStepSchema = z.object({
  text: z.string().trim().min(1).max(500),
});

export const patchStepSchema = z
  .object({
    text: z.string().trim().min(1).max(500).optional(),
    isComplete: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });

export const reorderStepsSchema = z.object({
  orderedStepIds: z.array(z.string().min(1)).min(1).max(200),
});
