import { authorizeRequest } from '@entities/session/server/auth'
import { jsonRateLimited } from '@shared/api/api-response'
import { awardTaskCompletionBonuses, clearTaskBonusTransactions } from '@entities/bonus/server/bonus-ledger'
import { createTaskApprovalToken } from '@entities/family/lib/task-approval'
import { bumpHouseholdRevision } from '@entities/household/server/household-revision'
import { syncHouseholdProfiles } from '@entities/profile/server/household-profile'
import { getMemberDisplayName, notifyHousehold, notifyMember } from '@entities/household/server/household-notify'
import {
  dispatchDueTaskDeadlineNotifications,
  rebuildTaskDeadlineNotifications,
} from '@entities/household/server/task-deadline-notifications'
import { finalizeTaskCompletion, resolveTaskCreatorMember } from '@entities/family/server/task-completion'
import { getPrisma } from '@shared/api/prisma'
import { enforceRateLimit, RateLimitError } from '@shared/api/rate-limit'
import { formatMoscowDeadlineLabel, formatPoints, POINT_UNITS } from '@entities/bonus'
import {
  sanitizeOptionalText,
  TASK_NOTE_MAX_LENGTH,
  TASK_TITLE_MAX_LENGTH,
  validateLength,
  validateRequiredText,
} from '@/shared/lib/validation'
import { formatElapsedLabel, formatMoscowDateTime } from '@/shared/lib/partner-notify'
import { isAllowedTaskDeadline } from '@shared/lib/task-deadline'
import { NextResponse } from 'next/server'

type UpdateTaskPayload = {
  action?: 'complete' | 'complete-together' | 'reopen' | 'replace'
  actorName?: string
  actorUsername?: string | null
  actorTelegramId?: string | null
  title?: string
  note?: string | null
  deadlineAt?: string
  assignedMemberId?: string | null
  creditedMemberId?: string | null
  rewardPoints?: number | null
}

function parseDeadline(deadlineAt?: string) {
  if (!deadlineAt) {
    return null
  }

  const deadline = new Date(deadlineAt)

  if (Number.isNaN(deadline.getTime())) {
    return null
  }

  const now = new Date()

  if (!isAllowedTaskDeadline(deadline, now)) {
    return null
  }

  return deadline
}

function formatTaskPerformerName(member: {
  firstName: string
  lastName: string | null
  username: string | null
}) {
  return [member.firstName, member.lastName].filter(Boolean).join(' ').trim() || member.username || member.firstName
}

export async function PATCH(request: Request, context: { params: Promise<{ taskId: string }> }) {
  const prisma = getPrisma()
  const auth = await authorizeRequest(request, prisma)
  const origin = new URL(request.url).origin

  if (!auth) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { taskId } = await context.params
  const body = (await request.json().catch(() => ({}))) as UpdateTaskPayload

  const actorName =
    [auth.user.first_name, auth.user.last_name].filter(Boolean).join(' ').trim() ||
    auth.user.username ||
    auth.member.firstName

  if (!body.action) {
    return NextResponse.json({ ok: false, error: 'Missing update data' }, { status: 400 })
  }

  try {
    await enforceRateLimit(prisma, {
      action: `task-${body.action}`,
      scope: auth.member.id,
      limit: body.action === 'replace' ? 20 : 60,
      windowMs: 60 * 1000,
    })
  } catch (error) {
    if (error instanceof RateLimitError) {
      return jsonRateLimited(error.retryAfterSeconds)
    }

    throw error
  }

  const task = await prisma.householdTask.findUnique({
    where: { id: taskId },
  })

  if (!task) {
    return NextResponse.json({ ok: false, error: 'Task not found' }, { status: 404 })
  }

  if (task.householdId !== auth.member.householdId) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
  }

  if (body.action === 'complete-together' && task.assignedMemberId) {
    return NextResponse.json(
      { ok: false, error: 'Assigned tasks cannot be completed together' },
      { status: 400 },
    )
  }

  if (body.action === 'replace') {
    const title = validateRequiredText(body.title ?? null, TASK_TITLE_MAX_LENGTH)
    const note = sanitizeOptionalText(body.note)
    const rewardPoints =
      body.rewardPoints === null || body.rewardPoints === undefined
        ? null
        : Number(body.rewardPoints)

    if (!title) {
      return NextResponse.json({ ok: false, error: 'Missing replacement title' }, { status: 400 })
    }

    if (note && !validateLength(note, TASK_NOTE_MAX_LENGTH)) {
      return NextResponse.json({ ok: false, error: 'Task note is too long' }, { status: 400 })
    }

    const deadline = parseDeadline(body.deadlineAt)

    if (!deadline) {
      return NextResponse.json({ ok: false, error: 'Invalid deadline' }, { status: 400 })
    }

    if (
      rewardPoints !== null &&
      (!Number.isInteger(rewardPoints) || rewardPoints <= 0 || rewardPoints > 5000)
    ) {
      return NextResponse.json({ ok: false, error: 'Invalid task reward' }, { status: 400 })
    }

    const assignee = body.assignedMemberId
      ? await prisma.member.findFirst({
          where: {
            id: body.assignedMemberId,
            householdId: auth.member.householdId,
            isActive: true,
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
          },
        })
      : null

    if (body.assignedMemberId && !assignee) {
      return NextResponse.json({ ok: false, error: 'Invalid task assignee' }, { status: 400 })
    }

    if (assignee?.id === auth.member.id) {
      return NextResponse.json(
        { ok: false, error: 'Self-assignment is not allowed' },
        { status: 400 },
      )
    }

    const updatedTask = await prisma.householdTask.update({
      where: { id: taskId },
      data: {
        title,
        note,
        deadlineAt: deadline,
        status: 'open',
        completedAt: null,
        completedByName: null,
        assignedMemberId: assignee?.id ?? null,
        assignedMemberName:
          assignee
            ? [assignee.firstName, assignee.lastName].filter(Boolean).join(' ').trim() ||
              assignee.username ||
              assignee.firstName
            : null,
        rewardUnits: rewardPoints ? rewardPoints * POINT_UNITS : null,
      },
    })

    await rebuildTaskDeadlineNotifications(prisma, updatedTask)
    await dispatchDueTaskDeadlineNotifications(prisma)

    await prisma.taskCompletionApproval.updateMany({
      where: {
        taskId,
        status: 'pending',
      },
      data: {
        status: 'rejected',
        resolvedAt: new Date(),
      },
    })

    await bumpHouseholdRevision(prisma, auth.member.householdId)

    await notifyHousehold(
      prisma,
      auth.member.householdId,
      `Household\n\n` +
        `${actorName} обновил(а) задачу\n` +
        `Задача: ${updatedTask.title}\n` +
        `Новый дедлайн: ${formatMoscowDeadlineLabel(updatedTask.deadlineAt)}` +
        `${updatedTask.assignedMemberName ? `\nАдресат: ${updatedTask.assignedMemberName}` : ''}` +
        `${updatedTask.rewardUnits ? `\nНаграда: ${formatPoints(updatedTask.rewardUnits)} HC` : ''}` +
        `${updatedTask.note ? `\nКомментарий: ${updatedTask.note}` : ''}`,
    )

    return NextResponse.json({ ok: true, task: updatedTask })
  }

  if (body.action === 'complete') {
    if (task.status === 'pending-approval') {
      return NextResponse.json(
        { ok: false, error: 'Task is already awaiting approval' },
        { status: 400 },
      )
    }

    if (task.assignedMemberId) {
      const creditedMemberId = body.creditedMemberId ?? task.assignedMemberId
      const creditedMember = await prisma.member.findFirst({
        where: {
          id: creditedMemberId,
          householdId: auth.member.householdId,
          isActive: true,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true,
        },
      })

      if (!creditedMember) {
        return NextResponse.json(
          { ok: false, error: 'Invalid task performer' },
          { status: 400 },
        )
      }

      if (auth.member.id === task.assignedMemberId) {
        if (creditedMember.id !== task.assignedMemberId) {
          return NextResponse.json(
            { ok: false, error: 'Assigned member can only request confirmation for themselves' },
            { status: 400 },
          )
        }

        const approver = await resolveTaskCreatorMember(prisma, task)

        if (!approver?.chatId) {
          return NextResponse.json(
            { ok: false, error: 'Task creator cannot confirm this task right now' },
            { status: 400 },
          )
        }

        await prisma.taskCompletionApproval.updateMany({
          where: {
            taskId,
            status: 'pending',
          },
          data: {
            status: 'rejected',
            resolvedAt: new Date(),
          },
        })

        const pendingTask = await prisma.householdTask.update({
          where: { id: taskId },
          data: {
            status: 'pending-approval',
            completedAt: null,
            completedByName: null,
          },
        })

        const approval = await prisma.taskCompletionApproval.create({
          data: {
            householdId: task.householdId,
            taskId: task.id,
            approverMemberId: approver.id,
            requesterMemberId: auth.member.id,
            creditedMemberId: creditedMember.id,
            creditedMemberName: formatTaskPerformerName(creditedMember),
            telegramChatId: approver.chatId,
          },
        })

        const approveToken = createTaskApprovalToken(approval.id, 'approved')
        const rejectToken = createTaskApprovalToken(approval.id, 'rejected')
        const approveUrl = `${origin}/api/tasks/decision?approvalId=${approval.id}&decision=approved&token=${approveToken}`
        const rejectUrl = `${origin}/api/tasks/decision?approvalId=${approval.id}&decision=rejected&token=${rejectToken}`

        const telegramMessage = await notifyMember(
          prisma,
          approver.id,
          `Household\n\n` +
            `Подтвердить выполнение задачи?\n` +
            `Задача: ${task.title}\n` +
            `Выполнил(а): ${approval.creditedMemberName}\n` +
            `Дедлайн: ${formatMoscowDeadlineLabel(task.deadlineAt)}`,
          {
            inline_keyboard: [
              [
                {
                  text: 'Подтвердить',
                  url: approveUrl,
                },
                {
                  text: 'Отклонить',
                  url: rejectUrl,
                },
              ],
            ],
          },
        )

        const messageId =
          typeof telegramMessage === 'object' &&
          telegramMessage &&
          'result' in telegramMessage &&
          typeof telegramMessage.result === 'object' &&
          telegramMessage.result &&
          'message_id' in telegramMessage.result &&
          typeof telegramMessage.result.message_id === 'number'
            ? telegramMessage.result.message_id
            : null

        if (messageId) {
          await prisma.taskCompletionApproval.update({
            where: { id: approval.id },
            data: {
              telegramMessageId: messageId,
            },
          })
        }

        await bumpHouseholdRevision(prisma, auth.member.householdId)

        return NextResponse.json({
          ok: true,
          task: pendingTask,
          completionState: 'pending-approval',
        })
      }

      const updatedTask = await finalizeTaskCompletion(prisma, {
        taskId,
        actorMemberId: auth.member.id,
        creditedMemberId: creditedMember.id,
        creditedMemberName: formatTaskPerformerName(creditedMember),
      })

      const members = await prisma.member.findMany({
        where: { householdId: auth.member.householdId },
        orderBy: [{ createdAt: 'asc' }],
        select: {
          firstName: true,
          lastName: true,
          username: true,
        },
      })

      await notifyHousehold(
        prisma,
        auth.member.householdId,
        `Household\n\n` +
          `Задача выполнена: ${updatedTask.title}\n` +
          `Кто выполнил: ${updatedTask.completedByName ?? actorName}\n` +
          `Когда: ${formatMoscowDateTime(updatedTask.completedAt ?? new Date())}\n` +
          `Дедлайн: ${formatMoscowDeadlineLabel(updatedTask.deadlineAt)}\n` +
          `Прошло с момента создания: ${formatElapsedLabel(task.createdAt, updatedTask.completedAt ?? new Date())}\n` +
          `Участники месяца: ${members.map(getMemberDisplayName).join(', ')}`,
      )

      return NextResponse.json({
        ok: true,
        task: updatedTask,
        completionState: 'completed',
      })
    }

    const updatedTask = await prisma.householdTask.update({
      where: { id: taskId },
      data: {
        status: 'done',
        completedAt: new Date(),
        completedByName: actorName,
      },
    })

    await awardTaskCompletionBonuses(
      prisma,
      {
        id: updatedTask.id,
        householdId: updatedTask.householdId,
        title: updatedTask.title,
        createdAt: updatedTask.createdAt,
        completedAt: updatedTask.completedAt ?? new Date(),
        completedByName: updatedTask.completedByName,
        assignedMemberId: updatedTask.assignedMemberId,
        rewardUnits: updatedTask.rewardUnits,
      },
      auth.member.id,
      false,
    )

    await syncHouseholdProfiles(prisma, auth.member.householdId)
    await bumpHouseholdRevision(prisma, auth.member.householdId)

    const members = await prisma.member.findMany({
      where: { householdId: auth.member.householdId },
      orderBy: [{ createdAt: 'asc' }],
      select: {
        firstName: true,
        lastName: true,
        username: true,
      },
    })

    await notifyHousehold(
      prisma,
      auth.member.householdId,
      `Household\n\n` +
        `Задача выполнена: ${updatedTask.title}\n` +
        `Кто выполнил: ${actorName}\n` +
        `Когда: ${formatMoscowDateTime(updatedTask.completedAt ?? new Date())}\n` +
        `Дедлайн: ${formatMoscowDeadlineLabel(updatedTask.deadlineAt)}\n` +
        `Прошло с момента создания: ${formatElapsedLabel(task.createdAt, updatedTask.completedAt ?? new Date())}\n` +
        `Участники месяца: ${members.map(getMemberDisplayName).join(', ')}`,
    )

    return NextResponse.json({ ok: true, task: updatedTask, completionState: 'completed' })
  }

  const updatedTask = await prisma.householdTask.update({
    where: { id: taskId },
    data:
      body.action === 'complete-together'
        ? {
            status: 'done',
            completedAt: new Date(),
            completedByName: 'Сделано вместе',
          }
        : {
            status: 'open',
            completedAt: null,
            completedByName: null,
            lastDeadlineReminderAt: null,
          },
  })

  await rebuildTaskDeadlineNotifications(prisma, updatedTask)

  if (body.action === 'reopen') {
    await dispatchDueTaskDeadlineNotifications(prisma)
  }

  if (body.action === 'complete-together') {
    await awardTaskCompletionBonuses(
      prisma,
      {
        id: updatedTask.id,
        householdId: updatedTask.householdId,
        title: updatedTask.title,
        createdAt: updatedTask.createdAt,
        completedAt: updatedTask.completedAt ?? new Date(),
        completedByName: updatedTask.completedByName,
        assignedMemberId: updatedTask.assignedMemberId,
        rewardUnits: updatedTask.rewardUnits,
      },
      auth.member.id,
      true,
    )

    await syncHouseholdProfiles(prisma, auth.member.householdId)
  }

  if (body.action === 'reopen') {
    await prisma.taskCompletionApproval.updateMany({
      where: {
        taskId,
        status: 'pending',
      },
      data: {
        status: 'rejected',
        resolvedAt: new Date(),
      },
    })

    await clearTaskBonusTransactions(prisma, updatedTask.id)
    await syncHouseholdProfiles(prisma, auth.member.householdId)
  }

  await bumpHouseholdRevision(prisma, auth.member.householdId)

  if (body.action === 'complete-together' && updatedTask.completedAt) {
    const members = await prisma.member.findMany({
      where: { householdId: auth.member.householdId },
      orderBy: [{ createdAt: 'asc' }],
      select: {
        firstName: true,
        lastName: true,
        username: true,
      },
    })

    await notifyHousehold(
      prisma,
      auth.member.householdId,
      `Household\n\n` +
        `Задача выполнена: ${updatedTask.title}\n` +
        `Кто выполнил: вместе\n` +
        `Когда: ${formatMoscowDateTime(updatedTask.completedAt)}\n` +
        `Дедлайн: ${formatMoscowDeadlineLabel(updatedTask.deadlineAt)}\n` +
        `Прошло с момента создания: ${formatElapsedLabel(task.createdAt, updatedTask.completedAt)}\n` +
        `Участники месяца: ${members.map(getMemberDisplayName).join(', ')}`,
    )
  }

  if (body.action === 'reopen') {
    await notifyHousehold(
      prisma,
      auth.member.householdId,
      `Household\n\n` +
        `${actorName} вернул(а) задачу в активный список\n` +
        `Задача: ${updatedTask.title}\n` +
        `Дедлайн: ${formatMoscowDeadlineLabel(updatedTask.deadlineAt)}`,
    )
  }

  return NextResponse.json({ ok: true, task: updatedTask })
}

export async function DELETE(request: Request, context: { params: Promise<{ taskId: string }> }) {
  const prisma = getPrisma()
  const auth = await authorizeRequest(request, prisma)

  if (!auth) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { taskId } = await context.params

  try {
    await enforceRateLimit(prisma, {
      action: 'task-delete',
      scope: auth.member.id,
      limit: 20,
      windowMs: 60 * 1000,
    })
  } catch (error) {
    if (error instanceof RateLimitError) {
      return jsonRateLimited(error.retryAfterSeconds)
    }

    throw error
  }

  const task = await prisma.householdTask.findUnique({
    where: { id: taskId },
  })

  if (!task) {
    return NextResponse.json({ ok: false, error: 'Task not found' }, { status: 404 })
  }

  if (task.householdId !== auth.member.householdId) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
  }

  await clearTaskBonusTransactions(prisma, taskId)
  await syncHouseholdProfiles(prisma, auth.member.householdId)
  await prisma.taskDeadlineNotification.deleteMany({
    where: {
      taskId,
    },
  })

  await prisma.householdTask.delete({
    where: { id: taskId },
  })

  await bumpHouseholdRevision(prisma, auth.member.householdId)

  const actorName =
    [auth.user.first_name, auth.user.last_name].filter(Boolean).join(' ').trim() ||
    auth.user.username ||
    auth.member.firstName

  await notifyHousehold(
    prisma,
    auth.member.householdId,
    `Household\n\n` +
      `${actorName} удалил(а) задачу\n` +
      `Задача: ${task.title}`,
  )

  return NextResponse.json({ ok: true })
}
