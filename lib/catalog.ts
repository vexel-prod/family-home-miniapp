import type { PrismaClient } from "@/generated/prisma/client";

export const taskCatalogSeed = [
  {
    id: "kitchen-dishes",
    title: "Помыть посуду",
    description: "Раковина, столешница и все, что осталось после готовки.",
    category: "Кухня",
    room: "Кухня",
    sortOrder: 10,
  },
  {
    id: "laundry-run",
    title: "Запустить стирку",
    description: "Собрать вещи, загрузить машинку и развесить после цикла.",
    category: "Стирка",
    room: "Ванная",
    sortOrder: 20,
  },
  {
    id: "floors-vacuum",
    title: "Пропылесосить полы",
    description: "Быстрый проход по основным комнатам и прихожей.",
    category: "Уборка",
    room: "Квартира",
    sortOrder: 30,
  },
  {
    id: "bathroom-refresh",
    title: "Освежить ванную",
    description: "Раковина, зеркало, сантехника и мелкая уборка.",
    category: "Уборка",
    room: "Ванная",
    sortOrder: 40,
  },
  {
    id: "trash-out",
    title: "Вынести мусор",
    description: "Пакеты, коробки и вторсырье, если накопилось.",
    category: "Рутина",
    room: "Кухня",
    sortOrder: 50,
  },
  {
    id: "plants-water",
    title: "Полить растения",
    description: "Проверить горшки и не перелить.",
    category: "Дом",
    room: "Комнаты",
    sortOrder: 60,
  },
] as const;

export const productCatalogSeed = [
  {
    id: "milk",
    title: "Молоко",
    description: "Для кофе, каши и завтраков.",
    category: "Холодильник",
    unitLabel: "упаковка",
    sortOrder: 10,
  },
  {
    id: "eggs",
    title: "Яйца",
    description: "Базовый запас для завтраков и выпечки.",
    category: "Холодильник",
    unitLabel: "десяток",
    sortOrder: 20,
  },
  {
    id: "bread",
    title: "Хлеб",
    description: "Свежий хлеб, тостовый или любимая булочная.",
    category: "База",
    unitLabel: "шт",
    sortOrder: 30,
  },
  {
    id: "fruit",
    title: "Фрукты",
    description: "Бананы, яблоки или то, что заканчивается.",
    category: "Фрукты",
    unitLabel: "набор",
    sortOrder: 40,
  },
  {
    id: "cheese",
    title: "Сыр",
    description: "Для бутербродов, пасты или запекания.",
    category: "Холодильник",
    unitLabel: "упаковка",
    sortOrder: 50,
  },
  {
    id: "detergent",
    title: "Средство для стирки",
    description: "Порошок или капсулы, когда запас на исходе.",
    category: "Бытовое",
    unitLabel: "упаковка",
    sortOrder: 60,
  },
] as const;

export async function ensureCatalogSeed(prisma: PrismaClient) {
  await prisma.taskCatalogItem.createMany({
    data: taskCatalogSeed.map((item) => ({ ...item, isActive: true })),
    skipDuplicates: true,
  });

  await prisma.productCatalogItem.createMany({
    data: productCatalogSeed.map((item) => ({ ...item, isActive: true })),
    skipDuplicates: true,
  });
}
