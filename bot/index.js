import { Telegraf, Markup } from 'telegraf';

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL;

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

bot.start(async (ctx) => {
  const code = (ctx.from?.language_code || '').toLowerCase();
  const lang = code.startsWith('ru') ? 'ru' : code.startsWith('uz') ? 'uz' : 'en';
  await ctx.reply(`${GREETING[lang]}\n\n${GREETING.uz === GREETING[lang] ? '' : GREETING.uz}`.trim(), launchKeyboard());
});

bot.command('open', async (ctx) => {
  await ctx.reply('Tap to launch:', launchKeyboard());
});

bot.launch().then(() => {
  console.log('Bot is running. WebApp URL:', WEBAPP_URL);
});

process.once('SIGINT',  () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
