import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api";

function parseInteger(value: string | null, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function GET(request: NextRequest) {
  const now = new Date();
  const windowMinutes = parseInteger(request.nextUrl.searchParams.get("windowMinutes"), 180);
  const windowEnd = new Date(now.getTime() + windowMinutes * 60 * 1000);

  const dueSoon = await prisma.task.findMany({
    where: {
      isComplete: false,
      reminderAt: {
        gte: now,
        lte: windowEnd,
      },
    },
    orderBy: [{ reminderAt: "asc" }, { priority: "desc" }],
    select: {
      id: true,
      title: true,
      objective: true,
      reminderAt: true,
      status: true,
      priority: true,
      scheduledFor: true,
    },
  });

  return NextResponse.json({
    now,
    windowMinutes,
    reminders: dueSoon,
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { taskIds?: string[] } | null;
  const taskIds = body?.taskIds ?? [];

  if (!Array.isArray(taskIds) || taskIds.length === 0) {
    return errorResponse("taskIds must be a non-empty array.", 400);
  }

  const timestamp = new Date();

  await prisma.task.updateMany({
    where: { id: { in: taskIds } },
    data: { lastRemindedAt: timestamp },
  });

  return NextResponse.json({
    success: true,
    markedAt: timestamp,
    taskIds,
  });
}
