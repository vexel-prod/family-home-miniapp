import { getPrisma } from "@/lib/prisma";
import { notifyPartner } from "@/lib/partner-notify";
import { NextResponse } from "next/server";

type CreateTaskPayload = {
  title?: string;
  note?: string | null;
  priority?: "normal" | "urgent";
  addedByName?: string;
  addedByUsername?: string | null;
  addedByTelegramId?: string | null;
};

export async function POST(request: Request) {
  const prisma = getPrisma();
  const body = (await request.json()) as CreateTaskPayload;

  if (!body.title?.trim() || !body.addedByName?.trim()) {
    return NextResponse.json({ ok: false, error: "Missing task data" }, { status: 400 });
  }

  const task = await prisma.householdTask.create({
    data: {
      title: body.title.trim(),
      note: body.note?.trim() || null,
      priority: body.priority === "urgent" ? "urgent" : "normal",
      addedByName: body.addedByName.trim(),
      addedByUsername: body.addedByUsername ?? null,
      addedByTelegramId: body.addedByTelegramId ?? null,
    },
  });

  await notifyPartner({
    actorName: body.addedByName.trim(),
    actorTelegramId: body.addedByTelegramId ?? null,
    actorUsername: body.addedByUsername ?? null,
    text:
      `Раздел: БЫТ\n` +
      `Задача: ${task.title}\n` +
      `Приоритет: ${task.priority === "urgent" ? "срочно" : "обычно"}` +
      `${task.note ? `\nКомментарий: ${task.note}` : ""}`,
  });

  return NextResponse.json({ ok: true, task });
}
