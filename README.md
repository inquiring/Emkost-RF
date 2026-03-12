# Emkost-RF

Лендинг по продаже ёмкостей и резервуаров с Node.js API для сохранения заявок в локальной БД и отправки уведомлений в Telegram.

## Структура проекта

- `index.html` - основная страница сайта.
- `assets/css/` - стили проекта.
- `assets/js/` - клиентские скрипты.
- `assets/images/gallery/` - фотографии ёмкостей и отгрузок.
- `docs/` - исходные материалы и вспомогательные документы.
- `server.js` - Express-сервер для раздачи сайта, сохранения заявок в SQLite и отправки уведомлений в Telegram.
- `.env.local` - локальные секреты Telegram-бота, не коммитится.
- `data/` - локальная база заявок SQLite, создается автоматически на сервере.

## Запуск

1. Установить зависимости: `npm install`
2. Создать `.env.local` по примеру `.env.example`
3. Запустить сервер: `npm run dev`
4. Открыть `http://localhost:3000`

## Как работает форма

1. Форма отправляет данные на `POST /api/create-order`
2. Сервер валидирует заявку
3. Сервер записывает заявку в локальную SQLite БД
4. После записи сервер отправляет уведомление в Telegram

Это означает, что Telegram не является единственным местом хранения заявки.

## Переменные окружения

- `TELEGRAM_BOT_TOKEN` - токен Telegram-бота
- `TELEGRAM_TARGET_CHAT` - один или несколько chat id через запятую
- `ADMIN_TOKEN` - токен для защищенного просмотра и выгрузки заявок
- `DATABASE_PATH` - путь к SQLite базе, по умолчанию `./data/emkost-rf.sqlite`
- `PORT` - порт сервера

## Просмотр и выгрузка заявок

Сервер поддерживает два защищенных endpoint:

- `GET /api/leads` - JSON со списком последних заявок
- `GET /api/leads.csv` - CSV выгрузка последних заявок

Авторизация:

- заголовок `Authorization: Bearer <ADMIN_TOKEN>`
- или query-параметр `?token=<ADMIN_TOKEN>`

Дополнительно:

- `limit` - сколько последних заявок вернуть, по умолчанию `100`, максимум `500`

Примеры:

- `GET /api/leads?limit=100&token=...`
- `GET /api/leads.csv?limit=200&token=...`

## Примечания

- Формы отправляются на `POST /api/create-order`.
- Telegram-бот должен иметь право писать в чат из `TELEGRAM_TARGET_CHAT`.
- При размещении на GitHub Pages API работать не будет, потому что нужен Node.js backend.
- Для рабочего размещения под заявки граждан РФ лучше использовать сервер и хранение данных на территории РФ.

## Временный preview на Render

1. В Render выбрать `New` -> `Blueprint` или `New` -> `Web Service`
2. Подключить репозиторий `inquiring/Emkost-RF`
3. Если используется `render.yaml`, Render сам подхватит `buildCommand` и `startCommand`
4. В переменных окружения задать:
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_TARGET_CHAT`
   - `ADMIN_TOKEN`
   - `DATABASE_PATH`
5. После деплоя Render выдаст публичный URL вида `https://emkost-rf.onrender.com`
