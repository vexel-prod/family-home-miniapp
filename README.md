# Household

Telegram Mini App для семьи: общие домашние задачи, список покупок, месячный рейтинг и личный
прогресс участника.

Это уже не приложение для двух фиксированных пользователей. Теперь это многопользовательская
household-модель с onboarding, invite-кодами и ролью главы семьи.

## 1. Что это за приложение

`Household` решает три задачи:

- ведет общий список бытовых задач
- ведет общий список покупок
- делает вклад каждого участника видимым через рейтинг и систему уровней

Приложение работает внутри Telegram Mini App. Авторизация опирается только на валидированный
Telegram `user.id`.

## Архитектура

Проект переведен на FSD-структуру с сохранением Next.js App Router.

Слои:

- `app/` — только route-layer и thin wrappers
- `pages-layer/` — page-level orchestration; импортируется через алиас `@pages/*`
- `widgets/` — крупные блоки экрана
- `features/` — пользовательские сценарии и модалки
- `entities/` — доменные типы, чистые правила и server-side доменная логика
- `shared/` — UI-kit, инфраструктура и общие утилиты

Важно: физическая папка называется `pages-layer`, а не `pages`, потому что корневой `pages/` в Next
зарезервирован под legacy routes. При этом архитектурный алиас остается `@pages/*`.

## 2. Как устроена модель доступа

### Telegram auth

Пользователь открывает приложение из Telegram. Сервер валидирует `initData` и получает настоящий
Telegram `user.id`.

Это единственный источник истины для доступа.

### Household membership

После auth у пользователя есть два возможных состояния:

1. `onboarding` Пользователь еще не состоит ни в одной активной семье.

2. `active` У пользователя есть активный `Member`, привязанный к конкретному `Household`.

### Что можно сделать в onboarding

- создать новую семью
- войти по invite-коду

### Правила membership

- один Telegram user может быть только в одной активной семье
- первый пользователь семьи становится `head`
- вошедший по invite становится `member`
- глава семьи может удалять участников и перевыпускать invite-код
- любой участник может выйти из семьи
- если последний участник выходит, семья удаляется безвозвратно каскадно

## 3. Основные сущности в базе

### `Household`

Семья / домашний контур.

Хранит:

- название семьи
- участников
- invite-коды
- задачи
- покупки
- бонусные транзакции
- месячные отчеты

### `Member`

Участник конкретной семьи.

Хранит:

- `telegramUserId`
- `chatId`
- имя / username
- `role` (`head` или `member`)
- `isActive`
- `joinedAt`
- `leftAt`
- `experiencePoints`
- `level`
- `bonusBalanceUnits`

Важно: уровень и прогресс живут на уровне membership, а не глобального пользователя. Это значит, что
новая семья = новый чистый прогресс.

### `HouseholdInvite`

Invite-код семьи.

Хранит:

- `code`
- `expiresAt`
- `revokedAt`
- `createdByMemberId`

Invite живет 24 часа.

### `HouseholdTask`

Домашняя задача с дедлайном, статусом выполнения и служебными полями для штрафов/напоминаний.

### `ShoppingItem`

Позиция из общего списка покупок.

### `BonusTransaction` / `BonusPurchase`

Используются для бонусного баланса и магазина бонусов.

### `MonthlyReport`

История месячных отчетов по семье.

## 4. Что умеет приложение

- создавать household
- входить в household по invite-коду
- перевыпускать invite-код
- задавать свой invite-код вручную
- выходить из семьи
- удалять участника, если ты `head`
- вести общий список задач
- вести общий список покупок
- считать журнал выполненных задач
- считать месячный рейтинг
- показывать профиль участника с exp и level
- начислять бонусный баланс
- отправлять уведомления участникам семьи через Telegram-бота

## 5. Главный UX-контракт

### Главный экран

- `DashboardHero` всегда наверху
- под ним идет `JournalSummary`
- подробный рейтинг на главный экран не возвращается
- рейтинг открывается только в модалке `leaderboard`

### JournalSummary

Показывает:

- количество выполненных задач
- дату последнего закрытия
- текущего лидера месяца
- доступ к магазину бонусов
- вход в личный кабинет

### Семейный кабинет

Живет в `HouseholdProfileModal`.

Показывает:

- текущий уровень
- прогресс до следующего уровня
- статистику exp
- состав семьи
- invite-код
- семейные действия

### Onboarding

Если пользователь не состоит в семье, главный экран не показывается. Вместо него открывается
onboarding с двумя действиями:

- `Создать семью`
- `Войти по коду`

## 6. Логика задач, рейтинга и профиля

### Задачи

Задача хранит:

- title
- note
- priority
- deadline
- статус
- автора
- закрывшего участника

### Месячный рейтинг

Месячный рейтинг считается отдельно от журнала выполненных задач.

Источник данных для рейтинга:

- `monthlyCompletedTasks`

Источник данных для журнала:

- `completedTasks`

Их нельзя смешивать.

Рейтинг сейчас считается на клиенте на основе `monthlyCompletedTasks`, который приходит из
`/api/bootstrap`.

### Профиль и уровни

Профиль участника считается на сервере.

Правила exp:

- обычная задача: `+10 exp`
- быстрая задача: `+15 exp`
- просроченная задача: `-15 exp`

Уровни:

- `lvl 1 = 100 exp`
- `lvl 2 = 250 exp`
- дальше шкала продолжается возрастающими порогами

За каждый уровень участник получает:

- `+100` бонусных баллов к постоянному бонусному балансу

Баланс и уровень сохраняются в `Member`.

## 7. Файлы, которые важно знать

- [app/page.tsx](/Users/vladimirpaskin/Developer/NEXTJS-projects/family-home-miniapp/app/page.tsx)
  Тонкий route-wrapper, который подключает page-layer.
- [pages-layer/home/ui/home-page.tsx](/Users/vladimirpaskin/Developer/NEXTJS-projects/family-home-miniapp/pages-layer/home/ui/home-page.tsx)
  Главный orchestration-файл клиента: bootstrap, onboarding, модалки, задачи, покупки, семейные
  действия.
- [entities/session/server/auth.ts](/Users/vladimirpaskin/Developer/NEXTJS-projects/family-home-miniapp/entities/session/server/auth.ts)
  Telegram auth и membership lookup.
- [entities/household/server/household.ts](/Users/vladimirpaskin/Developer/NEXTJS-projects/family-home-miniapp/entities/household/server/household.ts)
  Invite-коды, household summary, лимиты семьи.
- [entities/profile/server/household-profile.ts](/Users/vladimirpaskin/Developer/NEXTJS-projects/family-home-miniapp/entities/profile/server/household-profile.ts)
  Серверный профиль участника.
- [entities/profile/lib/household-profile.ts](/Users/vladimirpaskin/Developer/NEXTJS-projects/family-home-miniapp/entities/profile/lib/household-profile.ts)
  Формулы exp/level.
- [entities/monthly-rating/lib/monthly-rating.ts](/Users/vladimirpaskin/Developer/NEXTJS-projects/family-home-miniapp/entities/monthly-rating/lib/monthly-rating.ts)
  Месячный рейтинг.
- [app/api/bootstrap/route.ts](/Users/vladimirpaskin/Developer/NEXTJS-projects/family-home-miniapp/app/api/bootstrap/route.ts)
  Возвращает `active` или `onboarding`.
- [app/api/household/create/route.ts](/Users/vladimirpaskin/Developer/NEXTJS-projects/family-home-miniapp/app/api/household/create/route.ts)
  Создание семьи.
- [app/api/household/join/route.ts](/Users/vladimirpaskin/Developer/NEXTJS-projects/family-home-miniapp/app/api/household/join/route.ts)
  Вход по invite-коду.
- [app/api/household/invite/route.ts](/Users/vladimirpaskin/Developer/NEXTJS-projects/family-home-miniapp/app/api/household/invite/route.ts)
  Получение/создание invite-кода.
- [app/api/household/leave/route.ts](/Users/vladimirpaskin/Developer/NEXTJS-projects/family-home-miniapp/app/api/household/leave/route.ts)
  Выход из семьи.
- [app/api/household/members/[memberId]/route.ts](/Users/vladimirpaskin/Developer/NEXTJS-projects/family-home-miniapp/app/api/household/members/[memberId]/route.ts)
  Удаление участника.
- [features/household/onboarding/ui/household-onboarding.tsx](/Users/vladimirpaskin/Developer/NEXTJS-projects/family-home-miniapp/features/household/onboarding/ui/household-onboarding.tsx)
  Onboarding UI.
- [features/household/profile/ui/household-profile-modal.tsx](/Users/vladimirpaskin/Developer/NEXTJS-projects/family-home-miniapp/features/household/profile/ui/household-profile-modal.tsx)
  Семейный кабинет и семейные действия.
- [widgets/dashboard-hero/ui/dashboard-hero.tsx](/Users/vladimirpaskin/Developer/NEXTJS-projects/family-home-miniapp/widgets/dashboard-hero/ui/dashboard-hero.tsx)
  Верхний hero-блок главного экрана.
- [widgets/journal-summary/ui/journal-summary.tsx](/Users/vladimirpaskin/Developer/NEXTJS-projects/family-home-miniapp/widgets/journal-summary/ui/journal-summary.tsx)
  Вход в журнал, рейтинг, магазин бонусов и ЛК.

## 8. API

### `GET /api/bootstrap`

Возвращает два режима.

#### `state: "onboarding"`

Пользователь валиден как Telegram user, но у него нет активной семьи.

#### `state: "active"`

Возвращает:

- `openTasks`
- `completedTasks`
- `monthlyCompletedTasks`
- `monthlyLeaderboardEntries`
- `monthlyTeamBonusPoints`
- `participantNames`
- `currentUserBonusBalanceUnits`
- `currentUserProfile`
- `household`
- `bonusPurchases`
- `monthlyReports`
- `activeShoppingItems`

### `POST /api/household/create`

Создает новую семью и первого участника с ролью `head`.

### `POST /api/household/join`

Вход в семью по invite-коду.

Проверяет:

- что код существует
- что он не истек
- что он не revoked
- что семья не заполнена
- что пользователь еще не состоит в другой активной семье

### `GET /api/household/invite`

Возвращает активный invite семьи.

### `POST /api/household/invite`

Для главы семьи:

- либо создает новый случайный invite-код
- либо сохраняет пользовательский invite-код

### `POST /api/household/leave`

Участник покидает семью.

Если выходит последний участник:

- удаляется вся семья каскадно

### `DELETE /api/household/members/[memberId]`

Глава семьи удаляет участника.

### `POST /api/tasks`

Создает задачу.

### `PATCH /api/tasks/[taskId]`

Поддерживает:

- `complete`
- `complete-together`
- `reopen`
- `replace`

### `DELETE /api/tasks/[taskId]`

Удаляет задачу.

### `POST /api/shopping-items`

Создает покупку.

### `PATCH /api/shopping-items/[itemId]`

Обновляет или закрывает покупку.

### `DELETE /api/shopping-items/[itemId]`

Удаляет покупку.

## 9. Переменные окружения

Нужны только:

- `DATABASE_URL`
- `TELEGRAM_BOT_TOKEN`

Старые family-specific переменные Telegram больше не используются.

## 10. Локальный запуск

1. Создай `.env` по примеру `.env.example`
2. Установи зависимости
3. Сгенерируй Prisma Client
4. Примени схему
5. Запусти dev-сервер

```bash
bun install
bunx prisma generate
bunx prisma db push
bun run dev
```

## 11. Подключение как Telegram Mini App

Через `@BotFather`:

1. Создай или выбери бота
2. Открой `/mybots`
3. Выбери бота
4. Перейди в `Bot Settings`
5. Открой `Menu Button`
6. Укажи URL приложения

## 12. Деплой в Vercel

Preview:

```bash
vercel deploy . -y
```

Production:

```bash
vercel deploy . --prod -y
```

В Vercel должны быть добавлены:

- `DATABASE_URL`
- `TELEGRAM_BOT_TOKEN`

После изменения env нужен redeploy.

## 13. Что проверять после изменений

Минимум:

- `bun run lint`
- `bun run build`

Ручные проверки:

- onboarding нового пользователя
- создание семьи
- вход по invite-коду
- invite-код в ЛК
- удаление участника главой
- выход обычного участника
- выход последнего участника с безвозвратным предупреждением
- главный экран
- лидерборд
- мобильная высота экрана

## 14. Почему приложение устроено именно так

### Почему нет автосоздания семьи при первом открытии

Потому что иначе база быстро засоряется пустыми семьями от случайных открытий бота.

### Почему Telegram `user.id` — источник истины

Потому что клиенту нельзя доверять household access. Семья определяется только на сервере через
валидированный Telegram auth.

### Почему `Member` хранит уровень и баланс

Потому что прогресс относится к участию пользователя в конкретной семье, а не к человеку глобально.

### Почему последний участник удаляет семью

Потому что пустая семья без участников в этом продукте не имеет ценности и только создает мусор в
базе.
