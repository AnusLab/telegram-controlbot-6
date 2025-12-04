import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { Telegraf, Markup } from 'telegraf';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const bot = new Telegraf(process.env.BOT_TOKEN);

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint to get TMDB API key (for frontend)
app.get('/api/config', (req, res) => {
  res.json({
    tmdbApiKey: process.env.TMDB_API_KEY
  });
});

// Serve index.html for all routes (except webhook)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/webhook')) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ===== TELEGRAM BOT =====

// Start Command
bot.start((ctx) => {
  const webAppUrl = process.env.WEB_APP_URL || `https://${process.env.HEROKU_APP_NAME}.herokuapp.com`;
  
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
  const webAppUrl = process.env.WEB_APP_URL || `https://${process.env.HEROKU_APP_NAME}.herokuapp.com`;
  
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

// ===== START SERVER & BOT =====

app.listen(PORT, async () => {
  console.log(`🌐 Web-Server läuft auf Port ${PORT}`);
  
  // Heroku verwendet Webhooks statt Polling
  if (process.env.HEROKU_APP_NAME) {
    const webhookUrl = `https://${process.env.HEROKU_APP_NAME}.herokuapp.com/webhook`;
    
    try {
      // Webhook setzen
      await bot.telegram.setWebhook(webhookUrl);
      console.log(`✅ Webhook gesetzt: ${webhookUrl}`);
      
      // Webhook Route
      app.use(bot.webhookCallback('/webhook'));
    } catch (error) {
      console.error('❌ Fehler beim Setzen des Webhooks:', error);
    }
  } else {
    // Lokale Entwicklung: Polling verwenden
    bot.launch()
      .then(() => {
        console.log('✅ Bot gestartet (Polling-Modus)!');
        console.log('Bot Username:', bot.botInfo?.username);
      })
      .catch((err) => {
        console.error('❌ Fehler beim Starten des Bots:', err);
      });
  }
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
