import 'dotenv/config';
import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();
dotenv.config({ path: '.env.local', override: true });

const app = express();
const PORT = Number(process.env.PORT || 3000);
const TELEGRAM_TARGET_CHATS = (process.env.TELEGRAM_TARGET_CHAT || '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PHONE_PATTERN = /^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/;

app.use(express.json({ limit: '1mb' }));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/docs', express.static(path.join(__dirname, 'docs')));

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    telegramConfigured: !!process.env.TELEGRAM_BOT_TOKEN && TELEGRAM_TARGET_CHATS.length > 0,
    telegramTargetsCount: TELEGRAM_TARGET_CHATS.length,
  });
});

const formatOrderText = (body = {}) => {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  const volume = typeof body.volume === 'string' ? body.volume.trim() : '';
  const delivery = typeof body.delivery === 'string' ? body.delivery.trim() : '';
  const task = typeof body.task === 'string' ? body.task.trim() : '';
  const formName = typeof body.form_name === 'string' ? body.form_name.trim() : 'Заявка с сайта';

  return [
    'Новая заявка с сайта Emkost-RF',
    '',
    `Форма: ${formName}`,
    `Имя: ${name}`,
    `Телефон: ${phone}`,
    `Объем: ${volume || 'Не указан'}`,
    `Куда доставить: ${delivery || 'Не указано'}`,
    `Задача: ${task || 'Не указана'}`,
    `Дата: ${new Date().toLocaleString('ru-RU')}`,
  ].join('\n');
};

const sendTelegramNotification = async (text) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token || TELEGRAM_TARGET_CHATS.length === 0) {
    throw new Error(
      'TELEGRAM_BOT_TOKEN or TELEGRAM_TARGET_CHAT is not configured. The target chat must start the bot first.',
    );
  }

  const errors = [];

  for (const chatId of TELEGRAM_TARGET_CHATS) {
    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        errors.push(`chat ${chatId}: ${response.status} ${body}`);
      }
    } catch (error) {
      errors.push(`chat ${chatId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Telegram sendMessage failed: ${errors.join(' | ')}`);
  }
};

app.post('/api/create-order', async (req, res) => {
  try {
    const body = req.body || {};
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const volume = typeof body.volume === 'string' ? body.volume.trim() : '';
    const delivery = typeof body.delivery === 'string' ? body.delivery.trim() : '';
    const consent = body.consent;

    if (!name || !phone || !volume || !delivery || !consent) {
      return res.status(400).json({ ok: false, message: 'Заполните обязательные поля формы.' });
    }

    if (!PHONE_PATTERN.test(phone)) {
      return res
        .status(422)
        .json({ ok: false, message: 'Укажите телефон в формате +7 (999) 123-45-67.' });
    }

    await sendTelegramNotification(formatOrderText(body));

    return res.json({
      ok: true,
      message: 'Заявка отправлена. Мы свяжемся с вами в ближайшее время.',
    });
  } catch (error) {
    console.error('[create-order]', error);
    return res.status(500).json({
      ok: false,
      message: error instanceof Error ? error.message : 'Не удалось отправить заявку.',
    });
  }
});

app.use((_req, res) => {
  res.status(404).json({ ok: false, message: 'Not found' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Emkost-RF server listening on http://localhost:${PORT}`);
});
