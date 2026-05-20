import http from 'node:http';
import { Telegraf, Markup } from 'telegraf';

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL;
const PORT = Number(process.env.PORT) || 3000;

if (!BOT_TOKEN) {
  console.error('BOT_TOKEN env var is required.');
  process.exit(1);
}
if (!WEBAPP_URL || !/^https:\/\//.test(WEBAPP_URL)) {
  console.error('WEBAPP_URL env var is required and must start with https://');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

const GREETING = {
  en: 'Welcome to Uchqun — a 3D Solar System you can fly through. Pick a language:',
  ru: 'Добро пожаловать в Uchqun — 3D Солнечная система, по которой можно летать. Выбери язык:',
  uz: 'Uchqun’ga xush kelibsiz — uchib o‘taladigan 3D Quyosh tizimi. Tilni tanlang:',
};

function urlFor(lang) {
  const u = new URL(WEBAPP_URL);
  u.searchParams.set('lang', lang);
  return u.toString();
}

function launchKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.webApp('🇺🇿 O‘zbekcha', urlFor('uz'))],
    [Markup.button.webApp('🇷🇺 Русский',  urlFor('ru'))],
    [Markup.button.webApp('🇬🇧 English',  urlFor('en'))],
  ]);
}

bot.use(async (ctx, next) => {
  console.log(`[update] type=${ctx.updateType} from=${ctx.from?.id} text=${ctx.message?.text ?? ''}`);
  return next();
});

bot.start(async (ctx) => {
  const code = (ctx.from?.language_code || '').toLowerCase();
  const lang = code.startsWith('ru') ? 'ru' : code.startsWith('uz') ? 'uz' : 'en';
  await ctx.reply(GREETING[lang], launchKeyboard());
});

bot.command('open', async (ctx) => {
  await ctx.reply('Tap to launch:', launchKeyboard());
});

bot.catch((err, ctx) => {
  console.error(`[error] update ${ctx?.update?.update_id}:`, err);
});

async function main() {
  // Open the health-check HTTP port FIRST so Railway sees the service as
  // up. Telegraf's bot.launch() polls Telegram and never returns, which
  // can confuse platforms that expect a port-bound server.
  http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
  }).listen(PORT, () => {
    console.log(`Health server listening on :${PORT}`);
  });

  const me = await bot.telegram.getMe();
  console.log(`Logged in as @${me.username} (id ${me.id})`);

  // A stale webhook silently swallows every getUpdates call — clear it
  // and drop any pending updates so we start from a clean state.
  await bot.telegram.deleteWebhook({ drop_pending_updates: true });
  console.log('Webhook cleared, pending updates dropped.');

  // Long-polling can fail with 409 when another instance briefly overlaps
  // during a rolling deploy. Don't crash — wait it out and retry, so the
  // container self-heals once the other instance shuts down.
  let attempt = 0;
  while (true) {
    try {
      await bot.launch({ dropPendingUpdates: true });
      console.log('Polling loop exited cleanly.');
      return;
    } catch (err) {
      const code = err?.response?.error_code;
      if (code === 409) {
        const wait = Math.min(60_000, 5_000 * Math.pow(2, attempt++));
        console.warn(`[polling] 409 conflict — another instance is polling. Retrying in ${wait / 1000}s.`);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      console.error('[polling] Unexpected error, retrying in 10s:', err);
      await new Promise((r) => setTimeout(r, 10_000));
    }
  }
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});

process.once('SIGINT',  () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
