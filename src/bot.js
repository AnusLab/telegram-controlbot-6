import { Telegraf, Markup } from 'telegraf';
import dotenv from 'dotenv';

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN);

// Start Command
bot.start((ctx) => {
  const webAppUrl = process.env.WEB_APP_URL || 'http://localhost:3000';
  
  ctx.reply(
    '🎬 Willkommen beim IPTV Film-Bot!\n\n' +
    'Nutze die Mini App, um Filme zu durchsuchen und anzufragen.',
    Markup.keyboard([
      [Markup.button.webApp('🔍 Filme suchen', webAppUrl)]
    ]).resize()
  );
});

// Help Command
bot.help((ctx) => {
  ctx.reply(
    '📖 Hilfe:\n\n' +
    '/start - Bot starten\n' +
    '/help - Diese Hilfe anzeigen\n' +
    '/search - Film-Suche öffnen\n\n' +
    'Nutze den "Filme suchen" Button, um die Mini App zu öffnen.'
  );
});

// Search Command
bot.command('search', (ctx) => {
  const webAppUrl = process.env.WEB_APP_URL || 'http://localhost:3000';
  
  ctx.reply(
    '🔍 Öffne die Film-Suche:',
    Markup.inlineKeyboard([
      [Markup.button.webApp('Film-Suche öffnen', webAppUrl)]
    ])
  );
});

// Error Handling
bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}:`, err);
  ctx.reply('❌ Ein Fehler ist aufgetreten. Bitte versuche es erneut.');
});

// Start Bot
bot.launch()
  .then(() => {
    console.log('✅ Bot gestartet!');
    console.log('Bot Username:', bot.botInfo?.username);
  })
  .catch((err) => {
    console.error('❌ Fehler beim Starten des Bots:', err);
    process.exit(1);
  });

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
