import type { PrismaClient } from '@/generated/prisma/client'
import { POINT_UNITS } from '@entities/bonus'
import type { BonusReward } from '@entities/family'

type ExternalReward = BonusReward & {
  sourceKey: string
  isSystem: true
  sourceLabel: string
}

type MealDbRandomResponse = {
  meals?: Array<{
    idMeal: string
    strMeal: string
    strCategory?: string | null
    strArea?: string | null
  }>
}

type MealDbLookupResponse = MealDbRandomResponse

type NasaApodResponse = {
  title?: string
  explanation?: string
}

type PokeApiPokemonResponse = {
  id: number
  name: string
  types?: Array<{
    type?: {
      name?: string
    }
  }>
}

export const ROMANTIC_REWARD_TEMPLATES = [
  {
    title: 'Чай или кофе вместе',
    description: 'Небольшая пауза только для вас двоих. Без дел, без спешки, просто посидеть рядом.',
    costUnits: 20 * POINT_UNITS,
  },
  {
    title: 'Объятия без повода',
    description: 'Тёплый бонус на день: подойти, обнять и никуда не спешить хотя бы пару минут.',
    costUnits: 22 * POINT_UNITS,
  },
  {
    title: 'Я выбираю фильм',
    description: 'Сегодня выбор фильма, мультфильма или сериала полностью за покупателем этой награды.',
    costUnits: 28 * POINT_UNITS,
  },
  {
    title: 'Прогулка вдвоём',
    description: 'Небольшая прогулка только вдвоём, даже если это всего один круг вокруг дома.',
    costUnits: 32 * POINT_UNITS,
  },
  {
    title: 'Массаж 10 минут',
    description: 'Короткий, но приятный бонус для расслабления после дня с задачами и бытовыми квестами.',
    costUnits: 38 * POINT_UNITS,
  },
  {
    title: 'Свидание дома',
    description: 'Особенный вечер для двоих: уютный сценарий дома без бытовой суеты и отвлечений.',
    costUnits: 48 * POINT_UNITS,
  },
  {
    title: 'Поцелуй-бонус',
    description: 'Нежный и обязательный бонус по запросу владельца награды. Без отмазок и суеты.',
    costUnits: 20 * POINT_UNITS,
  },
  {
    title: 'Комплимент-ритуал',
    description: 'Несколько тёплых слов подряд и только про тебя. Искренне, красиво и с вниманием.',
    costUnits: 22 * POINT_UNITS,
  },
  {
    title: 'Танец на кухне',
    description: 'Одна любимая песня, кухня, объятия и короткий танец вдвоём без лишних причин.',
    costUnits: 24 * POINT_UNITS,
  },
  {
    title: '15 минут только вдвоём',
    description: 'Без телефонов, без дел и без переключений. Чистое время только друг на друга.',
    costUnits: 26 * POINT_UNITS,
  },
  {
    title: 'Завтрак с заботой',
    description: 'Небольшой завтрак, перекус или вкусная подача специально для тебя.',
    costUnits: 28 * POINT_UNITS,
  },
  {
    title: 'Моя музыка сегодня',
    description: 'Я выбираю музыкальный фон вечера или утра, и никто не спорит с плейлистом.',
    costUnits: 24 * POINT_UNITS,
  },
  {
    title: 'Прогулка за руку',
    description: 'Выйти вместе и просто пройтись рядом, без бытовых разговоров и спешки.',
    costUnits: 30 * POINT_UNITS,
  },
  {
    title: 'Маленький сюрприз',
    description: 'Небольшой милый знак внимания в течение дня или вечера на вкус исполнителя.',
    costUnits: 34 * POINT_UNITS,
  },
  {
    title: 'Селфи для нас двоих',
    description: 'Сделать красивую совместную фотографию, которую потом захочется сохранить.',
    costUnits: 20 * POINT_UNITS,
  },
  {
    title: 'Вечер без телефонов',
    description: 'Небольшой цифровой детокс только для двоих: больше внимания, меньше экранов.',
    costUnits: 36 * POINT_UNITS,
  },
  {
    title: 'Обнимательный вечер',
    description: 'Сегодня режим максимального уюта: больше касаний, больше тепла, меньше дистанции.',
    costUnits: 40 * POINT_UNITS,
  },
  {
    title: 'Я выбираю десерт',
    description: 'Сегодня выбор сладкого или вечернего вкусного бонуса полностью за покупателем.',
    costUnits: 30 * POINT_UNITS,
  },
  {
    title: 'Письмо о любви',
    description: 'Короткое, но настоящее сообщение или записка с тёплыми словами только для тебя.',
    costUnits: 26 * POINT_UNITS,
  },
  {
    title: 'Медленный танец',
    description: 'Один спокойный танец без спешки, даже если музыка будет играть только в голове.',
    costUnits: 28 * POINT_UNITS,
  },
  {
    title: 'Уютный плед-вечер',
    description: 'Плед, близость и вечер в режиме максимального домашнего тепла.',
    costUnits: 34 * POINT_UNITS,
  },
  {
    title: 'Список любимого в тебе',
    description: 'Несколько искренних пунктов о том, что в тебе особенно ценно и любимо.',
    costUnits: 24 * POINT_UNITS,
  },
  {
    title: 'Моя любимая песня для тебя',
    description: 'Сегодня звучит песня, которая ассоциируется с тобой или с нами.',
    costUnits: 22 * POINT_UNITS,
  },
  {
    title: 'Мини-пикник дома',
    description: 'Небольшой красивый перекус или чаепитие в домашнем формате, но с настроением свидания.',
    costUnits: 40 * POINT_UNITS,
  },
  {
    title: 'Сюрприз-объятие со спины',
    description: 'Подойти тихо, обнять крепко и хотя бы на минуту остановить весь мир вокруг.',
    costUnits: 20 * POINT_UNITS,
  },
  {
    title: 'Доброе утро по-особенному',
    description: 'Начать день чуть теплее обычного: с вниманием, нежностью и хорошим настроением.',
    costUnits: 26 * POINT_UNITS,
  },
  {
    title: 'Мой вечер сегодня',
    description: 'Покупатель выбирает, как именно пройдёт уютный совместный вечер.',
    costUnits: 42 * POINT_UNITS,
  },
  {
    title: 'Смотреть закат вместе',
    description: 'Выбраться или просто остановиться у окна и посмотреть на вечер вместе без суеты.',
    costUnits: 30 * POINT_UNITS,
  },
]

const EXTERNAL_CREATED_BY_MEMBER_ID = 'system'

function getMoscowDateKey(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  return formatter.format(date)
}

function getMoscowDateParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  const parts = formatter.formatToParts(date)

  return {
    year: parts.find(part => part.type === 'year')?.value ?? '0000',
    month: parts.find(part => part.type === 'month')?.value ?? '00',
    day: parts.find(part => part.type === 'day')?.value ?? '00',
  }
}

function hashString(value: string) {
  return [...value].reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 1), 0)
}

function toSentenceCase(value: string) {
  if (!value) {
    return value
  }

  return value.charAt(0).toUpperCase() + value.slice(1)
}

function truncateText(value: string | undefined, maxLength: number) {
  if (!value) {
    return ''
  }

  if (value.length <= maxLength) {
    return value
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}…`
}

async function fetchJson<T>(url: string) {
  const response = await fetch(url, {
    next: { revalidate: 60 * 60 },
  })

  if (!response.ok) {
    throw new Error(`External API failed: ${response.status}`)
  }

  return (await response.json()) as T
}

async function getNasaRewardByDate(dateKey: string): Promise<ExternalReward | null> {
  const payload = await fetchJson<NasaApodResponse>(
    `https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY&thumbs=true&date=${dateKey}`,
  )

  if (!payload.title) {
    return null
  }

  return {
    id: `external:nasa:${dateKey}`,
    sourceKey: 'nasa-daily',
    title: `Космический дроп дня`,
    description: `${truncateText(payload.title, 42)}. ${truncateText(payload.explanation, 110)}`,
    costUnits: 24 * POINT_UNITS,
    createdByMemberId: EXTERNAL_CREATED_BY_MEMBER_ID,
    isSystem: true,
    sourceLabel: 'NASA APOD',
  }
}

async function getMealRewardById(mealId: string): Promise<ExternalReward | null> {
  const payload = await fetchJson<MealDbLookupResponse>(
    `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${mealId}`,
  )
  const meal = payload.meals?.[0]

  if (!meal) {
    return null
  }

  const meta = [meal.strArea, meal.strCategory].filter(Boolean).join(' • ')

  return {
    id: `external:meal:${meal.idMeal}`,
    sourceKey: 'meal-daily',
    title: `Ужин-сюрприз: ${meal.strMeal}`,
    description: meta
      ? `${meta}. Открой карточку и забери идею блюда на сегодня.`
      : 'Открой карточку и забери идею блюда на сегодня.',
    costUnits: 28 * POINT_UNITS,
    createdByMemberId: EXTERNAL_CREATED_BY_MEMBER_ID,
    isSystem: true,
    sourceLabel: 'TheMealDB',
  }
}

async function getRandomMealReward(): Promise<ExternalReward | null> {
  const payload = await fetchJson<MealDbRandomResponse>(
    'https://www.themealdb.com/api/json/v1/1/random.php',
  )
  const mealId = payload.meals?.[0]?.idMeal

  if (!mealId) {
    return null
  }

  return getMealRewardById(mealId)
}

async function getPokemonRewardById(pokemonId: number): Promise<ExternalReward | null> {
  const payload = await fetchJson<PokeApiPokemonResponse>(
    `https://pokeapi.co/api/v2/pokemon/${pokemonId}`,
  )

  if (!payload.name) {
    return null
  }

  const types = (payload.types ?? [])
    .map(entry => entry.type?.name)
    .filter(Boolean)
    .map(typeName => toSentenceCase(typeName as string))
    .join(' • ')

  return {
    id: `external:poke:${payload.id}`,
    sourceKey: 'poke-daily',
    title: `Капсула дня: ${toSentenceCase(payload.name)}`,
    description: types
      ? `Коллекционный дроп из PokeAPI. Типы: ${types}.`
      : 'Коллекционный дроп из PokeAPI.',
    costUnits: 32 * POINT_UNITS,
    createdByMemberId: EXTERNAL_CREATED_BY_MEMBER_ID,
    isSystem: true,
    sourceLabel: 'PokeAPI',
  }
}

function getDailyPokemonId() {
  const { year, month, day } = getMoscowDateParts()
  const hash = hashString(`${year}-${month}-${day}`)
  return (hash % 151) + 1
}

export async function getExternalBonusRewards(): Promise<ExternalReward[]> {
  const dateKey = getMoscowDateKey()
  const dailyPokemonId = getDailyPokemonId()

  const [nasa, meal, pokemon] = await Promise.allSettled([
    getNasaRewardByDate(dateKey),
    getRandomMealReward(),
    getPokemonRewardById(dailyPokemonId),
  ])

  const apiRewards = [nasa, meal, pokemon]
    .map(result => (result.status === 'fulfilled' ? result.value : null))
    .filter((reward): reward is ExternalReward => Boolean(reward))

  const romanticRewards: ExternalReward[] = ROMANTIC_REWARD_TEMPLATES.map((reward, index) => ({
    id: `external:romance:${index + 1}`,
    sourceKey: `romance-${index + 1}`,
    title: reward.title,
    description: reward.description,
    costUnits: reward.costUnits,
    createdByMemberId: EXTERNAL_CREATED_BY_MEMBER_ID,
    isSystem: true,
    sourceLabel: 'Романтика',
  }))

  return [...romanticRewards, ...apiRewards]
}

export async function syncGlobalBonusRewards(prisma: PrismaClient) {
  const rewards = await getExternalBonusRewards()

  await Promise.all(
    rewards.map(reward =>
      prisma.globalBonusReward.upsert({
        where: {
          sourceKey: reward.sourceKey,
        },
        update: {
          title: reward.title,
          description: reward.description,
          costUnits: reward.costUnits,
          sourceLabel: reward.sourceLabel,
          isArchived: false,
        },
        create: {
          sourceKey: reward.sourceKey,
          title: reward.title,
          description: reward.description,
          costUnits: reward.costUnits,
          sourceLabel: reward.sourceLabel,
        },
      }),
    ),
  )

  return prisma.globalBonusReward.findMany({
    where: {
      isArchived: false,
    },
    orderBy: [{ createdAt: 'asc' }],
  })
}

export async function cleanupLegacySeededFamilyRewards(prisma: PrismaClient, householdId: string) {
  await prisma.bonusReward.deleteMany({
    where: {
      householdId,
      title: {
        in: ROMANTIC_REWARD_TEMPLATES.map(reward => reward.title),
      },
    },
  })
}
