import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { endOfLocalDay, groupTasksByStatus, startOfLocalDay } from "@/lib/task-logic";

function parseDate(value: string | null): Date {
  if (!value) {
    return new Date();
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export async function GET(request: NextRequest) {
  const date = parseDate(request.nextUrl.searchParams.get("date"));
  const start = startOfLocalDay(date);
  const end = endOfLocalDay(date);

  const [todayTasks, overdueTasks] = await Promise.all([
    prisma.task.findMany({
      where: {
        scheduledFor: {
          gte: start,
          lte: end,
        },
      },
      orderBy: [{ status: "asc" }, { priority: "desc" }, { updatedAt: "desc" }],
      include: {
        steps: {
          select: { id: true, isComplete: true },
        },
        template: {
          select: { id: true, name: true },
        },
      },
    }),
    prisma.task.findMany({
      where: {
        dueDate: { lt: start },
        isComplete: false,
      },
      orderBy: [{ dueDate: "asc" }, { priority: "desc" }],
      include: {
        steps: {
          select: { id: true, isComplete: true },
        },
      },
    }),
  ]);

  const enrichedToday = todayTasks.map((task) => ({
    ...task,
    totalSteps: task.steps.length,
    completeSteps: task.steps.filter((step) => step.isComplete).length,
  }));
  const grouped = groupTasksByStatus(enrichedToday);
  const total = enrichedToday.length;
  const done = grouped.done.length;

  return NextResponse.json({
    date: start,
    summary: {
      total,
      done,
      remaining: total - done,
      focus: grouped.now.length,
      queued: grouped.next.length + grouped.later.length,
      completionPercent: total === 0 ? 0 : Math.round((done / total) * 100),
      overdue: overdueTasks.length,
    },
    groups: grouped,
    overdue: overdueTasks.map((task) => ({
      id: task.id,
      title: task.title,
      dueDate: task.dueDate,
      priority: task.priority,
    })),
  });
}
