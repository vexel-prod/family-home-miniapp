import { getPrisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type UpdateTaskPayload = {
  action?: "complete" | "reopen";
  actorName?: string;
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ taskId: string }> },
) {
  const prisma = getPrisma();
  const { taskId } = await context.params;
  const body = (await request.json()) as UpdateTaskPayload;

  if (!body.action || !body.actorName?.trim()) {
    return NextResponse.json({ ok: false, error: "Missing update data" }, { status: 400 });
  }

  const task = await prisma.householdTask.findUnique({
    where: { id: taskId },
  });

  if (!task) {
    return NextResponse.json({ ok: false, error: "Task not found" }, { status: 404 });
  }

  const updatedTask = await prisma.householdTask.update({
    where: { id: taskId },
    data:
      body.action === "complete"
        ? {
            status: "done",
            completedAt: new Date(),
            completedByName: body.actorName.trim(),
          }
        : {
            status: "open",
            completedAt: null,
            completedByName: null,
          },
    include: {
      catalogItem: true,
    },
  });

  return NextResponse.json({ ok: true, task: updatedTask });
}
