import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api";
import { instantiateTemplateSchema } from "@/lib/schemas";
import { instantiateTaskFromTemplate } from "@/lib/workflow";

export async function POST(request: NextRequest, context: { params: Promise<{ templateId: string }> }) {
  const { templateId } = await context.params;
  const body = await request.json().catch(() => ({}));
  const parsed = instantiateTemplateSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message ?? "Invalid instantiate payload.", 400);
  }

  const template = await prisma.taskTemplate.findUnique({
    where: { id: templateId },
    include: {
      steps: { orderBy: { position: "asc" } },
    },
  });

  if (!template) {
    return errorResponse("Template not found.", 404);
  }

  const targetDate = parsed.data.date ?? new Date();

  const task = await prisma.$transaction(async (tx) =>
    instantiateTaskFromTemplate(tx, {
      template,
      targetDate,
      status: parsed.data.status,
      titleOverride: parsed.data.titleOverride,
    }),
  );

  return NextResponse.json({ task }, { status: 201 });
}
