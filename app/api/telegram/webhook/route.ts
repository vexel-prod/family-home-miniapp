import { formatMoscowDeadlineLabel } from '@entities/bonus'
import { finalizeTaskCompletion, reopenTaskFromRejectedApproval } from '@entities/family/server/task-completion'
import { getMemberDisplayName, notifyHousehold, notifyMember } from '@entities/household/server/household-notify'
import { getPrisma } from '@shared/api/prisma'
import { answerTelegramCallbackQuery, editTelegramMessage, sendTelegramMessage } from '@shared/api/telegram'
import { formatElapsedLabel, formatMoscowDateTime } from '@/shared/lib/partner-notify'
import { NextResponse } from 'next/server'

type TelegramCallbackQueryUpdate = {
  message?: {
    text?: string
    chat?: {
      id?: number
    }
    from?: {
      id?: number
      first_name?: string
      last_name?: string
      username?: string
    }
  }
  callback_query?: {
    id: string
    data?: string
    from?: {
      id?: number
      first_name?: string
      last_name?: string
      username?: string
    }
    message?: {
      message_id?: number
      chat?: {
        id?: number
      }
    }
  }
}

function verifyWebhookSecret(request: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET

  if (!secret) {
    return true
  }

  return request.headers.get('x-telegram-bot-api-secret-token') === secret
}

export async function POST(request: Request) {
  if (!verifyWebhookSecret(request)) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const update = (await request.json().catch(() => null)) as TelegramCallbackQueryUpdate | null
  const message = update?.message
  const callbackQuery = update?.callback_query
  const prisma = getPrisma()

  const loginMatch = message?.text?.trim().match(/^\/start\s+login_([a-f0-9]+)$/i)
  const legacyLoginMatch = message?.text?.trim().match(/^\/start\s+login_([^_\s]+)_([a-f0-9]+)$/i)

  if (message?.chat?.id && (loginMatch?.[1] || legacyLoginMatch?.[2])) {
    const token = loginMatch?.[1] ?? legacyLoginMatch?.[2] ?? ''
    const session = await prisma.browserLoginSession.findUnique({
      where: { token },
      select: {
        id: true,
        token: true,
        telegramUserId: true,
        expiresAt: true,
      },
    })

    if (!session || session.expiresAt.getTime() <= Date.now()) {
      await sendTelegramMessage({
        chatId: String(message.chat.id),
        text: 'Household\n\nСсылка для входа недействительна. Вернись в браузер и запусти вход заново.',
      }).catch(() => null)

      return NextResponse.json({ ok: true })
    }

    await prisma.browserLoginSession.update({
      where: { id: session.id },
      data: {
        telegramUserId: String(message.chat.id),
        firstName: message.from?.first_name ?? null,
        lastName: message.from?.last_name ?? null,
        username: message.from?.username ?? null,
        approvedAt: new Date(),
      },
    })

    await sendTelegramMessage({
      chatId: String(message.chat.id),
      text:
        'Household\n\n' +
        'Вход подтвержден.\n' +
        'Возвращайся в браузер, приложение продолжит вход автоматически.',
    }).catch(() => null)

    return NextResponse.json({ ok: true })
  }

  if (!callbackQuery?.id || !callbackQuery.data) {
    return NextResponse.json({ ok: true })
  }

  const browserLoginMatch = callbackQuery.data.match(/^browser-login:([^:]+)(?::([a-f0-9]+))?$/i)

  if (browserLoginMatch) {
    const [, sessionId, token = ''] = browserLoginMatch
    const session = await prisma.browserLoginSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        token: true,
        telegramUserId: true,
        expiresAt: true,
      },
    })

    if (
      !session ||
      (token && session.token !== token) ||
      session.expiresAt.getTime() <= Date.now() ||
      (session.telegramUserId && session.telegramUserId !== String(callbackQuery.from?.id ?? ''))
    ) {
      await answerTelegramCallbackQuery({
        callbackQueryId: callbackQuery.id,
        text: 'Сессия входа истекла. Вернись в браузер и начни заново.',
        showAlert: true,
      })

      return NextResponse.json({ ok: true })
    }

    await prisma.browserLoginSession.update({
      where: { id: session.id },
      data: {
        telegramUserId: String(callbackQuery.from?.id ?? ''),
        firstName: callbackQuery.from?.first_name ?? null,
        lastName: callbackQuery.from?.last_name ?? null,
        username: callbackQuery.from?.username ?? null,
        approvedAt: new Date(),
      },
    })

    if (callbackQuery.message?.chat?.id && callbackQuery.message?.message_id) {
      await editTelegramMessage({
        chatId: String(callbackQuery.message.chat.id),
        messageId: callbackQuery.message.message_id,
        text: 'Household\n\nВход подтвержден. Возвращайся в приложение, оно продолжит вход автоматически.',
        replyMarkup: {
          inline_keyboard: [],
        },
      }).catch(() => null)
    }

    await answerTelegramCallbackQuery({
      callbackQueryId: callbackQuery.id,
      text: 'Вход подтвержден',
      showAlert: false,
    })

    return NextResponse.json({ ok: true })
  }

  const match = callbackQuery.data.match(/^task-approval:([^:]+):(approve|reject)$/)

  if (!match) {
    await answerTelegramCallbackQuery({
      callbackQueryId: callbackQuery.id,
      text: 'Неизвестное действие',
      showAlert: false,
    })

    return NextResponse.json({ ok: true })
  }

  const [, approvalId, decision] = match
  const approval = await prisma.taskCompletionApproval.findUnique({
    where: { id: approvalId },
    include: {
      task: true,
      approverMember: {
        select: {
          id: true,
          chatId: true,
          firstName: true,
          lastName: true,
          username: true,
        },
      },
      requesterMember: {
        select: {
          id: true,
          chatId: true,
          firstName: true,
          lastName: true,
          username: true,
        },
      },
      creditedMember: {
        select: {
          id: true,
          chatId: true,
          firstName: true,
          lastName: true,
          username: true,
        },
      },
    },
  })

  if (!approval || approval.status !== 'pending') {
    await answerTelegramCallbackQuery({
      callbackQueryId: callbackQuery.id,
      text: 'Запрос уже обработан',
      showAlert: false,
    })

    return NextResponse.json({ ok: true })
  }

  if (String(callbackQuery.from?.id ?? '') !== approval.approverMember.chatId) {
    await answerTelegramCallbackQuery({
      callbackQueryId: callbackQuery.id,
      text: 'Это подтверждение не для вас',
      showAlert: true,
    })

    return NextResponse.json({ ok: true })
  }

  if (decision === 'approve') {
    const updatedTask = await finalizeTaskCompletion(prisma, {
      approvalId: approval.id,
      taskId: approval.taskId,
      actorMemberId: approval.approverMemberId,
      creditedMemberId: approval.creditedMemberId,
      creditedMemberName: approval.creditedMemberName,
    })

    const members = await prisma.member.findMany({
      where: { householdId: approval.householdId },
      orderBy: [{ createdAt: 'asc' }],
      select: {
        firstName: true,
        lastName: true,
        username: true,
      },
    })

    await notifyHousehold(
      prisma,
      approval.householdId,
      `Household\n\n` +
        `Задача выполнена: ${updatedTask.title}\n` +
        `Кто выполнил: ${updatedTask.completedByName ?? approval.creditedMemberName}\n` +
        `Когда: ${formatMoscowDateTime(updatedTask.completedAt ?? new Date())}\n` +
        `Дедлайн: ${formatMoscowDeadlineLabel(updatedTask.deadlineAt)}\n` +
        `Прошло с момента создания: ${formatElapsedLabel(approval.task.createdAt, updatedTask.completedAt ?? new Date())}\n` +
        `Участники месяца: ${members.map(getMemberDisplayName).join(', ')}`,
    )

    await notifyMember(
      prisma,
      approval.requesterMemberId,
      `Household\n\nПодтверждено выполнение задачи "${updatedTask.title}". Награда начислена: ${approval.creditedMemberName}.`,
    )

    if (approval.telegramChatId && approval.telegramMessageId) {
      await editTelegramMessage({
        chatId: approval.telegramChatId,
        messageId: approval.telegramMessageId,
        text:
          `Household\n\n` +
          `Подтверждено выполнение задачи\n` +
          `Задача: ${updatedTask.title}\n` +
          `Выполнил(а): ${approval.creditedMemberName}`,
        replyMarkup: {
          inline_keyboard: [],
        },
      }).catch(() => null)
    }

    await answerTelegramCallbackQuery({
      callbackQueryId: callbackQuery.id,
      text: 'Подтверждение принято',
      showAlert: false,
    })

    return NextResponse.json({ ok: true })
  }

  const updatedTask = await reopenTaskFromRejectedApproval(prisma, {
    approvalId: approval.id,
    taskId: approval.taskId,
    householdId: approval.householdId,
  })

  await notifyMember(
    prisma,
    approval.requesterMemberId,
    `Household\n\nЗапрос на выполнение задачи "${updatedTask.title}" отклонён. Задача возвращена в активный список.`,
  )

  if (approval.telegramChatId && approval.telegramMessageId) {
    await editTelegramMessage({
      chatId: approval.telegramChatId,
      messageId: approval.telegramMessageId,
      text:
        `Household\n\n` +
        `Подтверждение отклонено\n` +
        `Задача: ${updatedTask.title}\n` +
        `Заявлен исполнитель: ${approval.creditedMemberName}`,
      replyMarkup: {
        inline_keyboard: [],
      },
    }).catch(() => null)
  }

  await answerTelegramCallbackQuery({
    callbackQueryId: callbackQuery.id,
    text: 'Подтверждение отклонено',
    showAlert: false,
  })

  return NextResponse.json({ ok: true })
}
