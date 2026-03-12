# Family Home Mini App

Telegram Mini App для семейного управления бытовыми задачами и списком покупок.

## Что внутри

- кнопки `БЫТ` и `ПОКУПКИ`, которые открывают модальные списки
- сортировка по важности:
  - в быту срочные задачи сверху
  - в покупках позиции со статусом `Закончилось` сверху
- кастомный ввод названия задачи и продукта
- добавление комментария, количества и приоритета
- общий список для обоих участников
- уведомление партнера в чате бота при каждой новой задаче или покупке
- хранение данных в Postgres через Prisma

## Переменные окружения

- `DATABASE_URL`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_PRIMARY_CHAT_ID`
- `TELEGRAM_SECONDARY_CHAT_ID`

Логика уведомлений:

- если запись добавил пользователь с `TELEGRAM_PRIMARY_CHAT_ID`, уведомление уйдет в `TELEGRAM_SECONDARY_CHAT_ID`
- если запись добавил пользователь с `TELEGRAM_SECONDARY_CHAT_ID`, уведомление уйдет в `TELEGRAM_PRIMARY_CHAT_ID`

## Локальный запуск

1. Создай `.env` по примеру `.env.example`.
2. Установи зависимости:

```bash
bun install
```

3. Сгенерируй Prisma client и примени схему:

```bash
bunx prisma generate
bunx prisma db push
```

4. Запусти приложение:

```bash
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

В Vercel добавь:

- `DATABASE_URL`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_PRIMARY_CHAT_ID`
- `TELEGRAM_SECONDARY_CHAT_ID`

Потом сделай redeploy.
