# AGENTS.md

## Проект

`family-home-miniapp` сейчас работает как `Household` — Telegram Mini App для семьи или домашнего
контура с общими задачами, покупками, рейтингом и профилем участника.

Текущая модель:

- пользователь сначала проходит Telegram auth
- если он еще не состоит в семье, он попадает в onboarding
- в onboarding можно:
  - создать новую семью и стать `head`
  - войти в существующую семью по invite-коду и стать `member`
- один Telegram user может состоять только в одной активной семье
- глава семьи может перевыпускать invite-код и удалять участников
- любой участник может выйти из семьи
- если последний участник выходит, семья удаляется безвозвратно каскадно

## Стек

- Next.js App Router
- React 19
- TypeScript
- Prisma
- Postgres / Neon
- Tailwind CSS v4
- Framer Motion

## Архитектура

Проект теперь разложен по FSD-слоям:

- `app/` — только route-layer
- `pages-layer/` — orchestration страниц; использовать через алиас `@pages/*`
- `widgets/` — крупные блоки главного экрана
- `features/` — пользовательские сценарии и модалки
- `entities/` — типы, доменные правила и server-side доменные сервисы
- `shared/` — UI-kit, инфраструктура и общие утилиты

Важно: физическая директория называется `pages-layer`, а не `pages`, потому что корневой `pages/`
конфликтует с Next.js routing.

## Что важно не ломать

- `Dashboard` должен оставаться верхней секцией главного экрана.
- Подробный месячный рейтинг не должен возвращаться на главный экран.
- Вход в рейтинг идет через `JournalSummary`.
- Рейтинг открывается только в модалке `leaderboard`.
- При работе с рейтингом нужно сохранять отдельный источник данных `monthlyCompletedTasks`.
- Onboarding не должен пропускать пользователя в чужую семью без membership.
- `telegramUserId` должен оставаться единственным источником истины для доступа.
- Удаление последнего участника должно удалять всю семью каскадно.

## Текущий UX-контракт

- `DashboardHero` — верхняя секция.
- `JournalSummary` — блок под dashboard.
- В `JournalSummary` отображаются:
  - количество выполненных задач
  - текущий лидер месяца
  - дата последнего закрытия
  - вход в магазин бонусов
  - вход в личный кабинет
- Подробности рейтинга живут в `MonthlyRatingModal`.
- Семейный кабинет живет в `HouseholdProfileModal`.
- В личном кабинете есть:
  - общий уровень семьи
  - статистика семейного exp
  - личный баланс `house-coin`
  - состав семьи
  - invite-код семьи
  - действия главы семьи
- Если у пользователя нет семьи, вместо главного экрана показывается `HouseholdOnboarding`.

## Где лежит логика

- [app/page.tsx](/Users/vladimirpaskin/Developer/NEXTJS-projects/family-home-miniapp/app/page.tsx)
  Тонкий route-wrapper для главной страницы.
- [pages-layer/home/ui/home-page.tsx](/Users/vladimirpaskin/Developer/NEXTJS-projects/family-home-miniapp/pages-layer/home/ui/home-page.tsx)
  Главный orchestration-файл клиента: bootstrap, onboarding, модалки, задачи, покупки, семейные
  действия.
- [entities/session/server/auth.ts](/Users/vladimirpaskin/Developer/NEXTJS-projects/family-home-miniapp/entities/session/server/auth.ts)
  Telegram auth и привязка пользователя к активному `Member`.
- [entities/household/server/household.ts](/Users/vladimirpaskin/Developer/NEXTJS-projects/family-home-miniapp/entities/household/server/household.ts)
  Invite-коды, лимиты семьи, household summary.
- [prisma/schema.prisma](/Users/vladimirpaskin/Developer/NEXTJS-projects/family-home-miniapp/prisma/schema.prisma)
  Источник истины по модели данных.
- [app/api/bootstrap/route.ts](/Users/vladimirpaskin/Developer/NEXTJS-projects/family-home-miniapp/app/api/bootstrap/route.ts)
  Отдает `state: "active"` или `state: "onboarding"` и все данные главного экрана.
- [app/api/household/create/route.ts](/Users/vladimirpaskin/Developer/NEXTJS-projects/family-home-miniapp/app/api/household/create/route.ts)
  Создание новой семьи.
- [app/api/household/join/route.ts](/Users/vladimirpaskin/Developer/NEXTJS-projects/family-home-miniapp/app/api/household/join/route.ts)
  Вход в семью по invite-коду.
- [app/api/household/invite/route.ts](/Users/vladimirpaskin/Developer/NEXTJS-projects/family-home-miniapp/app/api/household/invite/route.ts)
  Получение/перевыпуск invite-кода, включая пользовательский код.
- [app/api/household/leave/route.ts](/Users/vladimirpaskin/Developer/NEXTJS-projects/family-home-miniapp/app/api/household/leave/route.ts)
  Выход из семьи. Последний участник удаляет household целиком.
- [app/api/household/members/[memberId]/route.ts](/Users/vladimirpaskin/Developer/NEXTJS-projects/family-home-miniapp/app/api/household/members/[memberId]/route.ts)
  Удаление участника главой семьи.
- [entities/monthly-rating/lib/monthly-rating.ts](/Users/vladimirpaskin/Developer/NEXTJS-projects/family-home-miniapp/entities/monthly-rating/lib/monthly-rating.ts)
  Правила месячного рейтинга.
- [entities/profile/lib/household-profile.ts](/Users/vladimirpaskin/Developer/NEXTJS-projects/family-home-miniapp/entities/profile/lib/household-profile.ts)
  Формулы семейного exp и уровней.
- [entities/profile/server/household-profile.ts](/Users/vladimirpaskin/Developer/NEXTJS-projects/family-home-miniapp/entities/profile/server/household-profile.ts)
  Серверная синхронизация семейного опыта, уровня и личного `house-coin` баланса.
- [widgets/dashboard-hero/ui/dashboard-hero.tsx](/Users/vladimirpaskin/Developer/NEXTJS-projects/family-home-miniapp/widgets/dashboard-hero/ui/dashboard-hero.tsx)
  Верхний dashboard-блок.
- [widgets/journal-summary/ui/journal-summary.tsx](/Users/vladimirpaskin/Developer/NEXTJS-projects/family-home-miniapp/widgets/journal-summary/ui/journal-summary.tsx)
  Входы в журнал, рейтинг, бонус-шоп и профиль.

## Правила для следующих правок

- Если меняется рейтинг, сначала проверять `entities/monthly-rating/lib/monthly-rating.ts` и
  `GET /api/bootstrap`.
- Если меняется семейная авторизация, сначала проверять `entities/session/server/auth.ts` и
  household API.
- Если меняется invite-flow, сначала проверять `entities/household/server/household.ts` и
  `/api/household/*`.
- Если меняется вход в лидерборд, сначала проверять
  `widgets/journal-summary/ui/journal-summary.tsx`.
- Если меняется логика задач, сначала проверять `/api/tasks/*`, `entities/bonus/server/bonus-ledger.ts`
  и `entities/profile/server/household-profile.ts`.
- Если меняется прокрутка лидерборда, править `monthly-rating-modal.tsx`, а не базовый `ModalPanel`.
- Если меняется форматирование / сортировка household-данных, сначала проверять
  `entities/family/lib/format.ts`.
- Если добавляется новый cross-slice импорт, он должен проходить FSD-ограничения из
  `eslint.config.mjs`.
- Не смешивать журнал выполненных задач и месячный рейтинг в один и тот же набор данных.
- Не возвращать индивидуальные уровни участника. Уровень и exp теперь живут на `Household`.
- Совместное закрытие задачи всегда означает участие всей семьи и делит `house-coin` на всех активных участников.
- Лидерборд считается по двум осям: накопленные `house-coin` и количество выполненных задач.
- Дедлайн задачи нельзя выводить за пределы текущего месяца.
- Не убирать московскую привязку месяца без явного решения по timezone.
- Не возвращать дефолтный household через env-переменные. Эта модель удалена.
- Не разрешать клиенту выбирать `householdId` напрямую.

## Минимальная проверка после изменений

- `bun run lint`
- `bun run build`
- ручная проверка onboarding
- ручная проверка входа по invite-коду
- ручная проверка ЛК и семейных действий
- ручная проверка главного экрана
- ручная проверка открытия `Лидербоард месяца`
- ручная проверка на мобильной высоте экрана
