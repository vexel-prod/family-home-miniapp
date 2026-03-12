import { authorizeRequest } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { notifyPartner } from "@/lib/partner-notify";
import { NextResponse } from "next/server";

type CreateTaskPayload = {
  title?: string;
  note?: string | null;
  priority?: "normal" | "urgent";
};

export async function POST(request: Request) {
  const prisma = getPrisma();
  const auth = await authorizeRequest(request, prisma);

  if (!auth) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as CreateTaskPayload;

  const actorName = [auth.user.first_name, auth.user.last_name].filter(Boolean).join(" ").trim() || auth.user.username || auth.member.firstName;

  if (!body.title?.trim()) {
    return NextResponse.json({ ok: false, error: "Missing task data" }, { status: 400 });
  }

  const task = await prisma.householdTask.create({
    data: {
      householdId: auth.member.householdId,
      title: body.title.trim(),
      note: body.note?.trim() || null,
      priority: body.priority === "urgent" ? "urgent" : "normal",
      addedByName: actorName,
      addedByUsername: auth.user.username ?? null,
      addedByTelegramId: String(auth.user.id),
    },
  });

  await notifyPartner({
    actorName,
    actorTelegramId: String(auth.user.id),
    actorUsername: auth.user.username ?? null,
    text:
      `Раздел: БЫТ\n` +
      `Задача: ${task.title}\n` +
      `Приоритет: ${task.priority === "urgent" ? "срочно" : "обычно"}` +
      `${task.note ? `\nКомментарий: ${task.note}` : ""}`,
  });

  return NextResponse.json({ ok: true, task });
}
