import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api";
import { patchTaskSchema } from "@/lib/schemas";

export async function GET(_: NextRequest, context: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await context.params;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      steps: { orderBy: { position: "asc" } },
      messages: { orderBy: { createdAt: "asc" } },
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

  const { isComplete, title, objective } = parsed.data;

  const updated = await prisma.$transaction(async (tx) => {
    if (typeof isComplete === "boolean") {
      await tx.step.updateMany({
        where: { taskId },
        data: { isComplete },
      });
    }

    await tx.task.update({
      where: { id: taskId },
      data: {
        ...(typeof isComplete === "boolean" ? { isComplete } : {}),
        ...(title !== undefined ? { title } : {}),
        ...(objective !== undefined ? { objective } : {}),
      },
    });

    return tx.task.findUnique({
      where: { id: taskId },
      include: {
        steps: { orderBy: { position: "asc" } },
        messages: { orderBy: { createdAt: "asc" } },
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
