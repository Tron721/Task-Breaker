import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api";
import { createTaskSchema } from "@/lib/schemas";
import { AiProviderError, generateInitialTaskPlan } from "@/lib/openrouter";
import { endOfLocalDay, startOfLocalDay } from "@/lib/task-logic";

function deriveTitle(objective: string): string {
  const compact = objective.replace(/\s+/g, " ").trim();
  return compact.length > 80 ? `${compact.slice(0, 77)}...` : compact;
}

function parseDateQuery(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const scope = searchParams.get("scope");
  const forDate = parseDateQuery(searchParams.get("date")) ?? new Date();
  const includeCompleted = searchParams.get("includeCompleted") !== "false";

  const where =
    scope === "today"
      ? {
          scheduledFor: {
            gte: startOfLocalDay(forDate),
            lte: endOfLocalDay(forDate),
          },
          ...(includeCompleted ? {} : { isComplete: false }),
        }
      : {
          ...(includeCompleted ? {} : { isComplete: false }),
        };

  const tasks = await prisma.task.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      steps: {
        select: {
          id: true,
          isComplete: true,
        },
      },
      template: {
        select: {
          id: true,
          name: true,
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
      status: task.status,
      priority: task.priority,
      scheduledFor: task.scheduledFor,
      dueDate: task.dueDate,
      estimatedMinutes: task.estimatedMinutes,
      actualMinutes: task.actualMinutes,
      reminderAt: task.reminderAt,
      template: task.template,
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

    const { objective, title, status, priority, scheduledFor, dueDate, estimatedMinutes, reminderAt } = parsed.data;

    const aiResult = await generateInitialTaskPlan({ objective, title });
    const normalizedStatus = status ?? "NEXT";
    const normalizedIsComplete = normalizedStatus === "DONE";
    const defaultScheduledFor = scheduledFor ?? startOfLocalDay(new Date());

    const created = await prisma.$transaction(async (tx) => {
      const task = await tx.task.create({
        data: {
          title: title ?? deriveTitle(objective),
          objective,
          isComplete: normalizedIsComplete,
          status: normalizedStatus,
          priority: priority ?? "MEDIUM",
          scheduledFor: defaultScheduledFor,
          dueDate,
          estimatedMinutes,
          reminderAt,
          completedAt: normalizedIsComplete ? new Date() : null,
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
          template: {
            select: {
              id: true,
              name: true,
            },
          },
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
