import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { workflowDateSchema } from "@/lib/schemas";
import { errorResponse } from "@/lib/api";
import { endOfLocalDay, shouldInstantiateTemplate, startOfLocalDay } from "@/lib/task-logic";
import { instantiateTaskFromTemplate } from "@/lib/workflow";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const parsed = workflowDateSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message ?? "Invalid workflow date payload.", 400);
  }

  const targetDate = parsed.data.date ?? new Date();
  const start = startOfLocalDay(targetDate);
  const end = endOfLocalDay(targetDate);

  const templates = await prisma.taskTemplate.findMany({
    where: {
      isActive: true,
      recurrence: { not: "NONE" },
    },
    include: {
      steps: { orderBy: { position: "asc" } },
    },
  });

  const createdTasks = [];

  for (const template of templates) {
    const shouldGenerate = shouldInstantiateTemplate({
      recurrence: template.recurrence,
      weeklyDays: template.weeklyDays,
      lastGeneratedOn: template.lastGeneratedOn,
      targetDate,
    });

    if (!shouldGenerate) {
      continue;
    }

    const existingForDay = await prisma.task.findFirst({
      where: {
        templateId: template.id,
        scheduledFor: {
          gte: start,
          lte: end,
        },
      },
      select: { id: true },
    });

    if (existingForDay) {
      continue;
    }

    const task = await prisma.$transaction(async (tx) => {
      const created = await instantiateTaskFromTemplate(tx, {
        template,
        targetDate,
      });

      await tx.taskTemplate.update({
        where: { id: template.id },
        data: { lastGeneratedOn: start },
      });

      return created;
    });

    if (task) {
      createdTasks.push(task);
    }
  }

  return NextResponse.json({
    createdCount: createdTasks.length,
    tasks: createdTasks,
  });
}
