# Family Home Mini App

Telegram Mini App для семейного управления бытовыми задачами и списком покупок.

## Текущее состояние

- Главный экран начинается с фиксированной секции `Dashboard`.
- Ниже расположен блок `JournalSummary`.
- В `JournalSummary` есть:
  - переход в журнал выполненных задач
  - карточка текущего лидера месяца
  - кнопка открытия `Лидербоард месяца`
- Подробный рейтинг больше не показывается на главном экране.
- Подробный рейтинг открывается в отдельной модалке.
- Внутри лидерборда центральная область ограничена по высоте и должна прокручиваться внутри модального окна.

## Что умеет приложение

- вести общий список домашних задач для двух участников
- вести общий список покупок
- создавать, редактировать, удалять и закрывать задачи
- закрывать задачу как выполненную вместе
- сортировать бытовые задачи с приоритетом `urgent` выше обычных
- сортировать покупки так, чтобы более критичные позиции были выше
- показывать журнал последних выполненных задач
- считать ежемесячный рейтинг по закрытым задачам
- показывать текущего лидера месяца прямо в `JournalSummary`
- открывать модальный лидербоард с деталями рейтинга и мотивацией
- отправлять уведомления второму участнику через Telegram-бота

## Логика ежемесячного рейтинга

Рейтинг считается на клиенте на основе массива `monthlyCompletedTasks`, который приходит из `/api/bootstrap`.

Начисление баллов:

- `10` баллов за каждую закрытую задачу
- `+6` баллов за срочную задачу
- `+3` балла, если задача закрыта в течение первых 24 часов с момента создания
- `+8` в командный бонус за задачу со статусом `Сделано вместе`

Текущие награды по порогам:

- `60` баллов: выбор семейного фильма
- `120` баллов: пропуск одной мелкой задачи
- `180` баллов: семейный десерт или ужин

Основная логика лежит в [shared/lib/monthly-rating.ts](/Users/vladimirpaskin/Developer/NEXTJS-projects/family-home-miniapp/shared/lib/monthly-rating.ts).

## Ключевые экраны и компоненты

- [app/page.tsx](/Users/vladimirpaskin/Developer/NEXTJS-projects/family-home-miniapp/app/page.tsx)
  Главный экран, модалки, локальное состояние, загрузка `/api/bootstrap`.
- [features/home/components/dashboard-hero.tsx](/Users/vladimirpaskin/Developer/NEXTJS-projects/family-home-miniapp/features/home/components/dashboard-hero.tsx)
  Верхняя dashboard-секция.
- [features/home/components/journal-summary.tsx](/Users/vladimirpaskin/Developer/NEXTJS-projects/family-home-miniapp/features/home/components/journal-summary.tsx)
  Сводка по журналу и вход в лидербоард.
- [features/home/components/monthly-rating-modal.tsx](/Users/vladimirpaskin/Developer/NEXTJS-projects/family-home-miniapp/features/home/components/monthly-rating-modal.tsx)
  Модалка лидерборда.
- [features/home/components/monthly-rating-board.tsx](/Users/vladimirpaskin/Developer/NEXTJS-projects/family-home-miniapp/features/home/components/monthly-rating-board.tsx)
  Контент лидерборда.
- [features/tasks/components/task-journal-modal.tsx](/Users/vladimirpaskin/Developer/NEXTJS-projects/family-home-miniapp/features/tasks/components/task-journal-modal.tsx)
  Журнал выполненных задач.

## API

### `GET /api/bootstrap`

Возвращает:

- `openTasks`
- `completedTasks`
- `monthlyCompletedTasks`
- `activeShoppingItems`

`completedTasks` используется для журнала.

`monthlyCompletedTasks` используется только для месячного рейтинга и приходит отдельным набором за текущий месяц по московскому времени.

### `POST /api/tasks`

Создает задачу.

### `PATCH /api/tasks/[taskId]`

Поддерживает действия:

- `complete`
- `complete-together`
- `reopen`
- `replace`

### `DELETE /api/tasks/[taskId]`

Удаляет задачу.

### `POST /api/shopping-items`

Создает позицию покупки.

### `PATCH /api/shopping-items/[itemId]`

Обновляет или закрывает покупку.

### `DELETE /api/shopping-items/[itemId]`

Удаляет позицию покупки.

## Переменные окружения

- `DATABASE_URL`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_PRIMARY_USER_ID`
- `TELEGRAM_SECONDARY_USER_ID`

Логика уведомлений:

- если запись добавил пользователь с `TELEGRAM_PRIMARY_USER_ID`, уведомление уйдет пользователю `TELEGRAM_SECONDARY_USER_ID`
- если запись добавил пользователь с `TELEGRAM_SECONDARY_USER_ID`, уведомление уйдет пользователю `TELEGRAM_PRIMARY_USER_ID`

## Локальный запуск

1. Создай `.env` по примеру `.env.example`.
2. Установи зависимости.
3. Сгенерируй Prisma Client.
4. Примени схему.
5. Запусти dev-сервер.

```bash
bun install
bunx prisma generate
bunx prisma db push
bun run dev
```

## Подключение как Telegram Mini App

У бота через `@BotFather`:

1. Создай бота через `/newbot`, если его еще нет.
2. Открой `/mybots` -> выбери бота -> `Bot Settings` -> `Menu Button`.
3. Укажи URL задеплоенного приложения.

## Деплой во Vercel

```bash
vercel deploy . -y
```

В Vercel должны быть добавлены:

- `DATABASE_URL`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_PRIMARY_USER_ID`
- `TELEGRAM_SECONDARY_USER_ID`

После изменения переменных нужен redeploy.
