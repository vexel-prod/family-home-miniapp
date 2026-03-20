import { formatMoscowDeadlineLabel } from '@entities/bonus'
import { type TaskApprovalDecision, verifyTaskApprovalToken } from '@entities/family/lib/task-approval'
import { finalizeTaskCompletion, reopenTaskFromRejectedApproval } from '@entities/family/server/task-completion'
import { getMemberDisplayName, notifyHousehold, notifyMember } from '@entities/household/server/household-notify'
import { getPrisma } from '@shared/api/prisma'
import { editTelegramMessage } from '@shared/api/telegram'
import { formatElapsedLabel, formatMoscowDateTime } from '@/shared/lib/partner-notify'

function renderHtml(title: string, description: string) {
  return new Response(
    `<!doctype html>
    <html lang="ru">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${title}</title>
        <style>
          body{margin:0;min-height:100vh;display:grid;place-items:center;background:#120f17;color:#fff4e8;font-family:ui-sans-serif,system-ui,sans-serif}
          main{width:min(92vw,560px);padding:28px;border-radius:28px;background:rgba(23,18,35,.88);border:1px solid rgba(255,255,255,.08)}
          h1{margin:0 0 12px;font-size:2rem}
          p{margin:0;color:#d4c4d6;line-height:1.5}
        </style>
      </head>
      <body>
        <main>
          <h1>${title}</h1>
          <p>${description}</p>
        </main>
      </body>
    </html>`,
    {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    },
  )
}

export async function GET(request: Request) {
  const prisma = getPrisma()
  const { searchParams } = new URL(request.url)
  const approvalId = searchParams.get('approvalId')
  const decision = searchParams.get('decision') as TaskApprovalDecision | null
  const token = searchParams.get('token')

  if (!approvalId || !decision || !token || !['approved', 'rejected'].includes(decision)) {
    return renderHtml('Ссылка невалидна', 'Не хватает данных для обработки подтверждения.')
  }

  if (!verifyTaskApprovalToken(approvalId, decision, token)) {
    return renderHtml('Доступ запрещен', 'Токен подтверждения не подошел.')
  }

  const approval = await prisma.taskCompletionApproval.findUnique({
    where: { id: approvalId },
    include: {
      task: true,
      requesterMember: {
        select: {
          id: true,
        },
      },
    },
  })

  if (!approval) {
    return renderHtml('Подтверждение не найдено', 'Возможно, задача уже была обновлена.')
  }

  if (approval.status !== 'pending') {
    return renderHtml(
      approval.status === 'approved' ? 'Уже подтверждено' : 'Уже отклонено',
      `Запрос уже обработан. Текущий статус: ${approval.status}.`,
    )
  }

  if (decision === 'approved') {
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
      }).catch(() => null)
    }

    return renderHtml(
      'Выполнение подтверждено',
      'Решение сохранено. Награда начислена, а бот уведомил участника о подтверждении.',
    )
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
    }).catch(() => null)
  }

  return renderHtml(
    'Подтверждение отклонено',
    'Решение сохранено. Задача возвращена в активный список, исполнитель получит уведомление.',
  )
}
