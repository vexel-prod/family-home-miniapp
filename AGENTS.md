# AGENTS.md

## Проект

`family-home-miniapp` — Telegram Mini App для двух участников семьи.

Стек:

- Next.js App Router
- React 19
- TypeScript
- Prisma
- Postgres
- Tailwind CSS v4
- Framer Motion

## Что важно не ломать

- Секция `Dashboard` на главном экране должна оставаться на своем месте.
- Подробный месячный рейтинг не должен возвращаться на главный экран.
- Вход в рейтинг идет через `JournalSummary`.
- Рейтинг открывается только в модалке `leaderboard`.
- Модалку как базовый shell лучше не менять без необходимости.
- При работе с рейтингом нужно сохранять отдельный источник данных `monthlyCompletedTasks`.

## Текущий UX-контракт

- `DashboardHero` — верхняя секция.
- `JournalSummary` — блок под dashboard.
- В `JournalSummary` отображаются:
  - количество выполненных задач
  - текущий лидер месяца
  - дата последнего закрытия
- Подробности рейтинга живут в `MonthlyRatingModal`.
- Контент лидерборда прокручивается внутри центральной области модалки.

## Где лежит логика

- [app/page.tsx](/Users/vladimirpaskin/Developer/NEXTJS-projects/family-home-miniapp/app/page.tsx)
  Главный orchestration-файл клиента.
- [app/api/bootstrap/route.ts](/Users/vladimirpaskin/Developer/NEXTJS-projects/family-home-miniapp/app/api/bootstrap/route.ts)
  Отдает данные для главного экрана, включая `monthlyCompletedTasks`.
- [shared/lib/monthly-rating.ts](/Users/vladimirpaskin/Developer/NEXTJS-projects/family-home-miniapp/shared/lib/monthly-rating.ts)
  Правила рейтинга и расчет сводки.
- [features/home/components/monthly-rating-modal.tsx](/Users/vladimirpaskin/Developer/NEXTJS-projects/family-home-miniapp/features/home/components/monthly-rating-modal.tsx)
  Обертка лидерборда в модалке.
- [features/home/components/monthly-rating-board.tsx](/Users/vladimirpaskin/Developer/NEXTJS-projects/family-home-miniapp/features/home/components/monthly-rating-board.tsx)
  Визуальный контент рейтинг-секции.

## Правила для следующих правок

- Если меняется рейтинг, сначала проверить `shared/lib/monthly-rating.ts`.
- Если меняется источник данных рейтинга, сначала проверить `GET /api/bootstrap`.
- Если меняется вход в лидерборд, сначала проверить `features/home/components/journal-summary.tsx`.
- Если меняется прокрутка лидерборда, сначала править `monthly-rating-modal.tsx`, а не базовый `ModalPanel`.
- Не смешивать журнал выполненных задач и месячный рейтинг в один и тот же набор данных.
- Не убирать московскую привязку месяца без явного решения по timezone.

## Минимальная проверка после изменений

- `bun run lint`
- ручная проверка главного экрана
- ручная проверка открытия `Лидербоард месяца`
- ручная проверка на мобильной высоте экрана
