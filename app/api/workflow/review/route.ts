import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { workflowDateSchema } from "@/lib/schemas";
import { errorResponse } from "@/lib/api";
import { endOfLocalDay, startOfLocalDay } from "@/lib/task-logic";

function addDays(base: Date, days: number): Date {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + days, 0, 0, 0, 0);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const parsed = workflowDateSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message ?? "Invalid review payload.", 400);
  }

  const reviewDate = parsed.data.date ?? new Date();
  const start = startOfLocalDay(reviewDate);
  const end = endOfLocalDay(reviewDate);
  const nextDay = addDays(start, 1);

  const todaysTasks = await prisma.task.findMany({
    where: {
      scheduledFor: {
        gte: start,
        lte: end,
      },
    },
    include: {
      steps: {
        select: {
          isComplete: true,
        },
      },
    },
  });

  const completed = todaysTasks.filter((task) => task.isComplete);
  const incomplete = todaysTasks.filter((task) => !task.isComplete);
  const rolled = [];

  for (const task of incomplete) {
    const updated = await prisma.task.update({
      where: { id: task.id },
      data: {
        scheduledFor: nextDay,
        status: task.status === "NOW" ? "NEXT" : task.status,
      },
      select: {
        id: true,
        title: true,
        status: true,
        scheduledFor: true,
      },
    });
    rolled.push(updated);
  }

  const completedStepCount = completed.reduce(
    (sum, task) => sum + task.steps.filter((step) => step.isComplete).length,
    0,
  );
  const totalStepCount = todaysTasks.reduce((sum, task) => sum + task.steps.length, 0);

  return NextResponse.json({
    reviewDate: start,
    summary: {
      totalTasks: todaysTasks.length,
      completedTasks: completed.length,
      rolledTasks: rolled.length,
      completedSteps: completedStepCount,
      totalSteps: totalStepCount,
      completionPercent: todaysTasks.length === 0 ? 0 : Math.round((completed.length / todaysTasks.length) * 100),
    },
    digest: [
      `Completed ${completed.length} of ${todaysTasks.length} scheduled tasks.`,
      rolled.length > 0
        ? `Rolled ${rolled.length} unfinished task${rolled.length === 1 ? "" : "s"} to tomorrow.`
        : "No rollover needed.",
      totalStepCount > 0
        ? `Step completion: ${completedStepCount}/${totalStepCount}.`
        : "No step-level progress recorded today.",
    ],
    rolled,
  });
}
