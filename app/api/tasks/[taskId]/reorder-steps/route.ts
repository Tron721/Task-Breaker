import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { reorderStepsSchema } from "@/lib/schemas";
import { errorResponse } from "@/lib/api";
import { normalizeOrderedIds } from "@/lib/task-logic";

export async function POST(request: NextRequest, context: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await context.params;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      steps: {
        select: { id: true },
      },
    },
  });

  if (!task) {
    return errorResponse("Task not found.", 404);
  }

  const body = await request.json();
  const parsed = reorderStepsSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message ?? "Invalid reorder payload.", 400);
  }

  let orderedIds: string[];

  try {
    orderedIds = normalizeOrderedIds(
      task.steps.map((step) => step.id),
      parsed.data.orderedStepIds,
    );
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Invalid step ordering.", 400);
  }

  await prisma.$transaction(
    orderedIds.map((stepId, position) =>
      prisma.step.update({
        where: { id: stepId },
        data: { position },
      }),
    ),
  );

  const steps = await prisma.step.findMany({
    where: { taskId },
    orderBy: { position: "asc" },
  });

  return NextResponse.json({ steps });
}
