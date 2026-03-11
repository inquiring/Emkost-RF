# Emkost-RF

Лендинг по продаже емкостей и резервуаров с Node.js API для отправки заявок в Telegram.

## Структура проекта

- `index.html` - основная страница сайта.
- `assets/css/` - стили проекта.
- `assets/js/` - клиентские скрипты.
- `assets/images/gallery/` - фотографии емкостей и отгрузок.
- `docs/` - исходные материалы и вспомогательные документы.
- `server.js` - Express-сервер для раздачи сайта и отправки заявок в Telegram.
- `.env.local` - локальные секреты Telegram-бота, не коммитится.

## Запуск

1. Установить зависимости: `npm install`
2. Создать `.env.local` по примеру `.env.example`
3. Запустить сервер: `npm run dev`
4. Открыть `http://localhost:3000`

## Примечания

- Формы отправляются на `POST /api/create-order`.
- Telegram-бот должен иметь право писать в чат из `TELEGRAM_TARGET_CHAT`.
- При размещении на GitHub Pages API работать не будет, потому что нужен Node.js backend.

## Временный preview на Render

1. В Render выбрать `New` -> `Blueprint` или `New` -> `Web Service`
2. Подключить репозиторий `inquiring/Emkost-RF`
3. Если используется `render.yaml`, Render сам подхватит `buildCommand` и `startCommand`
4. В переменных окружения задать:
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_TARGET_CHAT`
5. После деплоя Render выдаст публичный URL вида `https://emkost-rf.onrender.com`
