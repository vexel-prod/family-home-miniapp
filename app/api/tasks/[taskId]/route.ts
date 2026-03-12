import { authorizeRequest } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import {
  formatElapsedLabel,
  formatMoscowDateTime,
  notifyPartner,
} from "@/lib/partner-notify";
import { NextResponse } from "next/server";

type UpdateTaskPayload = {
  action?: "complete" | "reopen" | "replace";
  actorName?: string;
  actorUsername?: string | null;
  actorTelegramId?: string | null;
  title?: string;
  note?: string | null;
  priority?: "normal" | "urgent";
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ taskId: string }> },
) {
  const prisma = getPrisma();
  const auth = await authorizeRequest(request, prisma);

  if (!auth) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { taskId } = await context.params;
  const body = (await request.json()) as UpdateTaskPayload;

  const actorName = [auth.user.first_name, auth.user.last_name].filter(Boolean).join(" ").trim() || auth.user.username || auth.member.firstName;

  if (!body.action) {
    return NextResponse.json({ ok: false, error: "Missing update data" }, { status: 400 });
  }

  const task = await prisma.householdTask.findUnique({
    where: { id: taskId },
  });

  if (!task) {
    return NextResponse.json({ ok: false, error: "Task not found" }, { status: 404 });
  }

  if (task.householdId !== auth.member.householdId) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  if (body.action === "replace") {
    if (!body.title?.trim()) {
      return NextResponse.json({ ok: false, error: "Missing replacement title" }, { status: 400 });
    }

    const updatedTask = await prisma.householdTask.update({
      where: { id: taskId },
      data: {
        title: body.title.trim(),
        note: body.note?.trim() || null,
        priority: body.priority === "urgent" ? "urgent" : "normal",
      },
    });

    await notifyPartner({
      actorName,
      actorTelegramId: String(auth.user.id),
      actorUsername: auth.user.username ?? null,
      text:
        `Раздел: БЫТ\n` +
        `Задача обновлена: ${updatedTask.title}\n` +
        `Приоритет: ${updatedTask.priority === "urgent" ? "срочно" : "обычно"}` +
        `${updatedTask.note ? `\nКомментарий: ${updatedTask.note}` : ""}`,
    });

    return NextResponse.json({ ok: true, task: updatedTask });
  }

  const updatedTask = await prisma.householdTask.update({
    where: { id: taskId },
    data:
      body.action === "complete"
        ? {
            status: "done",
            completedAt: new Date(),
            completedByName: actorName,
          }
        : {
            status: "open",
            completedAt: null,
            completedByName: null,
          },
  });

  if (body.action === "complete" && updatedTask.completedAt) {
    await notifyPartner({
      actorName,
      actorTelegramId: String(auth.user.id),
      actorUsername: auth.user.username ?? null,
      text:
        `Раздел: БЫТ\n` +
        `Задача выполнена: ${updatedTask.title}\n` +
        `Кто выполнил: ${actorName}\n` +
        `Когда: ${formatMoscowDateTime(updatedTask.completedAt)}\n` +
        `Прошло с момента создания: ${formatElapsedLabel(task.createdAt, updatedTask.completedAt)}`,
    });
  }

  return NextResponse.json({ ok: true, task: updatedTask });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ taskId: string }> },
) {
  const prisma = getPrisma();
  const auth = await authorizeRequest(request, prisma);

  if (!auth) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { taskId } = await context.params;

  const task = await prisma.householdTask.findUnique({
    where: { id: taskId },
  });

  if (!task) {
    return NextResponse.json({ ok: false, error: "Task not found" }, { status: 404 });
  }

  if (task.householdId !== auth.member.householdId) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  await prisma.householdTask.delete({
    where: { id: taskId },
  });

  return NextResponse.json({ ok: true });
}
