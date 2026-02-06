import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api";
import { createTaskSchema } from "@/lib/schemas";
import { AiProviderError, generateInitialTaskPlan } from "@/lib/openrouter";

function deriveTitle(objective: string): string {
  const compact = objective.replace(/\s+/g, " ").trim();
  return compact.length > 80 ? `${compact.slice(0, 77)}...` : compact;
}

export async function GET() {
  const tasks = await prisma.task.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      steps: {
        select: {
          id: true,
          isComplete: true,
        },
      },
    },
  });

  const payload = tasks.map((task) => {
    const totalSteps = task.steps.length;
    const completeSteps = task.steps.filter((step) => step.isComplete).length;

    return {
      id: task.id,
      title: task.title,
      objective: task.objective,
      isComplete: task.isComplete,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      totalSteps,
      completeSteps,
    };
  });

  return NextResponse.json({ tasks: payload });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createTaskSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message ?? "Invalid task input.", 400);
    }

    const { objective, title } = parsed.data;

    const aiResult = await generateInitialTaskPlan({ objective, title });

    const created = await prisma.$transaction(async (tx) => {
      const task = await tx.task.create({
        data: {
          title: title ?? deriveTitle(objective),
          objective,
          isComplete: false,
        },
      });

      await tx.step.createMany({
        data: aiResult.steps.map((step, index) => ({
          taskId: task.id,
          text: step.text,
          position: index,
          isComplete: false,
        })),
      });

      await tx.taskMessage.createMany({
        data: [
          {
            taskId: task.id,
            role: "user",
            content: objective,
          },
          {
            taskId: task.id,
            role: "assistant",
            content: aiResult.assistantReply,
          },
        ],
      });

      const taskWithDetails = await tx.task.findUnique({
        where: { id: task.id },
        include: {
          steps: { orderBy: { position: "asc" } },
          messages: { orderBy: { createdAt: "asc" } },
        },
      });

      return taskWithDetails;
    });

    return NextResponse.json({ task: created, modelUsed: aiResult.modelUsed }, { status: 201 });
  } catch (error) {
    if (error instanceof AiProviderError) {
      return NextResponse.json(
        {
          error: error.message,
          details: error.details,
        },
        { status: error.status },
      );
    }

    return errorResponse("Failed to create task.", 500);
  }
}
