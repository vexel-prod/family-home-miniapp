import { authorizeRequest } from "@/lib/auth";
import { awardTaskCompletionBonuses, clearTaskBonusTransactions } from "@/lib/bonus-ledger";
import { getMemberDisplayName, notifyHousehold } from "@/lib/household-notify";
import { getPrisma } from "@/lib/prisma";
import { DEADLINE_LIMIT_MS, formatMoscowDeadlineLabel } from "@/shared/lib/bonus-shop";
import {
  formatElapsedLabel,
  formatMoscowDateTime,
} from "@/lib/partner-notify";
import { NextResponse } from "next/server";

type UpdateTaskPayload = {
  action?: "complete" | "complete-together" | "reopen" | "replace";
  actorName?: string;
  actorUsername?: string | null;
  actorTelegramId?: string | null;
  title?: string;
  note?: string | null;
  deadlineAt?: string;
};

function parseDeadline(deadlineAt?: string) {
  if (!deadlineAt) {
    return null;
  }

  const deadline = new Date(deadlineAt);

  if (Number.isNaN(deadline.getTime())) {
    return null;
  }

  const now = new Date();
  const diffMs = deadline.getTime() - now.getTime();

  if (diffMs <= 0 || diffMs > DEADLINE_LIMIT_MS) {
    return null;
  }

  return deadline;
}

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

    const deadline = parseDeadline(body.deadlineAt);

    if (!deadline) {
      return NextResponse.json({ ok: false, error: "Invalid deadline" }, { status: 400 });
    }

    const updatedTask = await prisma.householdTask.update({
      where: { id: taskId },
      data: {
        title: body.title.trim(),
        note: body.note?.trim() || null,
        deadlineAt: deadline,
      },
    });

    await notifyHousehold(
      prisma,
      auth.member.householdId,
      `Family Home Mini App\n\n` +
        `${actorName} обновил(а) задачу\n` +
        `Задача: ${updatedTask.title}\n` +
        `Новый дедлайн: ${formatMoscowDeadlineLabel(updatedTask.deadlineAt)}${updatedTask.note ? `\nКомментарий: ${updatedTask.note}` : ""}`,
    );

    return NextResponse.json({ ok: true, task: updatedTask });
  }

  const updatedTask = await prisma.householdTask.update({
    where: { id: taskId },
    data:
      body.action === "complete" || body.action === "complete-together"
        ? {
            status: "done",
            completedAt: new Date(),
            completedByName:
              body.action === "complete-together" ? "Сделано вместе" : actorName,
          }
        : {
            status: "open",
            completedAt: null,
            completedByName: null,
            lastDeadlineReminderAt: null,
          },
  });

  if (body.action === "complete" || body.action === "complete-together") {
    await awardTaskCompletionBonuses(
      prisma,
      {
        id: updatedTask.id,
        householdId: updatedTask.householdId,
        title: updatedTask.title,
        createdAt: updatedTask.createdAt,
        completedAt: updatedTask.completedAt ?? new Date(),
        completedByName: updatedTask.completedByName,
      },
      auth.member.id,
      body.action === "complete-together",
    );
  }

  if (body.action === "reopen") {
    await clearTaskBonusTransactions(prisma, updatedTask.id);
  }

  if (
    (body.action === "complete" || body.action === "complete-together") &&
    updatedTask.completedAt
  ) {
    const members = await prisma.member.findMany({
      where: { householdId: auth.member.householdId },
      orderBy: [{ createdAt: "asc" }],
      select: {
        firstName: true,
        lastName: true,
        username: true,
      },
    })

    await notifyHousehold(
      prisma,
      auth.member.householdId,
      `Family Home Mini App\n\n` +
        `Задача выполнена: ${updatedTask.title}\n` +
        `Кто выполнил: ${body.action === "complete-together" ? "вместе" : actorName}\n` +
        `Когда: ${formatMoscowDateTime(updatedTask.completedAt)}\n` +
        `Дедлайн: ${formatMoscowDeadlineLabel(updatedTask.deadlineAt)}\n` +
        `Прошло с момента создания: ${formatElapsedLabel(task.createdAt, updatedTask.completedAt)}\n` +
        `Участники месяца: ${members.map(getMemberDisplayName).join(", ")}`,
    );
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

  await clearTaskBonusTransactions(prisma, taskId);

  await prisma.householdTask.delete({
    where: { id: taskId },
  });

  return NextResponse.json({ ok: true });
}
