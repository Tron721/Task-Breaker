import { z } from "zod";

const taskStatusSchema = z.enum(["NOW", "NEXT", "LATER", "DONE"]);
const taskPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
const recurrenceTypeSchema = z.enum(["NONE", "DAILY", "WEEKLY"]);
const weekdaySchema = z.enum(["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]);

const optionalDateSchema = z.preprocess(
  (value) => (value === "" || value === null ? null : value === undefined ? undefined : value),
  z.coerce.date().nullable().optional(),
);

const optionalIntegerSchema = z.preprocess(
  (value) => (value === "" || value === null ? null : value === undefined ? undefined : value),
  z.coerce.number().int().nullable().optional(),
);

const optionalReviewNotesSchema = z.preprocess(
  (value) => (value === "" || value === null ? null : value === undefined ? undefined : value),
  z.string().trim().max(4000).nullable().optional(),
);

function isInRange(value: number | null | undefined, min: number, max: number) {
  return value === undefined || value === null || (value >= min && value <= max);
}

export const createTaskSchema = z.object({
  objective: z.string().trim().min(5).max(120000),
  title: z.string().trim().min(1).max(200).optional(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  scheduledFor: optionalDateSchema,
  dueDate: optionalDateSchema,
  estimatedMinutes: optionalIntegerSchema.refine(
    (value) => isInRange(value, 1, 1440),
    "Estimated minutes must be between 1 and 1440.",
  ),
  reminderAt: optionalDateSchema,
});

export const patchTaskSchema = z
  .object({
    isComplete: z.boolean().optional(),
    title: z.string().trim().min(1).max(200).optional(),
    objective: z.string().trim().min(5).max(120000).optional(),
    status: taskStatusSchema.optional(),
    priority: taskPrioritySchema.optional(),
    scheduledFor: optionalDateSchema,
    dueDate: optionalDateSchema,
    estimatedMinutes: optionalIntegerSchema.refine(
      (value) => isInRange(value, 1, 1440),
      "Estimated minutes must be between 1 and 1440.",
    ),
    actualMinutes: optionalIntegerSchema.refine(
      (value) => isInRange(value, 0, 1440),
      "Actual minutes must be between 0 and 1440.",
    ),
    reviewNotes: optionalReviewNotesSchema,
    reminderAt: optionalDateSchema,
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

export const createTemplateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  objective: z.string().trim().min(5).max(120000),
  priority: taskPrioritySchema.optional(),
  estimatedMinutes: optionalIntegerSchema.refine(
    (value) => isInRange(value, 1, 1440),
    "Estimated minutes must be between 1 and 1440.",
  ),
  recurrence: recurrenceTypeSchema,
  weeklyDays: z.array(weekdaySchema).max(7).optional(),
  reminderHour: optionalIntegerSchema.refine(
    (value) => isInRange(value, 0, 23),
    "Reminder hour must be between 0 and 23.",
  ),
  reminderMinute: optionalIntegerSchema.refine(
    (value) => isInRange(value, 0, 59),
    "Reminder minute must be between 0 and 59.",
  ),
  timezone: z.string().trim().min(3).max(80).optional(),
  steps: z
    .array(
      z.object({
        text: z.string().trim().min(1).max(500),
      }),
    )
    .min(1)
    .max(200),
});

export const patchTemplateSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    objective: z.string().trim().min(5).max(120000).optional(),
    priority: taskPrioritySchema.optional(),
    estimatedMinutes: optionalIntegerSchema.refine(
      (value) => isInRange(value, 1, 1440),
      "Estimated minutes must be between 1 and 1440.",
    ),
    recurrence: recurrenceTypeSchema.optional(),
    weeklyDays: z.array(weekdaySchema).max(7).optional(),
    reminderHour: optionalIntegerSchema.refine(
      (value) => isInRange(value, 0, 23),
      "Reminder hour must be between 0 and 23.",
    ),
    reminderMinute: optionalIntegerSchema.refine(
      (value) => isInRange(value, 0, 59),
      "Reminder minute must be between 0 and 59.",
    ),
    timezone: z.string().trim().min(3).max(80).optional(),
    isActive: z.boolean().optional(),
    steps: z
      .array(
        z.object({
          text: z.string().trim().min(1).max(500),
        }),
      )
      .min(1)
      .max(200)
      .optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });

export const instantiateTemplateSchema = z.object({
  date: optionalDateSchema,
  status: taskStatusSchema.optional(),
  titleOverride: z.string().trim().min(1).max(200).optional(),
});

export const workflowDateSchema = z.object({
  date: optionalDateSchema,
});
