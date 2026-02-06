import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { patchStepSchema } from "@/lib/schemas";
import { errorResponse } from "@/lib/api";
import { deriveTaskComplete } from "@/lib/task-logic";

export async function PATCH(request: NextRequest, context: { params: Promise<{ stepId: string }> }) {
  const { stepId } = await context.params;

  const existingStep = await prisma.step.findUnique({ where: { id: stepId } });
  if (!existingStep) {
    return errorResponse("Step not found.", 404);
  }

  const body = await request.json();
  const parsed = patchStepSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message ?? "Invalid step update payload.", 400);
  }

  const { text, isComplete } = parsed.data;

  const updated = await prisma.$transaction(async (tx) => {
    const step = await tx.step.update({
      where: { id: stepId },
      data: {
        ...(text !== undefined ? { text } : {}),
        ...(typeof isComplete === "boolean" ? { isComplete } : {}),
      },
    });

    if (typeof isComplete === "boolean") {
      const allStepCompletion = await tx.step.findMany({
        where: { taskId: step.taskId },
        select: { isComplete: true },
      });

      const taskIsComplete = deriveTaskComplete(allStepCompletion.map((item) => item.isComplete));

      await tx.task.update({
        where: { id: step.taskId },
        data: { isComplete: taskIsComplete },
      });
    }

    return step;
  });

  return NextResponse.json({ step: updated });
}

export async function DELETE(_: NextRequest, context: { params: Promise<{ stepId: string }> }) {
  const { stepId } = await context.params;

  const step = await prisma.step.findUnique({ where: { id: stepId } });
  if (!step) {
    return errorResponse("Step not found.", 404);
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.step.delete({ where: { id: stepId } });

    const remainingSteps = await tx.step.findMany({
      where: { taskId: step.taskId },
      orderBy: { position: "asc" },
      select: {
        id: true,
        isComplete: true,
      },
    });

    await Promise.all(
      remainingSteps.map((item, index) =>
        tx.step.update({
          where: { id: item.id },
          data: { position: index },
        }),
      ),
    );

    const taskIsComplete = deriveTaskComplete(remainingSteps.map((item) => item.isComplete));

    await tx.task.update({
      where: { id: step.taskId },
      data: { isComplete: taskIsComplete },
    });

    const normalizedSteps = await tx.step.findMany({
      where: { taskId: step.taskId },
      orderBy: { position: "asc" },
    });

    return {
      deletedId: stepId,
      steps: normalizedSteps,
      taskIsComplete,
    };
  });

  return NextResponse.json(result);
}
