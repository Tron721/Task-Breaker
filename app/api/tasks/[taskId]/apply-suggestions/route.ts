import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { applySuggestionsSchema } from "@/lib/schemas";
import { errorResponse } from "@/lib/api";

export async function POST(request: NextRequest, context: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await context.params;

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) {
    return errorResponse("Task not found.", 404);
  }

  const body = await request.json();
  const parsed = applySuggestionsSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message ?? "Invalid suggested steps payload.", 400);
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.step.deleteMany({ where: { taskId } });

    await tx.step.createMany({
      data: parsed.data.steps.map((step, index) => ({
        taskId,
        text: step.text,
        position: index,
        isComplete: false,
      })),
    });

    await tx.task.update({
      where: { id: taskId },
      data: { isComplete: false },
    });

    return tx.step.findMany({
      where: { taskId },
      orderBy: { position: "asc" },
    });
  });

  return NextResponse.json({ steps: result });
}
