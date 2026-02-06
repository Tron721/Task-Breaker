import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { chatMessageSchema } from "@/lib/schemas";
import { errorResponse } from "@/lib/api";
import { AiProviderError, generateTaskPlanFromChat } from "@/lib/openrouter";

export async function POST(request: NextRequest, context: { params: Promise<{ taskId: string }> }) {
  try {
    const { taskId } = await context.params;

    const body = await request.json();
    const parsed = chatMessageSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message ?? "Invalid chat payload.", 400);
    }

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

    const userMessage = parsed.data.message;

    const aiResult = await generateTaskPlanFromChat({
      objective: task.objective,
      title: task.title,
      existingSteps: task.steps,
      history: task.messages.map((message) => ({
        role: message.role as "user" | "assistant",
        content: message.content,
      })),
      newMessage: userMessage,
    });

    const createdMessages = await prisma.$transaction(async (tx) => {
      const newUserMessage = await tx.taskMessage.create({
        data: {
          taskId,
          role: "user",
          content: userMessage,
        },
      });

      const newAssistantMessage = await tx.taskMessage.create({
        data: {
          taskId,
          role: "assistant",
          content: aiResult.assistantReply,
        },
      });

      return [newUserMessage, newAssistantMessage];
    });

    return NextResponse.json({
      assistantReply: aiResult.assistantReply,
      suggestedSteps: aiResult.steps,
      modelUsed: aiResult.modelUsed,
      messages: createdMessages,
    });
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

    return errorResponse("Failed to process chat message.", 500);
  }
}
