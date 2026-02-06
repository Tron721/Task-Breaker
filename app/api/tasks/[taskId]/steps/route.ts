import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createStepSchema } from "@/lib/schemas";
import { errorResponse } from "@/lib/api";

export async function POST(request: NextRequest, context: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await context.params;

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) {
    return errorResponse("Task not found.", 404);
  }

  const body = await request.json();
  const parsed = createStepSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message ?? "Invalid step payload.", 400);
  }

  const maxPosition = await prisma.step.aggregate({
    where: { taskId },
    _max: { position: true },
  });

  const step = await prisma.step.create({
    data: {
      taskId,
      text: parsed.data.text,
      position: (maxPosition._max.position ?? -1) + 1,
      isComplete: false,
    },
  });

  await prisma.task.update({
    where: { id: taskId },
    data: { isComplete: false },
  });

  return NextResponse.json({ step }, { status: 201 });
}
