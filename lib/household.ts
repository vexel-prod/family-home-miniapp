import type { PrismaClient } from '@/generated/prisma/client'
import { randomBytes } from 'node:crypto'
import { getMemberDisplayName } from '@/lib/household-notify'

export const HOUSEHOLD_INVITE_TTL_MS = 24 * 60 * 60 * 1000
export const MAX_HOUSEHOLD_MEMBERS = 6

export function buildDefaultHouseholdName(firstName?: string) {
  const safeName = firstName?.trim()

  if (!safeName) {
    return 'My Household'
  }

  return `${safeName} Household`
}

export function generateInviteCode() {
  return randomBytes(5).toString('base64url').replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase()
}

export async function getActiveHouseholdInvite(prisma: PrismaClient, householdId: string, now = new Date()) {
  return prisma.householdInvite.findFirst({
    where: {
      householdId,
      revokedAt: null,
      expiresAt: {
        gt: now,
      },
    },
    orderBy: [{ createdAt: 'desc' }],
  })
}

export async function createHouseholdInvite(
  prisma: PrismaClient,
  householdId: string,
  createdByMemberId: string,
  now = new Date(),
) {
  await prisma.householdInvite.updateMany({
    where: {
      householdId,
      revokedAt: null,
      expiresAt: {
        gt: now,
      },
    },
    data: {
      revokedAt: now,
    },
  })

  return prisma.householdInvite.create({
    data: {
      householdId,
      createdByMemberId,
      code: generateInviteCode(),
      expiresAt: new Date(now.getTime() + HOUSEHOLD_INVITE_TTL_MS),
    },
  })
}

export async function countActiveHouseholdMembers(
  prisma: PrismaClient,
  householdId: string,
) {
  return prisma.member.count({
    where: {
      householdId,
      isActive: true,
    },
  })
}

export async function getHouseholdSummary(
  prisma: PrismaClient,
  householdId: string,
  currentUserMemberId: string,
) {
  const [household, members, activeInvite] = await Promise.all([
    prisma.household.findUnique({
      where: { id: householdId },
      select: {
        id: true,
        name: true,
      },
    }),
    prisma.member.findMany({
      where: {
        householdId,
        isActive: true,
      },
      orderBy: [{ joinedAt: 'asc' }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        role: true,
        joinedAt: true,
      },
    }),
    getActiveHouseholdInvite(prisma, householdId),
  ])

  if (!household) {
    return null
  }

  const currentMember = members.find(member => member.id === currentUserMemberId)

  if (!currentMember) {
    return null
  }

  return {
    id: household.id,
    name: household.name,
    members: members.map(member => ({
      id: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
      username: member.username,
      role: member.role === 'head' ? 'head' as const : 'member' as const,
      isCurrentUser: member.id === currentUserMemberId,
      joinedAt: member.joinedAt.toISOString(),
      displayName: getMemberDisplayName(member),
    })),
    activeInvite: activeInvite
      ? {
          code: activeInvite.code,
          expiresAt: activeInvite.expiresAt.toISOString(),
        }
      : null,
    currentUserMemberId,
    currentUserRole: currentMember.role === 'head' ? 'head' as const : 'member' as const,
  }
}
