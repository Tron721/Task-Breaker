import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api";
import { patchTemplateSchema } from "@/lib/schemas";
import { serializeWeeklyDays } from "@/lib/task-logic";

export async function GET(_: NextRequest, context: { params: Promise<{ templateId: string }> }) {
  const { templateId } = await context.params;

  const template = await prisma.taskTemplate.findUnique({
    where: { id: templateId },
    include: {
      steps: { orderBy: { position: "asc" } },
    },
  });

  if (!template) {
    return errorResponse("Template not found.", 404);
  }

  return NextResponse.json({ template });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ templateId: string }> }) {
  const { templateId } = await context.params;
  const existing = await prisma.taskTemplate.findUnique({ where: { id: templateId } });

  if (!existing) {
    return errorResponse("Template not found.", 404);
  }

  const body = await request.json();
  const parsed = patchTemplateSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message ?? "Invalid template update payload.", 400);
  }

  const data = parsed.data;
  if (data.recurrence === "WEEKLY" && data.weeklyDays && data.weeklyDays.length === 0) {
    return errorResponse("Weekly recurrence requires at least one weekday.", 400);
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.taskTemplate.update({
      where: { id: templateId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.objective !== undefined ? { objective: data.objective } : {}),
        ...(data.priority !== undefined ? { priority: data.priority } : {}),
        ...(data.estimatedMinutes !== undefined ? { estimatedMinutes: data.estimatedMinutes } : {}),
        ...(data.recurrence !== undefined ? { recurrence: data.recurrence } : {}),
        ...(data.weeklyDays !== undefined ? { weeklyDays: serializeWeeklyDays(data.weeklyDays) } : {}),
        ...(data.reminderHour !== undefined ? { reminderHour: data.reminderHour } : {}),
        ...(data.reminderMinute !== undefined ? { reminderMinute: data.reminderMinute } : {}),
        ...(data.timezone !== undefined ? { timezone: data.timezone } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });

    if (data.steps) {
      await tx.templateStep.deleteMany({ where: { templateId } });
      await tx.templateStep.createMany({
        data: data.steps.map((step, index) => ({
          templateId,
          text: step.text,
          position: index,
        })),
      });
    }

    return tx.taskTemplate.findUnique({
      where: { id: templateId },
      include: {
        steps: { orderBy: { position: "asc" } },
      },
    });
  });

  return NextResponse.json({ template: updated });
}

export async function DELETE(_: NextRequest, context: { params: Promise<{ templateId: string }> }) {
  const { templateId } = await context.params;
  const existing = await prisma.taskTemplate.findUnique({ where: { id: templateId } });

  if (!existing) {
    return errorResponse("Template not found.", 404);
  }

  await prisma.taskTemplate.delete({ where: { id: templateId } });
  return NextResponse.json({ success: true });
}
