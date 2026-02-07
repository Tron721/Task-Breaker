import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api";
import { patchTaskSchema } from "@/lib/schemas";
import { normalizeTaskCompletion, normalizeTaskStatus } from "@/lib/task-logic";

export async function GET(_: NextRequest, context: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await context.params;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
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

  if (!task) {
    return errorResponse("Task not found.", 404);
  }

  return NextResponse.json({ task });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await context.params;

  const existing = await prisma.task.findUnique({ where: { id: taskId } });
  if (!existing) {
    return errorResponse("Task not found.", 404);
  }

  const body = await request.json();
  const parsed = patchTaskSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message ?? "Invalid task update payload.", 400);
  }

  const { isComplete, title, objective, status, priority, scheduledFor, dueDate, estimatedMinutes, actualMinutes, reviewNotes, reminderAt } =
    parsed.data;

  const nextStatus =
    typeof isComplete === "boolean"
      ? normalizeTaskStatus({ status, isComplete })
      : status
        ? status
        : existing.status;
  const nextIsComplete =
    typeof isComplete === "boolean" ? isComplete : normalizeTaskCompletion(nextStatus);
  const shouldMarkCompleteAt = nextStatus === "DONE" || nextIsComplete;

  const updated = await prisma.$transaction(async (tx) => {
    if (typeof isComplete === "boolean" || (status === "DONE" && typeof isComplete !== "boolean")) {
      await tx.step.updateMany({
        where: { taskId },
        data: { isComplete: nextIsComplete },
      });
    }

    await tx.task.update({
      where: { id: taskId },
      data: {
        isComplete: nextIsComplete,
        status: nextStatus,
        ...(title !== undefined ? { title } : {}),
        ...(objective !== undefined ? { objective } : {}),
        ...(priority !== undefined ? { priority } : {}),
        ...(scheduledFor !== undefined ? { scheduledFor } : {}),
        ...(dueDate !== undefined ? { dueDate } : {}),
        ...(estimatedMinutes !== undefined ? { estimatedMinutes } : {}),
        ...(actualMinutes !== undefined ? { actualMinutes } : {}),
        ...(reviewNotes !== undefined ? { reviewNotes } : {}),
        ...(reminderAt !== undefined ? { reminderAt } : {}),
        completedAt: shouldMarkCompleteAt ? new Date() : null,
      },
    });

    return tx.task.findUnique({
      where: { id: taskId },
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
  });

  return NextResponse.json({ task: updated });
}

export async function DELETE(_: NextRequest, context: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await context.params;

  const existing = await prisma.task.findUnique({ where: { id: taskId } });
  if (!existing) {
    return errorResponse("Task not found.", 404);
  }

  await prisma.task.delete({ where: { id: taskId } });
  return NextResponse.json({ success: true });
}
