import { type Prisma } from "@prisma/client";
import { startOfLocalDay } from "@/lib/task-logic";
import { type TaskStatus } from "@/lib/types";

type TemplateWithSteps = {
  id: string;
  name: string;
  objective: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  estimatedMinutes: number | null;
  reminderHour: number | null;
  reminderMinute: number | null;
  steps: Array<{
    text: string;
    position: number;
  }>;
};

function buildReminderAt(date: Date, hour?: number | null, minute?: number | null): Date | null {
  if (hour === undefined || hour === null || minute === undefined || minute === null) {
    return null;
  }
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute, 0, 0);
}

export async function instantiateTaskFromTemplate(
  tx: Prisma.TransactionClient,
  input: {
    template: TemplateWithSteps;
    targetDate: Date;
    status?: TaskStatus;
    titleOverride?: string;
  },
) {
  const scheduledFor = startOfLocalDay(input.targetDate);
  const reminderAt = buildReminderAt(input.targetDate, input.template.reminderHour, input.template.reminderMinute);
  const status = input.status ?? "NEXT";

  const task = await tx.task.create({
    data: {
      title: input.titleOverride ?? input.template.name,
      objective: input.template.objective,
      status,
      isComplete: status === "DONE",
      priority: input.template.priority,
      scheduledFor,
      estimatedMinutes: input.template.estimatedMinutes,
      reminderAt,
      templateId: input.template.id,
      completedAt: status === "DONE" ? new Date() : null,
    },
  });

  if (input.template.steps.length > 0) {
    await tx.step.createMany({
      data: input.template.steps.map((step, index) => ({
        taskId: task.id,
        text: step.text,
        position: index,
        isComplete: status === "DONE",
      })),
    });
  }

  return tx.task.findUnique({
    where: { id: task.id },
    include: {
      steps: { orderBy: { position: "asc" } },
      messages: { orderBy: { createdAt: "asc" } },
      template: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}
