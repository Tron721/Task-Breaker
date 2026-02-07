import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api";
import { createTemplateSchema } from "@/lib/schemas";
import { serializeWeeklyDays } from "@/lib/task-logic";

export async function GET() {
  const templates = await prisma.taskTemplate.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      steps: { orderBy: { position: "asc" } },
    },
  });

  return NextResponse.json({ templates });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = createTemplateSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message ?? "Invalid template payload.", 400);
  }

  if (parsed.data.recurrence === "WEEKLY" && (!parsed.data.weeklyDays || parsed.data.weeklyDays.length === 0)) {
    return errorResponse("Weekly recurrence requires at least one weekday.", 400);
  }

  const template = await prisma.$transaction(async (tx) => {
    const created = await tx.taskTemplate.create({
      data: {
        name: parsed.data.name,
        objective: parsed.data.objective,
        priority: parsed.data.priority ?? "MEDIUM",
        estimatedMinutes: parsed.data.estimatedMinutes,
        recurrence: parsed.data.recurrence,
        weeklyDays: parsed.data.weeklyDays ? serializeWeeklyDays(parsed.data.weeklyDays) : null,
        reminderHour: parsed.data.reminderHour,
        reminderMinute: parsed.data.reminderMinute,
        timezone: parsed.data.timezone ?? "America/New_York",
        isActive: true,
      },
    });

    await tx.templateStep.createMany({
      data: parsed.data.steps.map((step, index) => ({
        templateId: created.id,
        text: step.text,
        position: index,
      })),
    });

    return tx.taskTemplate.findUnique({
      where: { id: created.id },
      include: {
        steps: { orderBy: { position: "asc" } },
      },
    });
  });

  return NextResponse.json({ template }, { status: 201 });
}
