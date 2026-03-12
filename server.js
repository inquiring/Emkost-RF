import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();
dotenv.config({ path: '.env.local' });

const app = express();
const PORT = Number(process.env.PORT || 3000);
const DATABASE_PATH = process.env.DATABASE_PATH || path.join('data', 'emkost-rf.sqlite');
const TELEGRAM_TARGET_CHATS = (process.env.TELEGRAM_TARGET_CHAT || '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const resolvedDatabasePath = path.isAbsolute(DATABASE_PATH)
  ? DATABASE_PATH
  : path.join(__dirname, DATABASE_PATH);

fs.mkdirSync(path.dirname(resolvedDatabasePath), { recursive: true });

const db = new DatabaseSync(resolvedDatabasePath);

db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    form_name TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    volume TEXT NOT NULL,
    purpose TEXT NOT NULL,
    delivery TEXT NOT NULL,
    task TEXT NOT NULL DEFAULT '',
    consent INTEGER NOT NULL DEFAULT 0,
    source_path TEXT,
    ip_address TEXT,
    user_agent TEXT,
    telegram_status TEXT NOT NULL DEFAULT 'pending',
    telegram_error TEXT
  );
`);

const insertLeadStatement = db.prepare(`
  INSERT INTO leads (
    form_name,
    name,
    phone,
    volume,
    purpose,
    delivery,
    task,
    consent,
    source_path,
    ip_address,
    user_agent,
    telegram_status
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const updateLeadTelegramStatement = db.prepare(`
  UPDATE leads
  SET telegram_status = ?, telegram_error = ?
  WHERE id = ?
`);

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
    databaseReady: true,
    databasePath: resolvedDatabasePath,
    telegramConfigured: !!process.env.TELEGRAM_BOT_TOKEN && TELEGRAM_TARGET_CHATS.length > 0,
    telegramTargetsCount: TELEGRAM_TARGET_CHATS.length,
  });
});

const formatOrderText = (body = {}) => {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  const volume = typeof body.volume === 'string' ? body.volume.trim() : '';
  const purpose = typeof body.purpose === 'string' ? body.purpose.trim() : '';
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
    `Под что нужна ёмкость: ${purpose || 'Не указано'}`,
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

const saveLead = ({ body, req }) => {
  const formName =
    typeof body.form_name === 'string' && body.form_name.trim()
      ? body.form_name.trim()
      : 'Заявка с сайта';
  const task = typeof body.task === 'string' ? body.task.trim() : '';

  const result = insertLeadStatement.run(
    formName,
    body.name.trim(),
    body.phone.trim(),
    body.volume.trim(),
    body.purpose.trim(),
    body.delivery.trim(),
    task,
    body.consent ? 1 : 0,
    req.headers.referer || req.originalUrl || '/',
    req.ip,
    req.get('user-agent') || '',
    'pending',
  );

  return Number(result.lastInsertRowid);
};

app.post('/api/create-order', async (req, res) => {
  try {
    const body = req.body || {};
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const volume = typeof body.volume === 'string' ? body.volume.trim() : '';
    const purpose = typeof body.purpose === 'string' ? body.purpose.trim() : '';
    const delivery = typeof body.delivery === 'string' ? body.delivery.trim() : '';
    const consent = body.consent;

    if (!name || !phone || !volume || !purpose || !delivery || !consent) {
      return res.status(400).json({ ok: false, message: 'Заполните обязательные поля формы.' });
    }

    if (!PHONE_PATTERN.test(phone)) {
      return res
        .status(422)
        .json({ ok: false, message: 'Укажите телефон в формате +7 (999) 123-45-67.' });
    }

    const leadId = saveLead({ body, req });

    try {
      await sendTelegramNotification(formatOrderText(body));
      updateLeadTelegramStatement.run('sent', null, leadId);
    } catch (telegramError) {
      const message =
        telegramError instanceof Error ? telegramError.message : 'Не удалось отправить в Telegram.';
      updateLeadTelegramStatement.run('failed', message, leadId);
      throw telegramError;
    }

    return res.json({
      ok: true,
      leadId,
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
