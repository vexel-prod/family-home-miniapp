import type { PrismaClient } from '@/generated/prisma/client'
import { awardTaskCompletionBonuses, clearTaskBonusTransactions } from '@entities/bonus/server/bonus-ledger'
import { syncTaskDeadlineNotificationsBestEffort } from '@entities/household/server/task-deadline-notifications'
import { bumpHouseholdRevision } from '@entities/household/server/household-revision'
import { syncHouseholdProfiles } from '@entities/profile/server/household-profile'

type ResolvedTaskCreator = {
  id: string
  chatId: string | null
  firstName: string
  lastName: string | null
  username: string | null
}

export async function resolveTaskCreatorMember(
  prisma: PrismaClient,
  task: {
    addedByMemberId: string | null
    addedByTelegramId: string | null
    householdId: string
  },
) {
  if (task.addedByMemberId) {
    const creator = await prisma.member.findFirst({
      where: {
        id: task.addedByMemberId,
        householdId: task.householdId,
        isActive: true,
      },
      select: {
        id: true,
        chatId: true,
        firstName: true,
        lastName: true,
        username: true,
      },
    })

    if (creator) {
      return creator as ResolvedTaskCreator
    }
  }

  if (!task.addedByTelegramId) {
    return null
  }

  const creator = await prisma.member.findFirst({
    where: {
      telegramUserId: task.addedByTelegramId,
      householdId: task.householdId,
      isActive: true,
    },
    select: {
      id: true,
      chatId: true,
      firstName: true,
      lastName: true,
      username: true,
    },
  })

  return creator ?? null
}

export async function finalizeTaskCompletion(
  prisma: PrismaClient,
  params: {
    taskId: string
    actorMemberId: string
    creditedMemberId: string
    creditedMemberName: string
    approvalId?: string
  },
) {
  const updatedTask = await prisma.householdTask.update({
    where: { id: params.taskId },
    data: {
      status: 'done',
      completedAt: new Date(),
      completedByName: params.creditedMemberName,
    },
  })

  await syncTaskDeadlineNotificationsBestEffort(prisma, updatedTask)

  if (params.approvalId) {
    await prisma.taskCompletionApproval.update({
      where: { id: params.approvalId },
      data: {
        status: 'approved',
        resolvedAt: new Date(),
      },
    })
  } else {
    await prisma.taskCompletionApproval.updateMany({
      where: {
        taskId: params.taskId,
        status: 'pending',
      },
      data: {
        status: 'approved',
        resolvedAt: new Date(),
      },
    })
  }

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
      creditedMemberId: params.creditedMemberId,
      rewardUnits: updatedTask.rewardUnits,
    },
    params.actorMemberId,
    false,
  )

  await syncHouseholdProfiles(prisma, updatedTask.householdId)
  await bumpHouseholdRevision(prisma, updatedTask.householdId)

  return updatedTask
}

export async function reopenTaskFromRejectedApproval(
  prisma: PrismaClient,
  params: {
    approvalId: string
    taskId: string
    householdId: string
  },
) {
  const updatedTask = await prisma.householdTask.update({
    where: { id: params.taskId },
    data: {
      status: 'open',
      completedAt: null,
      completedByName: null,
      lastDeadlineReminderAt: null,
    },
  })

  await syncTaskDeadlineNotificationsBestEffort(prisma, updatedTask)

  await prisma.taskCompletionApproval.update({
    where: { id: params.approvalId },
    data: {
      status: 'rejected',
      resolvedAt: new Date(),
    },
  })

  await clearTaskBonusTransactions(prisma, params.taskId)
  await syncHouseholdProfiles(prisma, params.householdId)
  await bumpHouseholdRevision(prisma, params.householdId)

  return updatedTask
}
